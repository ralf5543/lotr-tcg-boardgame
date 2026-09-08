import { describe, expect, it } from 'vitest';
import {
    getCompanionDefenderCapacity,
    isMinionDisabledForFierceAssignment,
} from './assignment';
import {
    createCompanion,
    createGameState,
    createMinion,
} from '../testing/createGameState';

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

describe('isMinionDisabledForFierceAssignment', () => {
    it('grise un séide non-FIERCE pendant la passe acharnée', () => {
        const G = createGameState({ isFierceAssignment: true });
        expect(
            isMinionDisabledForFierceAssignment(G, createMinion({ id: 'm1' }))
        ).toBe(true);
    });

    it('laisse le séide FIERCE actif pendant la passe acharnée', () => {
        const G = createGameState({ isFierceAssignment: true });
        expect(
            isMinionDisabledForFierceAssignment(
                G,
                createMinion({ id: 'm1', keywords: ['FIERCE'] })
            )
        ).toBe(false);
    });

    it('ne grise plus personne une fois isFierceAssignment levé', () => {
        const G = createGameState({ isFierceAssignment: false });
        expect(
            isMinionDisabledForFierceAssignment(G, createMinion({ id: 'm1' }))
        ).toBe(false);
    });
});
