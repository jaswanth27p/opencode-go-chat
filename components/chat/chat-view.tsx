"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type FileUIPart, type UIMessage } from "ai";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
} from "@/components/ai-elements/attachments";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { ModelSelect } from "@/components/chat/model-select";
import { Button } from "@/components/ui/button";
import { useCreateConversation } from "@/hooks/use-conversations";
import { DEFAULT_MODEL, getModel, modelSupportsMediaType } from "@/mastra/models";

const MODEL_STORAGE_KEY = "chat:last-model";

function ComposerAttachments() {
  const attachments = usePromptInputAttachments();
  if (attachments.files.length === 0) {
    return null;
  }
  return (
    <Attachments className="px-3 pt-3">
      {attachments.files.map((file) => (
        <Attachment
          data={file}
          key={file.id}
          onRemove={() => attachments.remove(file.id)}
        >
          <AttachmentPreview />
          <AttachmentRemove />
        </Attachment>
      ))}
    </Attachments>
  );
}

function renderMessageParts(message: UIMessage) {
  return message.parts.map((part, index) => {
    if (part.type === "text") {
      return <MessageResponse key={index}>{part.text}</MessageResponse>;
    }
    if (part.type === "file") {
      const mediaType = part.mediaType ?? "";
      if (mediaType.startsWith("image/")) {
        // eslint-disable-next-line @next/next/no-img-element
        return <img alt={part.filename ?? "attachment"} className="max-w-xs rounded-md" key={index} src={part.url} />;
      }
      if (mediaType.startsWith("audio/")) {
        return <audio className="max-w-xs" controls key={index} src={part.url} />;
      }
      if (mediaType.startsWith("video/")) {
        return <video className="max-w-xs rounded-md" controls key={index} src={part.url} />;
      }
    }
    return null;
  });
}

function buildOptimisticUserMessage(text: string, files: FileUIPart[]): UIMessage {
  const parts: UIMessage["parts"] = [];
  if (text.trim()) {
    parts.push({ type: "text", text });
  }
  for (const file of files) {
    parts.push(file);
  }
  return {
    id: `optimistic-${nanoid()}`,
    role: "user",
    parts,
    createdAt: new Date(),
  } as UIMessage;
}

export function ChatView({
  threadId,
  initialMessages,
}: {
  threadId?: string;
  initialMessages?: UIMessage[];
}) {
  const router = useRouter();
  const createConversation = useCreateConversation();
  const [model, setModel] = React.useState(DEFAULT_MODEL);
  const [optimisticUserMessage, setOptimisticUserMessage] = React.useState<UIMessage | null>(null);
  const [isCreatingThread, setIsCreatingThread] = React.useState(false);
  const modelRef = React.useRef(model);
  modelRef.current = model;

  React.useEffect(() => {
    const stored = window.localStorage.getItem(MODEL_STORAGE_KEY);
    if (stored) {
      setModel(stored);
    }
  }, []);

  React.useEffect(() => {
    window.localStorage.setItem(MODEL_STORAGE_KEY, model);
  }, [model]);

  const activeThreadId = threadId ?? "pending";
  const threadIdRef = React.useRef(activeThreadId);

  React.useEffect(() => {
    threadIdRef.current = activeThreadId;
  }, [activeThreadId]);

  const { messages, sendMessage, status, error, regenerate } = useChat({
    id: activeThreadId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: `/api/chat/${activeThreadId}`,
      body: () => ({ model: modelRef.current }),
      prepareSendMessagesRequest: ({
        body,
        headers,
        credentials,
        id,
        messages,
        trigger,
        messageId,
      }) => ({
        api: `/api/chat/${threadIdRef.current}`,
        body: { ...body, id, messages, trigger, messageId },
        headers,
        credentials,
      }),
    }),
  });

  const handleSubmit = async (message: PromptInputMessage) => {
    if (!message.text.trim() && message.files.length === 0) return;

    const modelObj = getModel(model);
    for (const file of message.files) {
      if (!modelSupportsMediaType(modelObj, file.mediaType ?? "")) {
        toast.error(
          `${modelObj.label} doesn't support ${file.mediaType ?? "this"} attachments.`
        );
        return;
      }
    }

    let targetThreadId = threadId;
    if (!targetThreadId) {
      setOptimisticUserMessage(
        buildOptimisticUserMessage(message.text, message.files as FileUIPart[])
      );
      setIsCreatingThread(true);
      try {
        const created = await createConversation.mutateAsync();
        targetThreadId = created.id;
        threadIdRef.current = targetThreadId;
        router.push(`/chat/${targetThreadId}`);
      } catch {
        toast.error("Couldn't start a new conversation. Try again.");
        setIsCreatingThread(false);
        return;
      }
      setIsCreatingThread(false);
      setOptimisticUserMessage(null);
    }

    sendMessage({ text: message.text, files: message.files });
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <Conversation>
        <ConversationContent>
          {messages.length === 0 && !optimisticUserMessage ? (
            <ConversationEmptyState
              description="Ask anything — switch models any time from the composer."
              title="Start a conversation"
            />
          ) : (
            <>
              {optimisticUserMessage && (
                <Message from="user" key={optimisticUserMessage.id}>
                  <MessageContent>{renderMessageParts(optimisticUserMessage)}</MessageContent>
                </Message>
              )}
              {messages.map((message) => (
                <Message from={message.role} key={message.id}>
                  <MessageContent>{renderMessageParts(message)}</MessageContent>
                  {message.role === "assistant" &&
                    typeof message.metadata === "object" &&
                    message.metadata !== null &&
                    "usage" in message.metadata && (
                      <div className="text-muted-foreground text-xs">
                        {getModel(String((message.metadata as { model?: string }).model ?? DEFAULT_MODEL)).label}
                        {" · "}
                        {(message.metadata as { usage?: { totalTokens?: number } }).usage?.totalTokens ?? 0} tokens
                      </div>
                    )}
                </Message>
              ))}
              {(status === "submitted" || status === "streaming") && (
                <Message from="assistant" key="assistant-loading">
                  <MessageContent>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <span className="relative flex size-2">
                        <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
                        <span className="relative inline-flex size-2 rounded-full bg-primary" />
                      </span>
                      {status === "submitted" ? "Thinking…" : "Generating…"}
                    </div>
                  </MessageContent>
                </Message>
              )}
            </>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {status === "error" && (
        <div className="flex items-center justify-between rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-destructive text-sm">
          <span>{error?.message || "Something went wrong. Try again."}</span>
          <Button onClick={() => regenerate()} size="sm" variant="outline">
            Retry
          </Button>
        </div>
      )}

      <PromptInput
        accept="image/*,audio/*,video/*"
        globalDrop
        maxFileSize={5 * 1024 * 1024}
        multiple
        onSubmit={handleSubmit}
      >
        <PromptInputBody>
          <ComposerAttachments />
          <PromptInputTextarea />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputTools>
            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger />
              <PromptInputActionMenuContent>
                <PromptInputActionAddAttachments />
              </PromptInputActionMenuContent>
            </PromptInputActionMenu>
            <ModelSelect onChange={setModel} value={model} />
          </PromptInputTools>
          <PromptInputSubmit disabled={isCreatingThread} status={status} />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
