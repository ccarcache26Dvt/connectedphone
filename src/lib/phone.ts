/** Keeps only digits; numbers must have 8 to 15 digits (E.164 range). */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

/** Accounts are keyed by phone; auth needs an email so we derive one. */
export function phoneToEmail(phone: string): string {
  return `${phone}@phone.chatline.app`;
}

export function formatPhone(phone: string): string {
  return `+${phone}`;
}
