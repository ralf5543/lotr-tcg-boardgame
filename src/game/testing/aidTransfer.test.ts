import { describe, expect, it } from 'vitest';
import { createEngineClient } from './createEngineClient';
import {
    createCompanion,
    createFollower,
    createMinion,
    createPlayerState,
} from './createGameState';

describe('Aide (transferAid)', () => {
    it('skippe le début de manœuvre s’il n’y a aucun Suivant à transférer', () => {
        const engine = createEngineClient({
            startPhase: 'startOfManeuver',
            G: {
                battlefield: [createMinion({ id: 'orc' })],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [createCompanion({ id: 'comp-1' })],
                    }),
                },
            },
        });

        expect(engine.getCtx().phase).toBe('maneuver');
    });

    it('attache un Suivant FP, ajoute du Crépuscule, puis enchaîne la manœuvre', () => {
        const follower = createFollower({
            id: 'follower-1',
            aidCost: { type: 'TWILIGHT', amount: 2 },
        });

        const engine = createEngineClient({
            startPhase: 'startOfManeuver',
            playerID: '0',
            G: {
                twilightPool: 0,
                battlefield: [createMinion({ id: 'orc' })],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [createCompanion({ id: 'comp-1' })],
                        supportArea: [follower],
                    }),
                },
            },
        });

        expect(engine.getCtx().phase).toBe('startOfManeuver');

        engine.moves.transferAid('follower-1', 'comp-1');

        const companion = engine.getG().players['0']?.fellowshipArea[0];
        expect(engine.getG().players['0']?.supportArea).toHaveLength(0);
        expect(companion?.attachments).toHaveLength(1);
        expect(companion?.attachments?.[0]?.attachedViaAid).toBe(true);
        expect(engine.getG().twilightPool).toBe(2);
        expect(engine.getCtx().phase).toBe('maneuver');
    });

    it('fait payer le Crépuscule à l’Ombre et refuse une cible FP', () => {
        const follower = createFollower({
            id: 'sh-follower',
            kind: 'SHADOW',
            aidCost: { type: 'TWILIGHT', amount: 2 },
        });

        const engine = createEngineClient({
            startPhase: 'startOfManeuver',
            playerID: '1',
            G: {
                twilightPool: 4,
                battlefield: [createMinion({ id: 'orc' })],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [createCompanion({ id: 'comp-1' })],
                    }),
                    '1': createPlayerState('1', {
                        supportArea: [follower],
                    }),
                },
            },
        });

        engine.moves.transferAid('sh-follower', 'comp-1');
        expect(engine.getG().players['1']?.supportArea).toHaveLength(1);
        expect(engine.getG().twilightPool).toBe(4);

        engine.moves.transferAid('sh-follower', 'orc');
        expect(engine.getG().twilightPool).toBe(2);
        expect(engine.getG().battlefield[0]?.attachments).toHaveLength(1);
        expect(engine.getCtx().phase).toBe('maneuver');
    });

    it('permet de passer l’Aide sans transférer', () => {
        const engine = createEngineClient({
            startPhase: 'startOfManeuver',
            playerID: '0',
            G: {
                battlefield: [createMinion({ id: 'orc' })],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [createCompanion({ id: 'comp-1' })],
                        supportArea: [createFollower({ id: 'follower-1' })],
                    }),
                },
            },
        });

        engine.moves.confirmStartOfPhase();

        expect(engine.getCtx().phase).toBe('maneuver');
        expect(engine.getG().players['0']?.supportArea).toHaveLength(1);
    });

    it('ajoute des fardeaux quand le coût d’Aide est BURDEN', () => {
        const engine = createEngineClient({
            startPhase: 'startOfManeuver',
            playerID: '0',
            G: {
                battlefield: [createMinion({ id: 'orc' })],
                players: {
                    '0': createPlayerState('0', {
                        burdens: 1,
                        fellowshipArea: [createCompanion({ id: 'comp-1' })],
                        supportArea: [
                            createFollower({
                                id: 'follower-1',
                                aidCost: { type: 'BURDEN', amount: 1 },
                            }),
                        ],
                    }),
                },
            },
        });

        engine.moves.transferAid('follower-1', 'comp-1');

        expect(engine.getG().players['0']?.burdens).toBe(2);
    });
});
