import { describe, expect, it } from 'vitest';
import { createEngineClient } from './createEngineClient';
import {
    createCompanion,
    createMinion,
    createPlayerState,
} from './createGameState';

describe('LURKER', () => {
    it('interdit de choisir un combat Lurker tant qu’il reste un combat normal', () => {
        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                battlefield: [
                    createMinion({ id: 'minion-normal' }),
                    createMinion({
                        id: 'minion-lurker',
                        keywords: ['LURKER'],
                    }),
                ],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createCompanion({ id: 'comp-1' }),
                            createCompanion({ id: 'comp-2' }),
                        ],
                    }),
                },
                skirmishes: [
                    {
                        id: 'skirmish_comp-1',
                        companionId: 'comp-1',
                        minionIds: ['minion-normal'],
                    },
                    {
                        id: 'skirmish_comp-2',
                        companionId: 'comp-2',
                        minionIds: ['minion-lurker'],
                    },
                ],
            },
        });

        engine.moves.selectSkirmish('skirmish_comp-2');
        expect(engine.getG().activeSkirmishId).toBeUndefined();

        engine.moves.selectSkirmish('skirmish_comp-1');
        expect(engine.getG().activeSkirmishId).toBe('skirmish_comp-1');
    });
});
