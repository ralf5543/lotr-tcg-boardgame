import type { Ability, CardState, GameState, SiteCardState } from '../types';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { triggerConditionsMet } from '../engine/abilities/siteMove';
import { tryOpenFellowshipMoves } from '../engine/responseWindow';
import { getCurrentSite } from './sites';

type PhaseEvents = {
    setPhase?: (phase: string) => void;
};

function siteInstanceKey(site: SiteCardState): string {
    return (site as SiteCardState & { instanceId?: string }).instanceId || site.id;
}

/** L’effet optionnel peut-il changer quelque chose ? (inerte > faux) */
function optionalMoveEffectsAreLegal(G: GameState, ability: Ability): boolean {
    const fpId = G.fpPlayerId || '0';
    const fp = G.players[fpId];
    if (!fp) return false;
    const effects = ability.effects || [];
    if (effects.length === 0) return false;
    for (const effect of effects) {
        if (effect.type === 'DRAW') {
            if (!fp.deck || fp.deck.length === 0) return false;
            continue;
        }
        if (effect.type === 'REMOVE_BURDENS') {
            if ((fp.burdens || 0) < 1) return false;
            continue;
        }
        // Effet non géré ici : on n’ouvre rien.
        return false;
    }
    return true;
}

/** Capacité optionnelle « moves to » du site d’arrivée (regroupement). */
export function findOptionalSiteMoveAbility(
    G: GameState
): { site: SiteCardState; ability: Ability } | null {
    const site = getCurrentSite(G);
    if (!site?.abilities?.length) return null;
    for (const ability of site.abilities) {
        if (!ability.optional) continue;
        if (ability.trigger?.type !== 'MOVES_TO') continue;
        if ((ability.cost || []).length > 0) continue;
        if (!triggerConditionsMet(G, site, ability)) continue;
        if (!optionalMoveEffectsAreLegal(G, ability)) continue;
        return { site, ability };
    }
    return null;
}

/**
 * Ouvre le toaster « Activer / Passer » après un déplacement de regroupement.
 * `nextPhase` : phase à lancer une fois le choix tranché.
 */
export function beginOptionalSiteMoveAbility(
    G: GameState,
    nextPhase?: string
): boolean {
    if (G.pendingSiteMoveAbility) return true;
    const found = findOptionalSiteMoveAbility(G);
    if (!found) return false;
    G.pendingSiteMoveAbility = {
        playerId: G.fpPlayerId || '0',
        siteInstanceId: siteInstanceKey(found.site),
        abilityId: found.ability.id,
        pendingPhaseAfterSiteMove: nextPhase,
    };
    G.statusMessage =
        'Déplacement : vous pouvez utiliser l’effet du site d’arrivée.';
    return true;
}

/** Suite normale après le déplacement : « each time moves » puis phase. */
function resumeAfterSiteMove(
    G: GameState,
    events: PhaseEvents | undefined,
    nextPhase?: string
): void {
    if (tryOpenFellowshipMoves(G) === 'WAITING') {
        if (nextPhase) G.pendingPhaseAfterResponse = nextPhase;
        return;
    }
    if (nextPhase) events?.setPhase?.(nextPhase);
}

/** Passer ou Activer : applique l’effet si accepté, puis reprend le flux. */
export function resolvePendingSiteMoveAbility(
    G: GameState,
    playerID: string,
    accept: boolean,
    events?: PhaseEvents
): boolean {
    const pending = G.pendingSiteMoveAbility;
    if (!pending || pending.playerId !== playerID) return false;

    if (accept) {
        const site = getCurrentSite(G);
        const ability = site?.abilities?.find(
            (ab) => ab.id === pending.abilityId
        );
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
                undefined,
                undefined,
                undefined,
                playerID
            )
        ) {
            return false;
        }
        G.statusMessage = `${site.name || 'Le site'} : effet appliqué.`;
    }

    const nextPhase = pending.pendingPhaseAfterSiteMove;
    G.pendingSiteMoveAbility = undefined;
    resumeAfterSiteMove(G, events, nextPhase);
    return true;
}
