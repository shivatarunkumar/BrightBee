import * as SecureStore from 'expo-secure-store';

// iOS Simulator  → use localhost
// Physical device → use your Mac's local IP (must be on the same Wi-Fi)
const BASE_URL = 'http://192.168.0.69:8000/api/v1';

// ---------------------------------------------------------------------------
// Core fetch wrapper — throws with a readable message on non-2xx responses
// ---------------------------------------------------------------------------
async function request<T>(path: string, options: RequestInit = {}, auth = false): Promise<T> {
  const url = `${BASE_URL}${path}`;
  console.log('[API] -->', options.method ?? 'GET', url);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (auth) {
    const token = await TokenStorage.getAccessToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (err: any) {
    console.error('[API] Network error:', err?.message);
    throw new Error(`Network error: ${err?.message ?? 'Cannot reach server'}`);
  }

  const text = await response.text();
  console.log('[API] <--', response.status, text.slice(0, 200));

  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    body = { detail: text };
  }

  if (!response.ok) {
    const raw = body?.detail;
    const detail = Array.isArray(raw)
      ? raw.map((e: any) => e.msg ?? JSON.stringify(e)).join(', ')
      : (raw ?? `HTTP ${response.status}`);
    throw Object.assign(new Error(detail), { status: response.status, body });
  }

  return body as T;
}

// ---------------------------------------------------------------------------
// Token storage (SecureStore)
// ---------------------------------------------------------------------------
const KEYS = { access: 'bb_access_token', refresh: 'bb_refresh_token' };

export const TokenStorage = {
  saveTokens: (access: string, refresh: string) =>
    Promise.all([
      SecureStore.setItemAsync(KEYS.access, access),
      SecureStore.setItemAsync(KEYS.refresh, refresh),
    ]),
  getAccessToken: () => SecureStore.getItemAsync(KEYS.access),
  getRefreshToken: () => SecureStore.getItemAsync(KEYS.refresh),
  clearTokens: () =>
    Promise.all([
      SecureStore.deleteItemAsync(KEYS.access),
      SecureStore.deleteItemAsync(KEYS.refresh),
    ]),
};

// ---------------------------------------------------------------------------
// Auth endpoints
// ---------------------------------------------------------------------------
export const authApi = {
  register: (data: { name: string; username: string; email: string; password: string }) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  login: (data: { identifier: string; password: string }) =>
    request<{ access_token: string; refresh_token: string }>(
      '/auth/login', { method: 'POST', body: JSON.stringify(data) }
    ),

  logout: (refresh_token: string) =>
    request('/auth/logout', { method: 'POST', body: JSON.stringify({ refresh_token }) }),

  forgotPassword: (email: string) =>
    request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),

  resetPassword: (reset_token: string, new_password: string) =>
    request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ reset_token, new_password }) }),
};

// ---------------------------------------------------------------------------
// Child profile endpoints (authenticated)
// ---------------------------------------------------------------------------
export type Child = {
  id: string;
  name: string;
  avatar: string;
  date_of_birth: string | null;
  current_class: string;
  streak_count: number;
};

export type TestHistoryItem = {
  test_id: string;
  subject: string;
  difficulty: string;
  score: number;
  total: number;
  percentage: number;
  completed_at: string;
};

export type SubjectStat = {
  subject: string;
  tests: number;
  avg_percentage: number;
  best_percentage: number;
};

export type ChildStats = {
  total_tests: number;
  avg_percentage: number;
  best_subject: string | null;
  streak_count: number;
  subject_stats: SubjectStat[];
};

export const childApi = {
  list: () =>
    request<Child[]>('/children', { method: 'GET' }, true),

  create: (data: { name: string; avatar: string; date_of_birth: string | null; current_class: string }) =>
    request<Child>('/children', { method: 'POST', body: JSON.stringify(data) }, true),

  history: (childId: string) =>
    request<TestHistoryItem[]>(`/children/${childId}/history`, { method: 'GET' }, true),

  stats: (childId: string) =>
    request<ChildStats>(`/children/${childId}/stats`, { method: 'GET' }, true),
};

// ---------------------------------------------------------------------------
// Friendly error messages shown to the user
// ---------------------------------------------------------------------------
export function friendlyError(err: any): string {
  const msg: string = err?.message ?? '';

  if (!msg || msg.startsWith('Network error'))
    return 'Unable to connect. Please check your internet connection and try again.';

  if (msg.includes('email') && (msg.includes('valid') || msg.includes('@')))
    return 'Please enter a valid email address.';

  if (msg.includes('at least 8') || msg.includes('8 characters'))
    return 'Password must be at least 8 characters long.';

  if (msg.includes('username is already taken'))
    return 'That username is already taken. Please choose another.';

  if (msg.includes('already exists'))
    return 'An account with this email already exists. Try logging in instead.';

  if (msg.includes('Invalid email or password'))
    return 'Incorrect email or password. Please try again.';

  if (msg.includes('Invalid or expired'))
    return 'Your session has expired. Please log in again.';

  return 'Something went wrong. Please try again.';
}

// ---------------------------------------------------------------------------
// Test endpoints (authenticated)
// ---------------------------------------------------------------------------
import { QuestionForClient, QuestionResult } from '../types/navigation';

export const testApi = {
  generate: (data: { child_id: string; subject: string; difficulty: string; question_count: number }) =>
    request<{
      test_id: string;
      subject: string;
      difficulty: string;
      question_count: number;
      questions: QuestionForClient[];
    }>('/tests/generate', { method: 'POST', body: JSON.stringify(data) }, true),

  submit: (testId: string, answers: { question_id: string; answer: string; time_taken_seconds?: number }[]) =>
    request<{
      test_id: string;
      score: number;
      total: number;
      percentage: number;
      results: QuestionResult[];
    }>(`/tests/${testId}/submit`, { method: 'POST', body: JSON.stringify({ answers }) }, true),

  results: (testId: string) =>
    request<{
      test_id: string;
      score: number;
      total: number;
      percentage: number;
      results: QuestionResult[];
    }>(`/tests/${testId}/results`, { method: 'GET' }, true),
};
