import type { Ability, CardState, GameState, SiteCardState } from '../types';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import {
    canPayAbilityCost,
    payAbilityCost,
} from '../engine/abilities/payAbilityCost';
import { triggerConditionsMet } from '../engine/abilities/siteMove';
import { tryOpenFellowshipMoves } from '../engine/responseWindow';
import {
    areBurdenRemovalsForbidden,
    areCultureTokenChangesForbidden,
    areHealsForbidden,
    getCurrentSite,
} from './sites';
import { canReinforce } from './cultureTokens';

type PhaseEvents = {
    setPhase?: (phase: string) => void;
};

function siteInstanceKey(site: SiteCardState): string {
    return (site as SiteCardState & { instanceId?: string }).instanceId || site.id;
}

/** Premier joueur légal pour un reinforce eachPlayerMay (FP puis Ombre). */
function firstEachPlayerMayResponder(
    G: GameState,
    ability: Ability
): string | null {
    const reinforce = (ability.effects || []).find(
        (e) => e.type === 'REINFORCE_CULTURE_TOKEN'
    );
    if (!reinforce || reinforce.type !== 'REINFORCE_CULTURE_TOKEN') {
        return null;
    }
    const fpId = G.fpPlayerId || '0';
    const shId = shadowPlayerId(G);
    if (canReinforce(G, fpId, reinforce.culture, reinforce.count || 1)) {
        return fpId;
    }
    if (canReinforce(G, shId, reinforce.culture, reinforce.count || 1)) {
        return shId;
    }
    return null;
}

/** Joueur qui répond à la capacité (FP par défaut ; Ombre si `responsePlayer`). */
function responderPlayerId(G: GameState, ability: Ability): string {
    const fpId = G.fpPlayerId || '0';
    if (ability.eachPlayerMay) {
        return firstEachPlayerMayResponder(G, ability) || fpId;
    }
    if (ability.responsePlayer === 'SHADOW') {
        return fpId === '0' ? '1' : '0';
    }
    return fpId;
}

function shadowPlayerId(G: GameState): string {
    const fpId = G.fpPlayerId || '0';
    return fpId === '0' ? '1' : '0';
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
            if (areBurdenRemovalsForbidden(G)) return false;
            if ((fp.burdens || 0) < 1) return false;
            continue;
        }
        if (effect.type === 'ADD_BURDENS') {
            // Réponse Ombre : toujours légal (on ajoute).
            continue;
        }
        if (
            effect.type === 'HEAL' &&
            (effect.all || effect.onePerCulture) &&
            Array.isArray(effect.target)
        ) {
            if (areHealsForbidden(G)) return false;
            const wounded = (fp.fellowshipArea || []).some(
                (c) =>
                    c &&
                    !c.isDead &&
                    (c.wounds || 0) > 0 &&
                    // Filtre grossier : Hobbit / companion — le match fin est à l’apply.
                    (effect.target as string[][]).some((group) =>
                        group.includes('HOBBIT')
                            ? c.race === 'HOBBIT'
                            : c.type === 'COMPANION'
                    )
            );
            if (!wounded) return false;
            continue;
        }
        if (effect.type === 'REINFORCE_CULTURE_TOKEN') {
            if (areCultureTokenChangesForbidden(G)) return false;
            // Légalité globale : au moins un joueur peut reinforce (eachPlayerMay).
            const shadowId = shadowPlayerId(G);
            const fpOk = canReinforce(
                G,
                fpId,
                effect.culture,
                effect.count || 1
            );
            const shOk = canReinforce(
                G,
                shadowId,
                effect.culture,
                effect.count || 1
            );
            if (!fpOk && !shOk) return false;
            continue;
        }
        // Effet non géré ici : on n’ouvre rien.
        return false;
    }
    return true;
}

/** Capacité optionnelle « moves to » du site d’arrivée. */
export function findOptionalSiteMoveAbility(
    G: GameState,
    forPlayerId?: string
): { site: SiteCardState; ability: Ability } | null {
    const site = getCurrentSite(G);
    if (!site?.abilities?.length) return null;
    for (const ability of site.abilities) {
        if (!ability.optional) continue;
        if (ability.trigger?.type !== 'MOVES_TO') continue;
        if (!triggerConditionsMet(G, site, ability)) continue;
        if (!optionalMoveEffectsAreLegal(G, ability)) continue;
        const playerId = forPlayerId || responderPlayerId(G, ability);
        // eachPlayerMay : n’offrir que si CE joueur a un reinforce légal.
        if (ability.eachPlayerMay) {
            const reinforce = (ability.effects || []).find(
                (e) => e.type === 'REINFORCE_CULTURE_TOKEN'
            );
            if (
                reinforce &&
                reinforce.type === 'REINFORCE_CULTURE_TOKEN' &&
                !canReinforce(
                    G,
                    playerId,
                    reinforce.culture,
                    reinforce.count || 1
                )
            ) {
                continue;
            }
        }
        if (
            !canPayAbilityCost(
                G,
                site as unknown as CardState,
                ability.cost,
                playerId
            )
        ) {
            continue;
        }
        return { site, ability };
    }
    return null;
}

function openPendingSiteMove(
    G: GameState,
    site: SiteCardState,
    ability: Ability,
    playerId: string,
    nextPhase?: string
): void {
    G.pendingSiteMoveAbility = {
        playerId,
        siteInstanceId: siteInstanceKey(site),
        abilityId: ability.id,
        pendingPhaseAfterSiteMove: nextPhase,
    };
    G.statusMessage =
        'Déplacement : vous pouvez utiliser l’effet du site d’arrivée.';
}

/**
 * Ouvre le toaster « Activer / Passer » après un déplacement.
 * `nextPhase` : phase à lancer une fois le choix tranché.
 */
export function beginOptionalSiteMoveAbility(
    G: GameState,
    nextPhase?: string,
    forPlayerId?: string
): boolean {
    if (G.pendingSiteMoveAbility) return true;
    const found = findOptionalSiteMoveAbility(G, forPlayerId);
    if (!found) return false;
    const playerId =
        forPlayerId || responderPlayerId(G, found.ability);
    openPendingSiteMove(G, found.site, found.ability, playerId, nextPhase);
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

/** Passer ou Activer : paie le coût et applique l’effet si accepté, puis reprend le flux. */
export function resolvePendingSiteMoveAbility(
    G: GameState,
    playerID: string,
    accept: boolean,
    events?: PhaseEvents,
    discardedHandIds?: string[],
    chosenEffectTargetIds?: string[]
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
        const source = site as unknown as CardState;
        if (!canPayAbilityCost(G, source, ability.cost, playerID)) {
            return false;
        }
        if (
            !payAbilityCost(
                G,
                source,
                ability.cost,
                undefined,
                discardedHandIds,
                undefined,
                playerID
            )
        ) {
            return false;
        }
        if (
            !applyAbilityEffect(
                G,
                source,
                ability,
                chosenEffectTargetIds,
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
    const abilityId = pending.abilityId;
    G.pendingSiteMoveAbility = undefined;

    // Morannon : après le FP, proposer à l’Ombre si encore légal.
    const site = getCurrentSite(G);
    const ability = site?.abilities?.find((ab) => ab.id === abilityId);
    if (ability?.eachPlayerMay && playerID === (G.fpPlayerId || '0')) {
        if (beginOptionalSiteMoveAbility(G, nextPhase, shadowPlayerId(G))) {
            return true;
        }
    }

    resumeAfterSiteMove(G, events, nextPhase);
    return true;
}
