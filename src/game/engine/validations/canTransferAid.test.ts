import { describe, expect, it } from 'vitest';
import { canTransferAid } from './canTransferAid';
import {
    createCompanion,
    createFollower,
    createGameState,
    createMinion,
} from '../../testing/createGameState';

describe('canTransferAid', () => {
    const G = createGameState({ twilightPool: 1 });

    it('refuse autre chose qu’un Suivant avec coût d’Aide', () => {
        expect(
            canTransferAid(
                createCompanion({ id: 'not-follower' }),
                createCompanion({ id: 'host' }),
                G,
                '0'
            ).valid
        ).toBe(false);

        expect(
            canTransferAid(
                createFollower({ id: 'no-cost', aidCost: undefined }),
                createCompanion({ id: 'host' }),
                G,
                '0'
            ).valid
        ).toBe(false);
    });

    it('refuse un Suivant FP sur un séide, et un Suivant d’Ombre sur un compagnon', () => {
        const fpFollower = createFollower({ id: 'fp-f' });
        const shadowFollower = createFollower({
            id: 'sh-f',
            kind: 'SHADOW',
        });

        expect(
            canTransferAid(fpFollower, createMinion({ id: 'orc' }), G, '0')
                .valid
        ).toBe(false);
        expect(
            canTransferAid(
                shadowFollower,
                createCompanion({ id: 'comp' }),
                G,
                '1'
            ).valid
        ).toBe(false);
    });

    it('refuse un Suivant d’Ombre si le Crépuscule ne suffit pas', () => {
        const follower = createFollower({
            id: 'sh-f',
            kind: 'SHADOW',
            aidCost: { type: 'TWILIGHT', amount: 3 },
        });

        expect(
            canTransferAid(
                follower,
                createMinion({ id: 'orc' }),
                createGameState({ twilightPool: 1 }),
                '1'
            ).valid
        ).toBe(false);

        expect(
            canTransferAid(
                follower,
                createMinion({ id: 'orc' }),
                createGameState({ twilightPool: 3 }),
                '1'
            ).valid
        ).toBe(true);
    });
});
