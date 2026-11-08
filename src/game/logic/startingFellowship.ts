import type { CardState, GameState } from '../types';
import { isRingBearerCard } from '../../utils/cardUtils';
import { afterCardPlayed } from '../engine/abilities/eachTimeYouPlay';
import { applyAutomaticToPlayCosts } from './applyToPlayCosts';
import { appendCardPlayedJournal } from './journal';

/**
 * Coût crépuscule compté pour la **limite de construction** (max 4).
 * Les réductions « when in your starting fellowship » s’appliquent ici.
 * Ce coût n’est **pas** ajouté au pool à la révélation.
 */
export function getStartingFellowshipTwilightCost(card: CardState): number {
    const printed = Number(card.twilightCost) || 0;
    const reduce = Number(card.startingFellowshipTwilightReduce) || 0;
    return Math.max(0, printed - reduce);
}

/**
 * Après pose du site 1 : révéler les compagnies, et **jouer** les compagnons
 * de départ du joueur FP (sauf le Porteur) — toPlay + when-played.
 *
 * Le Porteur n’est pas joué. Les autres compagnons le sont, mais leur coût
 * crépuscule n’alimente **pas** le pool (plafond 4 = construction de deck).
 */
export function revealAndPlayStartingFellowships(G: GameState): void {
    const fpId = G.fpPlayerId || '0';

    for (const [playerId, player] of Object.entries(G.players || {})) {
        if (!player?.fellowshipArea?.length) continue;

        for (const card of player.fellowshipArea) {
            card.isFaceDown = false;
        }

        if (playerId !== fpId) continue;

        for (const card of player.fellowshipArea) {
            if (card.type !== 'COMPANION') continue;
            if (isRingBearerCard(card)) continue;

            applyAutomaticToPlayCosts(G, card, fpId, 'fellowship');
            afterCardPlayed(G, card, {
                playerId: fpId,
                phase: 'fellowship',
            });
            appendCardPlayedJournal(G, fpId, card);
        }
    }
}
