# Akshar — Divine Knowledge Vault

> अक्षर — That which is imperishable. Your eternal knowledge.

A full-stack personal knowledge management platform with a divine cosmic aesthetic.

---

## Project Structure

```
frontend/           ← React + TypeScript frontend (Vite)
backend/   ← Node.js + Express + PostgreSQL backend
```

---

## ⚡ Quick Start

### 1. Clone & configure

```bash
# Frontend
cd akshar
cp .env.example .env
# Edit .env — set VITE_APP_NAME to rename the app on UI

# Backend
cd ../akshar-backend
cp .env.example .env
# Edit .env — set APP_NAME, DB credentials, Google OAuth keys
```

### 2. PostgreSQL setup

```bash
createdb akshar_db
cd akshar-backend
npm install
npm run db:migrate   # runs schema.sql
npm run db:seed      # seeds super admin
```

### 3. Run backend

```bash
cd akshar-backend
npm run dev          # starts on http://localhost:5000
```

### 4. Run frontend

```bash
cd akshar
npm install
npm run dev          # starts on http://localhost:5173
```

---

## 🔑 App Name — Rename Everything from .env

### Frontend (`frontend/.env`)
```env
VITE_APP_NAME=Akshar          # ← Change this
VITE_APP_TAGLINE=Divine Knowledge Vault
VITE_APP_LOGO_LETTER=अ
```

### Backend (`backend/.env`)
```env
APP_NAME=Akshar               # ← Change this (used for Drive folder name too)
APP_TAGLINE=Divine Knowledge Vault
APP_LOGO_LETTER=अ
```

> Both files must be updated. The frontend reads `VITE_APP_NAME` at build time.
> The backend uses `APP_NAME` at runtime (e.g. the Google Drive folder is named after it).

---

## 🔐 Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → **APIs & Services** → **Credentials**
3. Create **OAuth 2.0 Client ID** (Web application)
4. Add Authorised redirect URI: `http://localhost:5000/api/auth/google/callback`
5. Copy Client ID + Secret into `backend/.env`
6. Enable **Google Drive API** in the project

---

## 📁 Google Drive Integration

- Each user connects their own Drive
- Akshar creates a folder: `{APP_NAME}/` in the user's Drive
- All PDFs/images/videos are stored inside sub-folders:
  ```
  Akshar/
    College/
      DBMS/
        PDFs/
        Images/
    Self Study/
      Data Structures/
        PDFs/
  ```
- Only `drive.file` scope is used — least privilege
- Database stores only metadata (Drive file IDs, URLs)

---

## 🗄️ Database Schema (PostgreSQL)

| Table              | Purpose                            |
|--------------------|------------------------------------|
| `users`            | Auth, roles, Drive tokens          |
| `workspaces`       | Top-level containers               |
| `subjects`         | Grouped topics within workspaces   |
| `topics`           | Nested notes (infinite depth)      |
| `topic_versions`   | Version history for each topic     |
| `pdf_files`        | PDF metadata + Drive refs          |
| `pdf_bookmarks`    | Per-PDF reading bookmarks          |
| `media_files`      | Image/video metadata               |
| `tags`             | User-defined tags                  |
| `activity_log`     | Recent views/edits                 |
| `audit_logs`       | Admin audit trail                  |
| `session`          | Express session store              |

---

## 🛣️ API Routes

| Method | Route                                  | Auth      | Description                    |
|--------|----------------------------------------|-----------|--------------------------------|
| GET    | `/health`                              | Public    | Health check + app name        |
| GET    | `/api/auth/config`                     | Public    | App branding from .env         |
| GET    | `/api/auth/google`                     | Public    | Start Google OAuth             |
| GET    | `/api/auth/google/callback`            | Public    | OAuth callback → JWT cookie    |
| GET    | `/api/auth/me`                         | Auth      | Current user profile           |
| POST   | `/api/auth/logout`                     | Auth      | Clear session                  |
| GET    | `/api/workspaces`                      | Auth      | List user workspaces           |
| POST   | `/api/workspaces`                      | Auth      | Create workspace               |
| PATCH  | `/api/workspaces/:id`                  | Auth+Own  | Update workspace               |
| DELETE | `/api/workspaces/:id`                  | Auth+Own  | Archive/delete workspace       |
| GET    | `/api/subjects`                        | Auth      | List subjects                  |
| POST   | `/api/subjects`                        | Auth      | Create subject                 |
| PATCH  | `/api/subjects/:id`                    | Auth+Own  | Update subject                 |
| DELETE | `/api/subjects/:id`                    | Auth+Own  | Archive/delete subject         |
| GET    | `/api/topics`                          | Auth      | List topics (tree or flat)     |
| POST   | `/api/topics`                          | Auth      | Create topic                   |
| PATCH  | `/api/topics/:id`                      | Auth+Own  | Update topic + auto-version    |
| DELETE | `/api/topics/:id`                      | Auth+Own  | Archive/delete topic           |
| GET    | `/api/topics/:id/versions`             | Auth+Own  | List topic versions            |
| POST   | `/api/topics/:id/versions/:vid/restore`| Auth+Own  | Restore version                |
| POST   | `/api/pdfs/upload`                     | Auth      | Upload PDF → Drive             |
| PATCH  | `/api/pdfs/:id/progress`               | Auth+Own  | Update reading progress        |
| POST   | `/api/pdfs/:id/bookmarks`              | Auth+Own  | Add bookmark                   |
| POST   | `/api/media/upload`                    | Auth      | Upload image/video → Drive     |
| GET    | `/api/search`                          | Auth      | Full-text search               |
| GET    | `/api/activity`                        | Auth      | Recent activity                |
| GET    | `/api/activity/heatmap`                | Auth      | Study heatmap data             |
| GET    | `/api/drive/status`                    | Auth      | Drive connection status        |
| GET    | `/api/drive/connect`                   | Auth      | Start Drive OAuth              |
| GET    | `/api/admin/users`                     | Admin     | List all users                 |
| POST   | `/api/admin/users/:id/suspend`         | Admin     | Suspend user                   |
| POST   | `/api/admin/users/:id/restore`         | Admin     | Restore user                   |
| POST   | `/api/admin/users/:id/promote`         | SuperAdmin| Promote to Admin               |
| GET    | `/api/admin/analytics`                 | Admin     | Platform statistics            |
| GET    | `/api/admin/audit-logs`                | Admin     | Paginated audit log            |

---

## 👤 User Roles

| Role         | Capabilities                                               |
|--------------|------------------------------------------------------------|
| `USER`       | Full CRUD on own content, Drive integration                |
| `ADMIN`      | Manage users, view all analytics, audit logs               |
| `SUPER_ADMIN`| Everything + promote admins, system config (one per app)  |

Set `SUPER_ADMIN_EMAIL` in `.env` — the first login with that email auto-promotes.

---

## 🏗️ Tech Stack

**Frontend**
- React 18 + TypeScript + Vite
- Tailwind CSS + Framer Motion
- Tiptap rich text editor (bold/italic/tables/code/KaTeX)
- Zustand state management

**Backend**
- Node.js + Express + TypeScript
- PostgreSQL (with full-text search via `tsvector`)
- Passport.js (Google OAuth 2.0)
- JWT (httpOnly cookie)
- Google Drive API (`drive.file` scope)
- Multer (memory storage → streamed to Drive)
- Winston logging
- Zod validation
- express-rate-limit

---

## 🚀 Production Deployment

```bash
# Build frontend
cd akshar && npm run build   # outputs to dist/

# Build backend
cd akshar-backend && npm run build  # outputs to dist/

# Set production env vars
APP_ENV=production
DB_SSL=true
FRONTEND_URL=https://your-domain.com

# Start
node dist/server.js
```

Serve the frontend `dist/` via Nginx or any static host (Vercel, Netlify).
Point the backend on a Node.js host (Railway, Render, EC2).
