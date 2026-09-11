import type {
    Ability,
    AbilityEffectExpiry,
    CardState,
    GameState,
} from '../../types';
import type { ModifierScope } from '../../logic/stats/types';
import { resolveAbilityTarget, forEachInPlayCard, resolveWinnerTargets } from './resolveCostTarget';
import { requestWounds } from '../responseWindow';
import { cardMatchesTarget } from '../validations/matchers';
import { drawCardsForPlayer } from '../../../utils/drawCards';
import { discardCardFromPlay } from '../../../utils/discardCardFromPlay';
import { findTargetCard, isRingBearerCard } from '../../../utils/cardUtils';

function expiryToScope(expiresAtPhase: AbilityEffectExpiry): ModifierScope {
    if (expiresAtPhase === 'SKIRMISH') return 'SKIRMISH';
    if (expiresAtPhase === 'TURN_END') return 'TURN';
    return 'PHASE';
}

export function applyAbilityEffect(
    G: GameState,
    source: CardState,
    ability: Ability,
    chosenTargetId?: string
): boolean {
    const effects = ability.effects || [];
    if (effects.length === 0) return false;

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

        if (effect.type === 'WEAR_RING') {
            if (G.wearingTheOneRing) return false;
            G.wearingTheOneRing = {
                expiresAtPhase: effect.expiresAtPhase,
                replaceWoundWithBurdens: effect.replaceWoundWithBurdens,
                ...(effect.onlyInSkirmish
                    ? { onlyInSkirmish: true }
                    : {}),
            };
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
            const target = chosenTargetId
                ? matches.find(
                      (card) =>
                          card.instanceId === chosenTargetId ||
                          card.id === chosenTargetId
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

        const target = resolveAbilityTarget(
            G,
            source,
            effect.target,
            chosenTargetId
        );
        if (!target) return false;
        if (!applyOneEffect(G, source, ability, effect, target)) {
            return false;
        }
    }
    return true;
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
        if (effect.bearingBonus) {
            const bears = (target.attachments || []).some((att) =>
                cardMatchesTarget(att, effect.bearingBonus!.attachment)
            );
            if (bears) value = effect.bearingBonus.value;
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

    if (effect.type === 'HEAL') {
        if (target.isDead) return false;
        const amount = effect.count || 1;
        target.wounds = Math.max(0, (target.wounds || 0) - amount);
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
