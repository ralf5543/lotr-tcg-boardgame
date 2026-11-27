import bcrypt from 'bcryptjs';

const ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, ROUNDS);
}

export async function verifyPassword(
    password: string,
    passwordHash: string
): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
}

export function assertPasswordPolicy(password: string): string | null {
    if (typeof password !== 'string' || password.length < 8) {
        return 'Le mot de passe doit faire au moins 8 caractères.';
    }
    if (password.length > 200) {
        return 'Mot de passe trop long.';
    }
    return null;
}
