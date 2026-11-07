import type { Ability, CardState, GameState } from '../../types';
import {
    getCurrentSite,
    getCurrentSiteIndex,
    isCardStackedOnControlledSite,
} from '../../logic/sites';
import { abilityOwnerPlayerId } from './payAbilityCost';
import { findBearer } from './resolveCostTarget';
import {
    isSkirmishActionForbidden,
    isSkirmishSpecialAbility,
} from '../../logic/skirmishActionRestrictions';

function cardTitleOf(card: CardState): string {
    return (
        card.title ||
        card.i18n?.en?.title ||
        card.i18n?.fr?.title ||
        ''
    )
        .trim()
        .toLowerCase();
}

export function isAssignedToSkirmish(
    G: GameState,
    card: CardState
): boolean {
    const id = card.instanceId || card.id;
    if (!id) return false;
    return (G.skirmishes || []).some((skirmish) => {
        if (skirmish.companionId === id) return true;
        if (skirmish.minionIds?.some((mid) => mid === id)) return true;
        if (skirmish.minionId === id) return true;
        return false;
    });
}

/** Numéro de site courant (1–9), Standard. */
function getCurrentSiteNumber(G: GameState): number {
    const site = getCurrentSite(G);
    if (site?.siteNumber != null) return site.siteNumber;
    return getCurrentSiteIndex(G) + 1;
}

/** Restrictions hors coût / cible (ex. « not assigned to a skirmish »). */
export function abilityMeetsPlayRestrictions(
    G: GameState,
    source: CardState,
    ability: Ability
): boolean {
    if (ability.requiresUnassigned && isAssignedToSkirmish(G, source)) {
        return false;
    }
    if (ability.requiresBearerTitles && ability.requiresBearerTitles.length > 0) {
        const bearer = findBearer(G, source) || source;
        const title = cardTitleOf(bearer);
        const ok = ability.requiresBearerTitles.some(
            (t) => t.trim().toLowerCase() === title
        );
        if (!ok) return false;
    }
    if (
        typeof ability.requiresAtSiteNumber === 'number' &&
        ability.requiresAtSiteNumber > 0 &&
        getCurrentSiteNumber(G) !== ability.requiresAtSiteNumber
    ) {
        return false;
    }
    const siteNumber = getCurrentSiteNumber(G);
    if (
        typeof ability.requiresAtSiteNumberAtMost === 'number' &&
        ability.requiresAtSiteNumberAtMost > 0 &&
        siteNumber > ability.requiresAtSiteNumberAtMost
    ) {
        return false;
    }
    if (
        typeof ability.requiresAtSiteNumberAtLeast === 'number' &&
        ability.requiresAtSiteNumberAtLeast > 0 &&
        siteNumber < ability.requiresAtSiteNumberAtLeast
    ) {
        return false;
    }
    if (ability.requiresStackedOnControlledSite) {
        const ownerId = abilityOwnerPlayerId(G, source);
        if (!ownerId) return false;
        if (!isCardStackedOnControlledSite(G, source, ownerId)) return false;
    } else if (
        (ability.effects || []).some((e) => e.type === 'STACK_ON_CONTROLLED_SITE')
    ) {
        // Empiler : carte encore en jeu, pas déjà empilée
        if (findStacked(G, source)) return false;
    }
    if (isSkirmishSpecialAbility(ability)) {
        const ownerId = abilityOwnerPlayerId(G, source);
        if (
            ownerId &&
            isSkirmishActionForbidden(G, ownerId, 'SPECIAL_ABILITY')
        ) {
            return false;
        }
    }
    return true;
}

function findStacked(G: GameState, source: CardState): boolean {
    const id = source.instanceId || source.id;
    return (G.path || []).some((site) =>
        (site?.stacked || []).some(
            (c) => c && (c.instanceId === id || c.id === id)
        )
    );
}
