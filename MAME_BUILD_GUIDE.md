# Mame — The Complete Build Guide

> **What this document is.** A single, self-contained manual that lets *anyone* — even someone who has never written a line of code — recreate **Mame**, a Jira-style project-management web app, from absolute zero. It explains every concept, every tool, every file, and every feature. You can also hand this entire document to an AI coding assistant (like Claude Code) in a brand-new chat and it will have enough detail to rebuild the app exactly.
>
> **Read order.** If you're a beginner, read top to bottom. If you're experienced, jump to Part 6 (Database) and Part 11 (Features). If you're an AI assistant, read everything — the build order in Part 14 matters.

---

## Table of Contents

- **Part 0** — What is Mame? (the finished product)
- **Part 1** — Absolute basics (computers, code, the web)
- **Part 2** — The tech stack, explained in plain English
- **Part 3** — Accounts & tools you need to install
- **Part 4** — Creating the project skeleton
- **Part 5** — Configuration files
- **Part 6** — The database (the foundation of everything)
- **Part 7** — Architecture: how data flows
- **Part 8** — The type system
- **Part 9** — Authentication (login / signup / sessions)
- **Part 10** — Layouts & navigation
- **Part 11** — Every feature, in detail
- **Part 12** — The UI component library
- **Part 13** — Running locally & deploying to the internet
- **Part 14** — Build order + how to prompt an AI to rebuild this
- **Appendix A** — Complete file inventory
- **Appendix B** — The full database schema (copy-paste ready)

---

# Part 0 — What is Mame?

Mame is a **project-management tool** modeled on Jira/Linear. Teams use it to track work as "issues" (also called tickets) that move across a board from "to do" to "done."

**Core capabilities:**

1. **Accounts & teams** — sign up, log in, create projects, invite teammates by email.
2. **Projects** — each project is either *Scrum* (with sprints) or *Kanban* (continuous flow).
3. **Issues** — five types arranged in a hierarchy: **Epic → Story → Task/Bug → Subtask**. Each issue has a status, priority, assignees, dates, story points, labels, description, comments, and a full activity log.
4. **The Board** — a drag-and-drop Kanban board. Cards move between columns (Triage, To Do, In Progress, In Review, Blocked, Done, Not Done, Completed). Works on touch devices.
5. **The Backlog** (Scrum only) — plan sprints, drag issues between the backlog and sprints, start/complete sprints.
6. **Issues list** — a filterable, searchable table of every issue.
7. **Multiple assignees** — assign several real teammates *and/or* "virtual members" (placeholder people for solo planning) to one issue.
8. **Labels** — colored tags for categorizing issues.
9. **Time tracking** — due dates + story-point estimates produce automatic status (overdue, nearing deadline, completed late/on-time). Owners can "remove delay."
10. **Ideas** — a lightweight scratchpad to capture ideas before promoting them to issues.
11. **Status / reports** — charts summarizing the project by status, type, assignee, and label.
12. **PDF export** — download a formatted project report.
13. **Rich text** — descriptions and comments support a full WYSIWYG editor.

**What it looks like architecturally:** a single **Next.js** web application talking to a **Supabase** (hosted PostgreSQL) database. It deploys to **Vercel**. That's the whole system — no separate backend server to manage.

---

# Part 1 — Absolute Basics

*Skip this part if you already build software.*

### 1.1 What is a web app?

A **website** you can interact with — click buttons, type, save data. When you open one, two computers talk:

- **The frontend** (or "client") — the part that runs *in your web browser* (Chrome, Safari). It's what you see and click. Built with HTML (structure), CSS (styling), and JavaScript (behavior).
- **The backend** (or "server") — a computer somewhere on the internet that stores data and enforces rules. The frontend asks it "give me the issues" or "save this change."
- **The database** — where the backend permanently stores information (users, projects, issues), like a giant set of spreadsheets that never forget.

Mame blends frontend and backend into one **Next.js** project, and uses **Supabase** as the database (Supabase also handles the backend rules, so we write very little traditional "server code").

### 1.2 The terminal

The **terminal** (or "command line") is a text window where you type commands instead of clicking. On Mac it's an app called **Terminal**. You'll use it to install tools and run the app. Commands look like `npm run dev`. Don't be scared — you copy-paste them.

### 1.3 A code editor

A program for writing code. We use **Visual Studio Code** (VS Code) — free, made by Microsoft. It color-codes your code and catches mistakes.

### 1.4 Node.js and npm

- **Node.js** lets JavaScript run *outside* a browser (needed to build and run Mame). Think of it as the engine.
- **npm** ("Node Package Manager") comes with Node. It downloads pre-written code packages ("dependencies") that others have published, so you don't reinvent everything. Mame uses ~40 packages (React, Next.js, etc.).

### 1.5 Git and GitHub

- **Git** tracks every change to your code over time (like infinite undo + history). You "commit" snapshots.
- **GitHub** is a website that stores your Git history online and connects to Vercel for deployment.

### 1.6 What "deploying" means

Running the app on your own computer = **local development** (only you can see it at `localhost:3000`). **Deploying** = putting it on the public internet so anyone can visit. We deploy to **Vercel**, which is free for small projects and made by the same company as Next.js.

---

# Part 2 — The Tech Stack, Explained

Every tool Mame uses and *why*. (Exact versions are in Part 4.)

| Tool | What it is | Why Mame uses it |
|---|---|---|
| **Next.js 16** | A "framework" built on React. Organizes the whole app — pages, routing, server + client code in one project. | Lets us write frontend and backend together; handles URLs/pages automatically via the file system. |
| **React 19** | A library for building user interfaces out of reusable "components." | The entire UI is React components. |
| **TypeScript** | JavaScript + types. You declare that a variable is a `string` or an `Issue`, and the editor catches mistakes before you run. | Prevents a huge class of bugs; makes the code self-documenting. |
| **Tailwind CSS v4** | A styling system where you add tiny classes like `flex gap-2 text-sm` directly in your HTML. | Fast styling without writing separate CSS files. |
| **Supabase** | A hosted backend: PostgreSQL database + authentication + auto-generated APIs + row-level security. | Our entire backend. We talk to it directly from both server and browser. |
| **PostgreSQL** | The actual database engine inside Supabase. | Stores all data in tables with relationships. |
| **@supabase/ssr** | Supabase's helper for Next.js server-side rendering + cookies/sessions. | Keeps users logged in across server and browser. |
| **@hello-pangea/dnd** | A drag-and-drop library (a maintained fork of react-beautiful-dnd). | Powers the Board and Backlog drag-and-drop, including touch. |
| **Radix UI** | Unstyled, accessible UI primitives (dropdowns, dialogs, selects, tabs, tooltips). | We style them with Tailwind; they handle accessibility and keyboard behavior. |
| **lucide-react** | An icon set as React components. | All icons (board, list, trash, etc.). |
| **TipTap** | A rich-text editor framework (built on ProseMirror). | The WYSIWYG editor for descriptions and comments. |
| **@react-pdf/renderer** | Generates PDF files using React-like components. | The "Export PDF" report. |
| **date-fns** | Date utility functions (formatting, "3 days ago"). | Relative timestamps and date math. |
| **react-hot-toast** | Little pop-up notifications. | Success/error messages ("Issue created"). |
| **zustand** | A tiny state-management library. | Present as a dependency; light global state if needed. |
| **clsx + tailwind-merge** | Combine and de-duplicate CSS class strings. | The `cn()` helper used everywhere. |
| **class-variance-authority** | Define component style "variants." | Button variants (primary/outline/ghost). |

**Mental model:** Next.js is the skeleton. React builds the screens. TypeScript keeps it safe. Tailwind paints it. Supabase remembers everything. Vercel publishes it.

---

# Part 3 — Accounts & Tools You Need

### 3.1 Install on your computer

1. **Node.js** (version 20 or newer). Download the "LTS" installer from [nodejs.org](https://nodejs.org). Verify in Terminal:
   ```bash
   node --version   # should print v20.x or higher
   npm --version
   ```
2. **VS Code** — download from [code.visualstudio.com](https://code.visualstudio.com).
3. **Git** — Mac usually has it. Check with `git --version`. If missing, installing [Xcode Command Line Tools](https://developer.apple.com/) or [git-scm.com](https://git-scm.com) provides it.

### 3.2 Create online accounts (all free)

1. **Supabase** — [supabase.com](https://supabase.com). Sign up, then **create a new project**. Pick a name and a strong database password (save it). Wait ~2 minutes for it to provision.
2. **GitHub** — [github.com](https://github.com). For storing code and connecting to Vercel.
3. **Vercel** — [vercel.com](https://vercel.com). Sign up *with your GitHub account* so they're linked.

### 3.3 Collect your Supabase keys

In your Supabase project dashboard:

- **Settings → API**: copy the **Project URL** and the **anon public** key.
- **Settings → API**: copy the **service_role** key (secret — never expose in the browser).
- **Account → Access Tokens** (top-right avatar → Access Tokens): generate a **personal access token**. This lets Mame apply the database schema automatically (explained in Part 6).
- **Settings → Database**: note your database password.

You'll paste these into a file called `.env.local` in Part 5.

> **Important Supabase setting:** In **Authentication → Providers → Email**, turn **OFF** "Confirm email" (or enable auto-confirm) so new users can log in immediately without clicking an email link. Mame's signup flow signs the user in right after registration.

---

# Part 4 — Creating the Project Skeleton

### 4.1 Generate the Next.js app

In Terminal, navigate to where you keep projects and run:

```bash
npx create-next-app@latest mame
```

When prompted, choose: **TypeScript = Yes**, **ESLint = Yes**, **Tailwind CSS = Yes**, **App Router = Yes**, **src/ directory = No**, **import alias = `@/*`**. Then:

```bash
cd mame
```

### 4.2 Install all dependencies

```bash
npm install @hello-pangea/dnd @radix-ui/react-avatar @radix-ui/react-dialog \
  @radix-ui/react-dropdown-menu @radix-ui/react-label @radix-ui/react-popover \
  @radix-ui/react-scroll-area @radix-ui/react-select @radix-ui/react-separator \
  @radix-ui/react-slot @radix-ui/react-tabs @radix-ui/react-tooltip \
  @react-pdf/renderer @supabase/ssr @supabase/supabase-js \
  @tiptap/extension-color @tiptap/extension-highlight @tiptap/extension-image \
  @tiptap/extension-link @tiptap/extension-placeholder @tiptap/extension-text-align \
  @tiptap/extension-text-style @tiptap/extension-underline @tiptap/react \
  @tiptap/starter-kit class-variance-authority clsx date-fns lucide-react \
  pg @types/pg react-hot-toast tailwind-merge zustand
```

This matches Mame's `package.json` dependencies. Key versions used in the original: **Next.js 16.2.7**, **React 19.2.4**, **Tailwind 4**, **TypeScript 5**.

### 4.3 The folder structure you'll build

```
mame/
├── app/                      # All pages & routes (Next.js App Router)
│   ├── layout.tsx            # Root HTML shell (fonts, toaster, top-loader)
│   ├── page.tsx              # "/" → redirects to /login or /projects
│   ├── globals.css           # Tailwind import + editor/prose styles
│   ├── icon.tsx              # Favicon (the "M" logo, generated)
│   ├── not-found.tsx         # 404 → redirect home
│   ├── login/page.tsx        # Login screen
│   ├── register/page.tsx     # Signup screen
│   ├── api/
│   │   ├── setup/route.ts            # Ensures a profile row exists post-login
│   │   └── projects/[id]/members/route.ts  # Add/remove members (service role)
│   └── (app)/                # Route group = authenticated area (parentheses = no URL segment)
│       ├── layout.tsx        # Guards: redirect to /login if not signed in
│       ├── page.tsx          # Projects home (also at /)
│       ├── account/page.tsx  # Account settings
│       └── projects/
│           ├── page.tsx      # Projects list (wrapped in LayoutShell)
│           └── [key]/        # Dynamic: one project, keyed by its short code (e.g. "KA")
│               ├── layout.tsx          # Sidebar shell + runSchema()
│               ├── board/page.tsx      # Kanban board
│               ├── backlog/page.tsx    # Sprint backlog (scrum)
│               ├── issues/page.tsx     # Issues table
│               ├── status/page.tsx     # Charts/reports
│               ├── ideas/page.tsx      # Ideas scratchpad
│               ├── settings/page.tsx   # Project settings
│               └── */loading.tsx       # Skeleton loaders per route
├── components/               # All React components (the UI)
│   ├── layout/               # sidebar.tsx, layout-shell.tsx
│   ├── projects/             # projects-home.tsx, project-settings.tsx
│   ├── board/                # board-view.tsx, issue-card.tsx
│   ├── backlog/              # backlog-view.tsx
│   ├── issues/               # issue-detail-panel.tsx, create-issue-dialog.tsx,
│   │                         # issues-list-view.tsx, rich-text-editor.tsx
│   ├── ideas/                # ideas-view.tsx
│   ├── status/               # status-view.tsx
│   ├── export/               # project-pdf.tsx, export-pdf-button.tsx
│   ├── account/              # account-settings.tsx
│   └── ui/                   # Reusable primitives (button, input, dialog, select…)
├── lib/                      # Non-UI logic
│   ├── supabase/             # client.ts, server.ts, middleware.ts
│   ├── data.ts               # Cached server-side data fetchers
│   ├── db.ts                 # Auto-applies schema.sql to Supabase
│   ├── time-status.ts        # Due-date / story-point status logic
│   └── utils.ts              # cn(), getInitials(), statusBadgeClass()
├── types/
│   ├── index.ts              # App-level TypeScript types (Issue, Project…)
│   └── database.ts           # Supabase table types for type-safe queries
├── supabase/
│   ├── schema.sql            # The ENTIRE database definition (source of truth)
│   └── migrations/           # Historical SQL (optional reference)
├── instrumentation.ts        # Runs runSchema() once on server startup
├── proxy.ts                  # Middleware: auth redirects on every request
├── next.config.ts            # Next.js config
├── tsconfig.json             # TypeScript config
├── vercel.json               # Vercel deploy config
└── .env.local                # SECRET keys (never committed)
```

> **Why the `(app)` parentheses?** In Next.js App Router, a folder in parentheses is a "route group" — it organizes files without adding to the URL. So `app/(app)/projects/page.tsx` serves the URL `/projects`, not `/app/projects`. It exists so all authenticated pages can share guard logic.
>
> **Why `[key]` brackets?** Brackets mean a *dynamic* segment. `projects/[key]/board` matches `/projects/KA/board`, `/projects/XYZ/board`, etc., and hands your code the value (`KA`) as `params.key`.

---

# Part 5 — Configuration Files

### 5.1 `.env.local` (your secret keys)

Create this file in the project root. **Never commit it** (it's in `.gitignore`). Fill in the values you collected in Part 3.3:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOURPROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-secret-key
SUPABASE_DB_PASSWORD=your-database-password
SUPABASE_ACCESS_TOKEN=your-personal-access-token
```

- `NEXT_PUBLIC_*` variables are safe to expose to the browser (the anon key is *meant* to be public — security comes from row-level rules in the database).
- The others are server-only secrets. `SUPABASE_ACCESS_TOKEN` is used to auto-apply the schema; `SUPABASE_SERVICE_ROLE_KEY` is used by the members API to bypass row-level security for trusted operations.

### 5.2 `next.config.ts`

```typescript
import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },
};
export default nextConfig;
```
`ignoreBuildErrors` lets the production build succeed even if the auto-generated Supabase types produce strict `never` complaints (a known friction with the typed client). Runtime behavior is unaffected.

### 5.3 `tsconfig.json`

Standard Next.js TypeScript config. The critical line is the path alias so `@/` means the project root:
```json
{ "compilerOptions": { "paths": { "@/*": ["./*"] }, "strict": true, "jsx": "react-jsx", "moduleResolution": "bundler" } }
```

### 5.4 `proxy.ts` (middleware — runs on EVERY request)

> **Note:** This file is named `proxy.ts` in Mame and exports a `proxy` function. (In most Next.js projects this is `middleware.ts` exporting `middleware`. Either works depending on your Next version; the logic is identical.)

```typescript
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```
This intercepts every page request, refreshes the Supabase session cookie, and redirects logged-out users to `/login` (and logged-in users away from auth pages). The `matcher` skips static assets for speed.

### 5.5 `instrumentation.ts` (runs once when the server boots)

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runSchema } = await import("./lib/db");
    await runSchema();
  }
}
```
On server startup, this applies `schema.sql` to your Supabase database (see Part 6.4). It only runs in the Node runtime (not Edge).

### 5.6 `vercel.json`

```json
{ "framework": "nextjs", "buildCommand": "npm run build", "devCommand": "npm run dev", "installCommand": "npm install" }
```

### 5.7 `postcss.config.mjs` (Tailwind v4)

```javascript
const config = { plugins: { "@tailwindcss/postcss": {} } };
export default config;
```

### 5.8 `app/globals.css`

Starts with `@import "tailwindcss";` then defines styles for the TipTap editor (`.ProseMirror …`) and read-only rich content (`.prose …`) — headings, lists, code blocks, blockquotes, links, text-align, images. (Full contents in the repo; reproduce the editor/prose rules so rich text renders correctly.)

---

# Part 6 — The Database (the foundation)

**Everything** in Mame rests on the database. Build this first and correctly. The complete, copy-paste-ready SQL is in **Appendix B** — that single file (`supabase/schema.sql`) defines every table, security rule, function, and index, and is written to be **idempotent** (safe to run many times).

### 6.1 The tables (what data we store)

| Table | Purpose | Key columns |
|---|---|---|
| `profiles` | One row per user (mirrors Supabase auth). | `id` (= auth user id), `email`, `full_name`, `avatar_url` |
| `projects` | A project. | `id`, `name`, `key` (short code, unique), `type` (`scrum`/`kanban`), `owner_id` |
| `project_members` | Who belongs to a project (besides owner). | `project_id`, `user_id`, `role` |
| `sprints` | Time-boxed work periods (scrum). | `project_id`, `name`, `goal`, `status` (`planned`/`active`/`completed`), `start_date`, `end_date` |
| `labels` | Colored tags. | `project_id`, `name`, `color` |
| `issues` | The core entity — tickets. | see below |
| `virtual_members` | Placeholder "people" for solo planning. | `project_id`, `name`, `color`, `created_by` |
| `issue_labels` | Many-to-many: which labels an issue has. | `issue_id`, `label_id` |
| `issue_assignees` | Many-to-many: multiple real/virtual assignees per issue. | `issue_id`, `user_id` *or* `virtual_member_id` |
| `comments` | Comments on issues. | `issue_id`, `author_id`, `body` |
| `activity` | Audit log of every change. | `issue_id`, `actor_id`, `action`, `field`, `old_value`, `new_value` |
| `issue_counters` | Per-project counter for generating keys (KA-1, KA-2…). | `project_id`, `count` |
| `ideas` | Lightweight idea capture. | `project_id`, `title`, `description`, `created_by`, `converted` |

**The `issues` table columns in full:** `id`, `key` (e.g. "KA-12"), `title`, `description`, `type` (epic/story/task/bug/subtask), `status` (triage/todo/in_progress/in_review/blocked/done/not_done/completed), `priority` (highest/high/medium/low/lowest), `project_id`, `sprint_id`, `assignee_id` (legacy single assignee), `virtual_assignee_id` (legacy single virtual), `reporter_id`, `parent_id` (self-reference for hierarchy), `story_points` (integer = estimated days), `start_date`, `due_date`, `completed_at`, `sort_order` (bigint for ordering on the board), `created_at`, `updated_at`.

> **Why both `assignee_id` AND `issue_assignees`?** The app started with one assignee per issue (`assignee_id` / `virtual_assignee_id`). The multi-assignee feature added the `issue_assignees` junction table. Both exist: the junction table is the source of truth for *display and filtering*, while the legacy columns are kept in sync (first assignee) for backward compatibility and simpler queries. The schema **backfills** existing single-assignee data into the junction table automatically.

### 6.2 The issue hierarchy

Issues form a tree via `parent_id`:
```
Epic
 └─ Story
     └─ Task / Bug
         └─ Subtask
```
Valid parent rules (enforced in the UI, not the DB): a Story's parent is an Epic; a Task/Bug's parent is a Story or Epic; a Subtask's parent is a Task. The detail panel and create dialog only offer valid parents.

### 6.3 Row-Level Security (RLS) — the security model

Supabase exposes your database directly to the browser, so **security lives in the database** via RLS policies. Every table has `ENABLE ROW LEVEL SECURITY` and policies that say, e.g., "you can only see issues in projects you own or are a member of."

Two helper functions make this clean and avoid infinite recursion (a policy querying a table that itself has a policy):
```sql
create function is_project_member(p_project_id uuid) returns boolean
  language sql security definer set search_path = public as $$
  select exists (select 1 from project_members where project_id = p_project_id and user_id = auth.uid());
$$;

create function is_project_owner(p_project_id uuid) returns boolean
  language sql security definer set search_path = public as $$
  select exists (select 1 from projects where id = p_project_id and owner_id = auth.uid());
$$;
```
`security definer` means these run with elevated privileges and **bypass RLS** when they query — breaking the recursion. Every policy then reads like:
```sql
create policy "issues_all" on issues for all
  using (is_project_owner(project_id) or is_project_member(project_id));
```

### 6.4 Auto-applying the schema (no manual SQL ever)

A deliberate design goal: **the user should never open the Supabase SQL editor.** Mame applies `schema.sql` itself.

**`lib/db.ts`** reads `supabase/schema.sql`, hashes it, and POSTs it to Supabase's Management API (`/v1/projects/{ref}/database/query`) using `SUPABASE_ACCESS_TOKEN`. It remembers the hash in memory so it only does real work once per server process:

```typescript
import fs from "fs"; import path from "path"; import crypto from "crypto";
const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace("https://","").replace(".supabase.co","");
let appliedHash: string | null = null;

export async function runSchema() {
  if (!process.env.SUPABASE_ACCESS_TOKEN) return;
  const sql = fs.readFileSync(path.join(process.cwd(),"supabase","schema.sql"),"utf8");
  const hash = crypto.createHash("sha256").update(sql).digest("hex").slice(0,12);
  if (appliedHash === hash) return;             // already applied this process → instant no-op
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method:"POST",
    headers:{ Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`, "Content-Type":"application/json" },
    body: JSON.stringify({ query: sql }),
  });
  if (res.ok) appliedHash = hash;
}
```

It's triggered from **two** places so the tables always exist before any query:
1. `instrumentation.ts` — once when the server boots.
2. `app/(app)/projects/[key]/layout.tsx` — `await runSchema()` on the first project-page request after a cold start (Vercel serverless cold-starts spawn fresh processes).

Because every statement in `schema.sql` uses `IF NOT EXISTS` / `ON CONFLICT DO NOTHING` / drop-then-recreate for policies, running it repeatedly is harmless. This is how new tables (like `issue_assignees`) roll out on deploy **without anyone touching Supabase**.

---

# Part 7 — Architecture: How Data Flows

### 7.1 Server Components vs Client Components

Next.js App Router renders two kinds of components:

- **Server Components** (default) — run on the server, can talk directly to the database, can't use interactivity (no `onClick`, no `useState`). Mame's `page.tsx` files are server components: they fetch data and pass it down.
- **Client Components** — marked `"use client"` at the top. Run in the browser, handle clicks, state, and real-time updates. Mame's `*-view.tsx` and dialogs are client components.

**The pattern throughout Mame:** a server `page.tsx` fetches initial data from Supabase, then renders a client `*-view.tsx` and passes the data as `initial…` props. The client component takes over for all interactivity, making its own Supabase calls (from the browser) for updates.

```
page.tsx (server)  ──fetch──►  Supabase
   │ passes initialIssues, members, etc.
   ▼
board-view.tsx (client) ──updates──► Supabase (from browser)
```

### 7.2 The three Supabase clients

| File | Used in | How it auths |
|---|---|---|
| `lib/supabase/server.ts` | Server components & route handlers | Reads cookies via `next/headers` |
| `lib/supabase/client.ts` | Client components (browser) | Uses the public anon key |
| `lib/supabase/middleware.ts` | `proxy.ts` middleware | Refreshes session cookies on each request, handles redirects |

All three are thin wrappers around `@supabase/ssr`. The server and browser clients are typed with `Database` (from `types/database.ts`) for autocomplete and safety.

### 7.3 Cached fetchers — `lib/data.ts`

Server components often need the same data (e.g., the current project) in both the layout and the page. `lib/data.ts` wraps fetchers in React's `cache()` so identical calls within one request hit Supabase **only once**:

```typescript
export const getProject = cache(async (key: string) => { /* select * from projects where key = ... */ });
export const getUser = cache(async () => { /* supabase.auth.getUser() */ });
export const getProjectMembers = cache(async (projectId, ownerId) => { /* members + owner merged */ });
// also: getProfile, getUserProjects, getVirtualMembers, getProjectSprints, getActiveSprint
```
Note `getProjectMembers` cleverly **prepends the owner** as a synthetic member (role admin) so the owner always appears in member lists even though they're not in `project_members`.

### 7.4 Generating issue keys

Issue keys like "KA-12" come from a Postgres function `get_next_issue_key(project_id)` that atomically increments `issue_counters`. The create dialog calls it via RPC: `supabase.rpc("get_next_issue_key", { p_project_id })`, then forms `${projectKey}-${count}`.

---

# Part 8 — The Type System

`types/index.ts` defines the app's vocabulary. These TypeScript interfaces mirror the database but add optional "joined" fields (e.g., an `Issue` can carry its `assignee` Profile, its `labels`, its `assignees`).

**The string-literal union types** (the heart of the domain):
```typescript
export type IssueType = "epic" | "story" | "task" | "bug" | "subtask";
export type IssueStatus = "triage" | "todo" | "in_progress" | "in_review" | "blocked" | "done" | "not_done" | "completed";
export type IssuePriority = "highest" | "high" | "medium" | "low" | "lowest";
export type ProjectType = "scrum" | "kanban";
export type SprintStatus = "planned" | "active" | "completed";
```

**Key interfaces** (abbreviated — see Appendix A for full): `Profile`, `Project`, `ProjectMember`, `Sprint`, `Label`, `Issue`, `IssueAssignee`, `VirtualMember`, `Comment`, `Activity`, `Idea`, `BoardColumn`.

**The `Issue` interface** carries both DB columns and optional joins:
```typescript
export interface Issue {
  id; key; title; description; type; status; priority;
  project_id; sprint_id; assignee_id; reporter_id; parent_id;
  story_points; start_date; due_date; completed_at; sort_order; created_at; updated_at;
  // optional joined/derived:
  assignee?: Profile | null; reporter?: Profile | null;
  virtual_assignee_id?: string | null; virtual_assignee?: VirtualMember | null;
  labels?: Label[]; subtasks?: Issue[]; parent?: Issue | null;
  assignees?: IssueAssignee[];           // multi-assignee source of truth
}
export interface IssueAssignee {
  id; issue_id; user_id: string | null; virtual_member_id: string | null;
  profile?: Profile | null; virtual_member?: VirtualMember | null;
}
```

**Label maps** turn enum values into display strings:
```typescript
export const STATUS_LABELS: Record<IssueStatus,string> = { triage:"Triage", todo:"To Do", in_progress:"In Progress", in_review:"In Review", blocked:"Blocked", done:"Done", not_done:"Not Done", completed:"Completed" };
export const PRIORITY_LABELS = { highest:"Highest", high:"High", medium:"Medium", low:"Low", lowest:"Lowest" };
export const TYPE_LABELS = { epic:"Epic", story:"Story", task:"Task", bug:"Bug", subtask:"Subtask" };
```

`types/database.ts` is a separate, more literal description of each table's `Row`/`Insert`/`Update` shapes, used to type the Supabase client.

---

# Part 9 — Authentication

### 9.1 Signup — `app/register/page.tsx`

Client component. Collects name/email/password. On submit:
1. `supabase.auth.signUp({ email, password, options: { data: { full_name } } })`.
2. Immediately `signInWithPassword` (because email confirmation is off).
3. `POST /api/setup` to guarantee a `profiles` row exists.
4. Redirect to `/projects`.

### 9.2 Login — `app/login/page.tsx`

`supabase.auth.signInWithPassword`, then `POST /api/setup`, then redirect.

### 9.3 The profile-sync route — `app/api/setup/route.ts`

A safety net. The database has a trigger (`handle_new_user`) that auto-creates a `profiles` row on signup, but for accounts created before the trigger existed, this route inserts the missing profile row on next login.

### 9.4 Session management — `lib/supabase/middleware.ts` + `proxy.ts`

On every request, `updateSession`:
- Refreshes the auth cookie.
- If **no user** and not on `/login` or `/register` → redirect to `/login`.
- If **logged in** and on an auth page → redirect to `/`.

This is what makes the whole `(app)` area private without per-page checks (though pages also double-check `getUser()` for safety).

### 9.5 The trigger that creates profiles

In `schema.sql`, a `security definer` function fires after every new `auth.users` insert:
```sql
create function handle_new_user() returns trigger ... as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do update set email = excluded.email;
  return new;
exception when others then return new;  -- never block auth
end; $$;
```

---

# Part 10 — Layouts & Navigation

### 10.1 Root layout — `app/layout.tsx`

Wraps every page. Loads the **Inter** font, applies base background, mounts the global **`<Toaster>`** (toasts) and **`<TopLoaderWrapper>`** (a thin progress bar on navigation). Sets the page `<title>` "Mame — Project Management."

### 10.2 Auth guard — `app/(app)/layout.tsx`

Server component: `getUser()`, redirect to `/login` if absent. All authenticated pages nest under this.

### 10.3 Project shell — `app/(app)/projects/[key]/layout.tsx`

For any page inside a specific project. It (a) calls `await runSchema()` (Part 6.4), (b) loads the user profile, the current project, and all the user's projects in parallel, and (c) renders **`<LayoutShell>`** with the sidebar around the page content.

### 10.4 `LayoutShell` — `components/layout/layout-shell.tsx`

Client component handling **responsive navigation**:
- **Desktop (lg+):** sidebar always visible on the left (`hidden lg:flex`).
- **Mobile:** a top bar with a hamburger button; tapping it slides in the sidebar as an overlay drawer with a dark backdrop. State: `mobileOpen`.
- Layout uses `flex flex-col h-screen` so the mobile bar takes its own row and content fills the rest.

### 10.5 `Sidebar` — `components/layout/sidebar.tsx`

The dark navigation rail (`#1d2125`). Shows: the Mame logo; the **current project** with its nav links (Board, Backlog [scrum only], Issues, Status, Ideas, Settings); a list of **all projects**; and a footer with "All projects," "Sign out," and an avatar linking to Account settings. Active link is highlighted by comparing `usePathname()`. Accepts an optional `onClose` (shown as an X) when rendered in the mobile drawer. Can collapse to a narrow icon rail (`collapsed` state).

---

# Part 11 — Every Feature, In Detail

Each feature below lists: **where it lives**, **what it does**, **how it's built** (state, key functions, data flow). Reproduce the behaviors; exact JSX can vary.

## 11.1 Projects Home — `components/projects/projects-home.tsx`

**Where:** `/` and `/projects`. **Does:** lists the user's projects as cards; "Create project" dialog.

**Build:** Client component receiving `projects` + `userId`. A modal collects **name**, **key** (auto-suggested from the name's initials, uppercased), and **type** (scrum/kanban). On create: insert into `projects` with `owner_id = userId`, then redirect to the new project's board. Validates the key is unique-ish and uppercase. Each card shows the project key badge, name, type, and links to its board.

## 11.2 The Board — `components/board/board-view.tsx` (+ `issue-card.tsx`)

**Where:** `/projects/[key]/board`. The flagship feature.

**Server side (`board/page.tsx`):** fetches issues for the project (filtered to the active sprint if scrum), then in parallel fetches parents, `issue_labels`, all project labels, and `issue_assignees`; merges them so each issue carries `parent`, `labels`, and `assignees`. Passes everything to `BoardView`.

**Columns:** statuses are grouped into visual columns. The grouping (`COLUMN_GROUPS`) stacks related statuses; the canonical set: Triage, To Do, In Progress, In Review, Blocked, Done, Not Done, Completed — each a droppable column.

**Drag & drop:** uses `@hello-pangea/dnd` (`DragDropContext`, `Droppable`, `Draggable`). On drop (`onDragEnd`), update the issue's `status` and `sort_order` in Supabase and optimistically in local state. When an issue first enters a done status, stamp `completed_at = now()`; when it leaves done, clear it (see 11.9).

**Touch & auto-scroll (mobile):** a manual scroll loop. A `handleMove(clientX)` listens to both `mousemove` and `touchmove` (the latter with `{ passive: true }`). When the dragged card nears a screen edge, a `requestAnimationFrame` loop scrolls the board horizontally. On mobile, columns are narrower (`w-60` vs `w-72`) and the track has trailing padding (`pr-[40vw]`) so the *last* columns are reachable as drop targets. Thresholds/speeds are higher on mobile.

**Filters (toolbar):**
- **Search** by title/key.
- **Person filter** — a dropdown built from `userMap` (real members keyed by uuid, virtual members keyed by `v:uuid`, plus "unassigned"). Filtering uses a shared helper `issueMatchesAssignee(issue, key)` that checks the **full `assignees` array** (falling back to legacy fields) — so an issue with multiple assignees matches *any* of them. The per-person counts use the same helper.
- **Label filter** — multi-select; an issue must contain *all* selected labels.
- **Overdue toggle** — a button showing the overdue count; when on, only issues with `getTimeStatus(i) === "overdue"` show.

**`issue-card.tsx`:** renders one card — type icon, priority icon, key, a time/points badge (from `getTimeInfo`/`getTimeStatus`), **multiple assignee avatars** (via `<AssigneeAvatars>`), label pills, optional date range, and a colored parent badge bar. The whole card is clickable to open the detail panel; background tint reflects time status (`TIME_STATUS_BG`).

## 11.3 The Backlog — `components/backlog/backlog-view.tsx`

**Where:** `/projects/[key]/backlog` (scrum only). **Does:** plan sprints and groom the backlog.

**Build:** sections for each non-completed sprint plus the "Backlog." Issues are draggable between sprints and the backlog (`@hello-pangea/dnd`); dropping sets the issue's `sprint_id`. Sprint headers let you **create**, **start** (set status active + dates), and **complete** sprints. Same filter set as the board (search, type multi-select, person filter via the shared `issueMatchesAssignee`, labels). Each row (`IssueRow`) shows key, type/priority icons, title, labels, a time badge, and assignee avatars — all responsive (columns hide progressively on small screens). Clicking a row opens the detail panel.

## 11.4 Issues List — `components/issues/issues-list-view.tsx`

**Where:** `/projects/[key]/issues`. **Does:** a sortable/filterable table of all issues.

**Build:** a table with columns Key, Summary, Type, Status, Priority (hidden < sm), Assignee (hidden < md), Updated (hidden < lg). Filters: search, type, priority, status, and assignee — the assignee dropdown lists real members **and** virtual members (`v:uuid`), and filtering uses the shared `issueMatchesAssignee` helper so multi-assignee issues match correctly. The Assignee cell renders `<AssigneeAvatars>` (stacked) or "Unassigned." Clicking a row opens the detail panel and pushes `?issue=KEY` to the URL.

## 11.5 Issue Detail Panel — `components/issues/issue-detail-panel.tsx`

**Where:** a slide-over panel opened from any view. The largest component (~1300 lines). The single editing surface for an issue.

**Layout:** a right-side panel with a main column (title, description, child issues, comments/activity tabs) and a sidebar of fields (status, sprint, priority, type, assignees, reporter, story points, start/due dates, labels, parent).

**Key behaviors:**
- **Fresh fetch on navigation.** When you open or navigate to a different issue (e.g., click a child or the parent breadcrumb), a `useEffect` keyed on `initialIssue.id` seeds state immediately, then `fetchFullIssue()` re-queries *all* columns so every sidebar field is accurate (navigation may pass a partial object). `fetchParentFresh()` likewise fetches the parent's full row so breadcrumb clicks carry complete data.
- **Inline editing.** Title is click-to-edit. Description uses the TipTap `RichTextEditor`, saved on blur. Every field change calls `updateField(field, value)` which writes to Supabase, **logs to `activity`**, and updates local + parent state via `onUpdated`.
- **Uncontrolled date/number inputs use `key={`dd-${issue.id}`}`** so React fully remounts them when you switch issues — otherwise they'd show the previous issue's value.
- **Status → completed_at logic** (mirrors the board): entering done/completed for the first time stamps `completed_at = now()`; leaving done clears it; done↔completed doesn't change it.
- **Child issues.** Lists children with progress (e.g., "2/5 done"), a progress bar, "Create new" (opens the create dialog with `parentId` preset), and "Link existing" (a searchable modal). Each child row is clickable to navigate.
- **Parent linking.** A "Set parent" button opens a searchable modal limited to valid parent types; re-parenting warns if the target already has a parent.
- **Labels.** A popover lists all project labels with checkmarks; toggling inserts/deletes `issue_labels` rows.
- **Multiple assignees.** Current assignees show as removable chips. An "Add assignees" popover lists team members and virtual members with checkmarks. Adding inserts an `issue_assignees` row (and syncs the legacy `assignee_id` if empty); removing deletes the row. State: `assignees` array, refreshed by `fetchAssignees()`.
- **Time tracking card.** Shows the computed status headline ("⚠ Overdue," "✓ Completed on time," etc.) from `getTimeStatus`/`getTimeInfo`. If the issue is `late_done` and the viewer is the **project owner**, a **"Remove delay"** button sets `completed_at = due_date` so it reads as on-time (for the "forgot to move the ticket" case).
- **Comments & Activity tabs.** Comments: add (Cmd+Enter), list with author/avatar/time, delete your own. Activity: paginated audit log (25/page, "Load more"), each entry rendered as "X updated *field* from *old* to *new* · 3h ago" with HTML stripped from values.
- **Duplicate & Delete** in the header. Duplicate clones the issue with an incremented title and a new key.

## 11.6 Create Issue Dialog — `components/issues/create-issue-dialog.tsx`

**Where:** opened from board/backlog/issues "Create issue" buttons and from the detail panel ("Create new" child).

**Fields:** title, type, priority, status, story points, **searchable parent picker**, start/due dates, and **multi-select assignees**.

**Searchable parent picker:** a custom combobox (not a plain `<select>`). It computes valid parent types from the chosen issue type (`getParentTypes()`), then live-queries Supabase with `ilike` on title/key as you type (debounced via `useEffect` on `parentSearch`), capped at 40 results. Each option shows a colored type badge (E/S/T), key, and title. Switching the issue type resets the selected parent. "None (standalone)" is always available.

**Multi-select assignees:** a scrollable list of team + virtual members; click to toggle (selected ones become chips above the list with an X). On submit, the first real/virtual selection is written to the legacy `assignee_id`/`virtual_assignee_id` columns, and **all** selections are inserted into `issue_assignees`.

**Submit flow:** RPC `get_next_issue_key` → form `KEY-N` → insert issue → insert assignee rows → toast → `onCreated(issue)` → reset form.

## 11.7 Multiple Assignees — cross-cutting

The shared piece is **`components/ui/assignee-avatars.tsx`**: given an issue, it renders up to 3 stacked, overlapping avatars (real members show initials/photo; virtual members show a colored initial circle) and a "+N" overflow chip. It prefers the new `assignees` array and falls back to legacy single fields. Used by the board card, backlog row, and issues table.

The shared **`issueMatchesAssignee(issue, key)`** logic (duplicated in board-view, backlog-view, issues-list-view) powers correct filtering across all assignees. Keys: plain uuid = real user, `v:uuid` = virtual member, `unassigned` = none.

## 11.8 Labels — cross-cutting

Defined per project (Settings). Stored in `labels`; linked via `issue_labels`. Rendered as colored pills on cards/rows and editable via the detail panel's label popover and the create dialog. The Status page and PDF report aggregate counts by label.

## 11.9 Time Status — `lib/time-status.ts`

Pure logic, no UI. Two functions:
- **`getTimeStatus(issue): "overdue" | "warning" | "normal" | "late_done" | "on_time_done"`** — if done: compare `completed_at` vs `due_date` → `late_done`/`on_time_done`. If not done: past `due_date` → `overdue`; if `story_points` exceed days-left → `warning`; else `normal`.
- **`getTimeInfo(issue)`** — returns `{ pts, daysOverdue, daysLeft, daysLate? }` for badges.
- **`TIME_STATUS_BG`** — maps each status to a Tailwind background for card tinting.

All date math is done at day granularity (`setHours(0,0,0,0)`).

## 11.10 Virtual Members — cross-cutting

Placeholder "people" (name + color) for planning when you don't have real teammates yet. Created in Settings, stored in `virtual_members`. They can be assigned to issues (legacy `virtual_assignee_id` and via `issue_assignees.virtual_member_id`) and appear in every assignee picker and filter, color-coded.

## 11.11 Ideas — `components/ideas/ideas-view.tsx`

**Where:** `/projects/[key]/ideas`. **Does:** capture rough ideas, read them full-screen, convert to issues.

**Build:** a grid of idea cards. Create with title + rich description. Clicking a card opens a **full-screen reader**. The **creator** sees Edit (inline title + `RichEditor`) and Delete; **non-creators** see a read-only view with a lock badge. "Convert to issue" promotes an idea into the issue creation flow and marks it `converted`. Server page joins `creator:profiles!created_by(*)`.

## 11.12 Status / Reports — `components/status/status-view.tsx`

**Where:** `/projects/[key]/status`. **Does:** dashboard charts.

**Build:** server page fetches a lean issue projection + labels and merges label data. The client renders summary cards and bar charts: issues **by status**, **by type**, **by assignee**, and **by label** (color-coded). Counts computed with `useMemo`. No charting library — bars are styled `div`s sized by percentage.

## 11.13 PDF Export — `components/export/project-pdf.tsx` + `export-pdf-button.tsx`

**Where:** a button (e.g., on Status). **Does:** generate a downloadable PDF report.

**Build:** `@react-pdf/renderer` components (`Document`, `Page`, `View`, `Text`) define a styled report — cover/overview with horizontal bar charts (status/type/label distributions) and issue rows grouped by status. Because react-pdf doesn't support CSS gradients, a `solidColor()` helper extracts the first hex from any gradient label color. The button lazy-renders the PDF and triggers a download.

## 11.14 Rich Text — `components/issues/rich-text-editor.tsx` & `components/ui/rich-editor.tsx`

TipTap-based WYSIWYG. Extensions: StarterKit (bold/italic/lists/headings/code/quote), Underline, Link, Image, TextAlign, Color, Highlight, TextStyle, Placeholder. A toolbar exposes formatting. Content is stored as HTML in `description`/`body`. Display-only contexts render the HTML with the `.prose` CSS from `globals.css`. `rich-text-editor.tsx` is the issue editor (save-on-blur); `ui/rich-editor.tsx` is a reusable variant (used by Ideas).

## 11.15 Project Settings — `components/projects/project-settings.tsx`

**Where:** `/projects/[key]/settings`. **Does (owner-centric):**
- **General** — edit project name/description.
- **Members** — add by email (calls `POST /api/projects/[id]/members`, which uses the **service-role** client to look up the user and insert, bypassing RLS), list members, remove them.
- **Sprints** — create/edit/delete sprints (scrum).
- **Labels** — create/edit/delete colored labels.
- **Virtual members** — create/edit/delete placeholder people.
- **Danger zone** — delete the project.

## 11.16 Account Settings — `components/account/account-settings.tsx`

**Where:** `/account`. **Does:** edit display name; change password (re-authenticates with the current password via `signInWithPassword`, then `updateUser({ password })`); shows a live password-strength meter.

## 11.17 The Members API — `app/api/projects/[id]/members/route.ts`

A route handler (server). **POST** adds a member: verifies the caller is the project owner, finds the target `profiles` row by email using the **service-role** client (bypasses RLS so it can read other users), guards against duplicates/self, and inserts into `project_members`. **DELETE** removes a member (owner only). This is the one place Mame uses the service role — because adding a member requires reading a user the caller can't otherwise see under RLS.

---

# Part 12 — The UI Component Library (`components/ui/`)

Small, reusable, Tailwind-styled primitives — most wrap a Radix component. Build these early; everything depends on them.

| File | What it is |
|---|---|
| `button.tsx` | Button with variants (default/outline/ghost/destructive) + sizes, via `class-variance-authority`. |
| `input.tsx` / `textarea.tsx` | Styled form inputs. |
| `select.tsx` | Dropdown select (Radix). Exports `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`, `SelectGroup`, `SelectLabel`, `SelectValue`, `SelectSeparator`. |
| `dialog.tsx` | Modal dialog (Radix). `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`. |
| `dropdown-menu.tsx` | Context menus (Radix). |
| `avatar.tsx` | Avatar with image + initials fallback (Radix). |
| `tabs.tsx` | Tabbed interface (Radix). |
| `tooltip.tsx` | Hover tooltips (Radix). |
| `scroll-area.tsx` | Styled scroll container (Radix). |
| `badge.tsx` | Small status/label pill. |
| `skeleton.tsx` | Gray loading placeholder. |
| `issue-icons.tsx` | `IssueTypeIcon` and `PriorityIcon` — colored icons per type/priority. |
| `assignee-avatars.tsx` | Stacked multi-assignee avatars (see 11.7). |
| `top-loader.tsx` + `top-loader-wrapper.tsx` | Thin navigation progress bar. |
| `nav-loader.tsx` + `nav-loader-wrapper.tsx` | Route-change loading indicator. |
| `rich-editor.tsx` | Reusable TipTap editor. |

The `cn()` helper (`lib/utils.ts`) merges Tailwind classes intelligently:
```typescript
import { clsx } from "clsx"; import { twMerge } from "tailwind-merge";
export function cn(...inputs) { return twMerge(clsx(inputs)); }
```
Also in `utils.ts`: `getInitials(nameOrEmail)` and `statusBadgeClass(status)` (status → pill colors).

**`*/loading.tsx` files:** each route has a sibling `loading.tsx` that renders skeleton placeholders. Next.js shows these automatically while the server component fetches data.

---

# Part 13 — Running Locally & Deploying

### 13.1 Run it on your computer

```bash
npm run dev
```
Open **http://localhost:3000**. On first load of a project page, the schema auto-applies to Supabase. Sign up, create a project, and you're in. Edit any file and the page hot-reloads.

### 13.2 Put your code on GitHub

```bash
git init
git add -A
git commit -m "Initial Mame build"
# create an empty repo on github.com, then:
git remote add origin https://github.com/YOU/mame.git
git push -u origin main
```
(`.env.local` is gitignored — your secrets stay private.)

### 13.3 Deploy to Vercel

1. On [vercel.com](https://vercel.com) → **New Project** → import your GitHub repo.
2. In **Environment Variables**, add the same five keys from `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_PASSWORD`, `SUPABASE_ACCESS_TOKEN`).
3. **Deploy.** Vercel builds and gives you a public URL. On first request the schema auto-applies. Every `git push` redeploys.

> Because the schema auto-applies on deploy, shipping a new table or column is just: edit `schema.sql`, commit, push. No manual database steps, ever.

---

# Part 14 — Build Order + How to Prompt an AI to Rebuild This

### 14.1 Recommended build order

Build bottom-up so each layer can be tested:

1. **Scaffold** (Part 4) — create-next-app, install deps, config files (Part 5).
2. **`.env.local`** with your Supabase keys (Part 3 & 5.1).
3. **Database** — write `supabase/schema.sql` (Appendix B) and `lib/db.ts` + `instrumentation.ts` so it auto-applies.
4. **Supabase clients** — `lib/supabase/{client,server,middleware}.ts` and `proxy.ts`.
5. **Types** — `types/index.ts` and `types/database.ts`.
6. **Utilities** — `lib/utils.ts`, `lib/time-status.ts`, `lib/data.ts`.
7. **UI primitives** — everything in `components/ui/`.
8. **Auth** — `login`, `register`, `api/setup`, root `layout.tsx`, `(app)/layout.tsx`.
9. **Navigation shell** — `sidebar.tsx`, `layout-shell.tsx`, project `layout.tsx`.
10. **Projects home** + create-project flow.
11. **The Board** (`board-view`, `issue-card`) — the core loop.
12. **Issue detail panel** + **create-issue dialog** — the editing surface.
13. **Backlog**, **Issues list**, **Status**, **Ideas**, **PDF**, **Settings**, **Account**.
14. **Polish** — loading skeletons, responsiveness, toasts.

### 14.2 How to prompt Claude Code with this document

Open a fresh Claude Code session in an empty folder and say something like:

> "I'm giving you a complete build guide for an app called Mame. Read it fully. Then build the app exactly as specified, in the build order in Part 14.1. Start by scaffolding the Next.js project and creating `supabase/schema.sql` from Appendix B. After each major part, run `npm run build` to check it compiles. Ask me for my Supabase keys when you reach the `.env.local` step. Don't skip the auto-schema mechanism (Part 6.4) — I never want to run SQL manually."

Then paste this entire document (or put it in the repo as `MAME_BUILD_GUIDE.md` and tell Claude to read it). Provide your Supabase keys when asked. Let it work part by part, building and testing as it goes.

### 14.3 Things that are easy to get wrong (tell the AI to watch for these)

- **The auto-schema must run before queries.** Keep both triggers (`instrumentation.ts` *and* `await runSchema()` in the project layout).
- **Multi-assignee = source of truth is `issue_assignees`**, but keep `assignee_id` in sync. Filtering must check the whole array (`issueMatchesAssignee`).
- **`completed_at` rules** must match in *both* the board and the detail panel.
- **Uncontrolled inputs need `key={issue.id}`** in the detail panel or they show stale values on navigation.
- **RLS helper functions need `security definer`** or policies recurse infinitely.
- **The owner is a synthetic member** — `getProjectMembers` prepends them; don't expect an owner row in `project_members`.
- **Touch drag** needs the `touchmove` listener and narrower mobile columns + trailing padding, or the last columns aren't droppable on phones.

---

# Appendix A — Complete File Inventory

**Config & root:** `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `vercel.json`, `proxy.ts`, `instrumentation.ts`, `.env.local`, `.gitignore`, `README.md`.

**`app/`:** `layout.tsx`, `page.tsx`, `globals.css`, `icon.tsx`, `not-found.tsx`, `login/page.tsx`, `register/page.tsx`, `api/setup/route.ts`, `api/projects/[id]/members/route.ts`, and under `(app)/`: `layout.tsx`, `page.tsx`, `loading.tsx`, `account/page.tsx`, `projects/page.tsx`, `projects/[key]/layout.tsx`, and per-feature `board|backlog|issues|status|ideas|settings/page.tsx` each with a `loading.tsx`.

**`components/`:** `layout/{sidebar,layout-shell}.tsx`; `projects/{projects-home,project-settings}.tsx`; `board/{board-view,issue-card}.tsx`; `backlog/backlog-view.tsx`; `issues/{issue-detail-panel,create-issue-dialog,issues-list-view,rich-text-editor}.tsx`; `ideas/ideas-view.tsx`; `status/status-view.tsx`; `export/{project-pdf,export-pdf-button}.tsx`; `account/account-settings.tsx`; and `ui/` primitives (button, input, textarea, select, dialog, dropdown-menu, avatar, tabs, tooltip, scroll-area, badge, skeleton, issue-icons, assignee-avatars, top-loader(+wrapper), nav-loader(+wrapper), rich-editor).

**`lib/`:** `supabase/{client,server,middleware}.ts`, `data.ts`, `db.ts`, `time-status.ts`, `utils.ts`.

**`types/`:** `index.ts`, `database.ts`. **`supabase/`:** `schema.sql`, `migrations/`.

**Approximate sizes (for scope):** the detail panel is the largest (~1300 lines), followed by backlog-view (~800), ideas-view (~750), project-pdf (~660), board-view (~550), status-view (~480), project-settings (~440), create-issue-dialog (~390). UI primitives are mostly 20–90 lines each. The codebase totals roughly 8,000 lines of component code plus ~400 lines of SQL.

---

# Appendix B — The Full Database Schema

> This is the single source of truth. Save it **verbatim** as `supabase/schema.sql`. It is **idempotent** — running it repeatedly is safe. `lib/db.ts` applies it automatically; you never paste it into Supabase by hand.
>
> **Note on ordering:** the `issues` table references `virtual_members` in a column definition, and the `virtual_members` table is created after it — this is fine because the foreign key is added when the table is created and `virtual_members` exists by the time any row is inserted. If your Postgres rejects the forward reference, the idempotent migration block near the bottom (`alter table issues add column if not exists virtual_assignee_id ...`) also guarantees the column exists.

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles table (extends auth.users)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Projects
create table if not exists projects (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  key text not null unique,
  description text,
  type text not null default 'scrum' check (type in ('scrum', 'kanban')),
  owner_id uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Project members
create table if not exists project_members (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz default now(),
  unique(project_id, user_id)
);

-- Sprints
create table if not exists sprints (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  name text not null,
  goal text,
  status text not null default 'planned' check (status in ('planned', 'active', 'completed')),
  start_date date,
  end_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Labels
create table if not exists labels (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  name text not null,
  color text not null default '#6366f1',
  created_at timestamptz default now()
);

-- Issues
create table if not exists issues (
  id uuid default uuid_generate_v4() primary key,
  key text not null,
  title text not null,
  description text,
  type text not null default 'task' check (type in ('epic', 'story', 'task', 'bug', 'subtask')),
  status text not null default 'triage' check (status in ('triage', 'todo', 'in_progress', 'in_review', 'blocked', 'done', 'not_done', 'completed')),
  priority text not null default 'medium' check (priority in ('highest', 'high', 'medium', 'low', 'lowest')),
  project_id uuid references projects(id) on delete cascade not null,
  sprint_id uuid references sprints(id) on delete set null,
  assignee_id uuid references profiles(id) on delete set null,
  reporter_id uuid references profiles(id) on delete set null,
  parent_id uuid references issues(id) on delete set null,
  virtual_assignee_id uuid references virtual_members(id) on delete set null,
  story_points integer,
  start_date date,
  due_date date,
  completed_at timestamptz,
  sort_order bigint default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(project_id, key)
);

-- Virtual members (dummy/fake team members for personal tracking)
create table if not exists virtual_members (
  id uuid default uuid_generate_v4() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  name text not null,
  color text not null default '#6366f1',
  created_by uuid references profiles(id) on delete cascade not null,
  created_at timestamptz default now()
);

-- Issue labels
create table if not exists issue_labels (
  issue_id uuid references issues(id) on delete cascade not null,
  label_id uuid references labels(id) on delete cascade not null,
  primary key (issue_id, label_id)
);

-- Comments
create table if not exists comments (
  id uuid default uuid_generate_v4() primary key,
  issue_id uuid references issues(id) on delete cascade not null,
  author_id uuid references profiles(id) on delete cascade not null,
  body text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Activity log
create table if not exists activity (
  id uuid default uuid_generate_v4() primary key,
  issue_id uuid references issues(id) on delete cascade not null,
  actor_id uuid references profiles(id) on delete cascade not null,
  action text not null,
  field text,
  old_value text,
  new_value text,
  created_at timestamptz default now()
);

-- Issue counter per project (for generating keys like PROJ-1, PROJ-2)
create table if not exists issue_counters (
  project_id uuid references projects(id) on delete cascade primary key,
  count integer not null default 0
);

-- Function to auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, profiles.full_name);
  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Function to get next issue key
create or replace function get_next_issue_key(p_project_id uuid)
returns integer as $$
declare
  next_count integer;
begin
  insert into issue_counters (project_id, count)
  values (p_project_id, 1)
  on conflict (project_id)
  do update set count = issue_counters.count + 1
  returning count into next_count;
  return next_count;
end;
$$ language plpgsql;

-- Helper functions (security definer = bypass RLS, breaks circular reference)
create or replace function is_project_member(p_project_id uuid)
returns boolean language sql security definer set search_path = public as $f$
  select exists (select 1 from project_members where project_id = p_project_id and user_id = auth.uid());
$f$;

create or replace function is_project_owner(p_project_id uuid)
returns boolean language sql security definer set search_path = public as $f$
  select exists (select 1 from projects where id = p_project_id and owner_id = auth.uid());
$f$;

-- RLS Policies
alter table profiles enable row level security;
alter table projects enable row level security;
alter table project_members enable row level security;
alter table sprints enable row level security;
alter table labels enable row level security;
alter table issues enable row level security;
alter table issue_labels enable row level security;
alter table comments enable row level security;
alter table activity enable row level security;
alter table issue_counters enable row level security;
alter table virtual_members enable row level security;

-- Drop all policies before recreating (idempotent)
do $$ declare r record;
begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute 'drop policy if exists "' || r.policyname || '" on ' || r.tablename;
  end loop;
end $$;

-- PROFILES
create policy "profiles_select" on profiles for select using (auth.role() = 'authenticated');
create policy "profiles_insert" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update" on profiles for update using (auth.uid() = id);

-- PROJECTS
create policy "projects_select"  on projects for select using (auth.uid() = owner_id or is_project_member(id));
create policy "projects_insert"  on projects for insert with check (auth.uid() = owner_id);
create policy "projects_update"  on projects for update using (auth.uid() = owner_id);
create policy "projects_delete"  on projects for delete using (auth.uid() = owner_id);

-- PROJECT_MEMBERS
create policy "members_select"  on project_members for select using (user_id = auth.uid() or is_project_owner(project_id));
create policy "members_insert"  on project_members for insert with check (is_project_owner(project_id));
create policy "members_delete"  on project_members for delete using (is_project_owner(project_id));

-- SPRINTS
create policy "sprints_all" on sprints for all using (is_project_owner(project_id) or is_project_member(project_id));

-- LABELS
create policy "labels_all" on labels for all using (is_project_owner(project_id) or is_project_member(project_id));

-- ISSUES
create policy "issues_all" on issues for all using (is_project_owner(project_id) or is_project_member(project_id));

-- ISSUE COUNTERS
create policy "counters_all" on issue_counters for all using (is_project_owner(project_id) or is_project_member(project_id));

-- VIRTUAL MEMBERS
create policy "virtual_members_all" on virtual_members for all using (is_project_owner(project_id) or is_project_member(project_id));

-- ISSUE_LABELS
create policy "issue_labels_all" on issue_labels for all using (
  exists (select 1 from issues where id = issue_id and (is_project_owner(project_id) or is_project_member(project_id)))
);

-- COMMENTS
create policy "comments_all" on comments for all using (
  exists (select 1 from issues where id = issue_id and (is_project_owner(project_id) or is_project_member(project_id)))
);

-- ACTIVITY
create policy "activity_select" on activity for select using (
  exists (select 1 from issues where id = issue_id and (is_project_owner(project_id) or is_project_member(project_id)))
);
create policy "activity_insert" on activity for insert with check (
  exists (select 1 from issues where id = issue_id and (is_project_owner(project_id) or is_project_member(project_id)))
);

-- Indexes for query performance
create index if not exists idx_issues_project_id       on issues(project_id);
create index if not exists idx_issues_sprint_id        on issues(sprint_id);
create index if not exists idx_issues_parent_id        on issues(parent_id);
create index if not exists idx_issues_assignee_id      on issues(assignee_id);
create index if not exists idx_issues_status           on issues(project_id, status);
create index if not exists idx_issues_sort_order       on issues(project_id, sort_order);
create index if not exists idx_activity_issue_id       on activity(issue_id);
create index if not exists idx_activity_created_at     on activity(issue_id, created_at desc);
create index if not exists idx_comments_issue_id       on comments(issue_id);
create index if not exists idx_project_members_project on project_members(project_id);
create index if not exists idx_project_members_user    on project_members(user_id);
create index if not exists idx_sprints_project_id      on sprints(project_id);
create index if not exists idx_virtual_members_project on virtual_members(project_id);

-- Migrations (idempotent — safe to run on existing databases)
alter table issues add column if not exists virtual_assignee_id uuid references virtual_members(id) on delete set null;
alter table issues add column if not exists start_date date;
alter table issues alter column sort_order type bigint using sort_order::bigint;
alter table issues alter column status set default 'triage';
do $$ begin
  alter table issues drop constraint if exists issues_status_check;
  alter table issues add constraint issues_status_check check (status = any(array['triage','todo','in_progress','in_review','blocked','done','not_done','completed']));
exception when others then null;
end $$;

-- IDEAS TABLE (idempotent)
create table if not exists public.ideas (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  converted boolean not null default false,
  converted_at timestamptz,
  converted_issue_id uuid references public.issues(id) on delete set null
);

alter table public.ideas enable row level security;

do $$ begin
  create policy "ideas_select" on public.ideas for select using (is_project_owner(project_id) or is_project_member(project_id));
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "ideas_insert" on public.ideas for insert with check (auth.uid() = created_by and (is_project_owner(project_id) or is_project_member(project_id)));
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "ideas_update" on public.ideas for update using (auth.uid() = created_by or is_project_owner(project_id) or is_project_member(project_id));
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "ideas_delete" on public.ideas for delete using (auth.uid() = created_by or is_project_owner(project_id) or is_project_member(project_id));
exception when duplicate_object then null;
end $$;

create index if not exists idx_ideas_project_id on public.ideas(project_id);
create index if not exists idx_ideas_created_at on public.ideas(project_id, created_at desc);

-- Fix ideas.created_by FK to point to profiles (not auth.users) so Supabase join works
do $$ begin
  alter table public.ideas drop constraint if exists ideas_created_by_fkey;
  alter table public.ideas add constraint ideas_created_by_fkey
    foreign key (created_by) references public.profiles(id) on delete set null;
exception when others then null;
end $$;

-- Add completed_at and start_date to issues (migration for existing DBs)
alter table public.issues add column if not exists completed_at timestamptz;
alter table public.issues add column if not exists start_date date;

-- ── Multiple Assignees ──────────────────────────────────────────────────────
create table if not exists issue_assignees (
  id                 uuid default uuid_generate_v4() primary key,
  issue_id           uuid references issues(id) on delete cascade not null,
  user_id            uuid references profiles(id) on delete cascade,
  virtual_member_id  uuid references virtual_members(id) on delete cascade,
  created_at         timestamptz default now(),
  constraint issue_assignees_one_type check (
    (user_id is not null and virtual_member_id is null) or
    (user_id is null    and virtual_member_id is not null)
  )
);

alter table public.issue_assignees enable row level security;

create unique index if not exists idx_ia_issue_user
  on public.issue_assignees(issue_id, user_id) where user_id is not null;
create unique index if not exists idx_ia_issue_virtual
  on public.issue_assignees(issue_id, virtual_member_id) where virtual_member_id is not null;
create index if not exists idx_issue_assignees_issue_id
  on public.issue_assignees(issue_id);

create policy "issue_assignees_select" on public.issue_assignees for select using (
  exists (select 1 from issues i where i.id = issue_id
          and (is_project_owner(i.project_id) or is_project_member(i.project_id)))
);
create policy "issue_assignees_insert" on public.issue_assignees for insert with check (
  exists (select 1 from issues i where i.id = issue_id
          and (is_project_owner(i.project_id) or is_project_member(i.project_id)))
);
create policy "issue_assignees_delete" on public.issue_assignees for delete using (
  exists (select 1 from issues i where i.id = issue_id
          and (is_project_owner(i.project_id) or is_project_member(i.project_id)))
);

-- Backfill legacy single-assignee data into the junction table
insert into issue_assignees (issue_id, user_id)
  select id, assignee_id from issues where assignee_id is not null
on conflict do nothing;
insert into issue_assignees (issue_id, virtual_member_id)
  select id, virtual_assignee_id from issues where virtual_assignee_id is not null
on conflict do nothing;
```

---

*End of guide. Build it part by part, test as you go, and you'll have a pixel-faithful, fully-functional Mame.*
