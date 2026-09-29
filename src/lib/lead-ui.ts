// Pure helpers for the lead forms UI (tested in tests/seo.test.ts). Network client: src/lib/lead-form.ts (from PR #2).

const MESSAGES: Record<string, string> = {
  'email:required': 'Enter your email address.',
  'email:invalid': 'Enter a valid email address.',
  'consent:required': 'Please tick the box so we can store your message.',
  'turnstile:required': 'Please complete the anti-spam check.',
  too_long: 'This is too long. Please shorten it.',
  invalid: 'Please check this field.',
  required: 'This field is required.',
};

export function fieldErrors(fields: Record<string, string> | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, code] of Object.entries(fields ?? {})) {
    out[k] = MESSAGES[`${k}:${code}`] ?? MESSAGES[code] ?? MESSAGES.invalid;
  }
  return out;
}

export function topicFromSearch(search: string): string | null {
  const t = new URLSearchParams(search).get('topic');
  return t && /^[a-z0-9-]{1,32}$/.test(t) ? t : null;
}

export type FormKind = 'early-access' | 'contact' | 'demo';

export function formKindFor(topic: string | null): FormKind {
  return topic === 'demo' ? 'demo' : 'contact';
}
