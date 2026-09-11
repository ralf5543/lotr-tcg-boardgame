import { describe, expect, it } from 'vitest';
import type { Ability } from '../types';
import { abilityMatchesPhase } from '../engine/abilities/collectAbilities';

/**
 * Même règle que la bulle UI : hors réponse ouverte, jamais de Response ;
 * sinon uniquement les capacités de la phase courante.
 */
function abilitiesForBubble(
    abilities: Ability[],
    phase: string | undefined,
    responseOpen: boolean,
    responseMatch: (ability: Ability) => boolean
): Ability[] {
    return abilities.filter((ability) => {
        if (responseOpen) {
            if (!abilityMatchesPhase(ability, 'RESPONSE')) return false;
            return responseMatch(ability);
        }
        if (abilityMatchesPhase(ability, 'RESPONSE')) return false;
        return !phase || abilityMatchesPhase(ability, phase);
    });
}

describe('ability bubble phase filter', () => {
    const fellowship: Ability = {
        id: 'a:fellowship',
        phases: ['FELLOWSHIP'],
        cost: [],
        effects: [{ type: 'DRAW', count: 1 }],
        source: 'SELF',
    };
    const archery: Ability = {
        id: 'a:archery',
        phases: ['ARCHERY'],
        cost: [],
        effects: [{ type: 'WOUND', count: 1, target: [['MINION']] }],
        source: 'SELF',
    };
    const response: Ability = {
        id: 'a:response',
        phases: ['RESPONSE'],
        cost: [],
        effects: [{ type: 'MAKE_RING_BEARER', resistance: 5 }],
        source: 'SELF',
        trigger: { type: 'CHARACTER_DIES', target: [['Frodo']] },
    };

    const all = [fellowship, archery, response];

    it('Fellowship : seulement l’effet Fellowship', () => {
        expect(
            abilitiesForBubble(all, 'fellowship', false, () => true).map(
                (a) => a.id
            )
        ).toEqual(['a:fellowship']);
    });

    it('Ombre : rien', () => {
        expect(
            abilitiesForBubble(all, 'shadow', false, () => true)
        ).toHaveLength(0);
    });

    it('Archerie : seulement l’effet Archery', () => {
        expect(
            abilitiesForBubble(all, 'archery', false, () => true).map(
                (a) => a.id
            )
        ).toEqual(['a:archery']);
    });

    it('hors réponse : Response absente même si d’autres effets existent', () => {
        expect(
            abilitiesForBubble(all, 'maneuver', false, () => true)
        ).toHaveLength(0);
        expect(
            abilitiesForBubble(
                [response, fellowship],
                'fellowship',
                false,
                () => true
            ).map((a) => a.id)
        ).toEqual(['a:fellowship']);
    });

    it('fenêtre de réponse : seulement les Response éligibles', () => {
        expect(
            abilitiesForBubble(all, 'skirmish', true, (a) => a.id === 'a:response').map(
                (a) => a.id
            )
        ).toEqual(['a:response']);
    });
});
