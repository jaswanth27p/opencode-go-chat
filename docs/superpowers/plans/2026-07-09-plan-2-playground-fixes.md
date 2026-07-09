# Plan 2: Playground Fixes

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the playground mobile-responsive, validate inputs, fix the `maxTokens` parameter mapping, and surface errors via toast.

**Architecture:** Add a zod schema in `lib/validations/playground.ts`; client validates before submit; server re-validates and maps `maxOutputTokens` -> `maxTokens` for the AI SDK.

**Tech Stack:** Next.js App Router, React, TypeScript, zod, @ai-sdk/react, Sonner, Tailwind CSS, shadcn/ui.

## Global Constraints
- All external input must be validated with zod in `lib/validations/`.
- Shared types go in `types/`; one-domain-per-file.
- Path alias `@/*` for cross-folder imports.
- No new top-level folders.
- Use theme tokens, never raw colors/radii in Tailwind classes.

---

## File structure

| File | Responsibility |
|------|----------------|
| `lib/validations/playground.ts` | zod schema for playground parameters. |
| `app/(app)/playground/page.tsx` | Responsive UI + client validation + toast errors. |
| `app/api/playground/route.ts` | Server validation + correct model settings. |

---

### Task 1: Playground validation schema

**Files:**
- Create: `lib/validations/playground.ts`
- Test: `pnpm exec tsc --noEmit`

**Interfaces:**
- Consumes: none.
- Produces: `PlaygroundInputSchema`, `PlaygroundInput` type.

- [ ] **Step 1: Write the schema**

Create `lib/validations/playground.ts`:

```ts
import { z } from "zod";

export const playgroundInputSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  model: z.string().min(1),
  systemPrompt: z.string().optional(),
  temperature: z.coerce.number().min(0).max(2).optional(),
  maxTokens: z.coerce.number().int().positive().optional(),
  topP: z.coerce.number().min(0).max(1).optional(),
  topK: z.coerce.number().int().min(0).optional(),
  presencePenalty: z.coerce.number().min(-1).max(1).optional(),
  frequencyPenalty: z.coerce.number().min(-1).max(1).optional(),
  seed: z.coerce.number().int().optional(),
  stopSequences: z.string().optional(),
});

export type PlaygroundInput = z.infer<typeof playgroundInputSchema>;
```

- [ ] **Step 2: Type check**

Run: `pnpm exec tsc --noEmit`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/validations/playground.ts
git commit -m "feat: add playground input validation schema"
```

---

### Task 2: Responsive layout

**Files:**
- Modify: `app/(app)/playground/page.tsx`
- Test: visual resize + `pnpm exec tsc --noEmit`

**Interfaces:**
- Consumes: none.
- Produces: responsive grid.

- [ ] **Step 1: Change the top-level grid**

Find:

```tsx
<div className="grid h-[calc(100vh-6rem)] grid-cols-[320px_1fr] gap-6">
```

Replace with:

```tsx
<div className="grid h-[calc(100vh-6rem)] grid-cols-1 gap-4 lg:grid-cols-[320px_1fr] lg:gap-6">
```

- [ ] **Step 2: Make sidebar scrollable on mobile**

The `<aside>` already has `overflow-y-auto`. Add bottom padding for mobile:

```tsx
<aside className="flex flex-col gap-4 overflow-y-auto lg:pr-4">
```

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/playground/page.tsx
git commit -m "feat: make playground page responsive"
```

---

### Task 3: Client validation + maxTokens fix + error toast

**Files:**
- Modify: `app/(app)/playground/page.tsx`
- Test: `pnpm exec tsc --noEmit`

**Interfaces:**
- Consumes: `playgroundInputSchema` from `lib/validations/playground.ts`.
- Produces: validated form body; toast on error.

- [ ] **Step 1: Add imports and validation**

Add imports:

```tsx
import { toast } from "sonner";
import { playgroundInputSchema } from "@/lib/validations/playground";
```

Change the state variable from `maxOutputTokens` to `maxTokens`:

```tsx
const [maxTokens, setMaxTokens] = React.useState("");
```

Update the input field id/label to `max-tokens` and state setter.

- [ ] **Step 2: Validate on submit**

Replace the form with a local submit handler:

```tsx
const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  const parsed = playgroundInputSchema.safeParse({
    prompt: input,
    model,
    systemPrompt: systemPrompt || undefined,
    temperature: temperature ? Number(temperature) : undefined,
    maxTokens: maxTokens ? Number(maxTokens) : undefined,
    topP: topP ? Number(topP) : undefined,
    topK: topK ? Number(topK) : undefined,
    presencePenalty: presencePenalty ? Number(presencePenalty) : undefined,
    frequencyPenalty: frequencyPenalty ? Number(frequencyPenalty) : undefined,
    seed: seed ? Number(seed) : undefined,
    stopSequences: stopSequences || undefined,
  });

  if (!parsed.success) {
    const first = parsed.error.errors[0];
    toast.error(first?.message || "Invalid input");
    return;
  }

  handleSubmit(e);
};
```

Change the form's `onSubmit` to `handleFormSubmit`.

- [ ] **Step 3: Fix maxTokens in useCompletion body**

Change:

```tsx
maxOutputTokens: maxTokens ? Number(maxTokens) : undefined,
```

to:

```tsx
maxTokens: maxTokens ? Number(maxTokens) : undefined,
```

- [ ] **Step 4: Toast server errors**

Add a `useEffect`:

```tsx
React.useEffect(() => {
  if (error) {
    toast.error(error.message || "Something went running the model. Try again.");
  }
}, [error]);
```

- [ ] **Step 5: Type check**

Run: `pnpm exec tsc --noEmit`

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/\(app\)/playground/page.tsx
git commit -m "feat: validate playground inputs and map maxTokens correctly"
```

---

### Task 4: Server validation + correct model settings

**Files:**
- Modify: `app/api/playground/route.ts`
- Test: `pnpm exec tsc --noEmit`

**Interfaces:**
- Consumes: `playgroundInputSchema`.
- Produces: validated body, `modelSettings` with `maxTokens`.

- [ ] **Step 1: Import and validate body**

Add import:

```ts
import { playgroundInputSchema } from "@/lib/validations/playground";
```

Replace the prompt/model extraction and modelSettings block with:

```ts
const parseResult = playgroundInputSchema.safeParse(body);
if (!parseResult.success) {
  return new Response(parseResult.error.errors[0]?.message ?? "Invalid input", { status: 400 });
}

const {
  prompt,
  model: modelId,
  systemPrompt,
  temperature,
  maxTokens,
  topP,
  topK,
  presencePenalty,
  frequencyPenalty,
  seed,
  stopSequences,
} = parseResult.data;

const requestContext = new RequestContext();
requestContext.set("model", modelId);

const modelSettings: Record<string, unknown> = {};
if (temperature !== undefined) modelSettings.temperature = temperature;
if (maxTokens !== undefined) modelSettings.maxTokens = maxTokens;
if (topP !== undefined) modelSettings.topP = topP;
if (topK !== undefined) modelSettings.topK = topK;
if (presencePenalty !== undefined) modelSettings.presencePenalty = presencePenalty;
if (frequencyPenalty !== undefined) modelSettings.frequencyPenalty = frequencyPenalty;
if (seed !== undefined) modelSettings.seed = seed;
if (stopSequences?.trim()) {
  modelSettings.stopSequences = stopSequences
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
```

- [ ] **Step 2: Update the agent.stream call**

Change `agent.stream(prompt, { ... })` variables to use the destructured values. The call remains the same shape:

```ts
const result = await agent.stream(prompt, {
  instructions: systemPrompt?.trim() ? systemPrompt : undefined,
  requestContext,
  modelSettings,
});
```

- [ ] **Step 3: Type check**

Run: `pnpm exec tsc --noEmit`

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/playground/route.ts
git commit -m "feat: validate playground request and use maxTokens in model settings"
```

---

## Spec coverage check

| Spec section | Task |
|--------------|------|
| Playground responsive layout | Task 2 |
| Input validation | Tasks 1, 3, 4 |
| maxTokens fix | Tasks 3, 4 |
| Error toasts | Task 3 |
