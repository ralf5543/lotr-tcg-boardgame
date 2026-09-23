import { describe, expect, it } from 'vitest';
import { applyDevPreset } from '../dev/presets';
import { createGameState } from './createGameState';
import {
    getCostDesignationCandidates,
    getEffectDesignationCandidates,
    getHandEventDesignationTargetIds,
} from '../engine/abilities/designation';
import { canPlayCard } from '../engine/canPlayCard';
import {
    applyEventAbility,
    findEventAbilityForPhase,
} from '../engine/abilities/playEventAbility';
import { getEffectiveVitality, isExhausted } from '../../utils/cardStats';
import { getKeywordValue } from '../engine/keywords/keywordUtils';

describe('EXHAUST_TEST Versatility + Nelya', () => {
    it('Versatility : pas de flèche-main (coût+effet) mais cibles distinctes', () => {
        const G = createGameState();
        applyDevPreset(G, 'EXHAUST_TEST');
        const event = G.players['0']!.hand[0]!;
        const ability = findEventAbilityForPhase(event, 'maneuver')!;
        expect(ability).toBeTruthy();

        expect(
            canPlayCard(event, {
                G,
                ctx: { phase: 'maneuver' },
                playerID: '0',
            }).valid
        ).toBe(true);

        // Coût + effet → pas de liste unique pour le drag main
        expect(getHandEventDesignationTargetIds(G, event, 'maneuver')).toEqual(
            []
        );

        const cost = getCostDesignationCandidates(G, event, ability);
        const effect = getEffectDesignationCandidates(G, event, ability);
        expect(cost.some((c) => c.id === '1R89')).toBe(true);
        expect(effect.length).toBeGreaterThan(0);

        const ranger = cost.find((c) => c.id === '1R89')!;
        const minion = effect.find((c) => c.id === '0P20')!;
        expect(
            applyEventAbility(G, event, 'maneuver', [
                ranger.instanceId || ranger.id,
                minion.instanceId || minion.id,
            ])
        ).toBe(true);
        expect(isExhausted(minion)).toBe(true);
        expect(getEffectiveVitality(ranger)).toBe(3); // vit 4 − 1 exert
    });

    it('Nelya : fierce + Damage +1 si 2 blessures sur le Porteur', () => {
        const G = createGameState();
        applyDevPreset(G, 'EXHAUST_TEST');
        const nelya = G.battlefield.find((c) => c.id === '2R84')!;
        expect(nelya.abilities?.length).toBeGreaterThan(0);

        expect(getKeywordValue(nelya, 'FIERCE', G)).toBeGreaterThanOrEqual(0);
        expect(getKeywordValue(nelya, 'DAMAGE', G)).toBeGreaterThan(0);

        // Sans blessures ni fardeaux → passif off
        const frodo = G.players['0']!.fellowshipArea.find(
            (c) => c.id === '2C102'
        )!;
        frodo.wounds = 0;
        expect(getKeywordValue(nelya, 'FIERCE', G)).toBe(-1);
        expect(getKeywordValue(nelya, 'DAMAGE', G)).toBe(-1);
    });
});
