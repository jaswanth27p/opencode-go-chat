# OpenCode Go Chat

Live: [opencode-go-chat.jaswanthpakalapati.com](https://opencode-go-chat.jaswanthpakalapati.com)

Full-stack app: Next.js App Router, shadcn/ui (Base UI primitives), Tailwind v4, next-themes, zustand, TanStack Query, Prisma + Postgres, Zod, custom JWT email/password auth.

See [AGENTS.md](./AGENTS.md) for folder structure and coding rules to follow when adding new files.

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
