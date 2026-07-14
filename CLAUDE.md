# BrightBee — CLAUDE.md

## Project Overview

A cross-platform mobile app (iOS + Android) for children Nursery to Class 5 (ages 3–11) that lets parents manage child profiles and lets children take AI-generated subject tests with instant feedback and progress tracking.

## Tech Stack

| Layer | Choice |
|---|---|
| Mobile framework | React Native + Expo (managed workflow, EAS Build) |
| Navigation | React Navigation |
| State management | Redux Toolkit or Zustand |
| Backend | Node.js + Express (or NestJS) |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT-based, parent-managed accounts |
| AI provider | Anthropic Claude API (server-side only) |
| Hosting | Render / Railway / AWS |
| Push notifications | Expo Notifications |

## Key Architectural Rules

- **All AI calls are server-side only** — never call the AI API directly from the React Native client (API key security + child safety content filtering)
- AI must return **structured JSON** (use Claude's structured output / function calling) — never parse free text on the frontend
- No third-party ad or analytics SDKs that track children (COPPA compliance)
- All AI-generated content passes through a content-safety filter before being shown to a child

## Project Structure (planned)

```
BrightBee/
  apps/
    mobile/        # React Native + Expo app
    backend/       # Node.js + Express API server
  packages/        # Shared types/utilities (optional monorepo)
```

## Data Model

- **User** — parent account (id, name, email, password_hash)
- **ChildProfile** — linked to User (name, avatar, date_of_birth, current_class)
- **SubjectGrade** — per-child, per-subject current difficulty level
- **Test** — a test attempt (subject, difficulty, question_types, score)
- **TestQuestion** — individual question with child_answer, is_correct, help_note
- **ReportSnapshot** — weekly/monthly aggregated report per child

## AI Integration Points

1. **Question generation** — subject + class + difficulty + type + count → structured JSON
2. **Answer explanations** — returned alongside questions (no extra API call)
3. **Remedial notes** — generated post-submission only for wrong answers (short, kid-friendly, 2–4 sentences)

### Question JSON Schema

```json
{
  "questions": [
    {
      "id": "q1",
      "type": "mcq",
      "question": "What is 3 + 4?",
      "options": ["5", "6", "7", "8"],
      "correctAnswer": "7",
      "explanation": "3 + 4 means combining 3 and 4 objects, which gives 7."
    },
    {
      "id": "q2",
      "type": "fill_blank",
      "question": "The sun rises in the ____.",
      "correctAnswer": "east",
      "explanation": "The sun always rises in the east and sets in the west."
    },
    {
      "id": "q3",
      "type": "match_following",
      "pairs": [
        { "left": "Cow", "right": "Milk" },
        { "left": "Hen", "right": "Egg" }
      ],
      "explanation": "Each animal is matched with what it commonly gives us."
    }
  ]
}
```

## Build Phases

1. **Phase 1 — Foundation:** Expo setup, navigation, auth, child profile CRUD
2. **Phase 2 — Test Engine:** subject selection, test config, AI question generation (MCQ first)
3. **Phase 3 — Question Types:** fill-in-blank and match-the-following
4. **Phase 4 — Results & Explanations:** results screen, explanations, remedial notes
5. **Phase 5 — Persistence & Reporting:** weekly/monthly reports, grade progression logic
6. **Phase 6 — Polish:** animations, TTS, push notifications, parental dashboard

## UI/UX Principles

- Large buttons, icons, minimal text — designed for ages 3–11
- Encouraging, positive tone — no negative marking
- Word banks preferred over free-text input for younger children
- Optional text-to-speech for pre-readers (Nursery/LKG/UKG)
- High contrast, accessible font sizes

## Child Safety & Privacy

- Parental consent required for account creation
- Minimal data collection
- No open chat or direct AI text generation exposed to children
- No ads or third-party tracking SDKs

## Open Decisions

- AI provider confirmed: **Anthropic Claude API**
- Web dashboard for parents: TBD
- Multi-language support: TBD (relevant for Indian regional languages)
- Curriculum alignment: TBD (CBSE / ICSE / state board affects AI prompts)
