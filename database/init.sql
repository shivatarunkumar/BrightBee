-- =============================================================================
-- BrightBee — Database Initialisation Script
-- PostgreSQL 14+
-- Run via: ./setup.sh  (see database/setup.sh)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- 1. users  (parent / guardian accounts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(120) NOT NULL,
    email           VARCHAR(254) NOT NULL UNIQUE,
    password_hash   TEXT         NOT NULL,
    is_verified     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 2. child_profiles  (linked to a parent user)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS child_profiles (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(80)  NOT NULL,
    -- avatar: emoji key or image-asset identifier stored as a string
    avatar          VARCHAR(80)  NOT NULL DEFAULT '🐝',
    date_of_birth   DATE,
    -- Nursery | LKG | UKG | Class1 … Class5
    current_class   VARCHAR(20)  NOT NULL
                    CHECK (current_class IN (
                        'Nursery','LKG','UKG',
                        'Class1','Class2','Class3','Class4','Class5'
                    )),
    -- bcrypt hash of the child's 4-digit PIN (optional; used for child self-login)
    pin_hash        TEXT,
    streak_count    INT          NOT NULL DEFAULT 0,
    last_active_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_child_profiles_user_id ON child_profiles(user_id);

-- ---------------------------------------------------------------------------
-- 3. subject_grades  (per-child, per-subject difficulty level)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subject_grades (
    id                         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id                   UUID         NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    -- Math | English | Science | EVS | GK | Hindi  (add more without schema change)
    subject                    VARCHAR(50)  NOT NULL,
    -- Easy | Medium | Hard
    current_level              VARCHAR(10)  NOT NULL DEFAULT 'Easy'
                               CHECK (current_level IN ('Easy','Medium','Hard')),
    -- rolling counters used by the grade-progression logic in the backend
    tests_at_current_level     INT          NOT NULL DEFAULT 0,
    avg_score_at_current_level NUMERIC(5,2) NOT NULL DEFAULT 0,
    updated_at                 TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (child_id, subject)
);

CREATE INDEX IF NOT EXISTS idx_subject_grades_child_id ON subject_grades(child_id);

-- ---------------------------------------------------------------------------
-- 4. tests  (one row per test attempt)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tests (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id        UUID         NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    subject         VARCHAR(50)  NOT NULL,
    difficulty      VARCHAR(10)  NOT NULL
                    CHECK (difficulty IN ('Easy','Medium','Hard')),
    -- e.g. ARRAY['mcq','fill_blank'] or ARRAY['mcq','fill_blank','match_following']
    question_types  TEXT[]       NOT NULL,
    question_count  INT          NOT NULL CHECK (question_count > 0),
    total_questions INT          NOT NULL CHECK (total_questions > 0),
    -- score is NULL until the test is submitted
    score           INT          CHECK (score >= 0),
    -- in_progress | completed | abandoned
    status          VARCHAR(15)  NOT NULL DEFAULT 'in_progress'
                    CHECK (status IN ('in_progress','completed','abandoned')),
    started_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tests_child_id   ON tests(child_id);
CREATE INDEX IF NOT EXISTS idx_tests_subject    ON tests(subject);
CREATE INDEX IF NOT EXISTS idx_tests_started_at ON tests(started_at DESC);

-- ---------------------------------------------------------------------------
-- 5. test_questions  (one row per question within a test)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS test_questions (
    id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id            UUID         NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
    question_order     INT          NOT NULL CHECK (question_order > 0),
    -- mcq | fill_blank | match_following
    type               VARCHAR(20)  NOT NULL
                       CHECK (type IN ('mcq','fill_blank','match_following')),
    question_text      TEXT         NOT NULL,
    -- MCQ: ["option A","option B","option C","option D"]
    options            JSONB,
    -- match_following: [{"left":"Cow","right":"Milk"},{"left":"Hen","right":"Egg"}]
    pairs              JSONB,
    -- correct_answer is NULL for match_following (correct state is embedded in pairs)
    correct_answer     TEXT,
    explanation        TEXT         NOT NULL,
    -- child_answer: string for mcq/fill_blank; JSON array of pairs for match_following
    child_answer       JSONB,
    -- NULL until the child answers this question
    is_correct         BOOLEAN,
    -- short AI-generated remedial note; only set for incorrect answers
    help_note          TEXT,
    time_taken_seconds INT,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (test_id, question_order)
);

CREATE INDEX IF NOT EXISTS idx_test_questions_test_id ON test_questions(test_id);

-- ---------------------------------------------------------------------------
-- 6. report_snapshots  (pre-computed weekly / monthly summaries)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS report_snapshots (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id         UUID         NOT NULL REFERENCES child_profiles(id) ON DELETE CASCADE,
    -- weekly | monthly
    period_type      VARCHAR(10)  NOT NULL
                     CHECK (period_type IN ('weekly','monthly')),
    period_start     DATE         NOT NULL,
    period_end       DATE         NOT NULL,
    total_tests      INT          NOT NULL DEFAULT 0,
    avg_score        NUMERIC(5,2) NOT NULL DEFAULT 0,
    -- e.g. {"Math":{"tests":3,"avg_score":75.0},"English":{"tests":2,"avg_score":60.0}}
    subjects_summary JSONB        NOT NULL DEFAULT '{}',
    -- e.g. [{"subject":"Math","from":"Easy","to":"Medium","promoted_at":"2026-07-01"}]
    grade_changes    JSONB        NOT NULL DEFAULT '[]',
    generated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (child_id, period_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_report_snapshots_child_id    ON report_snapshots(child_id);
CREATE INDEX IF NOT EXISTS idx_report_snapshots_period      ON report_snapshots(period_type, period_start);

-- ---------------------------------------------------------------------------
-- 7. refresh_tokens  (JWT refresh-token allowlist for parent sessions)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- store bcrypt/sha256 hash of the token, never the raw value
    token_hash  TEXT         NOT NULL UNIQUE,
    issued_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ  NOT NULL,
    revoked     BOOLEAN      NOT NULL DEFAULT FALSE,
    user_agent  TEXT,
    ip_address  INET
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- ---------------------------------------------------------------------------
-- Trigger: auto-update updated_at on every row change
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY['users', 'child_profiles', 'subject_grades']
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I;
            CREATE TRIGGER trg_%I_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        ', tbl, tbl, tbl, tbl);
    END LOOP;
END;
$$;

-- =============================================================================
-- Done — all BrightBee tables created.
-- =============================================================================
