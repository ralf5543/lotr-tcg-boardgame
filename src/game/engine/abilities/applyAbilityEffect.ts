import type {
    Ability,
    AbilityEffectExpiry,
    CardState,
    GameState,
} from '../../types';
import type { ModifierScope } from '../../logic/stats/types';
import { resolveAbilityTarget, forEachInPlayCard } from './resolveCostTarget';

function expiryToScope(expiresAtPhase: AbilityEffectExpiry): ModifierScope {
    if (expiresAtPhase === 'SKIRMISH') return 'SKIRMISH';
    if (expiresAtPhase === 'TURN_END') return 'TURN';
    return 'PHASE';
}

export function applyAbilityEffect(
    G: GameState,
    source: CardState,
    ability: Ability
): boolean {
    const effects = ability.effects || [];
    if (effects.length === 0) return false;

    const resolved = effects.map((effect) => ({
        effect,
        target: resolveAbilityTarget(G, source, effect.target),
    }));
    if (resolved.some((item) => !item.target)) return false;

    for (const { effect, target } of resolved) {
        if (!applyOneEffect(G, source, ability, effect, target!)) {
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
        G.tempModifiers.push({
            id: `${ability.id}:${G.tempModifiers.length}`,
            sourceCardTitle: source.i18n?.fr?.title || source.title,
            targetCardId,
            stat: effect.stat,
            value: effect.value,
            scope: expiryToScope(effect.expiresAtPhase),
            expiresAtPhase: effect.expiresAtPhase,
        });
        return true;
    }

    return false;
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
}
