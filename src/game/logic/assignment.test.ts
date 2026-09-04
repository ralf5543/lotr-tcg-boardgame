import { describe, expect, it } from 'vitest';
import { getCompanionDefenderCapacity } from './assignment';
import { createCompanion, createGameState } from '../testing/createGameState';

describe('getCompanionDefenderCapacity', () => {
    const G = createGameState();

    it('vaut 1 sans Défenseur', () => {
        expect(
            getCompanionDefenderCapacity(createCompanion({ id: 'comp' }), G)
        ).toBe(1);
    });

    it('ajoute le bonus DEFENDER +X', () => {
        expect(
            getCompanionDefenderCapacity(
                createCompanion({
                    id: 'comp',
                    keywords: ['DEFENDER +1'],
                }),
                G
            )
        ).toBe(2);
    });
});
