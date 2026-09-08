import { describe, expect, it } from 'vitest';
import { hasNewInflictedWound } from './useSkirmishAudio';

describe('hasNewInflictedWound', () => {
    it('ignore un affaiblissement (Gimli en combat)', () => {
        expect(
            hasNewInflictedWound(['gimli'], ['gimli'], new Set())
        ).toBe(false);
    });

    it('détecte une blessure infligée à la résolution ou par une carte', () => {
        expect(hasNewInflictedWound(['orc'], [], new Set())).toBe(true);
        expect(
            hasNewInflictedWound(['gimli', 'orc'], ['gimli'], new Set())
        ).toBe(true);
    });

    it('ne rejoue pas l’impact déjà entendu', () => {
        expect(
            hasNewInflictedWound(['orc'], [], new Set(['orc']))
        ).toBe(false);
    });
});
