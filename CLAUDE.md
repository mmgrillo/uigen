# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Code Style

Use comments sparingly. Only comment complex code.

## Commands

```bash
# Setup (first time)
npm run setup          # installs deps, generates Prisma client, runs migrations

# Development
npm run dev            # Next.js dev server with Turbopack
npm run build          # Production build
npm run lint           # ESLint

# Testing
npm test               # Run all Vitest tests
npx vitest run <file>  # Run a single test file

# Database
npx prisma migrate dev # Apply new migrations
npm run db:reset       # Reset database (destructive)
npx prisma studio      # Browse database GUI
```

Dev server requires `NODE_OPTIONS=--require ./node-compat.cjs` — the npm scripts set this via `cross-env` so they work on Linux, macOS, and Windows (cmd / Git Bash) without shell-specific syntax.

Set `ANTHROPIC_API_KEY` in `.env` — without it the app falls back to a mock AI that generates simple placeholder components.

## Architecture

UIGen is an AI-powered React component generator. Users chat with Claude to generate React components; the results render live in an iframe.

### Request Flow

1. User submits a chat message in the browser
2. `useChat` (Vercel AI SDK) POSTs to `/api/chat` with current messages and the virtual file system state
3. The API route calls `streamText` with two tools: `str_replace_editor` and `file_manager`
4. Claude streams back tool calls (file creates/edits) alongside text
5. Tool results execute on the **client** via the `toolCall` handler in `ChatContext`
6. `FileSystemContext` updates in-memory state → triggers iframe refresh
7. The `PreviewFrame` recompiles JSX with Babel standalone and re-renders the iframe
8. On stream completion, the API route persists messages + serialized file system to SQLite via Prisma

### Virtual File System (`src/lib/file-system.ts`)

All generated code lives in memory — nothing is written to disk. The `VirtualFileSystem` class manages an in-memory tree. It serializes to JSON for database persistence (`serialize()` / `deserializeFromNodes()`).

### AI Tools (`src/lib/tools/`)

- **`str_replace_editor`**: `view | create | str_replace | insert | undo_edit` — the main tool Claude uses to write code
- **`file_manager`**: `rename | delete`

Both validate with Zod and execute against `VirtualFileSystem`.

### Context Providers

- **`FileSystemContext`** — owns the VFS instance, exposes file CRUD, and handles tool call execution dispatched from chat
- **`ChatContext`** — wraps `useChat`, intercepts tool calls, and forwards them to `FileSystemContext`; also tracks anonymous work for pre-login users

### Preview Pipeline (`src/lib/transform/jsx-transformer.ts`)

`createPreviewHTML()` builds a full HTML document with:
- An import map for React/ReactDOM/Tailwind dependencies
- Babel standalone to compile JSX in the browser
- The virtual file system contents injected as modules
- The entry point auto-detected (prefers `/App.jsx`)

The iframe is sandboxed; compilation errors surface as user-friendly messages.

### Authentication

JWT sessions via `jose` (edge-compatible). Sessions stored as httpOnly cookies (7-day TTL). Password hashing uses bcrypt. Server Actions in `src/actions/index.ts` handle sign-up, sign-in, sign-out, and user fetch. Middleware in `src/middleware.ts` guards `/api/projects/*` and `/api/filesystem/*`.

Anonymous users can generate components without logging in; on sign-up/sign-in their anonymous project is migrated to their account (`useAuth` hook).

### Database

SQLite via Prisma. See `prisma/schema.prisma` for the full schema — reference it whenever you need to understand the structure of data stored in the database. Two models: `User` (email + hashed password) and `Project` (messages as JSON string, virtual FS as JSON string, optional `userId` for anonymous projects).

### AI Provider (`src/lib/provider.ts`)

When `ANTHROPIC_API_KEY` is set: uses `claude-haiku-4-5` with ephemeral prompt caching and up to 40 tool steps. Without the key: `MockLanguageModel` generates a hardcoded component and simulates tool calls (max 4 steps).

### Layout

Three-panel resizable layout (react-resizable-panels):
- Left 35%: Chat (MessageList + MessageInput)
- Right 65%: Preview tab (iframe) or Code tab (file tree 30% + Monaco editor 70%)
