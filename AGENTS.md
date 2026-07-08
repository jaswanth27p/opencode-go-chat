# AGENTS.md

Rules for where new files go in this repo. Follow these when adding anything — don't invent new top-level folders without a reason.

## Folder structure

```
app/                        routes only (App Router) — no business logic, no reusable components
  (auth)/                   route group: public auth pages (login, register)
  (app)/                    route group: authenticated app shell (sidebar layout)

components/
  ui/                       shadcn/ui primitives only. Never hand-edit — regenerate via `pnpm dlx shadcn@latest add <name>`.
  global/                   shared across multiple pages/routes (app-sidebar, nav-user, theme-toggle, theme-provider, providers, command-menu)
  <page>/                   components used by a single page only, named after the route (auth/, dashboard/, settings/, profile/)
                             e.g. a component only used by app/(app)/dashboard/page.tsx goes in components/dashboard/

hooks/                      custom React hooks (TanStack Query hooks, use-mobile, etc). One hook per file, kebab-case, `use-` prefix.

lib/
  actions/                  server actions ("use server"), grouped by domain (auth.ts, ...)
  validations/              zod schemas, grouped by domain (auth.ts, ...)
  prisma.ts                 Prisma client singleton
  session.ts                auth/session helpers
  utils.ts                  generic helpers (cn, etc.) — shadcn-managed, keep small

store/                      zustand stores. One store per file, kebab-case, `use-*-store` naming.

types/                      shared TypeScript types/interfaces used across 2+ files. Colocate types that are only used in one file next to that file instead.

prisma/
  schema.prisma             single source of truth for the DB schema
```

## Rules

1. **New component → decide scope first.** Used by one page only → `components/<page>/`. Used by 2+ pages or part of the app chrome → `components/global/`. Raw shadcn primitive → `components/ui/` (via CLI only).
2. **New page → matching component folder.** Adding `app/(app)/reports/page.tsx` with page-specific pieces → create `components/reports/`.
3. **Server actions live in `lib/actions/`, never inline in a page/component file.** Group by domain, not by page (`auth.ts`, `user.ts`, not `dashboard-actions.ts`).
4. **All external input (forms, server action args) validated with a zod schema from `lib/validations/`** before use. Infer TS types from the schema (`z.infer<...>`) instead of hand-writing duplicate types.
5. **Shared types go in `types/`, one file per domain** (e.g. `types/user.ts`). If a type is only used in the file that defines it (or one importer), keep it colocated — don't preemptively move it to `types/`.
6. **One zustand store per concern**, in `store/`, named `use-<concern>-store.ts`. Don't put unrelated state in one giant store.
7. **One TanStack Query hook per query/mutation**, in `hooks/`, named `use-<thing>.ts` (e.g. `use-profile.ts`). Query keys defined alongside the hook, not scattered inline in components.
8. **Database access only through `lib/prisma.ts`'s singleton**, only from server-side code (server actions, route handlers, server components). Never import `@prisma/client` directly in client components.
9. **Auth/session checks only through `lib/session.ts` helpers** (`getSession`, `requireUser`). Don't parse the session cookie manually elsewhere.
10. **Path alias `@/*` for all cross-folder imports** — no relative `../../..` chains.
11. **No new top-level folders** for things that fit an existing bucket above. If something genuinely doesn't fit, flag it before adding it.
12. **No hardcoded design values in Tailwind classnames — use the configured theme tokens for everything, not just color.**
    - Color: never `bg-black`, `text-zinc-50`, `border-gray-200`, `#fff`, arbitrary `bg-[#...]`. Use `bg-primary`, `text-primary-foreground`, `bg-secondary`, `bg-muted`, `text-muted-foreground`, `bg-background`, `text-foreground`, `border-border`, `bg-destructive`, `bg-sidebar`, `bg-sidebar-primary`, etc.
    - Radius: never `rounded-[6px]` or a raw arbitrary radius. Use `rounded-sm/md/lg/xl` etc, which derive from the configured `--radius` in `app/globals.css`.
    - Shadow, spacing scale, font size/weight, and any other value shadcn/Tailwind already expose as a theme token: use the token/utility class, not an arbitrary `[value]` override.
    - This applies everywhere, not just `components/ui/` — dashboard/settings/profile pages and any new UI must use the same tokens so light/dark theming and visual consistency hold app-wide.
    - If a needed token genuinely doesn't exist yet, add it to the theme in `app/globals.css` (under `:root` / `.dark` / `@theme inline`), don't inline a raw value in a component.
13. **Animations use `motion` (the Framer Motion successor, imported from `"motion/react"`)** — e.g. `<motion.div>`, `AnimatePresence`. Don't hand-roll CSS keyframes/transitions for anything interactive (enter/exit, drag, layout) or reach for another animation library; plain Tailwind transition utilities are still fine for simple hover/focus states.
