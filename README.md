# AI Lab

Live: [ai-lab.jaswanthpakalapati.com](https://ai-lab.jaswanthpakalapati.com)

A proof-of-work project for practical AI engineering — not a toy demo, but
real production patterns for the pieces that make up a modern AI product:
chat infrastructure, multi-persona agents, a model playground, and (next up)
retrieval, agentic workflows, and tool-connected agents.

Full-stack app: Next.js App Router, shadcn/ui (Base UI primitives), Tailwind
v4, next-themes, zustand, TanStack Query, Prisma + Postgres, Zod, custom JWT
email/password auth, Mastra for agents/memory/observability.

See [AGENTS.md](./AGENTS.md) for folder structure and coding rules to follow when adding new files.

## What's here

- **Chat** — a no-character chat with streaming responses, model switching,
  and image/audio/video attachments.
- **Characters** — the same chat, backed by personas with a distinct system
  prompt each (Code Reviewer, Debug Partner, Writing Editor, Socratic Tutor,
  Interview Coach, Brainstorm Partner). Chat and character conversations
  share one combined history in the sidebar.
- **Playground** — a raw completion surface for testing prompts and tuning
  model parameters (temperature, top-p/top-k, penalties, stop sequences).

## Roadmap

- **RAG** — one-shot chat with uploaded documents (PDF, docs, text,
  images), plus **Projects**: upload a set of files, then chat and search
  across them with reranking, query rewriting, and hybrid search all
  implemented, not just referenced.
- **Website & docs chat** — point at a site or docs set and chat with it
  directly.
- **MCP-connected characters** — selected personas get live MCP tool
  connections instead of just a system prompt.
- **Workflow features** — one or two multi-step, workflow-driven features
  built on top of the agent layer.

## Getting started

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy the env file and adjust as needed:

   ```bash
   cp .env.example .env
   ```

3. Start local Postgres:

   ```bash
   docker compose up -d
   ```

4. Push the schema to the database and generate the Prisma client:

   ```bash
   pnpm prisma db push
   ```

5. Start the dev server:

   ```bash
   pnpm dev
   ```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/login`. Register an account to reach the dashboard.

## Stack notes

- **Auth**: custom bcrypt + JWT (jose) in an httpOnly cookie, guarded by `middleware.ts`. Not tied to Next.js — the same JWT can be verified from a separate NestJS/Python backend later via a shared `JWT_SECRET`.
- **UI**: shadcn/ui on Base UI primitives (not Radix). Components use the `render` prop for polymorphism instead of `asChild`.
- **DB**: Prisma 7 with the `@prisma/adapter-pg` driver adapter — see `lib/prisma.ts` and `prisma.config.ts`.
- **Agents**: Mastra (`@mastra/core`, `@mastra/memory`, `@mastra/ai-sdk`) backs both the no-character assistant and every Characters persona. Each persona is its own Mastra `Agent` sharing one Postgres-backed memory store (`mastra/index.ts`), so conversation threads aren't agent-scoped — the sidebar's combined history comes from that for free.
