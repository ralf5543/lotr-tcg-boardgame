/** Code de partie = matchID boardgame.io (nanoid 11). */

export function normalizeMatchCode(raw: string): string {
    return raw.replace(/\s+/g, '').trim();
}

export function isPlausibleMatchCode(code: string): boolean {
    // nanoid URL-safe : A-Za-z0-9_- ; longueur typique 11, on accepte 6–21.
    return /^[A-Za-z0-9_-]{6,21}$/.test(code);
}
