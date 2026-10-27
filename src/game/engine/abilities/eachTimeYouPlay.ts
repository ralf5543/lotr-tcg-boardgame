import type { Ability, CardState, GameState } from '../../types';
import { applyAbilityEffect } from './applyAbilityEffect';
import { canPayAbilityCost, payAbilityCost } from './payAbilityCost';
import { forEachInPlayCard } from './resolveCostTarget';
import { cardMatchesTarget } from '../validations/matchers';
import { resolveWhenPlayed } from './whenPlayed';
import { enforceWhileSelfDiscards } from './enforceWhileDiscard';
import { pauseActionYieldForResponses } from '../responseWindow';
import { findBearer } from './resolveCostTarget';
import { getCurrentSite } from '../../logic/sites';

export function isYouPlayAbility(ability: Ability): boolean {
    return ability.trigger?.type === 'YOU_PLAY';
}

/**
 * Each time you play a [classe] : cartes déjà en jeu du même camp, pas la carte
 * qu’on vient de jouer (sinon une condition « weather » se déclencherait sur elle-même).
 */
export function resolveEachTimeYouPlay(
    G: GameState,
    playedCard: CardState
): void {
    const playedId = playedCard.instanceId || playedCard.id;
    const playedKind = playedCard.kind;

    forEachInPlayCard(G, (source) => {
        if ((source.instanceId || source.id) === playedId) return;
        if (source.kind !== playedKind) return;

        for (const ability of source.abilities || []) {
            if (!isYouPlayAbility(ability) || ability.optional) continue;
            const trigger = ability.trigger;
            if (!trigger || trigger.type !== 'YOU_PLAY') continue;
            if (!cardMatchesTarget(playedCard, trigger.played)) continue;
            if (!canPayAbilityCost(G, source, ability.cost)) continue;
            if (!payAbilityCost(G, source, ability.cost)) continue;
            applyAbilityEffect(G, source, ability);
        }
    });
}

/**
 * Trollshaw Forest : réponse optionnelle du site courant quand le FP joue
 * un artefact / possession **sur un compagnon** → toaster « vous pouvez
 * piocher » (pendingWhenPlayed marqué fromSite).
 */
export function maybeOfferSiteYouPlayResponse(
    G: GameState,
    playedCard: CardState,
    options?: { playerId?: string; phase?: string }
): void {
    if (G.pendingWhenPlayed) return;
    const fpId = G.fpPlayerId || '0';
    const playerId = options?.playerId || fpId;
    if (playerId !== fpId) return;

    const site = getCurrentSite(G);
    if (!site?.abilities?.length) return;

    for (const ability of site.abilities) {
        if (!isYouPlayAbility(ability) || !ability.optional) continue;
        if (ability.responsePlayer && ability.responsePlayer !== 'FREE_PEOPLE') {
            continue;
        }
        const trigger = ability.trigger;
        if (!trigger || trigger.type !== 'YOU_PLAY') continue;
        if (!cardMatchesTarget(playedCard, trigger.played)) continue;

        if (trigger.onCompanion) {
            const bearer = findBearer(G, playedCard);
            if (!bearer || bearer.type !== 'COMPANION') continue;
        }
        if (!canPayAbilityCost(G, site as unknown as CardState, ability.cost)) {
            continue;
        }
        // Pioche vide : effet impossible → pas de fenêtre (mieux vaut inerte).
        const drawCount = (ability.effects || []).reduce(
            (sum, e) => sum + (e.type === 'DRAW' ? e.count || 0 : 0),
            0
        );
        if (drawCount > 0 && (G.players[fpId]?.deck?.length || 0) <= 0) {
            continue;
        }

        const siteKey = (site as { instanceId?: string }).instanceId || site.id;
        if (!siteKey) return;
        G.pendingWhenPlayed = {
            playerId: fpId,
            sourceInstanceId: siteKey,
            abilityId: ability.id,
            phase: options?.phase,
            fromSite: true,
        };
        G.statusMessage = 'Vous pouvez activer l’effet optionnel de ce site.';
        pauseActionYieldForResponses(G, fpId);
        return;
    }
}

export function afterCardPlayed(
    G: GameState,
    card: CardState,
    options?: { playerId?: string; phase?: string; skipWhenPlayed?: boolean }
): void {
    const phase = (options?.phase || '').toLowerCase();
    if (
        (phase === 'shadow' || phase === 'startofshadow') &&
        card.type === 'MINION' &&
        cardMatchesTarget(card, [['HUNTER', 'MINION']])
    ) {
        G.hunterMinionPlayedThisShadowPhase = true;
    }
    if (!options?.skipWhenPlayed) {
        resolveWhenPlayed(G, card, options);
    }
    resolveEachTimeYouPlay(G, card);
    maybeOfferSiteYouPlayResponse(G, card, options);
    enforceWhileSelfDiscards(G);
}
