import { describe, expect, it } from 'vitest';
import { createEngineClient } from './createEngineClient';
import {
    createCard,
    createCompanion,
    createPlayerState,
    createSite,
} from './createGameState';

const cards = (prefix: string, count: number) =>
    Array.from({ length: count }, (_, i) =>
        createCard({ id: `${prefix}-${i}` })
    );

describe('fin de Communauté', () => {
    it('avance la compagnie et passe à l’Ombre si le site est déjà posé', () => {
        const engine = createEngineClient({
            startPhase: 'fellowship',
            playerID: '0',
            G: {
                twilightPool: 0,
                path: [
                    createSite({ id: 'site-1' }),
                    createSite({ id: 'site-2', twilightCost: 1 }),
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                ],
                players: {
                    '0': createPlayerState('0', {
                        currentSiteIndex: 0,
                        fellowshipArea: [
                            createCompanion({ id: 'comp-1' }),
                            createCompanion({ id: 'comp-2' }),
                        ],
                    }),
                },
            },
        });

        engine.updatePlayerID('1');
        engine.moves.endFellowshipPhase();
        expect(engine.getCtx().phase).toBe('fellowship');

        engine.updatePlayerID('0');
        engine.moves.endFellowshipPhase();

        expect(engine.getG().players['0']?.currentSiteIndex).toBe(1);
        expect(engine.getG().twilightPool).toBe(3);
        expect(['startOfShadow', 'shadow']).toContain(engine.getCtx().phase);
    });

    it('attend que l’Ombre pose le site suivant, refuse un mauvais joueur / emplacement', () => {
        const nextSite = createSite({ id: 'site-2', twilightCost: 1 });

        const engine = createEngineClient({
            startPhase: 'fellowship',
            playerID: '0',
            G: {
                twilightPool: 0,
                path: [
                    createSite({ id: 'site-1' }),
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                ],
                players: {
                    '0': createPlayerState('0', {
                        currentSiteIndex: 0,
                        fellowshipArea: [createCompanion({ id: 'comp-1' })],
                    }),
                    '1': createPlayerState('1', {
                        sitesDeck: [nextSite],
                    }),
                },
            },
        });

        engine.moves.playSite('site-2', 1);
        expect(engine.getG().path[1]).toBeNull();

        engine.moves.endFellowshipPhase();
        expect(engine.getG().awaitingSiteSelection).toBe(true);
        expect(engine.getCtx().phase).toBe('fellowship');

        engine.moves.playSite('site-2', 1);
        expect(engine.getG().path[1]).toBeNull();

        engine.updatePlayerID('1');
        engine.moves.playSite('site-2', 2);
        expect(engine.getG().path[1]).toBeNull();

        engine.moves.playSite('site-2', 1);

        expect(engine.getG().path[1]?.id).toBe('site-2');
        expect(engine.getG().awaitingSiteSelection).toBe(false);
        expect(engine.getG().twilightPool).toBe(2);
        expect(['startOfShadow', 'shadow']).toContain(engine.getCtx().phase);
    });
});

describe('pioche et ordre de la Communauté', () => {
    it('plafonne la pioche à 4 cartes en phase de Communauté', () => {
        const engine = createEngineClient({
            startPhase: 'fellowship',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        deck: cards('d', 10),
                        hand: [],
                    }),
                },
            },
        });

        engine.moves.drawCard(3);
        engine.moves.drawCard(3);

        expect(engine.getG().players['0']?.hand).toHaveLength(4);
        expect(engine.getG().fellowshipCardsDrawn).toBe(4);
    });

    it('réordonne la Communauté', () => {
        const engine = createEngineClient({
            startPhase: 'fellowship',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createCompanion({ id: 'frodo' }),
                            createCompanion({ id: 'sam' }),
                        ],
                    }),
                },
            },
        });

        engine.moves.reorderFellowship({ fromIndex: 0, toIndex: 1 });

        const ids = engine
            .getG()
            .players['0']?.fellowshipArea.map((c) => c.id);
        expect(ids).toEqual(['sam', 'frodo']);
    });
});
