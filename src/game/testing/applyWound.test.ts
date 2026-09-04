import { describe, expect, it } from 'vitest';
import { createEngineClient } from './createEngineClient';
import {
    createCard,
    createCompanion,
    createMinion,
    createPlayerState,
} from './createGameState';

describe('applyWound / cleanupPendingDeaths', () => {
    it('tue un compagnon à 0 vitalité et l’envoie à la pile des morts', () => {
        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createCompanion({
                                id: 'comp-1',
                                vitality: 1,
                            }),
                        ],
                    }),
                },
            },
        });

        engine.moves.applyWound('comp-1');

        expect(engine.getG().players['0']?.fellowshipArea[0]?.isDead).toBe(true);
        expect(engine.getG().pendingDeadCardIds).toContain('comp-1');

        engine.moves.cleanupPendingDeaths();

        expect(engine.getG().players['0']?.fellowshipArea).toHaveLength(0);
        expect(engine.getG().players['0']?.deadPile[0]?.id).toBe('comp-1');
    });

    it('compte la vitalité des attachements : une blessure ne tue pas un 1 + 1', () => {
        const armor = createCard({
            id: 'armor',
            type: 'POSSESSION',
            vitality: 1,
        });

        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createCompanion({
                                id: 'comp-1',
                                vitality: 1,
                                attachments: [armor],
                            }),
                        ],
                    }),
                },
            },
        });

        engine.moves.applyWound('comp-1');

        const companion = engine.getG().players['0']?.fellowshipArea[0];
        expect(companion?.wounds).toBe(1);
        expect(companion?.isDead).not.toBe(true);
        expect(engine.getG().pendingDeadCardIds || []).not.toContain('comp-1');
    });

    it('envoie un séide mort à la défausse de l’Ombre', () => {
        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                battlefield: [
                    createMinion({
                        id: 'orc-1',
                        vitality: 1,
                    }),
                ],
            },
        });

        engine.moves.applyWound('orc-1');
        engine.moves.cleanupPendingDeaths();

        expect(engine.getG().battlefield).toHaveLength(0);
        expect(engine.getG().players['1']?.discard[0]?.id).toBe('orc-1');
        expect(engine.getG().players['1']?.deadPile).toHaveLength(0);
    });
});
