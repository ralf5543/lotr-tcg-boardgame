import { describe, expect, it } from 'vitest';
import {
    getEffectiveResistance,
    getEffectiveVitality,
} from './cardStats';
import { createCard, createCompanion, createMinion } from '../game/testing/createGameState';

describe('getEffectiveVitality', () => {
    it('ajoute la vitalité des attachements et retranche les blessures', () => {
        const armor = createCard({
            id: 'armor',
            type: 'POSSESSION',
            vitality: 1,
        });
        const companion = createCompanion({
            id: 'comp',
            vitality: 3,
            wounds: 1,
            attachments: [armor],
        });

        expect(getEffectiveVitality(companion)).toBe(3);
    });
});

describe('getEffectiveResistance', () => {
    it('retranche les fardeaux aux compagnons, pas aux séides', () => {
        const companion = createCompanion({
            id: 'frodo',
            resistance: 10,
        });
        const minion = createMinion({
            id: 'orc',
            resistance: 4,
        });

        expect(getEffectiveResistance(companion, 3)).toBe(7);
        expect(getEffectiveResistance(minion, 3)).toBe(4);
        expect(getEffectiveResistance(companion, 20)).toBe(0);
    });
});
