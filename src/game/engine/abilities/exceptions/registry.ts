import type { Ability, CardState } from '../../../types';
import type { CardException } from './types';
import { exception2C114 } from './cards/2C114';

const EXCEPTIONS: CardException[] = [exception2C114];

export const EXCEPTION_REGISTRY: Record<string, CardException> =
    Object.fromEntries(
        EXCEPTIONS.map((entry) => [entry.cardId.toUpperCase(), entry])
    );

function mergeActionPhases(
    existing: string[] | undefined,
    abilities: Ability[]
): string[] | undefined {
    const phases = new Set(
        (existing || []).map((phase) => phase.toUpperCase())
    );
    for (const ability of abilities) {
        for (const phase of ability.phases || []) {
            phases.add(phase.toUpperCase());
        }
    }
    if (phases.size === 0) return existing;
    return [...phases];
}

/** Ajoute les abilities d’exception sans toucher au parser / cards.json. */
export function mergeExceptionAbilities(card: CardState): CardState {
    const exception = EXCEPTION_REGISTRY[card.id.toUpperCase()];
    if (!exception?.abilities?.length) return card;

    const existing = card.abilities || [];
    const existingIds = new Set(existing.map((ability) => ability.id));
    const extra = exception.abilities.filter(
        (ability) => !existingIds.has(ability.id)
    );
    if (extra.length === 0) return card;

    return {
        ...card,
        abilities: [...existing, ...extra],
        actionPhases: mergeActionPhases(card.actionPhases, extra),
    };
}
