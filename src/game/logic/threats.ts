import type { CardState, GameState } from '../types';
import { getEffectiveVitality } from '../../utils/cardStats';

/** Compagnons FP en jeu (les alliés ne comptent pas). */
export const countCompanionsInPlay = (G: GameState): number => {
    const fpId = G.fpPlayerId || '0';
    const fpPlayer = G.players[fpId];
    return (fpPlayer?.fellowshipArea ?? []).filter(
        (card) => card.type === 'COMPANION'
    ).length;
};

/** Limite papier : pas plus de menaces que de compagnons en jeu. */
export const getThreatLimit = (G: GameState): number =>
    countCompanionsInPlay(G);

export const canAddThreats = (G: GameState): boolean => {
    const fpId = G.fpPlayerId || '0';
    const current = G.players[fpId]?.threats || 0;
    return current < getThreatLimit(G);
};

/**
 * Ajoute (ou retire) des menaces sur le joueur FP.
 * À l’ajout : on s’arrête à la limite (un surplus est ignoré).
 * Un total déjà au-dessus de la limite (compagnon défaussé, pas tué) n’est pas raboté.
 * Retourne le delta réellement appliqué.
 */
export const addThreats = (G: GameState, amount: number): number => {
    const fpId = G.fpPlayerId || '0';
    const fpPlayer = G.players[fpId];
    if (!fpPlayer || amount === 0) return 0;

    const current = fpPlayer.threats || 0;

    if (amount < 0) {
        const removed = Math.min(current, -amount);
        fpPlayer.threats = current - removed;
        return -removed;
    }

    const limit = getThreatLimit(G);
    if (current >= limit) return 0;

    const added = Math.min(amount, limit - current);
    fpPlayer.threats = current + added;
    return added;
};

/** Compagnons encore vivants : seules cibles des blessures de menaces (pas les alliés). */
export const livingCompanionsForThreatWounds = (G: GameState): CardState[] => {
    const fpId = G.fpPlayerId || '0';
    const fpPlayer = G.players[fpId];
    return (fpPlayer?.fellowshipArea ?? []).filter(
        (card) =>
            card.type === 'COMPANION' &&
            !card.isDead &&
            getEffectiveVitality(card) > 0
    );
};

/**
 * Après qu’un compagnon ou un allié a rejoint la pile de mort :
 * on compte les menaces, on les retire, le FP assigne autant de blessures.
 * Une assignation déjà en cours n’en relance pas une autre (menaces déjà à 0).
 */
export const beginThreatWoundAssignment = (G: GameState): void => {
    if ((G.threatWoundsToAssign ?? 0) > 0) return;

    const fpId = G.fpPlayerId || '0';
    const fpPlayer = G.players[fpId];
    if (!fpPlayer) return;

    const threats = fpPlayer.threats || 0;
    if (threats <= 0) return;

    fpPlayer.threats = 0;

    if (livingCompanionsForThreatWounds(G).length === 0) {
        G.threatWoundsToAssign = undefined;
        G.statusMessage =
            threats === 1
                ? '1 menace retirée, aucun compagnon à blesser.'
                : `${threats} menaces retirées, aucun compagnon à blesser.`;
        return;
    }

    G.threatWoundsToAssign = threats;
    G.statusMessage =
        threats === 1
            ? 'Menaces : assignez 1 blessure à un compagnon.'
            : `Menaces : assignez ${threats} blessures à vos compagnons.`;
};
