export function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (/\s/.test(pw)) return "Password must not contain spaces.";
  if (!/[a-z]/.test(pw)) return "Password must include a lowercase letter.";
  if (!/[A-Z]/.test(pw)) return "Password must include an uppercase letter.";
  if (!/[0-9]/.test(pw)) return "Password must include a number.";
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pw)) return "Password must include a special character.";
  return null;
}

export const PASSWORD_RULES = [
  { test: (pw: string) => pw.length >= 8, label: "At least 8 characters" },
  { test: (pw: string) => /[a-z]/.test(pw), label: "One lowercase letter" },
  { test: (pw: string) => /[A-Z]/.test(pw), label: "One uppercase letter" },
  { test: (pw: string) => /[0-9]/.test(pw), label: "One number" },
  { test: (pw: string) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(pw), label: "One special character" },
  { test: (pw: string) => pw.length > 0 && !/\s/.test(pw), label: "No spaces" },
];
