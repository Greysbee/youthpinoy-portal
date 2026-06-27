"use client";

import { PASSWORD_RULES } from "@/lib/password-validation";

export default function PasswordRules({ password }: { password: string }) {
  return (
    <div className="mt-2 space-y-1">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <div key={rule.label} className="flex items-center gap-2 text-xs">
            {met ? (
              <svg className="h-3.5 w-3.5 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-3.5 w-3.5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <circle cx="12" cy="12" r="5" />
              </svg>
            )}
            <span className={met ? "text-brand-green" : "text-brand-muted"}>{rule.label}</span>
          </div>
        );
      })}
    </div>
  );
}
