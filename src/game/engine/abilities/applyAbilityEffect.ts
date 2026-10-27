import type {
    Ability,
    AbilityEffectExpiry,
    CardState,
    GameState,
    SiteCardState,
} from '../../types';
import type { ModifierScope } from '../../logic/stats/types';
import {
    resolveAbilityTarget,
    forEachInPlayCard,
    resolveWinnerTargets,
    resolveCostTarget,
    resolveSkirmishingOpponents,
} from './resolveCostTarget';
import {
    requestWounds,
    requestCancelSkirmish,
    requestExhaust,
    requestForceAssign,
} from '../responseWindow';
import { cardMatchesTarget } from '../validations/matchers';
import { drawCardsForPlayer } from '../../../utils/drawCards';
import {
    discardCardFromPlay,
    placeCardInDeadPile,
} from '../../../utils/discardCardFromPlay';
import { findTargetCard, isRingBearerCard } from '../../../utils/cardUtils';
import { getCalculatedStrength } from '../../logic/stats/statCalculator';
import {
    abilityOwnerPlayerId,
    discardCardsFromHand,
    playNextSiteDeckPlayerId,
} from './payAbilityCost';
import { playerHasInitiative } from '../../logic/initiative';
import { addThreats } from '../../logic/threats';
import {
    applyReinforce,
    getReinforceCandidates,
    placeCultureTokens,
    removeCultureTokensFromCard,
    tokenCountOnCard,
} from '../../logic/cultureTokens';
import { applyHeal } from '../../../utils/applyHeal';
import { applyExert } from '../../../utils/applyExert';
import { getEffectiveVitality } from '../../../utils/cardStats';
import { findSkirmishToCancel } from './cancelSkirmish';
import {
    getReplaceSiteCandidates,
    replaceCurrentSiteFromDeck,
    replacePathSiteFromDeck,
    playNextSiteFromDeck,
    canPlayNextSiteFromDeck,
    getCurrentSiteIndex,
    takeControlOfSite,
    liberateSite,
    stackMinionOnControlledSite,
    playStackedMinion,
    areCultureTokenChangesForbidden,
    areHealsForbidden,
    areBurdenRemovalsForbidden,
    isWoundPreventionForbidden,
    canCardTakeWound,
} from '../../logic/sites';
import {
    stackCardOnHost,
    takeStackedCardToHand,
    playStackedMinionFromCard,
    getCardsStackedOnHost,
} from '../../logic/cardStack';
import {
    getDeckOrDiscardPlayCandidates,
    getHandPlayCandidates,
    playCardFromDeckOrDiscard,
    playCardFromHand,
    searchDeckCardToDiscard,
    shufflePlayerDeck,
} from '../../logic/playFromOutOfPlay';
import { getWhileTwilightCostModifier } from '../../logic/stats/mechanics/whileModifier';
import { isSiteReplaceForbidden } from '../../logic/siteReplaceRestrictions';
import { afterCardPlayed } from './eachTimeYouPlay';
import { enforceWhileSelfDiscards } from './enforceWhileDiscard';
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
    return (
        Boolean(abilityReplaceSiteEffect(ability)) ||
        (ability.effects || []).some((item) => item.type === 'PLAY_NEXT_SITE')
    );
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

export function abilityPlayFromCardStackEffect(
    ability: Ability
): Extract<Ability['effects'][number], { type: 'PLAY_FROM_CARD_STACK' }> | null {
    const effect = (ability.effects || []).find(
        (item) => item.type === 'PLAY_FROM_CARD_STACK'
    );
    return effect && effect.type === 'PLAY_FROM_CARD_STACK' ? effect : null;
}

/**
 * Play from card stack sans coût à désigner (Web / Goblin Swarms Shadow) :
 * drag direct comme depuis la main — pas de bulle d’action.
 */
export function isCostlessPlayFromCardStack(ability: Ability): boolean {
    if ((ability.cost || []).length > 0) return false;
    const effect = abilityPlayFromCardStackEffect(ability);
    return Boolean(effect && Array.isArray(effect.target));
}

/** Joue un autre séide empilé (filtre), pas la source elle-même. */
export function abilityPlaysOtherFromStack(ability: Ability): boolean {
    const siteStack = abilityPlayFromStackEffect(ability);
    if (siteStack && Array.isArray(siteStack.target)) return true;
    return Boolean(abilityPlayFromCardStackEffect(ability));
}

export function abilityPlayFromDeckOrDiscardEffect(
    ability: Ability
): Extract<
    Ability['effects'][number],
    { type: 'PLAY_FROM_DECK_OR_DISCARD' }
> | null {
    const effect = (ability.effects || []).find(
        (item) => item.type === 'PLAY_FROM_DECK_OR_DISCARD'
    );
    return effect && effect.type === 'PLAY_FROM_DECK_OR_DISCARD'
        ? effect
        : null;
}

export function abilitySearchDeckToDiscardEffect(
    ability: Ability
): Extract<
    Ability['effects'][number],
    { type: 'SEARCH_DECK_TO_DISCARD' }
> | null {
    const effect = (ability.effects || []).find(
        (item) => item.type === 'SEARCH_DECK_TO_DISCARD'
    );
    return effect && effect.type === 'SEARCH_DECK_TO_DISCARD' ? effect : null;
}

export function abilityTakeFromDiscardEffect(
    ability: Ability
): Extract<
    Ability['effects'][number],
    { type: 'TAKE_FROM_DISCARD' }
> | null {
    const effect = (ability.effects || []).find(
        (item) => item.type === 'TAKE_FROM_DISCARD'
    );
    return effect && effect.type === 'TAKE_FROM_DISCARD' ? effect : null;
}

/** Choix pioche/défausse (Captured…) — pas une désignation plateau. */
export function abilityNeedsDeckOrDiscardPick(ability: Ability): boolean {
    return Boolean(
        abilityPlayFromDeckOrDiscardEffect(ability) ||
            abilitySearchDeckToDiscardEffect(ability) ||
            abilityTakeFromDiscardEffect(ability)
    );
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
    discardedHandIds?: string[],
    costTargetId?: string | string[],
    /** Joueur qui active (deck d’aventure pour PLAY_NEXT_SITE). */
    actingPlayerId?: string
): boolean {
    const effects = ability.effects || [];
    if (effects.length === 0) return false;
    const chosenIds = normalizeChosenIds(chosenTargetId);
    const costIds = normalizeChosenIds(costTargetId);

    for (
        let effectIndex = 0;
        effectIndex < effects.length;
        effectIndex += 1
    ) {
        const effect = effects[effectIndex]!;
        if (effect.type === 'PREVENT_WOUND') {
            if (isWoundPreventionForbidden(G)) return false;
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
            // Site Ombre (Slopes…) : le joueur qui active pioche.
            // Sinon : propriétaire de la carte (Ombre → Ombre, FP → FP).
            const ownerId =
                actingPlayerId &&
                (source.kind === 'SITE' || source.type === 'SITE')
                    ? actingPlayerId
                    : source.kind === 'SHADOW'
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
                enforceWhileSelfDiscards(G);
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
                if (pathIndex === getCurrentSiteIndex(G)) {
                    enforceWhileSelfDiscards(G);
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
            if (pathIndex === getCurrentSiteIndex(G)) {
                enforceWhileSelfDiscards(G);
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

        if (effect.type === 'PREVENT_MOVE_AGAIN') {
            G.preventMoveAgain = true;
            continue;
        }

        if (
            effect.type === 'HEAL' &&
            effect.all &&
            Array.isArray(effect.target)
        ) {
            if (areHealsForbidden(G)) return false;
            const matches = resolveCostTarget(G, source, effect.target).filter(
                (card) => !card.isDead && (card.wounds || 0) > 0
            );
            // Aucun blessé : succès inerte (Valley si Hobbits sains).
            for (const card of matches) {
                applyHeal(G, card, effect.count || 1);
            }
            continue;
        }

        if (
            effect.type === 'HEAL' &&
            effect.onePerCulture &&
            Array.isArray(effect.target)
        ) {
            if (areHealsForbidden(G)) return false;
            const matches = resolveCostTarget(G, source, effect.target).filter(
                (card) => !card.isDead && (card.wounds || 0) > 0
            );
            const cultureCount = new Set(
                matches
                    .map((card) => card.culture)
                    .filter((c): c is NonNullable<typeof c> => Boolean(c))
            ).size;
            if (cultureCount <= 0) continue;
            // Désignation obligatoire : exactement 1 compagnon par culture blessée.
            if (chosenIds.length !== cultureCount) return false;
            if (new Set(chosenIds).size !== chosenIds.length) return false;
            const seen = new Set<string>();
            for (const id of chosenIds) {
                const card =
                    matches.find(
                        (c) => c.instanceId === id || c.id === id
                    ) || null;
                if (!card?.culture || seen.has(card.culture)) return false;
                seen.add(card.culture);
                applyHeal(G, card, effect.count || 1);
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

        if (effect.type === 'STACK_ON_SELF') {
            const ownerId = abilityOwnerPlayerId(G, source);
            if (!ownerId) return false;

            let cardToStack: CardState | null = null;
            if (effect.target === 'WINNER') {
                const matches = resolveWinnerTargets(G, source, ability);
                const cardId = chosenIds[0];
                cardToStack = cardId
                    ? matches.find(
                          (c) => c.instanceId === cardId || c.id === cardId
                      ) || null
                    : matches.length === 1
                      ? matches[0]
                      : null;
                if (!cardToStack || cardToStack.type !== 'MINION') {
                    return false;
                }
            } else if (effect.from === 'HAND') {
                const cardId = chosenIds[0];
                if (!cardId) return false;
                cardToStack =
                    (G.players[ownerId]?.hand || []).find(
                        (c) =>
                            c &&
                            (c.instanceId === cardId || c.id === cardId)
                    ) || null;
                if (
                    !cardToStack ||
                    !cardMatchesTarget(cardToStack, effect.target)
                ) {
                    return false;
                }
            } else {
                const cardId = chosenIds[0];
                if (!cardId) return false;
                cardToStack = findTargetCard(G, cardId) as CardState | null;
                if (
                    !cardToStack ||
                    cardToStack.type !== 'MINION' ||
                    !cardMatchesTarget(cardToStack, effect.target)
                ) {
                    return false;
                }
            }

            if (
                !stackCardOnHost(
                    G,
                    source,
                    cardToStack,
                    effect.from,
                    ownerId,
                    effect.maxStacked
                )
            ) {
                return false;
            }
            continue;
        }

        if (effect.type === 'TAKE_FROM_STACK') {
            const ownerId = abilityOwnerPlayerId(G, source);
            if (!ownerId) return false;
            const cardId = chosenIds[0];
            if (!cardId) return false;
            if (!takeStackedCardToHand(G, source, cardId, ownerId)) {
                return false;
            }
            continue;
        }

        if (effect.type === 'PLAY_FROM_CARD_STACK') {
            const ownerId = abilityOwnerPlayerId(G, source);
            if (!ownerId) return false;
            const cardId = chosenIds[0];
            if (!cardId) return false;
            const cardToPlay =
                getCardsStackedOnHost(source, effect.target).find(
                    (c) => c.instanceId === cardId || c.id === cardId
                ) || null;
            if (!cardToPlay) return false;
            if (
                playStackedMinionFromCard(G, source, cardToPlay, ownerId) ===
                null
            ) {
                return false;
            }
            continue;
        }

        if (effect.type === 'PLAY_FROM_HAND') {
            // Site : le joueur qui active joue depuis SA main (pas le FP par défaut).
            const ownerId =
                (source.kind === 'SITE' || source.type === 'SITE') &&
                actingPlayerId
                    ? actingPlayerId
                    : abilityOwnerPlayerId(G, source);
            if (!ownerId) return false;
            const cardId = chosenIds[0];
            if (!cardId) return false;
            const fpId = G.fpPlayerId || '0';
            const playPhase =
                ownerId === fpId ? 'fellowship' : 'shadow';
            const candidates = getHandPlayCandidates(
                G,
                ownerId,
                effect.target,
                playPhase,
                effect.twilightReduce || 0
            );
            if (
                !candidates.some(
                    (c) => c.instanceId === cardId || c.id === cardId
                )
            ) {
                return false;
            }
            const played = playCardFromHand(
                G,
                ownerId,
                cardId,
                effect.target,
                playPhase,
                effect.twilightReduce || 0
            );
            if (!played) return false;
            afterCardPlayed(G, played, {
                playerId: ownerId,
                phase: playPhase,
            });
            continue;
        }

        if (effect.type === 'PLAY_FROM_DECK_OR_DISCARD') {
            const ownerId =
                (source.kind === 'SITE' || source.type === 'SITE') &&
                actingPlayerId
                    ? actingPlayerId
                    : abilityOwnerPlayerId(G, source);
            if (!ownerId) return false;
            const cardId = chosenIds[0];
            if (!cardId) return false;
            const fpId = G.fpPlayerId || '0';
            const playPhase =
                ownerId === fpId ? 'fellowship' : 'shadow';
            let attachHost: CardState | null =
                effect.attachTo === 'SELF' ? source : null;
            if (!attachHost && chosenIds[1]) {
                attachHost =
                    (findTargetCard(G, chosenIds[1]) as CardState | null) ||
                    null;
            }
            const from = effect.from || 'DECK_OR_DISCARD';
            const candidates = getDeckOrDiscardPlayCandidates(
                G,
                ownerId,
                effect.target,
                playPhase,
                effect.attachTo === 'SELF' ? source : null,
                from
            );
            if (
                !candidates.some(
                    (c) => c.instanceId === cardId || c.id === cardId
                )
            ) {
                return false;
            }
            const played = playCardFromDeckOrDiscard(
                G,
                ownerId,
                cardId,
                effect.target,
                playPhase,
                attachHost,
                from
            );
            if (!played) return false;
            afterCardPlayed(G, played, {
                playerId: ownerId,
                phase: playPhase,
            });
            continue;
        }

        if (effect.type === 'TAKE_FROM_DISCARD') {
            const ownerId = abilityOwnerPlayerId(G, source);
            if (!ownerId) return false;
            const player = G.players[ownerId];
            if (!player?.discard) return false;
            const cardId = chosenIds[0];
            if (!cardId) return false;
            const idx = player.discard.findIndex(
                (c) =>
                    c &&
                    (c.instanceId === cardId || c.id === cardId) &&
                    cardMatchesTarget(c, effect.target)
            );
            if (idx < 0) return false;
            const [taken] = player.discard.splice(idx, 1);
            if (!taken) return false;
            if (!player.hand) player.hand = [];
            player.hand.push(taken);
            continue;
        }

        if (effect.type === 'REVEAL_OPPONENT_TOP') {
            const ownerId = abilityOwnerPlayerId(G, source);
            if (!ownerId) return false;
            const opponentId =
                ownerId === (G.fpPlayerId || '0')
                    ? Object.keys(G.players).find((id) => id !== ownerId)
                    : G.fpPlayerId || '0';
            if (!opponentId) return false;
            const opp = G.players[opponentId];
            if (!opp?.deck?.length) return false;
            const n = Math.min(effect.count || 0, opp.deck.length);
            if (n <= 0) return false;
            const revealed = opp.deck.slice(0, n);
            const sourceId = source.instanceId || source.id;
            if (!sourceId) return false;
            G.pendingReveal = {
                playerId: ownerId,
                opponentId,
                sourceInstanceId: sourceId,
                abilityId: ability.id,
                cardIds: revealed.map((c) => c.instanceId || c.id),
                ...(chosenIds[0] ? { conditionId: chosenIds[0] } : {}),
                ...(effect.perShadowCard
                    ? { perShadowCard: effect.perShadowCard }
                    : {}),
                ...(effect.perFreePeoplesCard
                    ? { perFreePeoplesCard: effect.perFreePeoplesCard }
                    : {}),
            };
            G.statusMessage =
                'Cartes révélées : validez pour appliquer menaces / jetons et mélanger.';
            continue;
        }

        if (effect.type === 'SEARCH_DECK_TO_DISCARD') {
            const ownerId = abilityOwnerPlayerId(G, source);
            if (!ownerId) return false;
            const cardId = chosenIds[0];
            if (!cardId) return false;
            if (
                !searchDeckCardToDiscard(
                    G,
                    ownerId,
                    cardId,
                    effect.target
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
                effect.twilightReduce || 0,
                getWhileTwilightCostModifier(G, cardToPlay)
            );
            if (paid === null) return false;
            for (const grant of effect.grantsTempKeywords || []) {
                if (!cardToPlay.tempKeywords) cardToPlay.tempKeywords = [];
                cardToPlay.tempKeywords.push({
                    keyword: grant.keyword,
                    expiresAtPhase: grant.expiresAtPhase,
                });
            }
            for (const grant of effect.grantsTempStats || []) {
                if (!G.tempModifiers) G.tempModifiers = [];
                const targetCardId = cardToPlay.instanceId || cardToPlay.id;
                G.tempModifiers.push({
                    id: `${ability.id}:stack-play:${G.tempModifiers.length}`,
                    sourceCardTitle: source.i18n?.fr?.title || source.title,
                    targetCardId,
                    stat: grant.stat,
                    value: grant.value,
                    scope: expiryToScope(grant.expiresAtPhase),
                    expiresAtPhase: grant.expiresAtPhase,
                });
            }
            continue;
        }

        if (effect.type === 'DISCARD_FROM_HAND') {
            const fpId = G.fpPlayerId || '0';
            const shadowId = fpId === '0' ? '1' : '0';
            const whose = effect.whose || 'OWNER';
            const ownerId =
                whose === 'FREE_PEOPLES'
                    ? fpId
                    : whose === 'SHADOW'
                      ? shadowId
                      : abilityOwnerPlayerId(G, source);
            if (!ownerId) return false;
            const need = effect.count || 0;
            if (effect.atRandom) {
                const hand = G.players[ownerId]?.hand || [];
                if (hand.length < need) return false;
                const pool = [...hand];
                const ids: string[] = [];
                for (let i = 0; i < need; i += 1) {
                    const idx = Math.floor(Math.random() * pool.length);
                    const card = pool.splice(idx, 1)[0];
                    if (!card) return false;
                    ids.push(card.instanceId || card.id);
                }
                if (!discardCardsFromHand(G, ownerId, ids)) return false;
                continue;
            }
            if (discardedHandIds === undefined) return false;
            const ids = discardedHandIds;
            if (effect.upTo) {
                if (ids.length > need) return false;
            } else if (ids.length !== need) {
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
            if (areBurdenRemovalsForbidden(G)) return false;
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

        if (effect.type === 'ADD_THREATS') {
            addThreats(G, effect.count || 0);
            continue;
        }

        if (effect.type === 'ADD_BURDENS') {
            const fpId = G.fpPlayerId || '0';
            const fp = G.players[fpId];
            if (!fp) return false;
            const n = effect.count || 0;
            if (n > 0) {
                fp.burdens = (fp.burdens || 0) + n;
            }
            continue;
        }

        if (effect.type === 'CHOOSE_ONE') {
            const sourceId = source.instanceId || source.id;
            if (!sourceId || G.pendingForcedChoice) return false;
            const ownerId = abilityOwnerPlayerId(G, source);
            if (!ownerId) return false;
            const fpId = G.fpPlayerId || '0';
            const shadowId = fpId === '0' ? '1' : '0';
            let chooserId = ownerId;
            if (effect.chooser === 'FREE_PEOPLE') {
                chooserId = fpId;
            } else if (effect.chooser === 'OPPONENT') {
                chooserId = ownerId === fpId ? shadowId : fpId;
            }
            G.pendingForcedChoice = {
                playerId: chooserId,
                sourceInstanceId: sourceId,
                abilityId: ability.id,
                title: 'CHOIX FORCÉ',
                message:
                    G.statusMessage ||
                    'Choisissez une option pour résoudre cet effet.',
                options: effect.options.map((o) => ({
                    label: o.label,
                    effects: o.effects,
                })),
            };
            G.statusMessage =
                chooserId === fpId
                    ? 'Les Peuples Libres doivent choisir une option.'
                    : 'L’Ombre doit choisir une option.';
            continue;
        }

        if (effect.type === 'PLAY_NEXT_SITE') {
            if (effect.from !== 'SITES_DECK') return false;
            const ownerId = playNextSiteDeckPlayerId(
                G,
                source,
                actingPlayerId
            );
            if (!ownerId) return false;
            const siteId = chosenIds[0];
            if (!siteId) return false;
            if (!canPlayNextSiteFromDeck(G, ownerId)) return false;
            if (!playNextSiteFromDeck(G, ownerId, siteId)) return false;
            continue;
        }

        if (effect.type === 'RETURN_TO_HAND') {
            const pick = chosenIds[0];
            const target = resolveAbilityTarget(
                G,
                source,
                effect.target,
                pick
            );
            if (!target) return false;
            if (!returnCardToOwnerHand(G, target)) return false;
            continue;
        }

        if (effect.type === 'FORBID_ASSIGN') {
            const pick = chosenIds[0];
            const target = resolveAbilityTarget(
                G,
                source,
                effect.target,
                pick
            );
            if (!target) return false;
            target.forbidAssignUntil = effect.expiresAtPhase;
            continue;
        }

        if (effect.type === 'FORCE_ASSIGN') {
            const companionPick = chosenIds[0];
            if (!companionPick) return false;

            let minion: CardState | null = null;
            if (effect.minion === 'SELF') {
                minion = source;
            } else if (effect.minion === 'COST_TARGET') {
                const costId = costIds[0];
                if (!costId) return false;
                minion = findTargetCard(G, costId) as CardState | null;
            } else if (Array.isArray(effect.minion)) {
                minion = resolveAbilityTarget(
                    G,
                    source,
                    effect.minion,
                    companionPick
                );
            }
            if (!minion || minion.type !== 'MINION') return false;
            if (minion.cannotBeAssignedToSkirmish) return false;

            const companion = resolveAbilityTarget(
                G,
                source,
                effect.companion,
                companionPick
            );
            if (!companion || companion.type !== 'COMPANION') return false;
            if (
                effect.excludeRingBearer &&
                isRingBearerCard(companion)
            ) {
                return false;
            }
            if (!requestForceAssign(G, minion, companion, effect.fpMayPrevent)) {
                return false;
            }
            continue;
        }

        if (effect.type === 'WOUND' && effect.involving) {
            const fighters = resolveCostTarget(G, source, effect.involving);
            const opponents: CardState[] = [];
            for (const fighter of fighters) {
                for (const opp of resolveSkirmishingOpponents(G, fighter)) {
                    if (
                        !opponents.some(
                            (o) =>
                                (o.instanceId || o.id) ===
                                (opp.instanceId || opp.id)
                        )
                    ) {
                        opponents.push(opp);
                    }
                }
            }
            const pick = chosenIds[0];
            const target = pick
                ? opponents.find(
                      (c) => c.instanceId === pick || c.id === pick
                  ) || null
                : opponents.length === 1
                  ? opponents[0]
                  : null;
            if (!target) return false;
            if (!canCardTakeWound(G, target)) return false;
            let count = effect.count || 1;
            if (
                effect.countIfCulture &&
                target.culture === effect.countIfCulture.culture
            ) {
                count = effect.countIfCulture.count;
            }
            requestWounds(G, target, count);
            continue;
        }

        if (effect.type === 'REINFORCE_CULTURE_TOKEN') {
            // Site (Morannon) : le joueur qui active, pas le propriétaire du site.
            const ownerId =
                actingPlayerId || abilityOwnerPlayerId(G, source);
            if (!ownerId) return false;
            const count = effect.count || 1;
            const candidates = getReinforceCandidates(
                G,
                ownerId,
                effect.culture
            );
            // Aucun candidat : reinforce inerte (CR) — succès sans placer.
            if (candidates.length === 0) continue;
            // Une seule cible : pas de désignation obligatoire (toaster site).
            if (chosenIds.length === 0 && candidates.length === 1) {
                const placed = applyReinforce(
                    G,
                    ownerId,
                    effect.culture,
                    count
                );
                if (placed < count) return false;
                continue;
            }
            if (chosenIds.length === 0) {
                return false;
            }
            const placed = applyReinforce(
                G,
                ownerId,
                effect.culture,
                count,
                chosenIds
            );
            if (placed < count) return false;
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
            if (effect.skirmishingWith) {
                const involving = resolveCostTarget(
                    G,
                    source,
                    effect.skirmishingWith
                ).filter((card) => {
                    const id = card.instanceId || card.id;
                    if (!id) return false;
                    return (G.skirmishes || []).some((sk) => {
                        if (sk.resolved) return false;
                        if (sk.companionId === id) return true;
                        const mids =
                            sk.minionIds ||
                            (sk.minionId ? [sk.minionId] : []);
                        return mids.includes(id);
                    });
                });
                const toDiscard: CardState[] = [];
                for (const host of involving) {
                    const hostId = host.instanceId || host.id;
                    if (!hostId) continue;
                    const sk = (G.skirmishes || []).find((s) => {
                        if (s.resolved) return false;
                        if (s.companionId === hostId) return true;
                        const mids =
                            s.minionIds ||
                            (s.minionId ? [s.minionId] : []);
                        return mids.includes(hostId);
                    });
                    if (!sk) continue;
                    const mids =
                        sk.minionIds ||
                        (sk.minionId ? [sk.minionId] : []);
                    for (const mid of mids) {
                        const minion = (G.battlefield || []).find(
                            (c) =>
                                c &&
                                !c.isDead &&
                                (c.instanceId === mid || c.id === mid)
                        );
                        if (!minion) continue;
                        if (
                            effect.target === 'SKIRMISHING' ||
                            (Array.isArray(effect.target) &&
                                cardMatchesTarget(minion, effect.target))
                        ) {
                            toDiscard.push(minion);
                        }
                    }
                }
                for (const card of toDiscard) {
                    discardCardFromPlay(G, card);
                }
                if (effect.thenDeadPileMatching) {
                    for (const card of involving) {
                        if (
                            cardMatchesTarget(
                                card,
                                effect.thenDeadPileMatching
                            )
                        ) {
                            placeCardInDeadPile(G, card);
                        }
                    }
                }
                continue;
            }
            const matches =
                effect.target === 'SKIRMISHING'
                    ? resolveCostTarget(G, source, 'SKIRMISHING')
                    : resolveCostTarget(G, source, effect.target);
            for (const card of [...matches]) {
                discardCardFromPlay(G, card);
            }
            continue;
        }

        if (
            effect.type === 'EXERT' &&
            effect.all &&
            (effect.target === 'SKIRMISHING' || Array.isArray(effect.target))
        ) {
            const matches = resolveCostTarget(G, source, effect.target);
            const times = effect.count || 1;
            for (const card of matches) {
                for (let i = 0; i < times; i++) {
                    applyExert(G, card);
                }
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

        if (
            effect.type === 'EXERT' &&
            effect.multiCount &&
            effect.multiCount > 1
        ) {
            // N compagnons distincts, 1 affaiblissement chacun (Isildur RB…).
            const pool = resolveCostTarget(G, source, effect.target).filter(
                (card) =>
                    Boolean(card) &&
                    !card.isDead &&
                    getEffectiveVitality(card) > (effect.count || 1)
            );
            const need = effect.multiCount;
            if (pool.length < need) return false;
            if (chosenIds.length !== need) return false;
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

        if (
            effect.type === 'HEAL' &&
            (effect.multiFromSpot || (effect.multiCount && effect.multiCount > 1))
        ) {
            const pool = resolveCostTarget(G, source, effect.target).filter(
                isHealableForMulti
            );
            const cap = effect.multiFromSpot
                ? countFromSpotCost(G, source, ability)
                : effect.multiCount || 1;
            const need = Math.min(cap, pool.length);
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

        if (!('target' in effect)) continue;
        if (effect.target === 'COST_TARGET') {
            const costPick = costIds[0] || chosenIds[0];
            if (!costPick) return false;
            const costTarget = findTargetCard(G, costPick) as CardState | null;
            if (!costTarget) return false;
            if (!applyOneEffect(G, source, ability, effect, costTarget)) {
                return false;
            }
            continue;
        }
        // Dol Guldur : coût déjà payé → le FP désigne ensuite (`pendingFpDiscard`).
        if (
            effect.type === 'DISCARD' &&
            effect.chooser === 'FREE_PEOPLE' &&
            chosenIds.length === 0
        ) {
            const sourceId = source.instanceId || source.id;
            if (!sourceId || G.pendingFpDiscard) return false;
            const fpId = G.fpPlayerId || '0';
            G.pendingFpDiscard = {
                playerId: fpId,
                sourceInstanceId: sourceId,
                abilityId: ability.id,
            };
            G.statusMessage =
                'Peuples Libres : défaussez une de vos situations.';
            continue;
        }
        // Famille sites « Shadow: play… » (Buckland…) : la carte jouée est
        // en jeu (effets précédents), il reste cette désignation au joueur
        // qui active. Reportée dans `pendingSitePhaseDesignation`.
        // Le chosenTargetId reçu visait l’effet « jouer » (pas cette cible) :
        // on ne reporte que si aucun choix ne désigne déjà un candidat ici.
        if (
            effect.type === 'DISCARD' &&
            !effect.chooser &&
            (source.kind === 'SITE' || source.type === 'SITE') &&
            Array.isArray(effect.target) &&
            actingPlayerId &&
            effectIndex === effects.length - 1 &&
            !G.pendingSitePhaseDesignation
        ) {
            const candidates = resolveCostTarget(G, source, effect.target);
            const chosenIsCandidate = chosenIds.some((id) =>
                candidates.some(
                    (c) => c.instanceId === id || c.id === id
                )
            );
            if (!chosenIsCandidate) {
                const sourceId = source.instanceId || source.id;
                if (!sourceId) return false;
                if (candidates.length === 0) return false;
                G.pendingSitePhaseDesignation = {
                    playerId: actingPlayerId,
                    siteInstanceId: sourceId,
                    abilityId: ability.id,
                    effectIndex,
                };
                G.statusMessage =
                    'Ombre : défaussez une situation en jeu.';
                continue;
            }
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

    if (effect.type === 'SUPPRESS_KEYWORD') {
        if (!target.tempKeywords) target.tempKeywords = [];
        target.tempKeywords.push({
            keyword: effect.keyword,
            expiresAtPhase: effect.expiresAtPhase,
            suppress: true,
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
        if (effect.perCultureTokensOnSelf) {
            const n = tokenCountOnCard(
                source,
                effect.perCultureTokensOnSelf.culture
            );
            value = effect.value * n;
            const cap = effect.perCultureTokensOnSelf.limit;
            if (cap != null) value = Math.min(value, cap);
            if (value <= 0) return false;
        }
        if (effect.perSpot) {
            const n = resolveCostTarget(
                G,
                source,
                effect.perSpot.target
            ).filter((c) => !c.isDead).length;
            value = effect.value * n;
            if (value <= 0) return false;
        }
        if (
            effect.valueIfInitiative != null &&
            playerHasInitiative(
                G,
                abilityOwnerPlayerId(G, source) || ''
            )
        ) {
            value = effect.valueIfInitiative;
        }
        if (effect.valueIfFewerCardsInHand) {
            const ownerId = abilityOwnerPlayerId(G, source);
            const handSize = ownerId
                ? G.players[ownerId]?.hand?.length || 0
                : 0;
            if (handSize < effect.valueIfFewerCardsInHand.fewerThan) {
                value = effect.valueIfFewerCardsInHand.value;
            }
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
        if (!canCardTakeWound(G, target)) return false;
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

    if (effect.type === 'EXHAUST') {
        return requestExhaust(G, target, effect.fpMayPrevent);
    }

    if (effect.type === 'HEAL') {
        if (areHealsForbidden(G)) return false;
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

    if (effect.type === 'PLACE_CULTURE_TOKEN') {
        if (areCultureTokenChangesForbidden(G)) return false;
        let count = effect.count || 1;
        if (effect.perSpot) {
            count *= resolveCostTarget(G, source, effect.perSpot.target).length;
        }
        // 0 spoté = rien à placer (succès inerte).
        if (count <= 0) return true;
        return placeCultureTokens(target, effect.culture, count) > 0;
    }

    if (effect.type === 'REMOVE_CULTURE_TOKEN') {
        if (areCultureTokenChangesForbidden(G)) return false;
        return (
            removeCultureTokensFromCard(
                target,
                effect.culture,
                effect.count || 1
            ) === (effect.count || 1)
        );
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

function returnCardToOwnerHand(G: GameState, card: CardState): boolean {
    const ownerId = abilityOwnerPlayerId(G, card);
    if (!ownerId) return false;
    const player = G.players[ownerId];
    if (!player) return false;
    // Retirer via défausse puis déplacer vers la main (réutilise la logique de retrait).
    if (!discardCardFromPlay(G, card)) return false;
    const pile = player.discard || [];
    const idx = pile.findIndex(
        (c) =>
            c &&
            ((c.instanceId || c.id) === (card.instanceId || card.id) ||
                c === card)
    );
    if (idx < 0) return false;
    const [removed] = pile.splice(idx, 1);
    if (!removed) return false;
    removed.wounds = 0;
    removed.isDead = false;
    if (!player.hand) player.hand = [];
    player.hand.push(removed);
    return true;
}

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
        if (card.forbidAssignUntil === phase) {
            delete card.forbidAssignUntil;
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
