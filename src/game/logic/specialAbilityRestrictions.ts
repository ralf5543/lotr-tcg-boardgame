import type { CardState, GameState } from '../types';
import {
    findBearer,
    forEachInPlayCard,
} from '../engine/abilities/resolveCostTarget';
import { whileConditionHolds } from './stats/mechanics/whileModifier';

/**
 * Sauron’s Gaze : le joueur FP ne peut pas utiliser les capacités spéciales
 * du porteur (carte personnage + attachements sur ce porteur).
 */
export function areBearerSpecialAbilitiesForbidden(
    G: GameState,
    card: CardState,
    actingPlayerId: string
): boolean {
    const fpId = G.fpPlayerId || '0';
    if (String(actingPlayerId) !== String(fpId)) return false;

    // Personnage cliqué, ou hôte si on clique un attachement.
    let host: CardState | null =
        card.type === 'COMPANION' ||
        card.type === 'ALLY' ||
        card.type === 'MINION'
            ? card
            : findBearer(G, card);
    if (!host) return false;

    const hostId = host.instanceId || host.id;
    let forbidden = false;
    forEachInPlayCard(G, (source, bearer) => {
        if (forbidden) return;
        // La situation doit être attachée au porteur.
        if (!bearer || (bearer.instanceId || bearer.id) !== hostId) return;
        for (const ability of source.abilities || []) {
            if (ability.trigger?.type !== 'WHILE') continue;
            if (!whileConditionHolds(G, source, ability)) continue;
            for (const effect of ability.effects || []) {
                if (effect.type !== 'FORBID_SPECIAL_ABILITIES') continue;
                if (effect.target !== 'BEARER') continue;
                if (effect.who !== 'FREE_PEOPLE') continue;
                forbidden = true;
                return;
            }
        }
    });
    return forbidden;
}
