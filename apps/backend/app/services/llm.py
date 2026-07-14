"""
LLM service — supports Anthropic Claude (production) and Ollama (local dev).
Switch is automatic: if ANTHROPIC_API_KEY is unset/placeholder, Ollama is used.
All AI calls are server-side only.
"""
import json
import re
from dataclasses import dataclass

from app.config import settings

CLASS_DISPLAY = {
    "Nursery": "Nursery (age 3-4)",
    "LKG": "Lower Kindergarten (age 4-5)",
    "UKG": "Upper Kindergarten (age 5-6)",
    "Class1": "Class 1 (age 6-7)",
    "Class2": "Class 2 (age 7-8)",
    "Class3": "Class 3 (age 8-9)",
    "Class4": "Class 4 (age 9-10)",
    "Class5": "Class 5 (age 10-11)",
}

# ---------------------------------------------------------------------------
# Determine which backend to use
# ---------------------------------------------------------------------------
_PLACEHOLDER = "your_anthropic_api_key_here"
_USE_OLLAMA = (
    not settings.ANTHROPIC_API_KEY
    or settings.ANTHROPIC_API_KEY == _PLACEHOLDER
)

if _USE_OLLAMA:
    import httpx
    _OLLAMA_URL = settings.OLLAMA_BASE_URL.rstrip("/") + "/api/generate"
    _OLLAMA_MODEL = settings.OLLAMA_MODEL
    print(f"[LLM] Using Ollama at {_OLLAMA_URL} (model: {_OLLAMA_MODEL})")
else:
    import anthropic
    _client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    _CLAUDE_MODEL = "claude-sonnet-4-6"
    print(f"[LLM] Using Anthropic Claude ({_CLAUDE_MODEL})")


def _call_llm(prompt: str, max_tokens: int = 4096) -> str:
    """Call whichever LLM backend is active and return the raw text response."""
    if _USE_OLLAMA:
        response = httpx.post(
            _OLLAMA_URL,
            json={
                "model": _OLLAMA_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {"num_predict": max_tokens, "temperature": 0.3},
            },
            timeout=120.0,
        )
        response.raise_for_status()
        return response.json()["response"].strip()
    else:
        message = _client.messages.create(
            model=_CLAUDE_MODEL,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        return message.content[0].text.strip()


# ---------------------------------------------------------------------------
# Data models
# ---------------------------------------------------------------------------
@dataclass
class MCQQuestion:
    question_text: str
    options: list[str]       # exactly 4
    correct_answer: str      # must match one of options exactly
    explanation: str         # 1-2 sentences, kid-friendly


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _best_option_match(correct_answer: str, options: list[str]) -> str | None:
    """
    Try to find the intended correct option when the LLM returns a value that
    doesn't exactly match. Checks (in order):
      1. Case-insensitive exact match
      2. correct_answer is a substring of an option
      3. An option is a substring of correct_answer
    Returns the matched option string, or None if no match found.
    """
    ca_lower = correct_answer.strip().lower()

    for opt in options:
        if opt.strip().lower() == ca_lower:
            return opt

    for opt in options:
        if ca_lower in opt.strip().lower():
            return opt

    for opt in options:
        if opt.strip().lower() in ca_lower:
            return opt

    return None


def _parse_mcq_response(raw: str, expected_count: int) -> list[MCQQuestion]:
    """Parse and validate LLM JSON output into MCQQuestion list."""
    # Strip markdown fences
    raw = re.sub(r'^```(?:json)?\s*', '', raw.strip())
    raw = re.sub(r'\s*```$', '', raw)

    # Extract first JSON object (Ollama sometimes adds extra text around it)
    match = re.search(r'\{.*\}', raw, re.DOTALL)
    if match:
        raw = match.group(0)

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"LLM returned invalid JSON: {e}\nRaw: {raw[:300]}")

    questions = []
    for i, q in enumerate(data.get("questions", [])):
        opts = q.get("options", [])
        if len(opts) != 4:
            raise ValueError(f"Question {i+1} has {len(opts)} options instead of 4")

        ca = q.get("correct_answer", "").strip()

        # Exact match — perfect
        if ca in opts:
            matched = ca
        else:
            # Try fuzzy correction
            matched = _best_option_match(ca, opts)
            if matched:
                print(f"[LLM] Auto-corrected correct_answer: '{ca}' → '{matched}'")
            else:
                raise ValueError(
                    f"Question {i+1}: correct_answer '{ca}' not in options {opts}"
                )

        questions.append(MCQQuestion(
            question_text=q["question_text"],
            options=opts,
            correct_answer=matched,
            explanation=q.get("explanation", ""),
        ))

    if len(questions) != expected_count:
        raise ValueError(f"Expected {expected_count} questions, got {len(questions)}")

    return questions


# ---------------------------------------------------------------------------
# Question generation (with retry)
# ---------------------------------------------------------------------------
MCQ_PROMPT = """You are an educational assessment generator for children in India (CBSE curriculum).

Generate exactly {count} multiple-choice questions for:
- Student level: {class_label}
- Subject: {subject}
- Difficulty: {difficulty}

STRICT RULES — follow exactly or your response will be rejected:
1. Each question must have exactly 4 options in the "options" array
2. The "correct_answer" value MUST be copied EXACTLY (character-for-character) from one of the 4 options
3. Do NOT paraphrase or shorten the correct_answer — copy it verbatim from the options list
4. Use simple, age-appropriate language
5. Cover different topics within the subject
6. explanation must be 1-2 encouraging, kid-friendly sentences

Respond with ONLY valid JSON — no markdown, no code fences, no extra text:
{{
  "questions": [
    {{
      "question_text": "What is 2 + 3?",
      "options": ["3", "4", "5", "6"],
      "correct_answer": "5",
      "explanation": "When we add 2 and 3 together, we get 5!"
    }}
  ]
}}"""


def generate_mcq_questions(
    subject: str,
    current_class: str,
    difficulty: str,
    count: int,
    max_retries: int = 3,
) -> list[MCQQuestion]:
    class_label = CLASS_DISPLAY.get(current_class, current_class)
    prompt = MCQ_PROMPT.format(
        count=count,
        class_label=class_label,
        subject=subject,
        difficulty=difficulty,
    )

    last_error: Exception = ValueError("No attempts made")
    for attempt in range(1, max_retries + 1):
        try:
            raw = _call_llm(prompt, max_tokens=4096)
            questions = _parse_mcq_response(raw, count)
            if attempt > 1:
                print(f"[LLM] Succeeded on attempt {attempt}")
            return questions
        except Exception as e:
            last_error = e
            print(f"[LLM] Attempt {attempt}/{max_retries} failed: {e}")

    raise ValueError(f"Question generation failed after {max_retries} attempts: {last_error}")


# ---------------------------------------------------------------------------
# Remedial help note
# ---------------------------------------------------------------------------
def generate_help_note(
    subject: str,
    current_class: str,
    question_text: str,
    correct_answer: str,
    child_answer: str,
) -> str:
    class_label = CLASS_DISPLAY.get(current_class, current_class)

    prompt = f"""A {class_label} student answered a {subject} question incorrectly.

Question: {question_text}
Their answer: {child_answer}
Correct answer: {correct_answer}

Write a short, encouraging 2-3 sentence explanation to help them understand why the correct answer is right.
- Use simple words a child can understand
- Be encouraging and positive (never say "wrong" or "incorrect")
- Give a helpful hint or example to remember it
- Return ONLY the explanation text, no labels or formatting."""

    return _call_llm(prompt, max_tokens=256)
