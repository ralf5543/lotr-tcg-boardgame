import { describe, expect, it } from 'vitest';
import {
    createEngineClient,
    passBothActionWindows,
    type EngineClient,
} from './createEngineClient';
import {
    createCard,
    createCompanion,
    createMinion,
    createPlayerState,
    createSite,
} from './createGameState';

const cards = (prefix: string, count: number) =>
    Array.from({ length: count }, (_, i) =>
        createCard({ id: `${prefix}-${i}`, title: `${prefix} ${i}` })
    );

function goToFpDecision(engine: EngineClient) {
    passBothActionWindows(engine);
    engine.updatePlayerID('1');
    engine.moves.confirmHandRefill();
    expect(engine.getG().regroupStep).toBe('FP_DECISION');
}

describe('ralliement (Muster)', () => {
    it('skippe le ralliement s’il n’y a aucun MUSTER', () => {
        const engine = createEngineClient({
            startPhase: 'startOfRegroup',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [createCompanion({ id: 'comp-1' })],
                    }),
                },
            },
        });

        expect(engine.getCtx().phase).toBe('regroup');
        expect(engine.getG().musterState).toBeUndefined();
        expect(engine.getG().regroupStep).toBe('ACTION_WINDOW');
    });

    it('défausse jusqu’au quota, pioche autant, puis passe au regroupement', () => {
        const engine = createEngineClient({
            startPhase: 'startOfRegroup',
            playerID: '0',
            G: {
                battlefield: [
                    createMinion({ id: 'muster-orc', keywords: ['MUSTER'] }),
                ],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createCompanion({
                                id: 'frodo',
                                keywords: ['MUSTER'],
                            }),
                        ],
                        hand: cards('fp-hand', 4),
                        deck: cards('fp-deck', 4),
                    }),
                    '1': createPlayerState('1', {
                        hand: cards('sh-hand', 4),
                        deck: cards('sh-deck', 4),
                    }),
                },
            },
        });

        expect(engine.getCtx().phase).toBe('startOfRegroup');
        expect(engine.getG().regroupStep).toBe('MUSTER_STEP');
        expect(engine.getG().musterState?.players['0']?.allowedCount).toBe(1);
        expect(engine.getG().musterState?.players['1']?.allowedCount).toBe(1);

        engine.moves.discardForMuster(0);
        engine.moves.discardForMuster(0);
        expect(engine.getG().musterState?.players['0']?.discardedCount).toBe(1);
        expect(engine.getG().players['0']?.hand).toHaveLength(3);

        engine.moves.confirmMuster();
        expect(engine.getG().players['0']?.hand).toHaveLength(4);
        expect(engine.getCtx().phase).toBe('startOfRegroup');

        engine.updatePlayerID('1');
        engine.moves.confirmMuster();

        expect(engine.getG().musterState).toBeUndefined();
        expect(engine.getCtx().phase).toBe('regroup');
    });
});

describe('regroupement : refill et fin de tour', () => {
    it('reconstitue la main d’Ombre à 8, puis laisse le FP décider', () => {
        const engine = createEngineClient({
            startPhase: 'regroup',
            G: {
                players: {
                    '1': createPlayerState('1', {
                        hand: cards('sh-hand', 5),
                        deck: cards('sh-deck', 10),
                    }),
                },
            },
        });

        goToFpDecision(engine);

        expect(engine.getG().players['1']?.hand).toHaveLength(8);
    });

    it('après une défausse optionnelle (main ≤ 8), enchaîne tout de suite la pioche', () => {
        const engine = createEngineClient({
            startPhase: 'regroup',
            G: {
                players: {
                    '1': createPlayerState('1', {
                        hand: cards('sh-hand', 6),
                        deck: cards('sh-deck', 10),
                    }),
                },
            },
        });

        passBothActionWindows(engine);
        engine.updatePlayerID('1');
        engine.moves.discardCardFromHand(0);

        expect(engine.getG().players['1']?.hand).toHaveLength(8);
        expect(engine.getG().players['1']?.discard).toHaveLength(1);
        expect(engine.getG().regroupStep).toBe('FP_DECISION');
    });

    it('saute la décision FP si la compagnie a déjà bougé 2 fois', () => {
        const engine = createEngineClient({
            startPhase: 'regroup',
            G: { movesThisTurn: 2 },
        });

        passBothActionWindows(engine);
        engine.updatePlayerID('1');
        engine.moves.confirmHandRefill();

        expect(engine.getG().regroupStep).toBe('FP_REFILL');
    });

    it('termine le tour : swap FP, vide le battlefield, reset le Crépuscule', () => {
        const follower = createCard({
            id: 'follower-1',
            kind: 'FREE_PEOPLE',
            type: 'FOLLOWER',
            title: 'Follower',
            attachedViaAid: true,
        });

        const engine = createEngineClient({
            startPhase: 'regroup',
            G: {
                twilightPool: 7,
                battlefield: [createMinion({ id: 'leftover-orc' })],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createCompanion({
                                id: 'comp-1',
                                attachments: [follower],
                            }),
                        ],
                    }),
                },
            },
        });

        goToFpDecision(engine);
        engine.updatePlayerID('0');
        engine.moves.endTurnChoice();
        engine.moves.confirmHandRefill();

        expect(engine.getG().fpPlayerId).toBe('1');
        expect(engine.getG().twilightPool).toBe(0);
        expect(engine.getG().battlefield).toHaveLength(0);
        expect(engine.getCtx().phase).toBe('fellowship');
        expect(
            engine.getG().players['0']?.fellowshipArea[0]?.attachments
        ).toHaveLength(0);
        expect(engine.getG().players['0']?.supportArea).toHaveLength(1);
    });
});

describe('avancée de la compagnie au regroupement', () => {
    it('ajoute le Crépuscule du site + des compagnons si le site est déjà posé', () => {
        const engine = createEngineClient({
            startPhase: 'regroup',
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

        goToFpDecision(engine);
        engine.updatePlayerID('0');
        engine.moves.moveNextSite();

        expect(engine.getG().players['0']?.currentSiteIndex).toBe(1);
        expect(engine.getG().twilightPool).toBe(3);
        expect(['startOfShadow', 'shadow']).toContain(engine.getCtx().phase);
    });

    it('attend que l’Ombre pose le site suivant s’il n’est pas encore sur le chemin', () => {
        const nextSite = createSite({
            id: 'site-2',
            twilightCost: 2,
            ownerId: '1',
        });

        const engine = createEngineClient({
            startPhase: 'regroup',
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

        goToFpDecision(engine);
        engine.updatePlayerID('0');
        engine.moves.moveNextSite();

        expect(engine.getG().awaitingSiteSelection).toBe(true);
        expect(engine.getCtx().phase).toBe('regroup');

        engine.moves.playSite('site-2', 1);
        expect(engine.getG().awaitingSiteSelection).toBe(true);

        engine.updatePlayerID('1');
        engine.moves.playSite('site-2', 1);

        expect(engine.getG().path[1]?.id).toBe('site-2');
        expect(engine.getG().twilightPool).toBe(3);
        expect(['startOfShadow', 'shadow']).toContain(engine.getCtx().phase);
    });
});
