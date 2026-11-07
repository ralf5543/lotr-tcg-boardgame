import type { GameState, JournalEntry } from '../types';
import { otherPlayerId, playerDisplayName } from './playerName';

const JOURNAL_CAP = 200;

function pushEntry(G: GameState, entry: JournalEntry): void {
    if (!G.journalLog) G.journalLog = [];
    G.journalLog.push(entry);
    if (G.journalLog.length > JOURNAL_CAP) {
        G.journalLog = G.journalLog.slice(-JOURNAL_CAP);
    }
}

/** Ligne neutre (pas de « Vous »). */
export function appendJournal(G: GameState, text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    pushEntry(G, { named: trimmed });
}

/**
 * Fait attribué à un joueur : le spectateur local voit `vous`,
 * les autres voient `named` (avec le vrai nom).
 */
export function appendActorJournal(
    G: GameState,
    actorId: string | null | undefined,
    forms: { vous: string; named: string }
): void {
    const vous = forms.vous.trim();
    const named = forms.named.trim();
    if (!named) return;
    const id = actorId != null ? String(actorId) : '';
    if (!id) {
        pushEntry(G, { named });
        return;
    }
    pushEntry(G, {
        actorId: id,
        vous: vous || named,
        named,
    });
}

/** Texte à afficher pour le joueur local. */
export function formatJournalEntry(
    entry: JournalEntry | string,
    myPlayerId: string | null | undefined
): string {
    if (typeof entry === 'string') return entry;
    const mine =
        entry.actorId != null &&
        myPlayerId != null &&
        String(entry.actorId) === String(myPlayerId);
    if (mine && entry.vous) return entry.vous;
    return entry.named;
}

/** Raccourci : ligne d’acteur avec le nom profil courant. */
export function appendNamedActorJournal(
    G: GameState,
    actorId: string | null | undefined,
    build: (name: string) => { vous: string; named: string }
): void {
    const name = playerDisplayName(G, actorId);
    appendActorJournal(G, actorId, build(name));
}

/** Terminologie : 0/1 → point-fardeau ; 2+ → points-fardeau. */
export function formatPointsFardeau(count: number): string {
    const n = Math.max(0, Math.floor(Number(count) || 0));
    return n <= 1 ? `${n} point-fardeau` : `${n} points-fardeau`;
}

/**
 * Annonce les rôles FP / Ombre (deux lignes, chacune personnalisable « Vous »).
 * `prefix` : ex. « Nouveau tour ! » (ajouté uniquement sur la 1ʳᵉ ligne).
 */
export function appendSideRolesJournal(
    G: GameState,
    fpPlayerId: string,
    options?: { prefix?: string }
): void {
    const fpId = String(fpPlayerId);
    const shadowId = otherPlayerId(fpId);
    const fpName = playerDisplayName(G, fpId);
    const shadowName = playerDisplayName(G, shadowId);
    const prefix = options?.prefix?.trim()
        ? `${options.prefix.trim()} `
        : '';

    appendActorJournal(G, fpId, {
        vous: `${prefix}Vous jouez les Peuples Libres.`,
        named: `${prefix}${fpName} joue les Peuples Libres.`,
    });
    appendActorJournal(G, shadowId, {
        vous: 'Vous jouez l’Ombre.',
        named: `${shadowName} joue l’Ombre.`,
    });
}

/** Texte live neutre (bandeau) pour les rôles. */
export function formatSideRolesStatus(
    G: GameState,
    fpPlayerId: string,
    options?: { prefix?: string; suffix?: string }
): string {
    const fpId = String(fpPlayerId);
    const shadowId = otherPlayerId(fpId);
    const prefix = options?.prefix?.trim()
        ? `${options.prefix.trim()} `
        : '';
    const suffix = options?.suffix?.trim()
        ? ` ${options.suffix.trim()}`
        : '';
    return `${prefix}${playerDisplayName(G, fpId)} joue les Peuples Libres. ${playerDisplayName(G, shadowId)} joue l’Ombre.${suffix}`;
}
