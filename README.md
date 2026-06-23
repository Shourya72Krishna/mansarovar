# मानसरोवर (Manasarovar)

> The sacred lake of the mind — a personal knowledge management platform for organizing study material, notes, and documents with a calm, cosmic aesthetic.

A full-stack web app for organizing knowledge into **Workspaces → Subjects → Topics**, with a rich-text editor, PDF storage via Google Drive, full-text search, and basic admin tooling.

---

## Tech Stack

**Frontend**
- React 18 + TypeScript + Vite
- Tailwind CSS + Framer Motion (animation)
- Zustand (state management)
- Tiptap (rich text editor — headings, tables, task lists, highlights, links, images)
- `@dnd-kit` (drag-and-drop reordering)

**Backend**
- Python + FastAPI
- `asyncpg` (async PostgreSQL driver)
- Neon (serverless PostgreSQL)
- JWT auth via Google OAuth 2.0
- Google Drive API (`drive.file` scope) for PDF/media storage
- `slowapi` (rate limiting), `loguru` (logging)

**Deployment**
- Backend: Render
- Frontend: any static host (Vercel, Netlify, Render static site)
- Database: Neon

---

## Project Structure

```
manasarovar/
├── frontend/                  React + TypeScript + Vite app
│   └── src/
│       ├── pages/             Dashboard, Workspace, Subject, Topic, Search, Admin, etc.
│       ├── components/
│       │   ├── editor/        RichEditor.tsx (Tiptap)
│       │   ├── layout/        Sidebar.tsx
│       │   └── shared/        Modal, ConfirmDialog, SplashScreen, CosmicBackground
│       ├── store/              Zustand store (single source of app state)
│       └── services/api.ts     Typed API client
│
└── backend-python/            FastAPI backend
    ├── app/
    │   ├── main.py             App entrypoint, router mounting
    │   ├── config.py           Settings (reads .env)
    │   ├── routers/             auth, workspaces, subjects, topics, search, files, misc (tags/activity/drive/admin)
    │   ├── services/            Business logic
    │   ├── middleware/
    │   └── db/                  Connection pool
    └── scripts/
        ├── schema.sql           Full database schema
        ├── migrate.py           Applies schema.sql to the configured database
        └── seed.py               Seeds initial/demo data
```

---

## Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.10+
- A **Neon** (or any PostgreSQL) database
- A **Google Cloud** project with OAuth credentials (for login + Drive storage)

---

## Setup

### 1. Backend

```bash
cd backend-python

# Create and activate a virtual environment (recommended — keeps
# dependencies isolated from your system Python)
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # macOS/Linux

pip install -r requirements.txt

cp .env.example .env
# Edit .env — see Environment Variables below
```

Apply the database schema:

```bash
python scripts/migrate.py
```

Run the backend:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 5000
```

The API is now live at `http://localhost:5000`, with all routes mounted under `/api`.

### 2. Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env` (or edit the existing one) and point it at your backend:

```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
```

Run it:

```bash
npm run dev
```

The app is now live at `http://localhost:5173`.

> **Note:** Both servers must be running at the same time during local development — the frontend has no functionality of its own without the backend.

---

## Environment Variables

### `backend-python/.env`

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Neon or otherwise) |
| `JWT_SECRET` | Long random string used to sign auth tokens — **generate your own**, never reuse the example |
| `JWT_ALGORITHM` | Defaults to `HS256` |
| `JWT_EXPIRE_DAYS` | How long a login session lasts |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `GOOGLE_REDIRECT_URI` | Must exactly match the redirect URI configured in Google Cloud Console |
| `GOOGLE_DRIVE_SCOPE` | Drive API scope — `drive.file` is the least-privilege option (only accesses files this app creates) |
| `SUPER_ADMIN_EMAIL` | The Google account that auto-promotes to `SUPER_ADMIN` on first login |
| `FRONTEND_URL` / `BACKEND_URL` | Used for CORS and OAuth redirects |
| `RATE_LIMIT_PER_MINUTE` | API rate limit per client |

### `frontend/.env`

| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the backend API |
| `VITE_GOOGLE_CLIENT_ID` | Same Google OAuth client ID as the backend |
| `VITE_APP_NAME` / `VITE_APP_TAGLINE` / `VITE_APP_LOGO_LETTER` | Branding strings shown in the UI |

> **Security note:** Treat `.env` files as secrets. Don't commit real database credentials or JWT secrets to version control — `.env.example` should only ever contain placeholder values.

---

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com) → create or select a project.
2. **APIs & Services → Credentials → Create OAuth 2.0 Client ID** (type: Web application).
3. Add an authorized redirect URI matching `GOOGLE_REDIRECT_URI` in your backend `.env`, e.g.:
   ```
   http://localhost:5000/api/auth/google/callback
   ```
4. Copy the Client ID and Client Secret into `backend-python/.env`. Copy the Client ID alone into `frontend/.env`.
5. Enable the **Google Drive API** for the project (used to store uploaded PDFs/media in each user's own Drive).

---

## Database Schema

| Table | Purpose |
|---|---|
| `users` | Accounts, roles, Drive connection state |
| `workspaces` | Top-level containers (e.g. "College", "Self Study") |
| `subjects` | Grouped topics within a workspace |
| `topics` | Individual notes, with nesting and version history |
| `topic_versions` | Snapshot history for each topic |
| `pdf_files` | PDF metadata + Google Drive references |
| `pdf_bookmarks` | Per-PDF reading bookmarks |
| `media_files` | Image/video metadata + Drive references |
| `tags` | User-defined tags |
| `activity_log` | Recently viewed/edited items (drives the Dashboard's "Recently Viewed") |
| `audit_logs` | Admin action audit trail |
| `session` | Reserved for session storage |

Schema lives in `backend-python/scripts/schema.sql` and is applied with `python scripts/migrate.py`.

---

## API Reference

All routes are mounted under `/api`, except `/health`.

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/health` | Public | Lightweight liveness check |
| GET | `/api/auth/config` | Public | App branding config |
| GET | `/api/auth/google` | Public | Start Google OAuth flow |
| GET | `/api/auth/google/callback` | Public | OAuth callback → issues JWT |
| GET | `/api/auth/me` | Auth | Current user profile |
| POST | `/api/auth/logout` | Auth | Log out |
| GET / POST | `/api/workspaces` | Auth | List / create workspaces |
| PATCH | `/api/workspaces/batch/reorder` | Auth | Bulk reorder workspaces |
| GET / PATCH / DELETE | `/api/workspaces/{id}` | Auth+Owner | Single workspace operations |
| GET / POST | `/api/subjects` | Auth | List / create subjects |
| GET / PATCH / DELETE | `/api/subjects/{id}` | Auth+Owner | Single subject operations |
| GET / POST | `/api/topics` | Auth | List / create topics (`?subject_id=` required for list) |
| GET / PATCH / DELETE | `/api/topics/{id}` | Auth+Owner | Single topic operations (PATCH auto-creates a version snapshot) |
| GET | `/api/topics/{id}/versions` | Auth+Owner | Version history |
| POST | `/api/topics/{id}/versions/{version_id}/restore` | Auth+Owner | Restore a previous version |
| GET | `/api/search` | Auth | Full-text search |
| GET / POST | `/api/pdfs` | Auth | List / upload PDFs |
| PATCH | `/api/pdfs/{id}/progress` | Auth+Owner | Update reading progress |
| POST | `/api/pdfs/{id}/bookmarks` | Auth+Owner | Add a bookmark |
| DELETE | `/api/pdfs/{id}` | Auth+Owner | Delete a PDF |
| GET / POST / DELETE | `/api/media` | Auth | Image/video upload and management |
| GET / POST / DELETE | `/api/tags` | Auth | Tag management |
| GET | `/api/activity` | Auth | Recent activity feed |
| GET | `/api/activity/heatmap` | Auth | Activity heatmap data |
| GET | `/api/drive/status` | Auth | Google Drive connection status |
| POST | `/api/drive/disconnect` | Auth | Disconnect Drive |
| GET | `/api/admin/users` | Admin | Paginated user list |
| PATCH | `/api/admin/users/{id}/suspend` | Admin | Suspend a user |
| PATCH | `/api/admin/users/{id}/restore` | Admin | Restore a suspended user |
| PATCH | `/api/admin/users/{id}/role` | Super Admin | Change a user's role |
| GET | `/api/admin/analytics` | Admin | Platform-wide statistics |
| GET | `/api/admin/audit-logs` | Admin | Paginated audit log |

---

## User Roles

| Role | Capabilities |
|---|---|
| `USER` | Full CRUD on own content, own Drive integration |
| `ADMIN` | Everything a `USER` can do, plus user management and analytics |
| `SUPER_ADMIN` | Everything an `ADMIN` can do, plus changing other users' roles |

The account matching `SUPER_ADMIN_EMAIL` in the backend `.env` is automatically promoted on first login.

---

## Production Deployment

**Backend (Render)**
1. Create a new Web Service, root directory `backend-python`.
2. Build command: `pip install -r requirements.txt`
3. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Set all environment variables from the table above in Render's dashboard (use production values, not the local `.env`).
5. Update `GOOGLE_REDIRECT_URI` to the deployed backend URL, and add it as an authorized redirect URI in Google Cloud Console.

> Render's free tier spins the service down after ~15 minutes of inactivity, causing a 30+ second "cold start" on the next request. A free external uptime monitor (e.g. UptimeRobot or cron-job.org) pinging `/health` every 5–10 minutes keeps the instance warm. Use an HTTP(s) monitor type, not ICMP/Ping — and give it a generous timeout, since a monitor with too short a timeout can itself report a false "down" during a genuine cold start.

**Frontend**
1. Build: `npm run build` (outputs to `frontend/dist/`)
2. Deploy the `dist/` folder to any static host.
3. Set `VITE_API_URL` to point at the deployed backend before building.

**Database**
- Neon's pooled connection string works as-is in `DATABASE_URL`; no separate connection pooler needed.

---

## Security Notes

- **Never commit real credentials.** `.env.example` files should contain placeholders only — double-check this repo's `.env.example` and `.env` files before pushing publicly; rotate any credentials that may have already been committed.
- `JWT_SECRET` must be a long, random value, unique per environment (local ≠ production).
- The Google Drive integration uses the `drive.file` scope deliberately — it only grants access to files this app itself creates, not a user's entire Drive.