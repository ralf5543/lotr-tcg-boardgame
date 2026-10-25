import type { CardState, GameState } from '../types';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { getFpDiscardCandidates } from '../engine/abilities/designation';
import { findTargetCard } from '../../utils/cardUtils';

/**
 * FP désigne une situation après un coût Ombre (Dol Guldur…).
 */
export function resolvePendingFpDiscard(
    G: GameState,
    playerID: string,
    chosenTargetId: string
): boolean {
    const pending = G.pendingFpDiscard;
    if (!pending || pending.playerId !== playerID) return false;

    const source = findTargetCard(
        G,
        pending.sourceInstanceId
    ) as CardState | null;
    const ability = source?.abilities?.find((ab) => ab.id === pending.abilityId);
    if (!source || !ability) {
        G.pendingFpDiscard = undefined;
        return false;
    }

    const legal = getFpDiscardCandidates(G, source, ability);
    const target = legal.find(
        (c) => c.instanceId === chosenTargetId || c.id === chosenTargetId
    );
    if (!target) return false;

    // Appliquer seulement l’effet DISCARD (coût déjà payé à l’activation).
    const discardOnly = {
        ...ability,
        effects: (ability.effects || []).filter(
            (e) => e.type === 'DISCARD' && e.chooser === 'FREE_PEOPLE'
        ),
    };
    if (
        !applyAbilityEffect(
            G,
            source,
            discardOnly,
            chosenTargetId,
            undefined,
            undefined,
            playerID
        )
    ) {
        return false;
    }

    G.pendingFpDiscard = undefined;
    const name =
        target.i18n?.fr?.title || target.title || 'La situation';
    G.statusMessage = `${name} est défaussée.`;
    return true;
}
