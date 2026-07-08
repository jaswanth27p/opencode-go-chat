"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
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
import { useCreateConversation } from "@/hooks/use-conversations";
import { DEFAULT_MODEL, getModel } from "@/mastra/models";

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

  const { messages, sendMessage, status } = useChat({
    id: activeThreadId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: `/api/chat/${activeThreadId}`,
      body: () => ({ model: modelRef.current }),
    }),
  });

  const handleSubmit = async (message: PromptInputMessage) => {
    if (!message.text.trim() && message.files.length === 0) {
      return;
    }

    let targetThreadId = threadId;
    if (!targetThreadId) {
      const created = await createConversation.mutateAsync();
      targetThreadId = created.id;
      router.push(`/chat/${targetThreadId}`);
    }

    sendMessage({ text: message.text, files: message.files });
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <Conversation>
        <ConversationContent>
          {messages.length === 0 ? (
            <ConversationEmptyState
              description="Ask anything — switch models any time from the composer."
              title="Start a conversation"
            />
          ) : (
            messages.map((message) => (
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
            ))
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

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
          <PromptInputSubmit status={status} />
        </PromptInputFooter>
      </PromptInput>
    </div>
  );
}
