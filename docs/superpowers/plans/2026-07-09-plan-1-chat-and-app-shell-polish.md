# Plan 1: Chat & App Shell Polish

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix chat loading/attachments, model validation, conversation list actions, model selector, sidebar branding, dashboard, global layout, and profile/settings pages.

**Architecture:** Keep business logic in existing files; extract model-support helpers into `mastra/models.ts`; use optimistic local state in `chat-view.tsx`; reuse `components/ui` and `components/ai-elements` primitives.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui (Base UI), @ai-sdk/react, @mastra/ai-sdk, TanStack Query, Sonner.

## Global Constraints
- All external input must be validated with zod in `lib/validations/`.
- Shared types go in `types/`; one-domain-per-file.
- Path alias `@/*` for cross-folder imports.
- No new top-level folders.
- Use theme tokens, never raw colors/radii in Tailwind classes.
- Motion library for animations.

---

## File structure

| File | Responsibility |
|------|----------------|
| `mastra/models.ts` | Model registry, media flags, and model-aware helpers. |
| `components/chat/model-select.tsx` | Model dropdown; shows label; mobile compact mode. |
| `components/global/app-sidebar.tsx` | Sidebar branding. |
| `app/(app)/layout.tsx` | App shell header + max-width container. |
| `components/global/conversation-list.tsx` | Conversation rows with working rename/delete. |
| `components/chat/chat-view.tsx` | Chat UX, optimistic send, attachments, validation. |
| `app/api/chat/[threadId]/route.ts` | Backend message sanitization + media validation. |
| `app/(app)/dashboard/page.tsx` | Dashboard shell. |
| `components/dashboard/feature-cards.tsx` | Chat & Playground feature cards. |
| `app/(app)/profile/page.tsx` | Improved profile layout. |
| `app/(app)/settings/page.tsx` | Improved settings layout. |

---

### Task 1: Update model registry flags

**Files:**
- Modify: `mastra/models.ts`
- Test: `pnpm exec tsc --noEmit`

**Interfaces:**
- Consumes: none.
- Produces: `modelSupportsMediaType(model, mediaType)`, `sanitizeMessagesForModel(messages, model)`.

- [ ] **Step 1: Add media flags to every model**

Update the `OPENCODE_GO_MODELS` array so each entry has the correct `supportsImage`, `supportsAudio`, `supportsVideo` booleans from the approved table.

```ts
export const OPENCODE_GO_MODELS: OpenCodeGoModel[] = [
  { id: "opencode-go/deepseek-v4-flash", label: "DeepSeek V4 Flash", contextWindow: "1.0M", inputPricePerMillion: 0.14, outputPricePerMillion: 0.28, supportsImage: false, supportsAudio: false, supportsVideo: false },
  { id: "opencode-go/deepseek-v4-pro", label: "DeepSeek V4 Pro", contextWindow: "1.0M", inputPricePerMillion: 2, outputPricePerMillion: 3, supportsImage: false, supportsAudio: false, supportsVideo: false },
  { id: "opencode-go/glm-5.1", label: "GLM 5.1", contextWindow: "203K", inputPricePerMillion: 1, outputPricePerMillion: 4, supportsImage: false, supportsAudio: false, supportsVideo: false },
  { id: "opencode-go/glm-5.2", label: "GLM 5.2", contextWindow: "1.0M", inputPricePerMillion: 1, outputPricePerMillion: 4, supportsImage: false, supportsAudio: false, supportsVideo: false },
  { id: "opencode-go/kimi-k2.6", label: "Kimi K2.6", contextWindow: "262K", inputPricePerMillion: 0.95, outputPricePerMillion: 4, supportsImage: true, supportsAudio: false, supportsVideo: true },
  { id: "opencode-go/kimi-k2.7-code", label: "Kimi K2.7 Code", contextWindow: "262K", inputPricePerMillion: 0.95, outputPricePerMillion: 4, supportsImage: true, supportsAudio: false, supportsVideo: true },
  { id: "opencode-go/mimo-v2.5", label: "MiMo V2.5", contextWindow: "1.0M", inputPricePerMillion: 0.14, outputPricePerMillion: 0.28, supportsImage: true, supportsAudio: true, supportsVideo: true },
  { id: "opencode-go/mimo-v2.5-pro", label: "MiMo V2.5 Pro", contextWindow: "1.0M", inputPricePerMillion: 2, outputPricePerMillion: 3, supportsImage: false, supportsAudio: false, supportsVideo: false },
  { id: "opencode-go/minimax-m2.7", label: "MiniMax M2.7", contextWindow: "205K", inputPricePerMillion: 0.3, outputPricePerMillion: 1, supportsImage: false, supportsAudio: false, supportsVideo: false },
  { id: "opencode-go/minimax-m3", label: "MiniMax M3", contextWindow: "1.0M", inputPricePerMillion: 0.3, outputPricePerMillion: 1, supportsImage: true, supportsAudio: false, supportsVideo: true },
  { id: "opencode-go/qwen3.6-plus", label: "Qwen3.6 Plus", contextWindow: "1.0M", inputPricePerMillion: 0.5, outputPricePerMillion: 3, supportsImage: true, supportsAudio: false, supportsVideo: true },
  { id: "opencode-go/qwen3.7-max", label: "Qwen3.7 Max", contextWindow: "1.0M", inputPricePerMillion: 3, outputPricePerMillion: 8, supportsImage: false, supportsAudio: false, supportsVideo: false },
  { id: "opencode-go/qwen3.7-plus", label: "Qwen3.7 Plus", contextWindow: "1.0M", inputPricePerMillion: 0.4, outputPricePerMillion: 2, supportsImage: true, supportsAudio: false, supportsVideo: true },
];
```

- [ ] **Step 2: Add helper functions**

Append to `mastra/models.ts`:

```ts
import type { UIMessage } from "ai";

export function modelSupportsMediaType(
  model: OpenCodeGoModel,
  mediaType: string
): boolean {
  if (mediaType.startsWith("image/")) return model.supportsImage;
  if (mediaType.startsWith("audio/")) return model.supportsAudio;
  if (mediaType.startsWith("video/")) return model.supportsVideo;
  return false;
}

export function sanitizeMessagesForModel(
  messages: UIMessage[],
  model: OpenCodeGoModel
): UIMessage[] {
  return messages
    .map((message) => ({
      ...message,
      parts: message.parts.filter((part) => {
        if (part.type !== "file") return true;
        return modelSupportsMediaType(model, part.mediaType ?? "");
      }),
    }))
    .filter((message) => message.parts.length > 0);
}
```

- [ ] **Step 3: Type check**

Run: `pnpm exec tsc --noEmit`

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add mastra/models.ts
git commit -m "feat: update model media flags and add model-aware helpers"
```

---

### Task 2: Model selector label + mobile compact

**Files:**
- Modify: `components/chat/model-select.tsx`
- Test: `pnpm exec tsc --noEmit`

**Interfaces:**
- Consumes: `getModel(id)` from `mastra/models.ts`.
- Produces: `<ModelSelect value onChange />` unchanged props.

- [ ] **Step 1: Show label in trigger and icon-only on mobile**

Replace the contents of `components/chat/model-select.tsx` with:

```tsx
"use client";

import { Brain } from "lucide-react";
import {
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
} from "@/components/ai-elements/prompt-input";
import { OPENCODE_GO_MODELS, getModel } from "@/mastra/models";

export function ModelSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const selected = getModel(value);
  return (
    <PromptInputSelect onValueChange={(value) => onChange(value as string)} value={value}>
      <PromptInputSelectTrigger className="gap-1.5">
        <Brain className="size-4 shrink-0" />
        <PromptInputSelectValue placeholder="Model">
          <span className="hidden sm:inline">{selected.label}</span>
        </PromptInputSelectValue>
      </PromptInputSelectTrigger>
      <PromptInputSelectContent>
        {OPENCODE_GO_MODELS.map((model) => (
          <PromptInputSelectItem key={model.id} value={model.id}>
            {model.label}
          </PromptInputSelectItem>
        ))}
      </PromptInputSelectContent>
    </PromptInputSelect>
  );
}
```

If Base UI `SelectValue` does not render children, instead render the label text inside `PromptInputSelectTrigger` directly and remove `PromptInputSelectValue` children.

- [ ] **Step 2: Type check**

Run: `pnpm exec tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/chat/model-select.tsx
git commit -m "fix: show model label in selector and collapse text on mobile"
```

---

### Task 3: Sidebar branding

**Files:**
- Modify: `components/global/app-sidebar.tsx`, `app/(app)/layout.tsx`

**Interfaces:**
- Consumes: none.
- Produces: updated copy only.

- [ ] **Step 1: Update sidebar header**

In `components/global/app-sidebar.tsx`, replace the sidebar header `SidebarMenuButton` content:

```tsx
<SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
    <Command className="size-4" />
  </div>
  <div className="grid flex-1 text-left text-sm leading-tight">
    <span className="truncate font-medium">OpenCode Go</span>
    <span className="truncate text-xs text-muted-foreground">Chat & Playground</span>
  </div>
</SidebarMenuButton>
```

- [ ] **Step 2: Update mobile header copy**

In `app/(app)/layout.tsx`, replace the mobile header block:

```tsx
<div className="flex items-center gap-2 md:hidden">
  <div className="flex aspect-square size-6 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
    <Command className="size-3.5" />
  </div>
  <span className="text-sm font-medium">OpenCode Go</span>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add components/global/app-sidebar.tsx app/\(app\)/layout.tsx
git commit -m "fix: replace Acme Inc branding with OpenCode Go"
```

---

### Task 4: Global max-width / centering

**Files:**
- Modify: `app/(app)/layout.tsx`, `app/admin/(dashboard)/layout.tsx`

**Interfaces:**
- Consumes: none.
- Produces: visual layout change.

- [ ] **Step 1: Wrap app content**

In `app/(app)/layout.tsx`, change:

```tsx
<div className="flex flex-1 flex-col gap-4 p-4">
  <div className="mx-auto w-full max-w-7xl">{children}</div>
</div>
```

- [ ] **Step 2: Wrap admin content**

In `app/admin/(dashboard)/layout.tsx`, change:

```tsx
<div className="flex flex-1 flex-col gap-4 p-4">
  <div className="mx-auto w-full max-w-7xl">{children}</div>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/layout.tsx app/admin/\(dashboard\)/layout.tsx
git commit -m "feat: cap page content at max-w-7xl and center"
```

---

### Task 5: Fix conversation list rename/delete

**Files:**
- Modify: `components/global/conversation-list.tsx`
- Test: manual UI test + `pnpm exec tsc --noEmit`

**Interfaces:**
- Consumes: `useRenameConversation`, `useDeleteConversation` from hooks.
- Produces: working dropdown actions with toast feedback.

- [ ] **Step 1: Fix dropdown trigger and handlers**

In `components/global/conversation-list.tsx`, update imports to include `toast` from `sonner`.

Replace the `DropdownMenuTrigger` block inside `ConversationRow`:

```tsx
<DropdownMenuTrigger
  render={
    <Button
      className="absolute top-1 right-1 size-6"
      size="icon"
      variant="ghost"
    >
      <MoreHorizontal className="size-3.5" />
    </Button>
  }
/>
```

Update the rename handler:

```tsx
<DropdownMenuItem
  onSelect={async () => {
    setTitle(thread.title ?? "");
    setEditing(true);
  }}
>
  Rename
</DropdownMenuItem>
```

Update the delete handler to await and toast:

```tsx
<DropdownMenuItem
  variant="destructive"
  onSelect={async () => {
    try {
      await remove.mutateAsync({ threadId: thread.id });
      if (isActive) {
        router.push("/chat");
      }
    } catch {
      toast.error("Couldn't delete conversation. Try again.");
    }
  }}
>
  Delete
</DropdownMenuItem>
```

Also await the rename form submit:

```tsx
onSubmit={async (e) => {
  e.preventDefault();
  const next = title.trim();
  if (!next) {
    setEditing(false);
    return;
  }
  try {
    await rename.mutateAsync({ threadId: thread.id, title: next });
  } catch {
    toast.error("Couldn't rename conversation. Try again.");
  }
  setEditing(false);
}}
```

- [ ] **Step 2: Type check**

Run: `pnpm exec tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/global/conversation-list.tsx
git commit -m "fix: make conversation rename/delete work and surface errors"
```

---

### Task 6: Optimistic first message + assistant loading state

**Files:**
- Modify: `components/chat/chat-view.tsx`
- Test: manual UI test + `pnpm exec tsc --noEmit`

**Interfaces:**
- Consumes: `modelSupportsMediaType`, `sanitizeMessagesForModel` (later task), `getModel`.
- Produces: immediate user message, assistant loading placeholder.

- [ ] **Step 1: Add optimistic message state and helper**

Add imports:

```tsx
import { nanoid } from "nanoid";
import type { UIMessage } from "ai";
```

Inside `ChatView`, after model state:

```tsx
const [optimisticUserMessage, setOptimisticUserMessage] = React.useState<UIMessage | null>(null);
const [isCreatingThread, setIsCreatingThread] = React.useState(false);
```

Add helper above component:

```tsx
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
```

- [ ] **Step 2: Update handleSubmit for optimistic send**

Replace `handleSubmit` with:

```tsx
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
```

- [ ] **Step 3: Render optimistic message and assistant loading row**

In the `ConversationContent` render, before the `messages.map(...)` branch, include the optimistic message:

```tsx
{messages.length === 0 && !optimisticUserMessage ? (
  <ConversationEmptyState ... />
) : (
  <>
    {optimisticUserMessage && (
      <Message from="user" key={optimisticUserMessage.id}>
        <MessageContent>{renderMessageParts(optimisticUserMessage)}</MessageContent>
      </Message>
    )}
    {messages.map((message) => (
      <Message from={message.role} key={message.id}>...</Message>
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
```

- [ ] **Step 4: Disable submit while creating thread**

Pass `disabled={isCreatingThread}` to `PromptInputSubmit`:

```tsx
<PromptInputSubmit disabled={isCreatingThread} status={status} />
```

- [ ] **Step 5: Type check**

Run: `pnpm exec tsc --noEmit`

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add components/chat/chat-view.tsx
git commit -m "feat: optimistic first message and assistant loading state"
```

---

### Task 7: Attachment UI + client validation

**Files:**
- Modify: `components/chat/chat-view.tsx`
- Test: manual UI test + `pnpm exec tsc --noEmit`

**Interfaces:**
- Consumes: `modelSupportsMediaType`, `getModel`.
- Produces: media-only attachments with model validation.

- [ ] **Step 1: Replace attachment menu with direct button**

In the `PromptInputFooter`, replace the `PromptInputActionMenu` block with:

```tsx
<PromptInputTools>
  <PromptInputActionAddAttachments label="Add image, audio or video" />
  <ModelSelect onChange={setModel} value={model} />
</PromptInputTools>
```

Ensure `PromptInput` props are:

```tsx
<PromptInput
  accept="image/*,audio/*,video/*"
  globalDrop
  maxFileSize={5 * 1024 * 1024}
  multiple
  onSubmit={handleSubmit}
>
```

- [ ] **Step 2: Verify client validation is already in handleSubmit**

The validation loop added in Task 6 covers current-message attachments.

- [ ] **Step 3: Type check**

Run: `pnpm exec tsc --noEmit`

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/chat/chat-view.tsx
git commit -m "feat: restrict attachments to media and validate against model"
```

---

### Task 8: Backend message sanitization + validation

**Files:**
- Modify: `app/api/chat/[threadId]/route.ts`
- Test: `pnpm exec tsc --noEmit`

**Interfaces:**
- Consumes: `sanitizeMessagesForModel` from `mastra/models.ts`.
- Produces: sanitized message array passed to `handleChatStream`.

- [ ] **Step 1: Sanitize messages before streaming**

After parsing `model` and before the `blockedModality` check, add:

```ts
const sanitizedMessages = sanitizeMessagesForModel(messages, model);
```

Then change the `lastUserMessage` lookup to use `sanitizedMessages`:

```ts
const lastUserMessage = [...sanitizedMessages].reverse().find((m) => m.role === "user");
```

- [ ] **Step 2: Pass sanitized messages to handleChatStream**

Change the `params.messages` field:

```ts
params: {
  messages: sanitizedMessages,
  memory: { thread: threadId, resource: user.id },
  requestContext,
},
```

- [ ] **Step 3: Type check**

Run: `pnpm exec tsc --noEmit`

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/chat/\[threadId\]/route.ts
git commit -m "feat: strip unsupported media from chat history server-side"
```

---

### Task 9: Dashboard feature cards

**Files:**
- Create: `components/dashboard/feature-cards.tsx`
- Modify: `app/(app)/dashboard/page.tsx`
- Test: `pnpm exec tsc --noEmit`

**Interfaces:**
- Consumes: none.
- Produces: `<FeatureCards />`.

- [ ] **Step 1: Create feature cards component**

Create `components/dashboard/feature-cards.tsx`:

```tsx
import Link from "next/link";
import { MessageSquare, FlaskConical, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    title: "Chat",
    description: "Ask anything, attach images, audio or video, and switch models on the fly.",
    href: "/chat",
    icon: MessageSquare,
  },
  {
    title: "Playground",
    description: "Test prompts, tweak temperature, max tokens and other model parameters.",
    href: "/playground",
    icon: FlaskConical,
  },
];

export function FeatureCards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {FEATURES.map((feature) => (
        <Card key={feature.title} className="flex flex-col">
          <CardHeader>
            <div className="flex items-center gap-2">
              <feature.icon className="size-5 text-primary" />
              <CardTitle>{feature.title}</CardTitle>
            </div>
            <CardDescription>{feature.description}</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Button asChild className="gap-2">
              <Link href={feature.href}>
                Open {feature.title}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Update dashboard page**

Replace `app/(app)/dashboard/page.tsx` with:

```tsx
import { FeatureCards } from "@/components/dashboard/feature-cards";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <FeatureCards />
    </div>
  );
}
```

- [ ] **Step 3: Type check**

Run: `pnpm exec tsc --noEmit`

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/dashboard/feature-cards.tsx app/\(app\)/dashboard/page.tsx
git commit -m "feat: add chat and playground cards to dashboard"
```

---

### Task 10: Profile page layout

**Files:**
- Modify: `app/(app)/profile/page.tsx`
- Test: `pnpm exec tsc --noEmit`

**Interfaces:**
- Consumes: `requireUser()`.
- Produces: styled profile page.

- [ ] **Step 1: Rewrite profile page**

Replace `app/(app)/profile/page.tsx` with:

```tsx
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { requireUser } from "@/lib/session";

export default async function ProfilePage() {
  const user = await requireUser();
  const initials = (user.name?.trim() || user.email).slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-6 sm:flex-row sm:items-start">
          <Avatar className="size-24">
            <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col gap-1 text-center sm:text-left">
            <p className="text-xl font-semibold">{user.name || "Unnamed"}</p>
            <p className="text-muted-foreground">{user.email}</p>
            <Separator className="my-2" />
            <div className="grid gap-2 text-sm">
              <p>
                <span className="text-muted-foreground">Joined:</span>{" "}
                {user.createdAt.toLocaleDateString()}
              </p>
              <p>
                <span className="text-muted-foreground">User ID:</span>{" "}
                <span className="font-mono text-xs">{user.id}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Type check**

Run: `pnpm exec tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/profile/page.tsx
git commit -m "feat: improve profile page layout"
```

---

### Task 11: Settings page layout

**Files:**
- Modify: `app/(app)/settings/page.tsx`
- Test: `pnpm exec tsc --noEmit`

**Interfaces:**
- Consumes: none.
- Produces: sectioned settings placeholder.

- [ ] **Step 1: Rewrite settings page**

Replace `app/(app)/settings/page.tsx` with:

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/global/theme-toggle";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Toggle between light and dark mode.</CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Manage your account details.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          <p className="text-muted-foreground">
            Visit your <a className="underline underline-offset-2" href="/profile">Profile</a> to review personal information.
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>Additional app preferences will appear here.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No additional preferences available yet.
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Type check**

Run: `pnpm exec tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/settings/page.tsx
git commit -m "feat: improve settings page layout"
```

---

## Spec coverage check

| Spec section | Task |
|--------------|------|
| Model registry flags | Task 1 |
| Chat loading UX | Task 6 |
| Attachments UI/validation | Tasks 6, 7, 8 |
| Conversation list rename/delete | Task 5 |
| Model selector label/mobile | Task 2 |
| Sidebar branding | Task 3 |
| Global max-width | Task 4 |
| Dashboard feature cards | Task 9 |
| Profile/Settings layout | Tasks 10, 11 |
