import type { CardState, GameResult, GameState } from '../types';
import { isRingBearerCard } from '../../utils/cardUtils';
import { getEffectiveResistance, getEffectiveVitality } from '../../utils/cardStats';
import { getCardText } from '../../utils/i18n';
import { otherPlayerId, playerDisplayName } from './playerName';
import { appendActorJournal } from './journal';

function fpPlayer(G: GameState) {
    return G.players[G.fpPlayerId || '0'];
}

function shadowPlayerId(G: GameState): string {
    return otherPlayerId(G.fpPlayerId || '0');
}

function ringBearerDisplayName(card: CardState | null): string {
    if (!card) return 'Le Porteur';
    return (
        getCardText(card, 'fr').title ||
        card.title ||
        card.i18n?.en?.title ||
        'Le Porteur'
    );
}

/** Porteur vivant encore en aire de communauté. */
export function findLivingRingBearer(G: GameState): CardState | null {
    const player = fpPlayer(G);
    for (const card of player?.fellowshipArea || []) {
        if (!isRingBearerCard(card)) continue;
        if (card.isDead) continue;
        if (getEffectiveVitality(card) <= 0) continue;
        return card;
    }
    return null;
}

/** Porteur pour le récit (vivant, sinon dernier en pile de mort). */
export function findRingBearerForNarrative(G: GameState): CardState | null {
    const living = findLivingRingBearer(G);
    if (living) return living;

    const deadPile = fpPlayer(G)?.deadPile || [];
    for (let i = deadPile.length - 1; i >= 0; i--) {
        const card = deadPile[i];
        if (!card) continue;
        if (isRingBearerCard(card)) return card;
        if ((card.keywords || []).includes('RING-BEARER')) return card;
    }
    return null;
}

export function isAtSiteNine(G: GameState): boolean {
    const index =
        fpPlayer(G)?.currentSiteIndex ?? G.currentSiteIndex ?? 0;
    return index === 8;
}

export function buildGameEndDetail(params: {
    reason: GameResult['reason'];
    ringBearerName: string;
    ringBearerIsFemale: boolean;
}): string {
    const { reason, ringBearerName, ringBearerIsFemale: female } = params;
    switch (reason) {
        case 'SITE_NINE':
            return female
                ? `${ringBearerName}, aidée de ses compagnons, a détruit l’Anneau de Sauron.`
                : `${ringBearerName}, aidé de ses compagnons, a détruit l’Anneau de Sauron.`;
        case 'CORRUPTION':
            return female
                ? `${ringBearerName} a été corrompue par la volonté de l’Anneau.`
                : `${ringBearerName} a été corrompu par la volonté de l’Anneau.`;
        case 'RING_BEARER_KILLED':
            return `${ringBearerName} a succombé à ses blessures.`;
    }
}

/** Titre selon le joueur qui regarde (gagnant → « Vous »). */
export function gameEndTitleForViewer(
    result: Pick<GameResult, 'winnerPlayerId' | 'winnerName'>,
    viewerPlayerId: string | undefined
): string {
    if (viewerPlayerId != null && viewerPlayerId === result.winnerPlayerId) {
        return 'Vous remportez la partie';
    }
    return `${result.winnerName} remporte la partie`;
}

function setGameResult(
    G: GameState,
    winnerSide: GameResult['winnerSide'],
    reason: GameResult['reason']
): boolean {
    if (G.gameResult) return false;

    const winnerPlayerId =
        winnerSide === 'FREE_PEOPLES'
            ? G.fpPlayerId || '0'
            : shadowPlayerId(G);
    const winnerName = playerDisplayName(G, winnerPlayerId);
    const rb = findRingBearerForNarrative(G);
    const ringBearerName = ringBearerDisplayName(rb);
    const ringBearerIsFemale = Boolean(rb?.isFemale);
    const detail = buildGameEndDetail({
        reason,
        ringBearerName,
        ringBearerIsFemale,
    });

    G.gameResult = {
        winnerSide,
        reason,
        winnerPlayerId,
        winnerName,
        ringBearerName,
        ringBearerIsFemale,
        detail,
        overlayDismissed: false,
    };
    // Barre partagée : nom du gagnant (pas « Vous », les deux camps voient le même texte).
    appendActorJournal(G, winnerPlayerId, {
        vous: `Vous remportez la partie. ${detail}`,
        named: `${winnerName} remporte la partie. ${detail}`,
    });
    G.statusMessage = `${winnerName} remporte la partie. ${detail}`;
    return true;
}

/** Corruption : résistance effective du Porteur ≤ 0. */
export function checkCorruptionLoss(G: GameState): boolean {
    if (G.gameResult) return false;
    const rb = findLivingRingBearer(G);
    if (!rb) return false;
    const burdens = fpPlayer(G)?.burdens || 0;
    if (getEffectiveResistance(rb, burdens, G) > 0) return false;
    return setGameResult(G, 'SHADOW', 'CORRUPTION');
}

/**
 * Mort du Porteur : plus aucun Porteur vivant en communauté
 * (après réponses Sam / etc. et enterrement).
 */
export function checkRingBearerKilledLoss(G: GameState): boolean {
    if (G.gameResult) return false;
    // Setup / enchères : pas encore de vraie partie.
    if (G.setupState && G.setupState.step !== 'COMPLETE') return false;
    if (findLivingRingBearer(G)) return false;
    const player = fpPlayer(G);
    // Pas de communauté du tout = pas encore posée.
    if (!player?.fellowshipArea?.length && !(player?.deadPile || []).length) {
        return false;
    }
    return setGameResult(G, 'SHADOW', 'RING_BEARER_KILLED');
}

/** Victoire FP : site 9, Porteur vivant, au moment d’entrer en regroupement. */
export function checkSiteNineWin(G: GameState): boolean {
    if (G.gameResult) return false;
    if (!isAtSiteNine(G)) return false;
    if (!findLivingRingBearer(G)) return false;
    return setGameResult(G, 'FREE_PEOPLES', 'SITE_NINE');
}

/**
 * Fin de partie « continue » après un coup (corruption).
 * Mort du Porteur : uniquement après enterrement (`cleanupPendingDeaths`),
 * pour laisser les réponses (Sam, etc.). Site 9 : entrée regroupement.
 */
export function applyGameEndIfNeeded(G: GameState): boolean {
    if (G.gameResult) return true;
    return checkCorruptionLoss(G);
}

export function dismissGameEndOverlay(G: GameState): void {
    if (!G.gameResult) return;
    G.gameResult = { ...G.gameResult, overlayDismissed: true };
}
