export type PasswordValidationResult = {
    ok: boolean;
    score: 0 | 1 | 2 | 3;
    errors: string[];
};

export function validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];

    if (password.length < 10) {
        errors.push("Almeno 10 caratteri");
    }
    if (!/[A-Za-z]/.test(password)) {
        errors.push("Almeno una lettera");
    }
    if (!/[0-9]/.test(password)) {
        errors.push("Almeno una cifra");
    }

    let score: 0 | 1 | 2 | 3 = 0;
    if (password.length >= 10) score = (score + 1) as 0 | 1 | 2 | 3;
    if (password.length >= 14 && /[A-Za-z]/.test(password) && /[0-9]/.test(password)) {
        score = (score + 1) as 0 | 1 | 2 | 3;
    }
    if (
        password.length >= 12 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password) &&
        /[^A-Za-z0-9]/.test(password)
    ) {
        score = (score + 1) as 0 | 1 | 2 | 3;
    }

    return {
        ok: errors.length === 0,
        score,
        errors,
    };
}
