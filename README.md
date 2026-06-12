# Team Knowledge Hub

AI-powered team knowledge management with social login, document upload, semantic search, and AI Q&A.

## Features

- **OAuth Login** — Google & GitHub social sign-in via NextAuth.js v5
- **Team Workspaces** — Create shared workspaces with Owner / Admin / Member roles
- **Document Management** — Upload PDF, DOCX, and TXT files (up to 10 MB each)
- **Semantic Search** — Vector-based search using embeddings (Voyage AI or simple fallback)
- **AI Q&A Chat** — Ask questions about your documents; Claude answers with source citations
- **Role-Based Access Control** — Owners manage admins, admins manage members

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Auth | NextAuth.js v5 + Prisma Adapter |
| Database | SQLite (dev) / PostgreSQL (prod) |
| ORM | Prisma |
| AI | Anthropic Claude (`claude-opus-4-8`) |
| Embeddings | Voyage AI `voyage-3-lite` (optional) |
| Styling | Tailwind CSS |

## Quick Start

### 1. Clone & install

```bash
git clone <repo>
cd team-knowledge-hub
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

#### Required variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | SQLite: `file:./dev.db` or PostgreSQL connection string |
| `AUTH_SECRET` | Random secret: `openssl rand -base64 32` |
| `AUTH_URL` | Your app URL, e.g. `http://localhost:3000` |
| `AUTH_GOOGLE_ID` | Google OAuth Client ID |
| `AUTH_GOOGLE_SECRET` | Google OAuth Client Secret |
| `AUTH_GITHUB_ID` | GitHub OAuth App Client ID |
| `AUTH_GITHUB_SECRET` | GitHub OAuth App Client Secret |
| `ANTHROPIC_API_KEY` | Anthropic API key for Q&A chat |

#### Optional

| Variable | Description |
|---|---|
| `VOYAGE_API_KEY` | Voyage AI key for neural embeddings. Without it, falls back to a character n-gram heuristic. |

### 3. Set up OAuth providers

**Google:** Go to [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials → Create OAuth Client ID. Set authorized redirect URI to `http://localhost:3000/api/auth/callback/google`.

**GitHub:** Go to github.com → Settings → Developer settings → OAuth Apps → New. Set callback URL to `http://localhost:3000/api/auth/callback/github`.

### 4. Set up the database

```bash
npm run db:push
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/
  (auth)/login/          Sign-in page
  (app)/
    dashboard/           Workspace list
    workspaces/[id]/     Workspace overview
      documents/         Document upload & search
      chat/              AI Q&A interface
      members/           Member management
  api/
    auth/[...nextauth]/  NextAuth handlers
    workspaces/          CRUD + members, documents, search, chat
components/
  CreateWorkspaceButton  Modal to create workspaces
  DocumentList           Upload, list, search, delete docs
  ChatInterface          Streaming SSE chat with Claude
  MembersManager         Add/remove/role-change members
lib/
  db.ts                  Prisma singleton
  embeddings.ts          Voyage AI embeddings (+ fallback)
  documents.ts           PDF/DOCX/TXT text extraction
  search.ts              Cosine similarity vector search
  permissions.ts         Role-based access helpers
auth.ts                  NextAuth configuration
middleware.ts            Route protection
prisma/schema.prisma     Database schema
```

## Production Notes

- Swap `DATABASE_URL` to a PostgreSQL connection string and update `provider = "postgresql"` in `schema.prisma`
- Run `npm run db:push` or `npx prisma migrate deploy` on the production database
- Set `AUTH_URL` to your production domain
- Add `VOYAGE_API_KEY` for much better semantic search quality
