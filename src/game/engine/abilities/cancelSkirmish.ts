import type {
    AbilityTargetRef,
    CardState,
    GameState,
    SkirmishState,
} from '../../types';
import { cardMatchesTarget } from '../validations/matchers';
import {
    findBearer,
    forEachInPlayCard,
} from './resolveCostTarget';

const matchId = (card: CardState, targetId: string) =>
    card.instanceId === targetId || card.id === targetId;

function findInPlayById(G: GameState, targetId: string): CardState | null {
    let found: CardState | null = null;
    forEachInPlayCard(G, (card) => {
        if (!found && matchId(card, targetId)) found = card;
    });
    return found;
}

function clearSkirmishTemps(G: GameState): void {
    forEachInPlayCard(G, (card) => {
        if (!card.tempKeywords || card.tempKeywords.length === 0) return;
        card.tempKeywords = card.tempKeywords.filter(
            (mod) => mod.expiresAtPhase !== 'SKIRMISH'
        );
        if (card.tempKeywords.length === 0) {
            delete card.tempKeywords;
        }
    });
    if (G.tempModifiers && G.tempModifiers.length > 0) {
        G.tempModifiers = G.tempModifiers.filter(
            (mod) => mod.expiresAtPhase !== 'SKIRMISH'
        );
        if (G.tempModifiers.length === 0) {
            delete G.tempModifiers;
        }
    }
}

function resolveInvolvingCards(
    G: GameState,
    source: CardState,
    involving: AbilityTargetRef
): CardState[] {
    if (involving === 'SELF') return [source];
    if (involving === 'BEARER') {
        const bearer = findBearer(G, source);
        return bearer ? [bearer] : [];
    }
    if (involving === 'SKIRMISHING' || involving === 'WINNER') return [];
    if (Array.isArray(involving)) {
        const matches: CardState[] = [];
        forEachInPlayCard(G, (card) => {
            if (cardMatchesTarget(card, involving)) matches.push(card);
        });
        return matches;
    }
    return [];
}

function skirmishHasParticipant(
    skirmish: SkirmishState,
    card: CardState
): boolean {
    const id = card.instanceId || card.id;
    if (!id) return false;
    if (skirmish.companionId === id) return true;
    return skirmish.minionIds.some((minionId) => minionId === id);
}

/** L’escarmouche implique-t-elle au moins une carte du filtre « involving » ? */
export function skirmishMatchesInvolving(
    G: GameState,
    skirmish: SkirmishState,
    source: CardState,
    involving: AbilityTargetRef
): boolean {
    return resolveInvolvingCards(G, source, involving).some((card) =>
        skirmishHasParticipant(skirmish, card)
    );
}

/**
 * Escarmouche à annuler : l’active si elle matche, sinon l’unique match.
 * Plusieurs matchs hors active → indécidable (inerte / pas légal).
 */
export function findSkirmishToCancel(
    G: GameState,
    source: CardState,
    involving: AbilityTargetRef
): SkirmishState | null {
    const open = (G.skirmishes || []).filter((s) => !s.resolved);
    const matches = open.filter((s) =>
        skirmishMatchesInvolving(G, s, source, involving)
    );
    if (matches.length === 0) return null;
    if (G.activeSkirmishId) {
        const active = matches.find((s) => s.id === G.activeSkirmishId);
        if (active) return active;
    }
    if (matches.length === 1) return matches[0];
    return null;
}

/** Annule sans vainqueur ni blessures. Les personnages restent en jeu. */
export function cancelSkirmish(G: GameState, skirmishId: string): boolean {
    const idx = (G.skirmishes || []).findIndex((s) => s.id === skirmishId);
    if (idx === -1) return false;

    const companion = findInPlayById(G, G.skirmishes[idx].companionId);
    const name =
        companion?.i18n?.fr?.title ||
        companion?.title ||
        'ce personnage';

    G.skirmishes.splice(idx, 1);
    if (G.activeSkirmishId === skirmishId) {
        G.activeSkirmishId = undefined;
        G.actionWindow = undefined;
    }
    clearSkirmishTemps(G);
    G.statusMessage = `Escarmouche annulée (${name}).`;
    return true;
}
