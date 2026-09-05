import type { CardState, LotrMoveContext } from '../types';
import { canUseAbility } from '../engine/canUseAbility';
import {
    canPayAbilityCost,
    payAbilityCost,
} from '../engine/abilities/payAbilityCost';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { abilityMatchesPhase } from '../engine/abilities/collectAbilities';
import { findTargetCard } from '../../utils/cardUtils';

export const activateAbility = (
    { G, ctx, playerID }: LotrMoveContext,
    sourceInstanceId: string,
    abilityId: string
) => {
    const source = findTargetCard(G, sourceInstanceId) as CardState | null;
    if (!source) return 'INVALID_MOVE';

    const ability = source.abilities?.find((ab) => ab.id === abilityId);
    if (!ability) return 'INVALID_MOVE';

    const context = { G, ctx, playerID };
    if (!canUseAbility(source, context).valid) return 'INVALID_MOVE';
    if (!abilityMatchesPhase(ability, ctx.phase || '')) return 'INVALID_MOVE';
    if (!canPayAbilityCost(G, source, ability.cost)) return 'INVALID_MOVE';
    if (!payAbilityCost(G, source, ability.cost)) return 'INVALID_MOVE';
    if (!applyAbilityEffect(G, source, ability)) return 'INVALID_MOVE';

    const title =
        source.i18n?.fr?.title || source.title || source.id;
    G.statusMessage = `${title} active une capacité.`;
};

export const abilityMoves = {
    activateAbility,
};
