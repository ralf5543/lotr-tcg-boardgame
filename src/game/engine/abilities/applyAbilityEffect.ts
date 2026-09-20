import type {
    Ability,
    AbilityEffectExpiry,
    CardState,
    GameState,
    SiteCardState,
} from '../../types';
import type { ModifierScope } from '../../logic/stats/types';
import { resolveAbilityTarget, forEachInPlayCard, resolveWinnerTargets, resolveCostTarget } from './resolveCostTarget';
import { requestWounds, requestCancelSkirmish } from '../responseWindow';
import { cardMatchesTarget } from '../validations/matchers';
import { drawCardsForPlayer } from '../../../utils/drawCards';
import { discardCardFromPlay } from '../../../utils/discardCardFromPlay';
import { findTargetCard, isRingBearerCard } from '../../../utils/cardUtils';
import { getCalculatedStrength } from '../../logic/stats/statCalculator';
import {
    abilityOwnerPlayerId,
    discardCardsFromHand,
} from './payAbilityCost';
import { addThreats } from '../../logic/threats';
import { applyHeal } from '../../../utils/applyHeal';
import { applyExert } from '../../../utils/applyExert';
import { findSkirmishToCancel } from './cancelSkirmish';
import {
    getReplaceSiteCandidates,
    replaceCurrentSiteFromDeck,
    replacePathSiteFromDeck,
    getCurrentSiteIndex,
    takeControlOfSite,
    liberateSite,
    stackMinionOnControlledSite,
    playStackedMinion,
    getSitesControlledBy,
} from '../../logic/sites';
import { isSiteReplaceForbidden } from '../../logic/siteReplaceRestrictions';
import type { CardKeyword } from '../../types';

export function abilityReplaceSiteEffect(
    ability: Ability
): Extract<Ability['effects'][number], { type: 'REPLACE_SITE' }> | null {
    const effect = (ability.effects || []).find(
        (item) => item.type === 'REPLACE_SITE'
    );
    return effect && effect.type === 'REPLACE_SITE' ? effect : null;
}

export function abilityExchangeSiteEffect(
    ability: Ability
): Extract<Ability['effects'][number], { type: 'EXCHANGE_SITE' }> | null {
    const effect = (ability.effects || []).find(
        (item) => item.type === 'EXCHANGE_SITE'
    );
    return effect && effect.type === 'EXCHANGE_SITE' ? effect : null;
}

export function abilityNeedsSiteReplace(ability: Ability): boolean {
    return Boolean(abilityReplaceSiteEffect(ability));
}

export function abilityNeedsSiteExchange(ability: Ability): boolean {
    return Boolean(abilityExchangeSiteEffect(ability));
}

/** Replace REGION ou exchange : 1ʳᵉ cible path, 2ᵉ deck. */
export function abilityNeedsPathThenDeckSite(ability: Ability): boolean {
    const replace = abilityReplaceSiteEffect(ability);
    if (replace?.scope === 'REGION') return true;
    return abilityNeedsSiteExchange(ability);
}

export function abilityNeedsStackSite(ability: Ability): boolean {
    return (ability.effects || []).some(
        (item) => item.type === 'STACK_ON_CONTROLLED_SITE'
    );
}

export function abilityStackSiteEffect(
    ability: Ability
): Extract<Ability['effects'][number], { type: 'STACK_ON_CONTROLLED_SITE' }> | null {
    const effect = (ability.effects || []).find(
        (item) => item.type === 'STACK_ON_CONTROLLED_SITE'
    );
    return effect && effect.type === 'STACK_ON_CONTROLLED_SITE' ? effect : null;
}

/** Empile un autre séide (filtre) plutôt que la source. */
export function abilityStacksOtherMinion(ability: Ability): boolean {
    const effect = abilityStackSiteEffect(ability);
    return Boolean(effect && Array.isArray(effect.target));
}

export function abilityPlayFromStackEffect(
    ability: Ability
): Extract<Ability['effects'][number], { type: 'PLAY_FROM_STACK' }> | null {
    const effect = (ability.effects || []).find(
        (item) => item.type === 'PLAY_FROM_STACK'
    );
    return effect && effect.type === 'PLAY_FROM_STACK' ? effect : null;
}

/** Joue un autre séide empilé (filtre), pas la source elle-même. */
export function abilityPlaysOtherFromStack(ability: Ability): boolean {
    const effect = abilityPlayFromStackEffect(ability);
    return Boolean(effect && Array.isArray(effect.target));
}

/** Sites contrôlés où l’on peut empiler le séide source. */
export function getStackSiteCandidates(
    G: GameState,
    source: CardState
): SiteCardState[] {
    const ownerId = abilityOwnerPlayerId(G, source);
    if (!ownerId) return [];
    return getSitesControlledBy(G, ownerId).map(({ site }) => site);
}

/** Choix obligatoire seulement s’il y a plusieurs sites contrôlés. */
export function abilityNeedsStackSiteChoice(
    G: GameState,
    source: CardState,
    ability: Ability
): boolean {
    if (!abilityNeedsStackSite(ability)) return false;
    return getStackSiteCandidates(G, source).length > 1;
}

export function abilityReplaceSiteScope(
    ability: Ability
): 'CURRENT' | 'REGION' | undefined {
    return abilityReplaceSiteEffect(ability)?.scope;
}

function findPathIndexForSiteId(G: GameState, siteId: string): number {
    for (let i = 0; i < 9; i++) {
        const site = G.path[i];
        if (site && (site.instanceId === siteId || site.id === siteId)) {
            return i;
        }
    }
    return -1;
}

function normalizeChosenIds(chosen?: string | string[]): string[] {
    if (!chosen) return [];
    return Array.isArray(chosen) ? chosen.filter(Boolean) : [chosen];
}

function expiryToScope(expiresAtPhase: AbilityEffectExpiry): ModifierScope {
    if (expiresAtPhase === 'SKIRMISH') return 'SKIRMISH';
    if (expiresAtPhase === 'TURN_END') return 'TURN';
    return 'PHASE';
}

export function applyAbilityEffect(
    G: GameState,
    source: CardState,
    ability: Ability,
    chosenTargetId?: string | string[],
    discardedHandIds?: string[]
): boolean {
    const effects = ability.effects || [];
    if (effects.length === 0) return false;
    const chosenIds = normalizeChosenIds(chosenTargetId);

    for (const effect of effects) {
        if (effect.type === 'PREVENT_WOUND') {
            if (
                G.pendingEvent?.type !== 'ABOUT_TO_WOUND' ||
                G.pendingEvent.remaining <= 0
            ) {
                return false;
            }
            G.pendingEvent.remaining -= 1;
            continue;
        }

        if (effect.type === 'ADD_TWILIGHT') {
            G.twilightPool = (G.twilightPool || 0) + (effect.count || 0);
            continue;
        }

        if (effect.type === 'DRAW') {
            const fpId = G.fpPlayerId || '0';
            const ownerId =
                source.kind === 'SHADOW'
                    ? fpId === '0'
                        ? '1'
                        : '0'
                    : fpId;
            const player = G.players[ownerId];
            if (!player) return false;
            const isFellowship = (ability.phases || []).some(
                (phase) => phase.toUpperCase() === 'FELLOWSHIP'
            );
            drawCardsForPlayer(G, player, effect.count || 0, isFellowship);
            continue;
        }

        if (effect.type === 'REPLACE_SITE') {
            if (effect.from !== 'SITES_DECK') return false;
            const ownerId = abilityOwnerPlayerId(G, source);
            if (!ownerId) return false;
            const keyword = effect.siteKeyword as CardKeyword | undefined;

            if (effect.scope === 'CURRENT') {
                const siteId = chosenIds[0];
                if (!siteId) return false;
                if (isSiteReplaceForbidden(G, ownerId, getCurrentSiteIndex(G))) {
                    return false;
                }
                if (
                    getReplaceSiteCandidates(G, ownerId, keyword).length === 0
                ) {
                    return false;
                }
                if (
                    !replaceCurrentSiteFromDeck(G, ownerId, siteId, keyword)
                ) {
                    return false;
                }
                continue;
            }

            if (effect.scope === 'REGION') {
                const pathSiteId = chosenIds[0];
                const deckSiteId = chosenIds[1];
                if (!pathSiteId || !deckSiteId) return false;
                const pathIndex = findPathIndexForSiteId(G, pathSiteId);
                if (pathIndex < 0) return false;
                if (isSiteReplaceForbidden(G, ownerId, pathIndex)) {
                    return false;
                }
                const oldSite = G.path[pathIndex];
                if (!oldSite) return false;
                if (
                    getReplaceSiteCandidates(
                        G,
                        ownerId,
                        keyword,
                        oldSite.id
                    ).length === 0
                ) {
                    return false;
                }
                if (
                    !replacePathSiteFromDeck(
                        G,
                        ownerId,
                        pathIndex,
                        deckSiteId,
                        keyword
                    )
                ) {
                    return false;
                }
                continue;
            }

            return false;
        }

        if (effect.type === 'EXCHANGE_SITE') {
            if (effect.from !== 'SITES_DECK') return false;
            const ownerId = abilityOwnerPlayerId(G, source);
            if (!ownerId) return false;
            const pathSiteId = chosenIds[0];
            const deckSiteId = chosenIds[1];
            if (!pathSiteId || !deckSiteId) return false;
            const pathIndex = findPathIndexForSiteId(G, pathSiteId);
            if (pathIndex < 0) return false;
            const oldSite = G.path[pathIndex];
            if (!oldSite || (oldSite.ownerId || '') !== ownerId) return false;
            if (
                getReplaceSiteCandidates(G, ownerId, undefined, oldSite.id)
                    .length === 0
            ) {
                return false;
            }
            if (
                !replacePathSiteFromDeck(
                    G,
                    ownerId,
                    pathIndex,
                    deckSiteId
                )
            ) {
                return false;
            }
            continue;
        }

        if (effect.type === 'TAKE_CONTROL_SITE') {
            const ownerId = abilityOwnerPlayerId(G, source);
            if (!ownerId) return false;
            if (!takeControlOfSite(G, ownerId)) return false;
            continue;
        }

        if (effect.type === 'FORCE_CHOOSE_MOVE_AGAIN') {
            if ((G.movesThisTurn || 0) < 2) {
                G.forceChooseMoveAgain = true;
            }
            continue;
        }

        if (effect.type === 'LIBERATE_SITE') {
            const ownerId = abilityOwnerPlayerId(G, source);
            if (!ownerId) return false;
            if (!liberateSite(G, ownerId)) return false;
            continue;
        }

        if (effect.type === 'STACK_ON_CONTROLLED_SITE') {
            const ownerId = abilityOwnerPlayerId(G, source);
            if (!ownerId) return false;

            let cardToStack: CardState = source;
            let siteId: string | undefined = chosenIds[0];

            if (Array.isArray(effect.target)) {
                const minionId = chosenIds[0];
                if (!minionId) return false;
                const picked = findTargetCard(G, minionId) as CardState | null;
                if (!picked || picked.type !== 'MINION') return false;
                if (!cardMatchesTarget(picked, effect.target)) return false;
                cardToStack = picked;
                siteId = chosenIds[1];
            }

            if (
                !stackMinionOnControlledSite(
                    G,
                    cardToStack,
                    ownerId,
                    siteId
                )
            ) {
                return false;
            }
            continue;
        }

        if (effect.type === 'PLAY_FROM_STACK') {
            const ownerId = abilityOwnerPlayerId(G, source);
            if (!ownerId) return false;

            let cardToPlay: CardState = source;
            if (Array.isArray(effect.target)) {
                const minionId = chosenIds[0];
                if (!minionId) return false;
                const picked = findTargetCard(G, minionId) as CardState | null;
                if (!picked || picked.type !== 'MINION') return false;
                if (!cardMatchesTarget(picked, effect.target)) return false;
                cardToPlay = picked;
            }

            const paid = playStackedMinion(
                G,
                cardToPlay,
                ownerId,
                effect.twilightReduce || 0
            );
            if (paid === null) return false;
            continue;
        }

        if (effect.type === 'DISCARD_FROM_HAND') {
            const ownerId = abilityOwnerPlayerId(G, source);
            if (!ownerId) return false;
            if (discardedHandIds === undefined) return false;
            const ids = discardedHandIds;
            if (effect.upTo) {
                if (ids.length > (effect.count || 0)) return false;
            } else if (ids.length !== (effect.count || 0)) {
                return false;
            }
            if (ids.length > 0 && !discardCardsFromHand(G, ownerId, ids)) {
                return false;
            }
            continue;
        }

        if (effect.type === 'REMOVE_TWILIGHT') {
            const count = effect.countFromSpot
                ? countFromSpotCost(G, source, ability)
                : effect.count || 0;
            G.twilightPool = Math.max(0, (G.twilightPool || 0) - count);
            continue;
        }

        if (effect.type === 'REMOVE_BURDENS') {
            const fpId = G.fpPlayerId || '0';
            const fpPlayer = G.players[fpId];
            if (!fpPlayer) return false;
            const count = effect.countFromSpot
                ? countFromSpotCost(G, source, ability)
                : effect.count || 0;
            fpPlayer.burdens = Math.max(0, (fpPlayer.burdens || 0) - count);
            continue;
        }

        if (effect.type === 'REMOVE_THREATS') {
            addThreats(G, -(effect.count || 0));
            continue;
        }

        if (effect.type === 'CANCEL_SKIRMISH') {
            const skirmish = findSkirmishToCancel(
                G,
                source,
                effect.involving
            );
            if (!skirmish) return false;
            if (
                !requestCancelSkirmish(
                    G,
                    skirmish.id,
                    effect.shadowMayPrevent
                )
            ) {
                return false;
            }
            continue;
        }

        if (effect.type === 'WEAR_RING') {
            if (G.wearingTheOneRing) return false;
            G.wearingTheOneRing = {
                expiresAtPhase: effect.expiresAtPhase,
                replaceWoundWithBurdens: effect.replaceWoundWithBurdens,
                ...(effect.onlyInSkirmish
                    ? { onlyInSkirmish: true }
                    : {}),
                ...(effect.strengthBonus
                    ? { strengthBonus: effect.strengthBonus }
                    : {}),
            };
            continue;
        }

        if (effect.type === 'DISCARD_ALL') {
            const matches = resolveCostTarget(G, source, effect.target);
            for (const card of [...matches]) {
                discardCardFromPlay(G, card);
            }
            continue;
        }

        if (effect.type === 'MAKE_RING_BEARER') {
            if (!makeRingBearer(G, source, effect.resistance)) {
                return false;
            }
            continue;
        }

        if ('target' in effect && effect.target === 'WINNER') {
            const matches = resolveWinnerTargets(G, source, ability);
            const pick = chosenIds[0];
            const target = pick
                ? matches.find(
                      (card) =>
                          card.instanceId === pick || card.id === pick
                  ) || null
                : matches.length === 1
                  ? matches[0]
                  : null;
            if (!target) return false;
            if (!applyOneEffect(G, source, ability, effect, target)) {
                return false;
            }
            continue;
        }

        if (effect.type === 'HEAL' && effect.multiFromSpot) {
            const spot = countFromSpotCost(G, source, ability);
            const pool = resolveCostTarget(G, source, effect.target).filter(
                isHealableForMulti
            );
            const need = Math.min(spot, pool.length);
            if (need <= 0 || chosenIds.length !== need) return false;
            if (new Set(chosenIds).size !== chosenIds.length) return false;
            for (const id of chosenIds) {
                const target =
                    pool.find(
                        (card) =>
                            card.instanceId === id || card.id === id
                    ) || null;
                if (!target) return false;
                if (!applyOneEffect(G, source, ability, effect, target)) {
                    return false;
                }
            }
            continue;
        }

        const pick = chosenIds[0];
        const target = resolveAbilityTarget(
            G,
            source,
            effect.target,
            pick
        );
        if (!target) return false;
        if (!applyOneEffect(G, source, ability, effect, target)) {
            return false;
        }
    }
    return true;
}

function isHealableForMulti(card: CardState): boolean {
    return Boolean(card) && !card.isDead && (card.wounds || 0) > 0;
}

function applyOneEffect(
    G: GameState,
    source: CardState,
    ability: Ability,
    effect: Ability['effects'][number],
    target: CardState
): boolean {
    if (effect.type === 'ADD_TEMP_KEYWORD') {
        if (!target.tempKeywords) target.tempKeywords = [];
        target.tempKeywords.push({
            keyword: effect.keyword,
            expiresAtPhase: effect.expiresAtPhase,
        });
        return true;
    }

    if (effect.type === 'ADD_TEMP_STAT') {
        if (!G.tempModifiers) G.tempModifiers = [];
        const targetCardId = target.instanceId || target.id;
        let value = effect.value;
        if (effect.valueFromSourceStat === 'STRENGTH') {
            value = getCalculatedStrength(G, source);
        }
        if (effect.bearingBonus) {
            const bears = (target.attachments || []).some((att) =>
                cardMatchesTarget(att, effect.bearingBonus!.attachment)
            );
            if (bears) value = effect.bearingBonus.value;
        }
        if (effect.limit != null) {
            const used = G.tempModifiers
                .filter((mod) => mod.id.startsWith(`${ability.id}:`))
                .reduce((sum, mod) => sum + mod.value, 0);
            if (used + value > effect.limit) return false;
        }
        G.tempModifiers.push({
            id: `${ability.id}:${G.tempModifiers.length}`,
            sourceCardTitle: source.i18n?.fr?.title || source.title,
            targetCardId,
            stat: effect.stat,
            value,
            scope: expiryToScope(effect.expiresAtPhase),
            expiresAtPhase: effect.expiresAtPhase,
        });
        return true;
    }

    if (effect.type === 'WOUND') {
        requestWounds(G, target, effect.count || 1);
        return true;
    }

    if (effect.type === 'EXERT') {
        const times = effect.count || 1;
        for (let i = 0; i < times; i++) {
            if (!applyExert(G, target)) return false;
        }
        return true;
    }

    if (effect.type === 'HEAL') {
        if (target.isDead) return false;
        const amount = effect.multiFromSpot
            ? 1
            : effect.countFromSpot
              ? countFromSpotCost(G, source, ability)
              : effect.count || 1;
        applyHeal(G, target, amount);
        return true;
    }

    if (effect.type === 'DISCARD') {
        return discardCardFromPlay(G, target);
    }

    if (effect.type === 'ALLOW_SKIRMISH') {
        target.allowedToSkirmish = true;
        return true;
    }

    return false;
}

function countFromSpotCost(
    G: GameState,
    source: CardState,
    ability: Ability
): number {
    const spot = ability.cost?.[0]?.spot?.[0];
    if (!spot) return 0;
    return resolveCostTarget(G, source, spot.target).length;
}

export { countFromSpotCost };

function makeRingBearer(
    G: GameState,
    newBearer: CardState,
    resistance: number
): boolean {
    if (!newBearer || newBearer.isDead) return false;
    if (isRingBearerCard(newBearer)) return false;

    forEachInPlayCard(G, (card) => {
        if (!card.keywords?.includes('RING-BEARER')) return;
        card.keywords = card.keywords.filter(
            (keyword) => keyword !== 'RING-BEARER'
        );
    });

    if (!newBearer.keywords) newBearer.keywords = [];
    if (!newBearer.keywords.includes('RING-BEARER')) {
        newBearer.keywords.push('RING-BEARER');
    }
    newBearer.resistance = resistance;

    const deadId =
        G.pendingEvent?.type === 'CHARACTER_DIES'
            ? G.pendingEvent.deadCardId
            : undefined;
    const dead = deadId
        ? (findTargetCard(G, deadId) as CardState | null)
        : null;

    const ringSources: CardState[] = [];
    if (dead?.attachments?.length) ringSources.push(dead);
    forEachInPlayCard(G, (card) => {
        if (card === newBearer || card === dead) return;
        if (card.attachments?.some((att) => att.type === 'RING')) {
            ringSources.push(card);
        }
    });

    if (!newBearer.attachments) newBearer.attachments = [];
    for (const host of ringSources) {
        const kept: CardState[] = [];
        for (const att of host.attachments || []) {
            if (att.type === 'RING') {
                newBearer.attachments.push(att);
            } else {
                kept.push(att);
            }
        }
        host.attachments = kept;
    }

    // Nouveau Porteur : les fardeaux du joueur FP repartent à zéro.
    const fpId = G.fpPlayerId || '0';
    const fpPlayer = G.players[fpId];
    if (fpPlayer) {
        fpPlayer.burdens = 0;
    }

    const name =
        newBearer.i18n?.fr?.title || newBearer.title || 'Ce personnage';
    G.statusMessage = `${name} devient le Porteur de l’Anneau (résistance ${resistance}).`;
    return true;
}

export function clearExpiredTempKeywords(
    G: GameState,
    phase: AbilityEffectExpiry
): void {
    forEachInPlayCard(G, (card) => {
        if (!card.tempKeywords || card.tempKeywords.length === 0) return;
        card.tempKeywords = card.tempKeywords.filter(
            (mod) => mod.expiresAtPhase !== phase
        );
        if (card.tempKeywords.length === 0) {
            delete card.tempKeywords;
        }
    });

    if (G.tempModifiers && G.tempModifiers.length > 0) {
        G.tempModifiers = G.tempModifiers.filter(
            (mod) => mod.expiresAtPhase !== phase
        );
        if (G.tempModifiers.length === 0) {
            delete G.tempModifiers;
        }
    }

    if (phase === 'REGROUP') {
        delete G.wearingTheOneRing;
    }
}
