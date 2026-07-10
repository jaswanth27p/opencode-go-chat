"use client";

import * as React from "react";
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
import { PersonaHeader } from "@/components/chat/persona-header";
import { Button } from "@/components/ui/button";
import { useCreateConversation } from "@/hooks/use-conversations";
import { DEFAULT_MODEL, getModel, modelSupportsMediaType } from "@/mastra/models";
import { getPersona } from "@/mastra/personas";
import { useUiStore } from "@/store/use-ui-store";
import { motion } from "motion/react";

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
  personaId,
}: {
  threadId?: string;
  initialMessages?: UIMessage[];
  personaId?: string;
}) {
  const persona = personaId ? getPersona(personaId) : undefined;
  const createConversation = useCreateConversation();
  const setActiveThreadId = useUiStore((state) => state.setActiveThreadId);
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

  // Generated once and never changed for this component's lifetime, so
  // `useChat`'s `id` (and thus its internal message cache) is stable across
  // the "blank chat -> first message -> persisted thread" transition. Real
  // navigations to a *different* thread remount ChatView (new initial
  // state), which is correct — that's the only case where this should change.
  const [chatId] = React.useState(() => threadId ?? nanoid());
  const [hasPersistedThread, setHasPersistedThread] = React.useState(() => Boolean(threadId));

  React.useEffect(() => {
    setActiveThreadId(chatId);
    return () => setActiveThreadId(null);
  }, [chatId, setActiveThreadId]);

  const { messages, sendMessage, status, error, regenerate } = useChat({
    id: chatId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: `/api/chat/${chatId}`,
      body: () => ({ model: modelRef.current }),
      prepareSendMessagesRequest: ({ body, headers, credentials, id, messages, trigger, messageId }) => ({
        api: `/api/chat/${chatId}`,
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

    if (!hasPersistedThread) {
      setOptimisticUserMessage(
        buildOptimisticUserMessage(message.text, message.files as FileUIPart[])
      );
      setIsCreatingThread(true);
      try {
        await createConversation.mutateAsync({ threadId: chatId, personaId: persona?.id });
        const canonicalPath = persona ? `/characters/${persona.id}/${chatId}` : `/chat/${chatId}`;
        window.history.replaceState(null, "", canonicalPath);
        setHasPersistedThread(true);
      } catch {
        toast.error("Couldn't start a new conversation. Try again.");
        setIsCreatingThread(false);
        setOptimisticUserMessage(null);
        return;
      }
      setIsCreatingThread(false);
      setOptimisticUserMessage(null);
    }

    sendMessage({ text: message.text, files: message.files });
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {persona && (
        <PersonaHeader description={persona.tagline} icon={persona.icon} name={persona.name} />
      )}
      <Conversation>
        <ConversationContent>
          {messages.length === 0 && !optimisticUserMessage ? (
            <ConversationEmptyState
              description={persona ? persona.description : "Ask anything — switch models any time from the composer."}
              title={persona ? `Chat with ${persona.name}` : "Start a conversation"}
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
              {(status === "submitted" || status === "streaming" || isCreatingThread) && (
                <Message from="assistant" key="assistant-loading">
                  <MessageContent>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <span className="relative flex size-2">
                        <motion.span
                          animate={{ scale: [1, 2], opacity: [0.75, 0] }}
                          className="absolute inline-flex size-full rounded-full bg-primary opacity-75"
                          transition={{
                            duration: 1,
                            ease: "easeOut",
                            repeat: Number.POSITIVE_INFINITY,
                          }}
                        />
                        <span className="relative inline-flex size-2 rounded-full bg-primary" />
                      </span>
                      {isCreatingThread || status === "submitted" ? "Thinking…" : "Generating…"}
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
                <PromptInputActionAddAttachments label="Add image, audio or video" />
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
