# BrightBee — Database

## Files

| File | Purpose |
|---|---|
| `init.sql` | Creates all tables, indexes, and triggers |
| `setup.sh` | End-to-end setup script (create DB, apply schema, grant permissions) |
| `.env.example` | Config template — copy to `.env` and fill in values |

## Quick Start

### Prerequisites
- PostgreSQL 14+ server running and reachable
- `psql` client installed on the machine running the script

```bash
# macOS
brew install libpq && brew link --force libpq

# Ubuntu / Debian
sudo apt install postgresql-client
```

### Steps

```bash
cd database/

# 1. Copy and edit the config
cp .env.example .env
# Fill in DB_HOST, DB_PORT, DB_ADMIN_USER, DB_ADMIN_PASSWORD, DB_APP_PASSWORD

# 2. Make the script executable
chmod +x setup.sh

# 3. Run setup
./setup.sh
```

The script will:
1. Create a least-privilege app role (`brightbee_app`)
2. Create the `brightbee` database
3. Apply `init.sql` (tables, indexes, triggers)
4. Grant only `SELECT / INSERT / UPDATE / DELETE` to the app role — no DDL access

### Re-running

The script is **idempotent** — safe to run multiple times. All `CREATE TABLE` and `CREATE INDEX` statements use `IF NOT EXISTS`.

---

## Schema Overview

```
users                   Parent / guardian accounts
  └─ child_profiles     One parent → many children
       ├─ subject_grades  Per-subject difficulty level per child
       ├─ tests            Each test attempt
       │    └─ test_questions  Individual questions + child answers
       └─ report_snapshots  Weekly / monthly summaries
refresh_tokens          JWT refresh-token allowlist (parent sessions)
```

### Table details

#### `users`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | auto-generated |
| name | VARCHAR(120) | |
| email | VARCHAR(254) UNIQUE | |
| password_hash | TEXT | bcrypt |
| is_verified | BOOLEAN | email verification flag |

#### `child_profiles`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK → users | CASCADE delete |
| name | VARCHAR(80) | |
| avatar | VARCHAR(80) | emoji or asset key |
| date_of_birth | DATE | |
| current_class | VARCHAR(20) | Nursery \| LKG \| UKG \| Class1–5 |
| pin_hash | TEXT | optional 4-digit PIN for child login |
| streak_count | INT | consecutive-day streak |

#### `subject_grades`
| Column | Type | Notes |
|---|---|---|
| child_id + subject | UNIQUE | one row per child per subject |
| current_level | VARCHAR(10) | Easy \| Medium \| Hard |
| tests_at_current_level | INT | resets on level change |
| avg_score_at_current_level | NUMERIC | rolling average |

#### `tests`
| Column | Type | Notes |
|---|---|---|
| question_types | TEXT[] | e.g. `{mcq,fill_blank}` |
| score | INT nullable | NULL until submitted |
| status | VARCHAR | in_progress \| completed \| abandoned |

#### `test_questions`
| Column | Type | Notes |
|---|---|---|
| type | VARCHAR | mcq \| fill_blank \| match_following |
| options | JSONB | MCQ choices array |
| pairs | JSONB | match_following left/right pairs |
| child_answer | JSONB | raw answer; JSON array for match |
| is_correct | BOOLEAN nullable | NULL until answered |
| help_note | TEXT nullable | AI remedial note (wrong answers only) |

#### `report_snapshots`
| Column | Type | Notes |
|---|---|---|
| period_type | VARCHAR | weekly \| monthly |
| subjects_summary | JSONB | per-subject stats |
| grade_changes | JSONB | level promotions/demotions in period |

---

## Connecting the Backend

Set `DATABASE_URL` in your backend `.env`:

```
DATABASE_URL=postgresql://brightbee_app:<password>@localhost:5432/brightbee
```

This is the value `setup.sh` prints at the end of a successful run.
