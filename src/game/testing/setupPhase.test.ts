import { describe, expect, it } from 'vitest';
import { createEngineClient } from './createEngineClient';
import {
    createBiddingSetupState,
    createCard,
    createCompanion,
    createPlayerState,
    createSite,
} from './createGameState';

const deck = (prefix: string, count: number) =>
    Array.from({ length: count }, (_, i) =>
        createCard({ id: `${prefix}-${i}`, title: `${prefix} ${i}` })
    );

describe('mise en place', () => {
    it('borne les mises entre 0 et 10 fardeaux', () => {
        const engine = createEngineClient({
            startPhase: 'setup',
            G: { setupState: createBiddingSetupState() },
        });

        engine.moves.submitBid(15);
        expect(engine.getG().setupState?.bids['0']).toBe(10);
        expect(engine.getG().players['0']?.burdens).toBe(10);

        engine.updatePlayerID('1');
        engine.moves.submitBid(-3);
        expect(engine.getG().setupState?.bids['1']).toBe(0);
        expect(engine.getG().players['1']?.burdens).toBe(0);
    });

    it('donne le choix du premier joueur au gagnant de l’enchère', () => {
        const engine = createEngineClient({
            startPhase: 'setup',
            G: { setupState: createBiddingSetupState() },
        });

        engine.moves.submitBid(3);
        engine.updatePlayerID('1');
        engine.moves.submitBid(1);

        expect(engine.getG().setupState?.auctionWinnerId).toBe('0');
        expect(engine.getG().setupState?.step).toBe('CHOOSING_FIRST');

        engine.moves.chooseFirstPlayer(true);
        expect(engine.getG().setupState?.step).toBe('CHOOSING_FIRST');
        expect(engine.getG().fpPlayerId).toBe('0');

        engine.updatePlayerID('0');
        engine.moves.chooseFirstPlayer(false);

        expect(engine.getG().fpPlayerId).toBe('1');
        expect(engine.getG().setupState?.step).toBe('AWAITING_SITE');
        expect(engine.getG().players['1']?.burdens).toBe(1);
    });

    it('enchaîne site 1 → mulligan → fellowship', () => {
        const site = createSite({ id: 'site-1', name: 'Bag End' });
        const engine = createEngineClient({
            startPhase: 'setup',
            G: {
                setupState: createBiddingSetupState(),
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createCompanion({
                                id: 'rb-0',
                                isFaceDown: true,
                            }),
                        ],
                        deck: deck('p0', 8),
                    }),
                    '1': createPlayerState('1', {
                        fellowshipArea: [
                            createCompanion({
                                id: 'rb-1',
                                isFaceDown: true,
                            }),
                        ],
                        deck: deck('p1', 8),
                    }),
                },
            },
        });

        engine.moves.submitBid(2);
        engine.updatePlayerID('1');
        engine.moves.submitBid(0);
        engine.updatePlayerID('0');
        engine.moves.chooseFirstPlayer(true);

        engine.updatePlayerID('1');
        engine.moves.selectStartingSite(site);
        expect(engine.getG().setupState?.step).toBe('AWAITING_SITE');

        engine.updatePlayerID('0');
        engine.moves.selectStartingSite(site);

        expect(engine.getG().path[0]?.id).toBe('site-1');
        expect(engine.getG().setupState?.step).toBe('MULLIGAN');
        expect(
            engine.getG().players['0']?.fellowshipArea[0]?.isFaceDown
        ).toBe(false);
        expect(engine.getG().players['0']?.hand).toHaveLength(8);
        expect(engine.getG().players['1']?.hand).toHaveLength(8);

        engine.moves.submitMulliganChoice(false);
        expect(engine.getG().setupState?.step).toBe('MULLIGAN');

        engine.updatePlayerID('1');
        engine.moves.submitMulliganChoice(false);

        expect(engine.getG().setupState?.step).toBe('COMPLETE');
        expect(engine.getCtx().phase).toBe('fellowship');
    });

    it('en cas d’égalité, le RNG seedé désigne un gagnant', () => {
        const engine = createEngineClient({
            startPhase: 'setup',
            G: { setupState: createBiddingSetupState() },
        });

        engine.moves.submitBid(1);
        engine.updatePlayerID('1');
        engine.moves.submitBid(1);

        expect(['0', '1']).toContain(engine.getG().setupState?.auctionWinnerId);
        expect(engine.getG().setupState?.step).toBe('CHOOSING_FIRST');
    });
});
