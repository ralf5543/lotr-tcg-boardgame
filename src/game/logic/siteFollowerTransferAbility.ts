import type { Ability, CardState, GameState, SiteCardState } from '../types';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { getEffectDesignationCandidates } from '../engine/abilities/designation';
import { getEffectiveVitality } from '../../utils/cardStats';
import { getCurrentSite } from './sites';

type PhaseEvents = {
    setPhase?: (phase: string) => void;
};

function siteInstanceKey(site: SiteCardState): string {
    return (
        (site as SiteCardState & { instanceId?: string }).instanceId || site.id
    );
}

function shadowPlayerId(G: GameState): string {
    const fpId = G.fpPlayerId || '0';
    return fpId === '0' ? '1' : '0';
}

function findFollowerTransferAbility(
    site: SiteCardState | null
): Ability | null {
    if (!site?.abilities?.length) return null;
    for (const ability of site.abilities) {
        if (!ability.optional) continue;
        if (ability.trigger?.type !== 'FOLLOWER_TRANSFERRED') continue;
        if (ability.responsePlayer !== 'SHADOW') continue;
        return ability;
    }
    return null;
}

/** Au moins un compagnon peut encaisser N exerts. */
function canExertCompanionTimes(
    G: GameState,
    source: CardState,
    ability: Ability,
    times: number
): boolean {
    const candidates = getEffectDesignationCandidates(
        G,
        source,
        ability,
        shadowPlayerId(G)
    );
    return candidates.some(
        (card) => !card.isDead && getEffectiveVitality(card) > times
    );
}

/**
 * Après un transfert de suivant : ouvre le toaster Ombre si le site le permet.
 */
export function beginOptionalSiteFollowerTransferAbility(
    G: GameState
): boolean {
    if (G.pendingSiteFollowerTransfer) return true;
    const site = getCurrentSite(G);
    const ability = findFollowerTransferAbility(site);
    if (!site || !ability) return false;

    const source = site as unknown as CardState;
    const exert = (ability.effects || []).find((e) => e.type === 'EXERT');
    const times =
        exert && exert.type === 'EXERT' ? Math.max(1, exert.count || 1) : 2;
    if (!canExertCompanionTimes(G, source, ability, times)) return false;

    G.pendingSiteFollowerTransfer = {
        playerId: shadowPlayerId(G),
        siteInstanceId: siteInstanceKey(site),
        abilityId: ability.id,
    };
    G.statusMessage =
        'Ombre : vous pouvez affaiblir un compagnon (×2) après le transfert de suivant.';
    return true;
}

/**
 * Passer : ferme. Activer sans cible : false (désignation UI).
 * Activer avec chosenTargetId : applique l’exert.
 */
export function resolvePendingSiteFollowerTransferAbility(
    G: GameState,
    playerID: string,
    accept: boolean,
    chosenTargetId?: string,
    _events?: PhaseEvents
): boolean {
    const pending = G.pendingSiteFollowerTransfer;
    if (!pending || pending.playerId !== playerID) return false;

    if (!accept) {
        G.pendingSiteFollowerTransfer = undefined;
        G.statusMessage = 'Ombre : effet du site (transfert) décliné.';
        return true;
    }

    if (!chosenTargetId) return false;

    const site = getCurrentSite(G);
    const ability = site?.abilities?.find((ab) => ab.id === pending.abilityId);
    if (
        !site ||
        !ability ||
        siteInstanceKey(site) !== pending.siteInstanceId
    ) {
        return false;
    }

    if (
        !applyAbilityEffect(
            G,
            site as unknown as CardState,
            ability,
            chosenTargetId,
            undefined,
            undefined,
            playerID
        )
    ) {
        return false;
    }

    G.pendingSiteFollowerTransfer = undefined;
    G.statusMessage = `${site.name || 'Le site'} : compagnon affaibli.`;
    return true;
}
