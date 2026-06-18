-- ═══════════════════════════════════════════════════════════════
--  AKSHAR DATABASE SCHEMA
--  Run: npm run db:migrate
-- ═══════════════════════════════════════════════════════════════

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- fast LIKE / trigram search
CREATE EXTENSION IF NOT EXISTS "unaccent";   -- accent-insensitive search

-- ── Enum Types ──────────────────────────────────────────────────
CREATE TYPE user_role   AS ENUM ('SUPER_ADMIN', 'ADMIN', 'USER');
CREATE TYPE user_status AS ENUM ('active', 'suspended');
CREATE TYPE media_type  AS ENUM ('image', 'video', 'attachment');

-- ── Users ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name            VARCHAR(255)  NOT NULL,
  email           VARCHAR(255)  NOT NULL UNIQUE,
  google_id       VARCHAR(255)  NOT NULL UNIQUE,
  avatar          TEXT,
  role            user_role     NOT NULL DEFAULT 'USER',
  status          user_status   NOT NULL DEFAULT 'active',

  -- Google Drive integration
  drive_connected         BOOLEAN   DEFAULT FALSE,
  drive_root_folder_id    VARCHAR(255),
  drive_access_token      TEXT,
  drive_refresh_token     TEXT,
  drive_token_expiry      TIMESTAMPTZ,

  last_login      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Workspaces ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workspaces (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        VARCHAR(255)  NOT NULL,
  icon        VARCHAR(10)   DEFAULT '📁',
  color       VARCHAR(20)   DEFAULT '#7c3aed',
  pinned      BOOLEAN       NOT NULL DEFAULT FALSE,
  archived    BOOLEAN       NOT NULL DEFAULT FALSE,
  sort_order  INTEGER       NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Subjects ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subjects (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id  UUID          NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id       UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          VARCHAR(255)  NOT NULL,
  description   TEXT,
  icon          VARCHAR(10)   DEFAULT '📖',
  color         VARCHAR(20)   DEFAULT '#2563eb',
  pinned        BOOLEAN       NOT NULL DEFAULT FALSE,
  archived      BOOLEAN       NOT NULL DEFAULT FALSE,
  sort_order    INTEGER       NOT NULL DEFAULT 0,
  tags          TEXT[]        NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Topics (self-referencing for infinite nesting) ─────────────
CREATE TABLE IF NOT EXISTS topics (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id      UUID          NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  user_id         UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id       UUID          REFERENCES topics(id) ON DELETE CASCADE,
  name            VARCHAR(500)  NOT NULL,
  content         TEXT          NOT NULL DEFAULT '',
  content_preview TEXT,
  pinned          BOOLEAN       NOT NULL DEFAULT FALSE,
  archived        BOOLEAN       NOT NULL DEFAULT FALSE,
  sort_order      INTEGER       NOT NULL DEFAULT 0,
  tags            TEXT[]        NOT NULL DEFAULT '{}',
  search_vector   TSVECTOR,
  last_edited_at  TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Topic Versions ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS topic_versions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id    UUID    NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
  user_id     UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT    NOT NULL,
  word_count  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── PDF Files ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pdf_files (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id        UUID          NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id          UUID          REFERENCES topics(id) ON DELETE SET NULL,
  user_id           UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name              VARCHAR(500)  NOT NULL,
  drive_file_id     VARCHAR(255)  NOT NULL,
  drive_view_url    TEXT,
  drive_folder_id   VARCHAR(255),
  size_bytes        BIGINT        NOT NULL DEFAULT 0,
  page_count        INTEGER,
  reading_progress  INTEGER       NOT NULL DEFAULT 0 CHECK (reading_progress BETWEEN 0 AND 100),
  tags              TEXT[]        NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── PDF Bookmarks ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pdf_bookmarks (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pdf_id    UUID          NOT NULL REFERENCES pdf_files(id) ON DELETE CASCADE,
  page      INTEGER       NOT NULL,
  label     VARCHAR(255)  NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Media Files ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS media_files (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id          UUID        NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id            UUID        REFERENCES topics(id) ON DELETE SET NULL,
  user_id             UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                VARCHAR(500) NOT NULL,
  type                media_type  NOT NULL,
  mime_type           VARCHAR(100),
  drive_file_id       VARCHAR(255) NOT NULL,
  drive_thumbnail_url TEXT,
  drive_view_url      TEXT,
  size_bytes          BIGINT      NOT NULL DEFAULT 0,
  tags                TEXT[]      NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Tags (global per user) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tags (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       VARCHAR(100)  NOT NULL,
  color      VARCHAR(20)   DEFAULT '#fbbf24',
  created_at TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, name)
);

-- ── Activity Log (recent views) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS activity_log (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_type  VARCHAR(20)   NOT NULL,   -- 'topic' | 'pdf' | 'media'
  resource_id    UUID          NOT NULL,
  action         VARCHAR(30)   NOT NULL,   -- 'view' | 'edit' | 'create'
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Audit Logs ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID          REFERENCES users(id) ON DELETE SET NULL,
  actor_name  VARCHAR(255),
  action      VARCHAR(100)  NOT NULL,
  details     TEXT,
  ip_address  VARCHAR(64),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Session Store (connect-pg-simple) ─────────────────────────────
CREATE TABLE IF NOT EXISTS session (
  sid     VARCHAR     NOT NULL COLLATE "default",
  sess    JSON        NOT NULL,
  expire  TIMESTAMPTZ NOT NULL,
  CONSTRAINT session_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE
);

CREATE OR REPLACE FUNCTION update_topic_derived_cols()
RETURNS TRIGGER AS $$
BEGIN
  NEW.content_preview := LEFT(NEW.content, 200);
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.content, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_topic_derived ON topics;
CREATE TRIGGER trg_topic_derived
BEFORE INSERT OR UPDATE ON topics
FOR EACH ROW EXECUTE FUNCTION update_topic_derived_cols();

-- ═══════════════════════════════════════════════════════════════
--  INDEXES
-- ═══════════════════════════════════════════════════════════════

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email     ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Workspaces
CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON workspaces(user_id);

-- Subjects
CREATE INDEX IF NOT EXISTS idx_subjects_workspace_id ON subjects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_subjects_user_id      ON subjects(user_id);

-- Topics
CREATE INDEX IF NOT EXISTS idx_topics_subject_id ON topics(subject_id);
CREATE INDEX IF NOT EXISTS idx_topics_parent_id  ON topics(parent_id);
CREATE INDEX IF NOT EXISTS idx_topics_user_id    ON topics(user_id);
CREATE INDEX IF NOT EXISTS idx_topics_search     ON topics USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_topics_tags       ON topics USING GIN(tags);

-- PDFs
CREATE INDEX IF NOT EXISTS idx_pdf_files_subject_id ON pdf_files(subject_id);
CREATE INDEX IF NOT EXISTS idx_pdf_files_user_id    ON pdf_files(user_id);

-- Media
CREATE INDEX IF NOT EXISTS idx_media_files_subject_id ON media_files(subject_id);
CREATE INDEX IF NOT EXISTS idx_media_files_user_id    ON media_files(user_id);
CREATE INDEX IF NOT EXISTS idx_media_files_type       ON media_files(type);

-- Activity
CREATE INDEX IF NOT EXISTS idx_activity_user_id    ON activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_resource   ON activity_log(resource_id);

-- Audit
CREATE INDEX IF NOT EXISTS idx_audit_user_id    ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at DESC);

-- Session
CREATE INDEX IF NOT EXISTS idx_session_expire ON session(expire);

-- ═══════════════════════════════════════════════════════════════
--  TRIGGERS — auto-update updated_at
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['users','workspaces','subjects','topics','pdf_files'] LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_updated_at ON %I;
       CREATE TRIGGER trg_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at();',
      tbl, tbl
    );
  END LOOP;
END $$;
