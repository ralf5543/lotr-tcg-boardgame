import { describe, expect, it } from 'vitest';
import { parseSiteAbilities } from '../../../scripts/convert/parsers';
import {
    beginDeadPileRemovalIfNeeded,
    resolveDeadPileRemoval,
} from '../logic/siteDeadPileRemoval';
import type { Ability, SiteCardState } from '../types';
import { createEngineClient } from './createEngineClient';
import {
    createCard,
    createCompanion,
    createGameState,
    createPlayerState,
    createSite,
} from './createGameState';

const FALLS_TEXT =
    '<keyword>River.</keyword> When the Fellowship moves to this site in region 2, the Free Peoples player places a card from the dead pile out of play.';

function fallsSite(siteNumber = 4): SiteCardState {
    return createSite({
        id: '17U146',
        name: 'Falls of Rauros',
        siteNumber,
        abilities: parseSiteAbilities(
            FALLS_TEXT,
            '17U146'
        ) as unknown as Ability[],
        ...({
            instanceId: '17U146-inst',
            kind: 'SITE',
            type: 'SITE',
            ownerId: '1',
        } as object),
    });
}

const deadGandalf = () =>
    createCard({
        id: '1R72',
        instanceId: 'gandalf-dead',
        type: 'COMPANION',
        kind: 'FREE_PEOPLE',
        title: 'Gandalf',
    });
const deadBoromir = () =>
    createCard({
        id: '1R96',
        instanceId: 'boromir-dead',
        type: 'COMPANION',
        kind: 'FREE_PEOPLE',
        title: 'Boromir',
    });

describe('parseSiteAbilities — Falls of Rauros', () => {
    it('moves to région 2 → REMOVE_DEAD_PILE_CARD_FROM_GAME (obligatoire)', () => {
        const abilities = parseSiteAbilities(FALLS_TEXT, '17U146');
        expect(abilities).toEqual([
            expect.objectContaining({
                optional: false,
                trigger: { type: 'MOVES_TO', siteRegion: 2 },
                cost: [],
                effects: [{ type: 'REMOVE_DEAD_PILE_CARD_FROM_GAME' }],
            }),
        ]);
    });
});

describe('beginDeadPileRemovalIfNeeded', () => {
    it('ouvre le choix FP en région 2 avec une pile de mort non vide', () => {
        const site = fallsSite(4);
        const G = createGameState({
            path: [null, null, null, site],
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 3,
                    deadPile: [deadGandalf(), deadBoromir()],
                }),
                '1': createPlayerState('1'),
            },
        });
        expect(beginDeadPileRemovalIfNeeded(G, 'startOfShadow')).toBe(true);
        expect(G.pendingDeadPileRemoval?.playerId).toBe('0');
        expect(G.pendingDeadPileRemoval?.pendingPhaseAfter).toBe(
            'startOfShadow'
        );
    });

    it('ne s’ouvre pas hors région 2', () => {
        const site = fallsSite(3);
        const G = createGameState({
            path: [null, null, site],
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 2,
                    deadPile: [deadGandalf()],
                }),
                '1': createPlayerState('1'),
            },
        });
        expect(beginDeadPileRemovalIfNeeded(G, 'startOfShadow')).toBe(false);
        expect(G.pendingDeadPileRemoval).toBeUndefined();
    });

    it('pile de mort vide → aucun choix, le flux continue', () => {
        const site = fallsSite(5);
        const G = createGameState({
            path: [null, null, null, null, site],
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 4,
                    deadPile: [],
                }),
                '1': createPlayerState('1'),
            },
        });
        expect(beginDeadPileRemovalIfNeeded(G, 'startOfShadow')).toBe(false);
        expect(G.pendingDeadPileRemoval).toBeUndefined();
    });
});

describe('resolveDeadPileRemoval', () => {
    function pendingG() {
        const site = fallsSite(4);
        const G = createGameState({
            path: [null, null, null, site],
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 3,
                    deadPile: [deadGandalf(), deadBoromir()],
                }),
                '1': createPlayerState('1'),
            },
        });
        beginDeadPileRemovalIfNeeded(G, 'startOfShadow');
        return G;
    }

    it('déplace la carte de la pile de mort vers les retirées du jeu', () => {
        const G = pendingG();
        expect(resolveDeadPileRemoval(G, '0', 'gandalf-dead')).toBe(true);
        expect(G.pendingDeadPileRemoval).toBeUndefined();
        expect(G.players['0']?.deadPile.map((c) => c.instanceId)).toEqual([
            'boromir-dead',
        ]);
        expect(
            G.players['0']?.removedFromGame.map((c) => c.instanceId)
        ).toEqual(['gandalf-dead']);
        expect(G.players['0']?.discard).toHaveLength(0);
    });

    it('refuse un autre joueur et une carte hors pile de mort', () => {
        const G = pendingG();
        expect(resolveDeadPileRemoval(G, '1', 'gandalf-dead')).toBe(false);
        expect(resolveDeadPileRemoval(G, '0', 'missing')).toBe(false);
        expect(G.pendingDeadPileRemoval).toBeDefined();
        expect(G.players['0']?.deadPile).toHaveLength(2);
        expect(G.players['0']?.removedFromGame).toHaveLength(0);
    });
});

describe('runtime — Falls of Rauros', () => {
    it('fin de Communauté → choix FP → la partie continue vers l’Ombre', () => {
        const falls = fallsSite(4);
        const start = createSite({
            id: 'start-site',
            name: 'Start',
            siteNumber: 3,
            ...({
                instanceId: 'start-inst',
                kind: 'SITE',
                type: 'SITE',
                ownerId: '0',
            } as object),
        });
        const engine = createEngineClient({
            startPhase: 'fellowship',
            playerID: '0',
            G: {
                path: [null, null, start, falls],
                players: {
                    '0': createPlayerState('0', {
                        currentSiteIndex: 2,
                        fellowshipArea: [
                            createCompanion({ id: 'c1' }),
                            createCompanion({ id: 'c2', title: 'Sam' }),
                        ],
                        deadPile: [deadGandalf(), deadBoromir()],
                    }),
                    '1': createPlayerState('1', { currentSiteIndex: 2 }),
                },
            },
        });

        engine.moves.endFellowshipPhase();
        const arrived = engine.getG();
        expect(arrived.players['0']?.currentSiteIndex).toBe(3);
        expect(arrived.pendingDeadPileRemoval?.playerId).toBe('0');
        // La phase Ombre n’a pas encore démarré.
        expect(engine.getCtx().phase).toBe('fellowship');

        // L’Ombre ne peut pas choisir à la place du FP.
        engine.updatePlayerID('1');
        engine.moves.resolveDeadPileRemovalChoice('gandalf-dead');
        expect(engine.getG().pendingDeadPileRemoval).toBeDefined();

        // Mauvaise carte refusée.
        engine.updatePlayerID('0');
        engine.moves.resolveDeadPileRemovalChoice('missing');
        expect(engine.getG().pendingDeadPileRemoval).toBeDefined();

        engine.moves.resolveDeadPileRemovalChoice('boromir-dead');
        const done = engine.getG();
        expect(done.pendingDeadPileRemoval).toBeUndefined();
        expect(done.players['0']?.deadPile.map((c) => c.instanceId)).toEqual([
            'gandalf-dead',
        ]);
        expect(
            done.players['0']?.removedFromGame.map((c) => c.instanceId)
        ).toEqual(['boromir-dead']);
        expect(engine.getCtx().phase).not.toBe('fellowship');
        engine.stop();
    });
});
