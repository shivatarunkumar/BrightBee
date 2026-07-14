# Kids Learning & Assessment App — Project Specification

## 1. App Overview

Build a cross-platform mobile application (iOS + Android) using **React Native with Expo** targeted at children from **Nursery to Class 5** (primary school, roughly ages 3–11). The app allows children to register, select a subject, take AI-generated tests of varying complexity and question types, receive instant feedback with explanations, and track progress over time through weekly/monthly reports and an evolving grade level.

**Primary goals:**
- Make subject practice fun, adaptive, and low-friction for young children
- Use AI to dynamically generate questions instead of a static question bank
- Give parents/teachers visibility into a child's progress over time
- Adapt difficulty/grade as the child's performance improves

---

## 2. Target Users

- **Primary user:** Child (Nursery – Class 5), interacts with simple, large-button, icon-heavy UI
- **Secondary user:** Parent/Guardian (or teacher), manages registration, views reports, may need to approve account creation
- Assume low reading ability for younger age groups → prioritize icons, audio prompts, and short text

> Note: Since this app is for children, keep **COPPA / child-data-privacy** considerations in mind from day one — minimal data collection, parental consent flows, no ads/tracking SDKs, no open chat features exposing kids to AI text generation directly (AI is used server-side to generate/grade content, not as a child-facing chatbot).

---

## 3. Tech Stack

| Layer | Choice |
|---|---|
| Mobile framework | React Native + Expo (managed workflow, EAS Build for store deployment) |
| Navigation | React Navigation |
| State management | Redux Toolkit or Zustand |
| Backend | Node.js + Express (or NestJS for structure) |
| Database | PostgreSQL |
| ORM | Prisma or TypeORM |
| Auth | JWT-based, parent-managed accounts; optionally Firebase Auth |
| AI provider | Anthropic Claude API / OpenAI API (question generation, explanations, notes) |
| Hosting | Render/Railway/AWS for backend; Expo EAS for app builds |
| Push notifications | Expo Notifications (for report reminders) |

---

## 4. Core Features

### 4.1 Registration & Profiles
- Parent creates account, adds one or more child profiles (name, age/class, avatar)
- Each child profile tracks: current grade level per subject, test history, streaks
- Simple PIN or avatar-tap login for the child once parent has registered them

### 4.2 Subject Selection
- Home screen shows subject tiles: Math, English, Science, EVS, GK, etc. (configurable list per class)
- Each subject shows current level/grade and a "Start Test" button

### 4.3 Test Configuration
Before generating a test, user (or parent) selects:
- **Subject** (e.g., Math)
- **Number of questions** (e.g., 5 / 10 / 15)
- **Complexity/difficulty** (Easy / Medium / Hard, or auto-suggested based on current grade)
- **Question type(s)**: Multiple Choice, Fill in the Blanks, Match the Following (allow multi-select or "Mixed")

### 4.4 AI Question Generation
Backend calls the AI API with a structured prompt including: subject, class/age group, difficulty, question type, and count. AI returns **structured JSON** (not free text) so the app can render it reliably. Example schema:

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

**Important:** Enforce a strict JSON schema/response format from the AI (use function calling / structured output mode if the provider supports it) so the frontend never has to parse loose text.

### 4.5 Test-Taking Screen
- Render each question type with a dedicated component:
  - MCQ → radio buttons/tappable cards
  - Fill in the blank → text input or word bank (word bank better for younger kids)
  - Match the following → drag-and-drop or tap-to-connect UI
- Show progress bar ("Question 3 of 10")
- No negative marking; kid-friendly encouraging tone throughout

### 4.6 Submission & Results
On submission:
- Show score (e.g., 7/10)
- For each question: show the child's answer, correct answer, and **AI-generated explanation**
- For **incorrect** or **match-the-following mismatches**, trigger an additional AI call to generate a short, simple **"help me understand"** note — a kid-friendly mini-lesson on that specific concept (2–4 sentences, simple vocabulary, maybe with an example)
- Store full result (question, selected answer, correct answer, explanation, time taken) in DB

### 4.7 Data Persistence
Every test attempt is saved for future reference — nothing is ephemeral. This powers reporting and grade progression (see below).

### 4.8 Reports & Grade Progression
- **Weekly report**: tests taken, average score, subjects practiced, improvement trend
- **Monthly report**: broader trend, strong/weak topics, comparison to previous month
- **Grade/level progression**: as a child consistently scores well at a difficulty level, auto-promote them to the next complexity level for that subject (and vice versa — soft demotion if they consistently struggle)
- Reports viewable by parent; simplified version (stars/badges) shown to child

---

## 5. Data Model (draft)

```
User (parent)
 - id, name, email, password_hash, created_at

ChildProfile
 - id, user_id (FK), name, avatar, date_of_birth, current_class
 - created_at

SubjectGrade
 - id, child_id (FK), subject, current_level, updated_at

Test
 - id, child_id (FK), subject, difficulty, question_types[], question_count
 - created_at, completed_at, score, total_questions

TestQuestion
 - id, test_id (FK), type, question_text, options (json), correct_answer,
   explanation, child_answer, is_correct, help_note (nullable)

ReportSnapshot
 - id, child_id (FK), period_type (weekly/monthly), period_start, period_end,
   avg_score, subjects_summary (json), grade_changes (json)
```

---

## 6. AI Integration Points

1. **Question generation** — subject + class + difficulty + type + count → structured JSON questions
2. **Answer explanation** — generated together with each question (cache-friendly, no extra call needed)
3. **Remedial notes** — generated only for wrong answers post-submission, kept short and age-appropriate
4. **(Optional later)** — AI-suggested next difficulty level based on performance trend, phrased as a recommendation the grading engine can accept/reject

All AI calls happen **server-side only** — the app never calls the AI API directly from the client, both for API key security and to keep a moderation/safety layer in front of anything shown to a child.

---

## 7. Non-Functional Requirements

- **Child safety/privacy:** minimal data collection, parental consent for account creation, no third-party ad/analytics SDKs that track children, all AI output passed through basic content-safety filtering before display
- **Offline resilience:** cache last-fetched test if connectivity drops mid-test
- **Accessibility:** large fonts, high contrast, optional text-to-speech for question reading (helpful for pre-readers in Nursery/LKG/UKG)
- **Performance:** question generation should feel instant — show a friendly loading animation, consider pre-fetching next question while child answers current one
- **Scalability:** design DB/schema so new subjects or question types can be added without migration pain

---

## 8. Suggested Build Phases

1. **Phase 1 — Foundation:** Expo project setup, navigation, auth, child profile CRUD
2. **Phase 2 — Test Engine:** subject selection, test config screen, AI question generation (MCQ only first)
3. **Phase 3 — Question Types:** add fill-in-blank and match-the-following
4. **Phase 4 — Results & Explanations:** results screen, AI explanations, remedial notes
5. **Phase 5 — Persistence & Reporting:** DB schema, weekly/monthly report generation, grade progression logic
6. **Phase 6 — Polish:** kid-friendly UI/animations, TTS, push notification reminders, parental dashboard

---

## 9. Ready-to-Use Prompt for the AI Coding Agent

You can hand the section below directly to your AI coding assistant to kick off implementation:

> Build a React Native (Expo) mobile app for children from Nursery to Class 5 that lets a parent register child profiles, and lets each child take AI-generated subject tests (Math, English, Science, etc.). The user configures number of questions, difficulty, and question type (Multiple Choice, Fill in the Blank, Match the Following) before a test is generated by calling an AI API server-side, which returns structured JSON questions with correct answers and explanations. After submission, show the score with correct answers and explanations for every question, and for incorrect answers generate a short kid-friendly "help me understand" note via a follow-up AI call. Persist every test attempt (questions, answers, correctness, score) in PostgreSQL via a Node.js/Express backend, and use this data to generate weekly and monthly progress reports, plus auto-adjust the child's grade/difficulty level per subject based on performance trends over time. Use React Navigation, Redux Toolkit (or Zustand) for state, and Prisma as the ORM. Prioritize a simple, large-icon, low-text UI suitable for young children, and treat all AI calls as backend-only for security and content-safety filtering. Start with Phase 1 (project setup, auth, child profiles) before building the test engine.

---

### Open decisions before you start
- Which AI provider will you use for generation (OpenAI, Anthropic, etc.)?
- Will parents also get a web dashboard, or is everything mobile-only?
- Do you need multi-language support (many primary schools in India, for instance, teach in regional languages alongside English)?
- Any specific curriculum/board alignment needed (CBSE, ICSE, state board, etc.) — this affects how you prompt the AI for question generation?
