"use client";

/**
 * Password strength meter.
 *
 * Every value here comes from `scorePassword()` — one scorer, in
 * `src/lib/password-strength.ts`. This component used to carry its own copy, and
 * the copy disagreed with the one on `/auth/reset-password`: it scored
 * `length >= 12` and lowercase, which the product states nowhere, while omitting
 * the uppercase rule the other page printed as a checklist. `Passw0rd!` was
 * "Very Strong" here and "Fair" there.
 *
 * The label is a **catalogue key**, not a word. The old `label: "Weak"` literal
 * was English in all 21 locales; `scorePassword` hands back
 * `AuthFlow.strength.weak` so the component has nothing to hardcode and nothing
 * to forget to translate.
 */
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { PASSWORD_RULES, scorePassword } from "@/lib/password-strength";

interface PasswordStrengthProps {
  password: string;
  /** Also print the four rules and their ticks, not just the meter. */
  showChecklist?: boolean;
}

export const PasswordStrength: React.FC<PasswordStrengthProps> = ({ password, showChecklist = true }) => {
  const t = useTranslations("AuthFlow");
  const strength = useMemo(() => scorePassword(password), [password]);

  if (!password) return null;

  return (
    <div className="mt-2" id="password-strength">
      {/* `aria-hidden`: the four bars are a visual echo of the checklist below,
          and a screen reader announcing four unlabelled divs is noise. The text
          label is the accessible statement of the same fact. */}
      <div className="flex gap-1 mb-1" aria-hidden="true">
        {PASSWORD_RULES.map((rule, index) => (
          <div
            key={rule.id}
            className={`flex-1 h-[3px] rounded-full transition-colors duration-300 ${
              index < strength.score ? strength.color : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      <p className="text-xs font-medium text-muted-foreground">{t(strength.labelKey)}</p>

      {showChecklist && (
        <ul className="text-xs text-muted-foreground space-y-1 mt-2">
          {PASSWORD_RULES.map((rule) => (
            <li key={rule.id} className={strength.met[rule.id] ? "text-primary" : undefined}>
              <span aria-hidden="true">{strength.met[rule.id] ? "✓" : "•"}</span> {t(rule.labelKey)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PasswordStrength;
