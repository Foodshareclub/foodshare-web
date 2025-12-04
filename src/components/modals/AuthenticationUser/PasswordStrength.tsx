/**
 * Password Strength Indicator
 * Visual feedback for password strength
 */


import { useMemo } from "react";

interface PasswordStrengthProps {
  password: string;
}

type StrengthLevel = "weak" | "medium" | "strong" | "very-strong";

interface StrengthResult {
  level: StrengthLevel;
  score: number;
  label: string;
  color: string;
}

export const PasswordStrength: React.FC<PasswordStrengthProps> = ({ password }) => {
  const strength = useMemo((): StrengthResult => {
    if (!password) {
      return { level: "weak", score: 0, label: "", color: "bg-gray-300" };
    }

    let score = 0;

    // Length check
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;

    // Contains lowercase
    if (/[a-z]/.test(password)) score += 1;

    // Contains uppercase
    if (/[A-Z]/.test(password)) score += 1;

    // Contains number
    if (/[0-9]/.test(password)) score += 1;

    // Contains special character
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    // Determine strength level
    if (score <= 2) {
      return { level: "weak", score, label: "Weak", color: "bg-red-500" };
    } else if (score <= 4) {
      return { level: "medium", score, label: "Medium", color: "bg-orange-500" };
    } else if (score === 5) {
      return { level: "strong", score, label: "Strong", color: "bg-green-500" };
    } else {
      return { level: "very-strong", score, label: "Very Strong", color: "bg-green-600" };
    }
  }, [password]);

  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4, 5, 6].map((level) => (
          <div
            key={level}
            className={`flex-1 h-[3px] rounded-full transition-colors duration-300 ${
              level <= strength.score ? strength.color : "bg-gray-200"
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${strength.color.replace("bg-", "text-")}`}>
        "Password strength: {strength.label}"
      </p>
    </div>
  );
};
