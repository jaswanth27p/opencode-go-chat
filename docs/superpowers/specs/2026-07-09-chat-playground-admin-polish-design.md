# Design: Chat, Playground, Dashboard & Admin Polish

## Context
OpenCode Go Chat is a Next.js app with:
- Chat UI using `@ai-sdk/react` + `@mastra/ai-sdk` streaming.
- Model registry in `mastra/models.ts`.
- Playground using `useCompletion` against `/api/playground`.
- Admin observability backed by Mastra's Postgres storage (`mastra_ai_spans`).

## Decisions from clarifying questions
- **Previous-message media when switching to a text model**: silently strip unsupported file parts from the message history; keep the text. Drop any message that becomes empty.
- **Media models** (from the provided table):
  - Image + Video: `opencode-go/kimi-k2.6`, `opencode-go/kimi-k2.7-code`, `opencode-go/minimax-m3`, `opencode-go/qwen3.6-plus`, `opencode-go/qwen3.7-plus`
  - Image + Audio + Video: `opencode-go/mimo-v2.5`
  - No media support: all other models.
- **Admin logs**: implement logging by switching storage to `PostgresStoreVNext` and enabling Mastra observability log forwarding. This makes the existing `/admin/logs` page functional.

## 1. Model registry

File: `mastra/models.ts`

- Update each model's `supportsImage`, `supportsAudio`, `supportsVideo` flags to match the table above.
- Add helpers:
  - `getModel(id)` — unchanged behavior.
  - `modelSupportsMediaType(model, mediaType)` — returns `true` if the model supports the given `image/*`, `audio/*`, or `video/*` type.
  - `sanitizeMessagesForModel(messages, model)` — returns a new message array with unsupported file parts removed; messages whose parts become empty are omitted entirely.

## 2. Chat send / loading UX

File: `components/chat/chat-view.tsx`

- Add local state `optimisticUserMessage: UIMessage | null`.
- `handleSubmit` flow for a brand-new chat:
  1. Render the user's message immediately via `optimisticUserMessage`.
  2. Disable the submit area (keep the composer visible but non-interactive).
  3. Create the thread with `createConversation.mutateAsync`.
  4. Update `threadIdRef.current`, push `/chat/${threadId}`, then call `sendMessage`.
  5. Clear `optimisticUserMessage`.
- If thread creation fails, keep the optimistic message so the user can retry, and `toast.error`.
- When `status === "submitted" || status === "streaming"`, render an assistant loading row at the bottom of `ConversationContent`:
  - pulsing avatar + "Thinking…" / "Generating…" text.
  - Removed as soon as a real assistant message appears.

## 3. Attachments

Files: `components/chat/chat-view.tsx`, `app/api/chat/[threadId]/route.ts`

- Restrict uploads to media only:
  - `PromptInput accept="image/*,audio/*,video/*"`.
  - Replace the nested `PromptInputActionMenu` with a single media-attachment button to avoid the file-dialog gesture issue.
- Client-side validation before send:
  - If any attached file's media type is unsupported by the selected model, `toast.error("{model.label} doesn't support {type} attachments.")` and abort.
- Backend validation & sanitization:
  - Before calling `handleChatStream`, run `sanitizeMessagesForModel(messages, model)`.
  - Keep a final safety check: if the last user message still contains an unsupported file part, stream a blocked-modality message (existing behavior).

## 4. Conversation list rename/delete

File: `components/global/conversation-list.tsx`

- Fix the `DropdownMenuTrigger` so the menu actually opens and item `onSelect` fires reliably (review the render-prop wrapping of `Button`).
- `rename.mutate` and `remove.mutate` should be awaited and surfaced with `toast.error` on failure.
- After delete, redirect if the deleted thread is active.
- Keep the optimistic cache updates already present.

## 5. Model selector

File: `components/chat/model-select.tsx`

- Show the model **label** in the trigger, not the raw ID.
- Mobile: collapse the trigger text and show only a compact icon (e.g. `Sparkles`/`Brain`) to save space.

## 6. Sidebar branding

Files: `components/global/app-sidebar.tsx`, `app/(app)/layout.tsx`

- Replace `Acme Inc` / `Template` with `OpenCode Go` / `Chat & Playground`.
- Apply the same branding text in the mobile header.

## 7. Playground

Files: `app/(app)/playground/page.tsx`, `app/api/playground/route.ts`

- Responsive layout: stack on mobile, side-by-side on `lg` (`grid-cols-1 lg:grid-cols-[320px_1fr]`).
- Client-side input validation:
  - `maxTokens` integer > 0
  - `temperature` 0–2
  - `topP` 0–1
  - `topK` integer ≥ 0
  - `presencePenalty` / `frequencyPenalty` -1 to 1
  - `seed` integer
- Map the form value to `maxTokens` (not `maxOutputTokens`) in `modelSettings` — AI SDK expects `maxTokens`.
- Surface errors via `toast.error` in addition to inline text. Use `useCompletion.onError` or a `useEffect` on `error`.
- Stream errors after the first chunk should still be visible to the user.

## 8. App dashboard

Files: `app/(app)/dashboard/page.tsx`, new `components/dashboard/feature-cards.tsx`

- Replace the bare profile card with two feature cards:
  - **Chat** — description + CTA button to `/chat`.
  - **Playground** — description + CTA button to `/playground`.
- Move the account-only profile overview to `/profile` (see section 9).

## 9. Global max-width / centering

File: `app/(app)/layout.tsx`

- Wrap `{children}` in a `max-w-7xl mx-auto` container so page content is centered and capped on ultra-wide screens.
- Apply the same container class to the admin layout for consistency.

## 10. Profile & Settings layouts

Files: `app/(app)/profile/page.tsx`, `app/(app)/settings/page.tsx`

- Profile:
  - Hero card with large avatar, name, email, joined date.
  - Optional stats row (conversation count from the API, placeholder for future stats).
- Settings:
  - Sectioned card layout: Appearance (theme toggle placeholder), Account (links to profile), Danger zone placeholder.
  - Remove the "Nothing configurable yet" placeholder copy.

## 11. Admin dashboard charts

Files: `app/admin/(dashboard)/page.tsx`, `lib/admin/observability.ts`, `components/admin/*-chart.tsx`

Extend `getOverviewStats()` to return more aggregated data from `mastra_ai_spans` and `mastra_messages`:

- **KPI tiles** (already present): conversations, messages, runs 24h, error rate 24h, avg latency 24h.
- **Runs last 14 days** stacked bar (existing).
- **Runs last 24 hours by hour** — bar/line chart.
- **Top models by run count** — horizontal bar chart.
- **Runs by status** — donut/pie chart (success vs error).
- **Average latency trend** — line chart over the last 14 days.
- **Messages over time** — line chart of message count per day.

Use the existing `recharts` + `components/ui/chart` setup.

## 12. Admin logging

Files: `mastra/index.ts`, `app/admin/(dashboard)/logs/page.tsx`

- Switch `mastra.storage` from `PostgresStore` to `PostgresStoreVNext` with `observability: { connectionString: process.env.DATABASE_URL }`.
- Add `logger: createLogger({ name: 'Mastra', level: 'info' })` (or `PinoLogger` if `@mastra/loggers` is installed).
- Enable observability log forwarding:
  ```ts
  logging: { enabled: true, level: 'info' }
  ```
- The existing `/admin/logs` page uses `observability.listLogs`; once the VNext store is in place and the app is restarted/re-migrated, logs will populate.
- Add a short notice on the logs page explaining log level filtering and retention.

## 13. Admin sidebar sign-out collapse

File: `components/admin/admin-sidebar.tsx`

- Wrap the sign-out button in `SidebarMenu` / `SidebarMenuItem` / `SidebarMenuButton` with a tooltip so it collapses to an icon when the sidebar is collapsed.

## Out of scope
- New top-level folders or design-system changes beyond what is needed above.
- Rewriting the AI Elements components themselves; we only adjust how they are composed.

## Risks / notes
- Switching to `PostgresStoreVNext` may create additional observability tables and require a Mastra migration. Existing `mastra_ai_spans` trace data should remain readable, but verify after deployment.
- Stripping media from previous messages means a text model will not "see" those images, but the original messages remain in memory for future vision-model turns.
