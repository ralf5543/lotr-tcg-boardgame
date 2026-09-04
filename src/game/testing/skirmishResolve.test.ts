import { describe, expect, it } from 'vitest';
import { createEngineClient } from './createEngineClient';
import {
    createCompanion,
    createMinion,
    createPlayerState,
} from './createGameState';

describe('résolution d’escarmouche', () => {
    it('submerge un séide à 2× la force, sans empiler de blessures', () => {
        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                battlefield: [
                    createMinion({
                        id: 'minion-1',
                        strength: 3,
                        vitality: 3,
                    }),
                ],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createCompanion({
                                id: 'comp-1',
                                strength: 6,
                                vitality: 4,
                            }),
                        ],
                    }),
                },
                skirmishes: [
                    {
                        id: 'skirmish_comp-1',
                        companionId: 'comp-1',
                        minionIds: ['minion-1'],
                    },
                ],
            },
        });

        engine.moves.selectSkirmish('skirmish_comp-1');
        engine.moves.resolveActiveSkirmish();

        const minion = engine.getG().battlefield[0];
        expect(minion?.isOverwhelmed).toBe(true);
        expect(minion?.isDead).toBe(true);
        expect(minion?.wounds || 0).toBe(0);
    });

    it('inflige 1 + DAMAGE +X blessure(s) si le compagnon gagne sans submerger', () => {
        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                battlefield: [
                    createMinion({
                        id: 'minion-1',
                        strength: 3,
                        vitality: 4,
                    }),
                ],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createCompanion({
                                id: 'comp-1',
                                strength: 5,
                                vitality: 4,
                                keywords: ['DAMAGE +1'],
                            }),
                        ],
                    }),
                },
                skirmishes: [
                    {
                        id: 'skirmish_comp-1',
                        companionId: 'comp-1',
                        minionIds: ['minion-1'],
                    },
                ],
            },
        });

        engine.moves.selectSkirmish('skirmish_comp-1');
        engine.moves.resolveActiveSkirmish();

        const minion = engine.getG().battlefield[0];
        expect(minion?.isOverwhelmed).not.toBe(true);
        expect(minion?.wounds).toBe(2);
        expect(minion?.isDead).not.toBe(true);
    });
});
