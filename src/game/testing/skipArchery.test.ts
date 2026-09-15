import { describe, expect, it } from 'vitest';
import {
    createEngineClient,
    passBothActionWindows,
} from './createEngineClient';
import {
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
} from './createGameState';
import { shouldSkipPhase } from '../logic/stats/mechanics/whileModifier';
import type { Ability, CardState } from '../types';

const skipArcherySpotBalrog: Ability = {
    id: '2U56:0',
    phases: [],
    trigger: {
        type: 'WHILE',
        spot: [{ count: 1, target: [['The Balrog']] }],
    },
    cost: [],
    effects: [{ type: 'SKIP_PHASE', phase: 'ARCHERY' }],
    source: 'SELF',
};

const skipArcheryBare: Ability = {
    id: '2U31:0',
    phases: [],
    trigger: { type: 'WHILE' },
    cost: [],
    effects: [{ type: 'SKIP_PHASE', phase: 'ARCHERY' }],
    source: 'SELF',
};

describe('shouldSkipPhase — archery', () => {
    it('Fill With Fear : skip si The Balrog est spoté', () => {
        const condition: CardState = {
            id: '2U56',
            instanceId: 'fear',
            kind: 'SHADOW',
            type: 'CONDITION',
            culture: 'MORIA',
            set: 2,
            rarity: 'U',
            isUnique: false,
            abilities: [skipArcherySpotBalrog],
        };
        const balrog = createMinion({
            id: '2C51',
            instanceId: 'balrog',
            title: 'The Balrog',
            race: 'BALROG',
            culture: 'MORIA',
        });

        const withBalrog = createGameState({
            battlefield: [balrog],
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', { supportArea: [condition] }),
            },
        });
        expect(shouldSkipPhase(withBalrog, 'ARCHERY')).toBe(true);

        const without = createGameState({
            battlefield: [
                createMinion({ id: 'orc', instanceId: 'orc', title: 'Orc' }),
            ],
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', { supportArea: [condition] }),
            },
        });
        expect(shouldSkipPhase(without, 'ARCHERY')).toBe(false);
    });

    it('Blood of Númenor : skip tant que la condition est en jeu', () => {
        const condition: CardState = {
            id: '2U31',
            instanceId: 'blood',
            kind: 'FREE_PEOPLE',
            type: 'CONDITION',
            culture: 'GONDOR',
            set: 2,
            rarity: 'U',
            isUnique: false,
            abilities: [skipArcheryBare],
        };
        const G = createGameState({
            players: {
                '0': createPlayerState('0', { supportArea: [condition] }),
                '1': createPlayerState('1'),
            },
        });
        expect(shouldSkipPhase(G, 'ARCHERY')).toBe(true);
    });
});

describe('phase — skip archery', () => {
    it('fin de manœuvre → assignment (pas d’archerie) si skip actif', () => {
        const engine = createEngineClient({
            startPhase: 'maneuver',
            G: {
                battlefield: [
                    createMinion({
                        id: '2C51',
                        instanceId: 'balrog',
                        title: 'The Balrog',
                        race: 'BALROG',
                        vitality: 5,
                    }),
                ],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createCompanion({
                                id: 'legolas',
                                keywords: ['ARCHER'],
                            }),
                        ],
                    }),
                    '1': createPlayerState('1', {
                        supportArea: [
                            {
                                id: '2U56',
                                instanceId: 'fear',
                                kind: 'SHADOW',
                                type: 'CONDITION',
                                culture: 'MORIA',
                                set: 2,
                                rarity: 'U',
                                isUnique: false,
                                abilities: [skipArcherySpotBalrog],
                            },
                        ],
                    }),
                },
            },
        });

        passBothActionWindows(engine);

        expect(engine.getCtx().phase).toBe('assignment');
        expect(engine.getG().archeryState).toBeUndefined();
    });
});
