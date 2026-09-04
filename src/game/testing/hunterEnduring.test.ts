import { describe, expect, it } from 'vitest';
import { createEngineClient } from './createEngineClient';
import {
    createCompanion,
    createMinion,
    createPlayerState,
} from './createGameState';

describe('Hunter / Enduring en escarmouche', () => {
    it('fait gagner le compagnon HUNTER contre un séide sans HUNTER à force égale', () => {
        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                battlefield: [
                    createMinion({ id: 'orc', strength: 4, vitality: 3 }),
                ],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createCompanion({
                                id: 'comp-1',
                                strength: 4,
                                vitality: 4,
                                keywords: ['HUNTER 1'],
                            }),
                        ],
                    }),
                },
                skirmishes: [
                    {
                        id: 'skirmish_comp-1',
                        companionId: 'comp-1',
                        minionIds: ['orc'],
                    },
                ],
            },
        });

        engine.moves.selectSkirmish('skirmish_comp-1');
        engine.moves.resolveActiveSkirmish();

        expect(engine.getG().battlefield[0]?.wounds).toBe(1);
        expect(engine.getG().players['0']?.fellowshipArea[0]?.wounds || 0).toBe(
            0
        );
    });

    it('applique ENDURING (+2 par blessure) à la résolution', () => {
        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                battlefield: [
                    createMinion({ id: 'orc', strength: 6, vitality: 3 }),
                ],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createCompanion({
                                id: 'comp-1',
                                strength: 3,
                                vitality: 4,
                                wounds: 2,
                                keywords: ['ENDURING'],
                            }),
                        ],
                    }),
                },
                skirmishes: [
                    {
                        id: 'skirmish_comp-1',
                        companionId: 'comp-1',
                        minionIds: ['orc'],
                    },
                ],
            },
        });

        engine.moves.selectSkirmish('skirmish_comp-1');
        engine.moves.resolveActiveSkirmish();

        // 3 + 4 enduring = 7 vs 6 → le compagnon gagne
        expect(engine.getG().battlefield[0]?.wounds).toBe(1);
        expect(engine.getG().players['0']?.fellowshipArea[0]?.wounds).toBe(2);
    });
});
