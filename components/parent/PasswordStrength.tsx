import { useState, useEffect } from "react";
import { Check, X } from "lucide-react";

interface PasswordStrengthProps {
    password: string;
    className?: string;
}

interface Requirement {
    label: string;
    test: (password: string) => boolean;
}

const requirements: Requirement[] = [
    { label: "At least 8 characters", test: (p) => p.length >= 8 },
    { label: "Contains uppercase letter", test: (p) => /[A-Z]/.test(p) },
    { label: "Contains lowercase letter", test: (p) => /[a-z]/.test(p) },
    { label: "Contains a number", test: (p) => /[0-9]/.test(p) },
];

function getStrength(password: string): number {
    let score = 0;
    for (const req of requirements) {
        if (req.test(password)) score++;
    }
    return score;
}

function getStrengthLabel(score: number): { label: string; color: string } {
    if (score === 0) return { label: "", color: "bg-gray-200" };
    if (score === 1) return { label: "Weak", color: "bg-red-500" };
    if (score === 2) return { label: "Fair", color: "bg-orange-500" };
    if (score === 3) return { label: "Good", color: "bg-yellow-500" };
    return { label: "Strong", color: "bg-green-500" };
}

export default function PasswordStrength({ password, className = "" }: PasswordStrengthProps) {
    const [strength, setStrength] = useState(0);

    useEffect(() => {
        setStrength(getStrength(password));
    }, [password]);

    const { label, color } = getStrengthLabel(strength);

    if (!password) return null;

    return (
        <div className={`space-y-3 ${className}`}>
            {/* Strength Meter */}
            <div className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Password Strength</span>
                    <span className={`font-medium ${strength === 4 ? 'text-green-600' :
                            strength === 3 ? 'text-yellow-600' :
                                strength === 2 ? 'text-orange-600' :
                                    'text-red-600'
                        }`}>
                        {label}
                    </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-300 ${color}`}
                        style={{ width: `${(strength / 4) * 100}%` }}
                    />
                </div>
            </div>

            {/* Requirements Checklist */}
            <ul className="space-y-1" role="list" aria-label="Password requirements">
                {requirements.map((req, i) => {
                    const passed = req.test(password);
                    return (
                        <li
                            key={i}
                            className={`flex items-center gap-2 text-sm ${passed ? 'text-green-600' : 'text-gray-500'
                                }`}
                        >
                            {passed ? (
                                <Check className="w-4 h-4" aria-hidden="true" />
                            ) : (
                                <X className="w-4 h-4" aria-hidden="true" />
                            )}
                            <span>{req.label}</span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

// Utility to validate password meets all requirements
export function isPasswordValid(password: string): boolean {
    return requirements.every((req) => req.test(password));
}
