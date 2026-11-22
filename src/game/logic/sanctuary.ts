import type { CardState, GameState } from '../types';
import { setRawStatus } from '../../i18n/status';
import { applyHeal } from '../../utils/applyHeal';
import { appendHealedJournal } from './journal';
import { isCurrentSiteSanctuary } from './sites';

export const SANCTUARY_HEAL_LIMIT = 5;

export const getSanctuaryHealCandidates = (G: GameState): CardState[] => {
    const fpId = G.fpPlayerId || '0';
    return (G.players[fpId]?.fellowshipArea || []).filter(
        (card) =>
            card.type === 'COMPANION' &&
            !card.isDead &&
            (card.wounds || 0) > 0
    );
};

/** Ouvre le choix « jusqu’à 5 blessures » si le site courant est un sanctuaire (Standard : emplacements 3 ou 6). */
export const beginSanctuaryHeals = (G: GameState): boolean => {
    if (!isCurrentSiteSanctuary(G)) return false;
    if (getSanctuaryHealCandidates(G).length === 0) return false;

    G.sanctuaryHeal = { remaining: SANCTUARY_HEAL_LIMIT };
    G.lastHealedCardIds = [];
    setRawStatus(G, 'Sanctuaire : soignez jusqu’à 5 blessures sur vos compagnons.');
    return true;
};

export const assignSanctuaryHeal = (G: GameState, cardId: string): boolean => {
    if (!G.sanctuaryHeal || G.sanctuaryHeal.remaining <= 0) return false;

    const target = getSanctuaryHealCandidates(G).find(
        (card) => card.instanceId === cardId || card.id === cardId
    );
    if (!target) return false;

    const healed = applyHeal(G, target, 1);
    if (healed <= 0) return false;
    appendHealedJournal(G, target, healed);
    G.sanctuaryHeal.remaining -= 1;
    return true;
};

export const sanctuaryHealsFinished = (G: GameState): boolean => {
    if (!G.sanctuaryHeal) return true;
    if (G.sanctuaryHeal.remaining <= 0) return true;
    return getSanctuaryHealCandidates(G).length === 0;
};

export const clearSanctuaryHeals = (G: GameState): void => {
    G.sanctuaryHeal = undefined;
};
