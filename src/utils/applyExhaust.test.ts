import { describe, expect, it } from 'vitest';
import { applyExhaust } from './applyExhaust';
import { getEffectiveVitality, isExhausted } from './cardStats';
import { createCompanion, createGameState } from '../game/testing/createGameState';
import { cardMatchesCriterion } from '../game/engine/validations/matchers';

describe('exhaust', () => {
    it('isExhausted si vitalité restante = 1', () => {
        const card = createCompanion({ vitality: 3, wounds: 2 });
        expect(getEffectiveVitality(card)).toBe(1);
        expect(isExhausted(card)).toBe(true);
        expect(cardMatchesCriterion(card, 'EXHAUSTED')).toBe(true);
    });

    it('applyExhaust blesse jusqu’à 1 PV', () => {
        const card = createCompanion({
            id: 'aragorn',
            vitality: 4,
            wounds: 0,
        });
        const G = createGameState();
        expect(applyExhaust(G, card)).toBe(true);
        expect(card.wounds).toBe(3);
        expect(isExhausted(card)).toBe(true);
        expect(applyExhaust(G, card)).toBe(false);
    });

    it('URUKHAI matche la culture URUK-HAI', () => {
        const card = createCompanion({
            id: 'uruk',
            kind: 'SHADOW',
            type: 'MINION',
            culture: 'URUK-HAI',
            race: 'URUK-HAI',
        });
        expect(cardMatchesCriterion(card, 'URUKHAI')).toBe(true);
        expect(cardMatchesCriterion(card, 'URUK-HAI')).toBe(true);
        expect(cardMatchesCriterion(card, 'MINION')).toBe(true);
    });
});
