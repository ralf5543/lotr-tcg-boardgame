import { describe, expect, it } from 'vitest';
import { createEngineClient } from './createEngineClient';
import {
    createCard,
    createCompanion,
    createMinion,
    createPlayerState,
} from './createGameState';

describe('transferAttachment', () => {
    it('transfère une possession FP et ajoute du Crépuscule', () => {
        const sword = createCard({
            id: 'sword',
            kind: 'FREE_PEOPLE',
            type: 'POSSESSION',
            title: 'Sword',
            twilightCost: 1,
        });

        const engine = createEngineClient({
            startPhase: 'fellowship',
            playerID: '0',
            G: {
                twilightPool: 0,
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createCompanion({
                                id: 'comp-1',
                                attachments: [sword],
                            }),
                            createCompanion({ id: 'comp-2' }),
                        ],
                    }),
                },
            },
        });

        engine.moves.transferAttachment({
            attachmentId: 'sword',
            fromCharacterId: 'comp-1',
            toCharacterId: 'comp-2',
        });

        const [first, second] = engine.getG().players['0']?.fellowshipArea ?? [];
        expect(first?.attachments).toHaveLength(0);
        expect(second?.attachments?.[0]?.id).toBe('sword');
        expect(engine.getG().twilightPool).toBe(1);
    });

    it('refuse le transfert vers le même hôte, et hors phase de Communauté', () => {
        const sword = createCard({
            id: 'sword',
            kind: 'FREE_PEOPLE',
            type: 'POSSESSION',
            twilightCost: 1,
        });

        const engine = createEngineClient({
            startPhase: 'fellowship',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createCompanion({
                                id: 'comp-1',
                                attachments: [sword],
                            }),
                            createCompanion({ id: 'comp-2' }),
                        ],
                    }),
                },
            },
        });

        engine.moves.transferAttachment({
            attachmentId: 'sword',
            fromCharacterId: 'comp-1',
            toCharacterId: 'comp-1',
        });
        expect(
            engine.getG().players['0']?.fellowshipArea[0]?.attachments
        ).toHaveLength(1);

        engine.updatePlayerID('1');
        engine.moves.transferAttachment({
            attachmentId: 'sword',
            fromCharacterId: 'comp-1',
            toCharacterId: 'comp-2',
        });
        expect(
            engine.getG().players['0']?.fellowshipArea[0]?.attachments
        ).toHaveLength(1);
    });

    it('fait payer le Crépuscule pour un transfert d’Ombre', () => {
        const blade = createCard({
            id: 'blade',
            kind: 'SHADOW',
            type: 'POSSESSION',
            twilightCost: 2,
        });

        const engine = createEngineClient({
            startPhase: 'shadow',
            playerID: '1',
            G: {
                twilightPool: 3,
                battlefield: [
                    createMinion({ id: 'orc-1', attachments: [blade] }),
                    createMinion({ id: 'orc-2' }),
                ],
            },
        });

        engine.moves.transferAttachment({
            attachmentId: 'blade',
            fromCharacterId: 'orc-1',
            toCharacterId: 'orc-2',
        });

        expect(engine.getG().twilightPool).toBe(1);
        expect(engine.getG().battlefield[0]?.attachments).toHaveLength(0);
        expect(engine.getG().battlefield[1]?.attachments?.[0]?.id).toBe('blade');
    });
});
