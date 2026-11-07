import type { GameState } from '../../types';
import { applyAbilityEffect } from './applyAbilityEffect';
import { collectCardAbilities } from './collectAbilities';
import { forEachInPlayCard, findBearer } from './resolveCostTarget';

/**
 * « At the start of each fellowship phase… » (Éclat de Lame : blesser le
 * porteur / point-fardeau si Porteur). Auto — pas de fenêtre d’actions.
 */
export function applyStartOfFellowshipTriggers(G: GameState): void {
    forEachInPlayCard(G, (card) => {
        for (const { source, ability } of collectCardAbilities(card)) {
            if (ability.trigger?.type !== 'START_OF_FELLOWSHIP') continue;
            // Besoin d’un porteur (situation déjà transférée).
            if (
                (ability.effects || []).some(
                    (e) =>
                        'target' in e &&
                        e.target === 'BEARER' &&
                        !findBearer(G, source)
                )
            ) {
                continue;
            }
            applyAbilityEffect(G, source, ability);
        }
    });
}
