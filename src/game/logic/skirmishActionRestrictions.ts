import type { Ability, CardState, GameState, SiteCardState } from '../types';
import { forEachInPlayCard } from '../engine/abilities/resolveCostTarget';
import { abilityOwnerPlayerId } from '../engine/abilities/payAbilityCost';
import { whileConditionHolds } from './stats/mechanics/whileModifier';
import { getCurrentSite } from './sites';
import { abilityMatchesPhase } from '../engine/abilities/collectAbilities';

export type SkirmishActionKind = 'EVENT' | 'SPECIAL_ABILITY';

function cardInActiveSkirmish(G: GameState, card: CardState): boolean {
    if (!G.activeSkirmishId) return false;
    const skirmish = (G.skirmishes || []).find(
        (s) => s.id === G.activeSkirmishId
    );
    if (!skirmish) return false;
    const id = card.instanceId || card.id;
    if (!id) return false;
    if (skirmish.companionId === id) return true;
    if (skirmish.minionIds?.some((mid) => mid === id)) return true;
    if (skirmish.minionId === id) return true;
    return false;
}

function whoBlocksActingPlayer(
    G: GameState,
    source: CardState | SiteCardState,
    who: 'OPPONENT' | 'ALL' | 'FREE_PEOPLE' | 'SHADOW',
    actingPlayerId: string
): boolean {
    const fpId = G.fpPlayerId || '0';
    const isFp = actingPlayerId === fpId;
    if (who === 'ALL') return true;
    if (who === 'FREE_PEOPLE') return isFp;
    if (who === 'SHADOW') return !isFp;
    // OPPONENT : adversaire du propriétaire de la source
    const ownerId =
        'kind' in source && source.kind
            ? abilityOwnerPlayerId(G, source as CardState)
            : undefined;
    if (!ownerId) return false;
    return actingPlayerId !== ownerId;
}

function effectForbidsKind(
    effect: {
        type: string;
        events?: boolean;
        specialAbilities?: boolean;
    },
    kind: SkirmishActionKind
): boolean {
    if (kind === 'EVENT') return Boolean(effect.events);
    return Boolean(effect.specialAbilities);
}

function scanSourceAbilities(
    G: GameState,
    source: CardState | SiteCardState,
    actingPlayerId: string,
    kind: SkirmishActionKind
): boolean {
    for (const ability of source.abilities || []) {
        if (ability.trigger?.type !== 'WHILE') continue;
        // Sites / personnages : WHILE vide = toujours vrai en jeu / sur le site.
        if (
            'kind' in source &&
            source.kind &&
            !whileConditionHolds(G, source as CardState, ability)
        ) {
            continue;
        }
        for (const effect of ability.effects || []) {
            if (effect.type !== 'FORBID_SKIRMISH_ACTIONS') continue;
            if (!effectForbidsKind(effect, kind)) continue;
            if (
                !whoBlocksActingPlayer(G, source, effect.who, actingPlayerId)
            ) {
                continue;
            }
            if (effect.involvingSource) {
                if (!('kind' in source) || !source.kind) continue;
                if (!cardInActiveSkirmish(G, source as CardState)) continue;
            }
            return true;
        }
    }
    return false;
}

/**
 * True si un passif interdit à ce joueur les events / capacités Skirmish
 * (Faramir, Cavern Entrance…).
 */
export function isSkirmishActionForbidden(
    G: GameState,
    actingPlayerId: string,
    kind: SkirmishActionKind
): boolean {
    let forbidden = false;
    forEachInPlayCard(G, (source) => {
        if (forbidden) return;
        if (scanSourceAbilities(G, source, actingPlayerId, kind)) {
            forbidden = true;
        }
    });
    if (forbidden) return true;

    const site = getCurrentSite(G);
    if (site && scanSourceAbilities(G, site, actingPlayerId, kind)) {
        return true;
    }
    return false;
}

/** Capacité spéciale Skirmish: (carte en jeu), pas un événement. */
export function isSkirmishSpecialAbility(ability: Ability): boolean {
    return abilityMatchesPhase(ability, 'SKIRMISH');
}
