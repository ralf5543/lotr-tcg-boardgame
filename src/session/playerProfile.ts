/**
 * Profil de session local (Phase 2 étape 1) — sans compte serveur.
 * Nom + avatar (liste = contenu de `public/avatars/`, générée au build).
 */

import {
    SESSION_AVATARS,
    type SessionAvatarId,
} from './avatarList.generated';

export { SESSION_AVATARS, type SessionAvatarId };

export const SESSION_PROFILE_KEY = 'lotr.sessionProfile';

export const MAX_DISPLAY_NAME_LENGTH = 24;

export type SessionAvatarEntry = {
    id: string;
    path: string;
};

export type SessionProfile = {
    name: string;
    avatarId: SessionAvatarId | string;
};

type StoredProfile = {
    name?: unknown;
    avatarId?: unknown;
};

export function defaultAvatarForSeat(
    playerId: string
): SessionAvatarEntry {
    if (SESSION_AVATARS.length === 0) {
        return { id: 'missing', path: 'avatars/missing.png' };
    }
    if (SESSION_AVATARS.length === 1 || playerId === '0') {
        return SESSION_AVATARS[0];
    }
    return SESSION_AVATARS[1] ?? SESSION_AVATARS[0];
}

export function avatarPathForId(avatarId: string): string {
    const found = SESSION_AVATARS.find((a) => a.id === avatarId);
    return found?.path ?? defaultAvatarForSeat('0').path;
}

export function isSessionAvatarId(value: unknown): value is string {
    return (
        typeof value === 'string' &&
        SESSION_AVATARS.some((a) => a.id === value)
    );
}

export function normalizeDisplayName(raw: unknown): string {
    if (typeof raw !== 'string') return '';
    return raw.replace(/\s+/g, ' ').trim().slice(0, MAX_DISPLAY_NAME_LENGTH);
}

export function normalizeSessionProfile(
    raw: StoredProfile | null | undefined
): SessionProfile {
    const fallbackId = defaultAvatarForSeat('0').id;
    return {
        name: normalizeDisplayName(raw?.name),
        avatarId: isSessionAvatarId(raw?.avatarId)
            ? raw.avatarId
            : fallbackId,
    };
}

export function loadSessionProfile(): SessionProfile {
    if (typeof localStorage === 'undefined') {
        return normalizeSessionProfile(null);
    }
    try {
        const raw = localStorage.getItem(SESSION_PROFILE_KEY);
        if (!raw) return normalizeSessionProfile(null);
        return normalizeSessionProfile(JSON.parse(raw) as StoredProfile);
    } catch {
        return normalizeSessionProfile(null);
    }
}

export function saveSessionProfile(profile: SessionProfile): SessionProfile {
    const next = normalizeSessionProfile(profile);
    if (typeof localStorage !== 'undefined') {
        try {
            localStorage.setItem(SESSION_PROFILE_KEY, JSON.stringify(next));
        } catch {
            /* quota / mode privé */
        }
    }
    return next;
}

/** Profil prêt pour `setupData` / createInitialPlayer. */
export function sessionProfileForSetup(profile?: SessionProfile): {
    name: string;
    avatar: string;
} {
    const p = profile ?? loadSessionProfile();
    return {
        name: p.name,
        avatar: avatarPathForId(p.avatarId),
    };
}

/** Nom affiché en partie si le profil n’a pas de pseudo. */
export function fallbackSeatName(playerId: string): string {
    return `Joueur ${playerId}`;
}
