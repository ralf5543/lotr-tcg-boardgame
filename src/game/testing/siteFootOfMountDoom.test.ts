import { describe, expect, it } from 'vitest';
import { parseSiteAbilities } from '../../../scripts/convert/parsers';
import { discardCardsFromHand } from '../engine/abilities/payAbilityCost';
import {
    discardDestinationPile,
    isDiscardReplacedByRemoval,
    placeCardIntoDiscardPile,
} from '../logic/sites';
import { discardCardFromPlay } from '../../utils/discardCardFromPlay';
import type { Ability, SiteCardState } from '../types';
import { createEngineClient } from './createEngineClient';
import {
    createCard,
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
    createSite,
    createSkirmishActionWindow,
} from './createGameState';

const FOOT_TEXT =
    '<keyword>Mountain.</keyword> Each card that is about to be placed into the discard pile is removed from the game instead.';

function footSite(): SiteCardState {
    return createSite({
        id: '18U135',
        name: 'Foot of Mount Doom',
        siteNumber: 5,
        abilities: parseSiteAbilities(
            FOOT_TEXT,
            '18U135'
        ) as unknown as Ability[],
        ...({
            instanceId: '18U135-inst',
            kind: 'SITE',
            type: 'SITE',
            ownerId: '1',
        } as object),
    });
}

function stateAt(site: SiteCardState | null) {
    return createGameState({
        path: [site],
        players: {
            '0': createPlayerState('0', { currentSiteIndex: 0 }),
            '1': createPlayerState('1', { currentSiteIndex: 0 }),
        },
    });
}

describe('parseSiteAbilities — Foot of Mount Doom', () => {
    it('passif WHILE : REMOVE_FROM_GAME_INSTEAD_OF_DISCARD', () => {
        const abilities = parseSiteAbilities(FOOT_TEXT, '18U135');
        expect(abilities).toEqual([
            expect.objectContaining({
                trigger: { type: 'WHILE' },
                cost: [],
                effects: [{ type: 'REMOVE_FROM_GAME_INSTEAD_OF_DISCARD' }],
            }),
        ]);
    });
});

describe('destination de défausse', () => {
    it('site courant = Foot → retirées du jeu ; sinon défausse', () => {
        const atFoot = stateAt(footSite());
        expect(isDiscardReplacedByRemoval(atFoot)).toBe(true);
        const card = createCard({ id: 'x1', instanceId: 'x1' });
        placeCardIntoDiscardPile(atFoot, '0', card);
        expect(atFoot.players['0']?.removedFromGame.map((c) => c.id)).toEqual([
            'x1',
        ]);
        expect(atFoot.players['0']?.discard).toHaveLength(0);

        const elsewhere = stateAt(createSite({ id: 'plain', siteNumber: 5 }));
        expect(isDiscardReplacedByRemoval(elsewhere)).toBe(false);
        expect(discardDestinationPile(elsewhere, '1')).toBe(
            elsewhere.players['1']?.discard
        );
    });
});

describe('discardCardFromPlay sous Foot', () => {
    it('situation FP défaussée → retirée du jeu du FP', () => {
        const condition = createCard({
            id: 'cond-1',
            instanceId: 'cond-1',
            type: 'CONDITION',
            kind: 'FREE_PEOPLE',
        });
        const G = stateAt(footSite());
        G.players['0']!.supportArea = [condition];
        expect(discardCardFromPlay(G, condition)).toBe(true);
        expect(G.players['0']?.supportArea).toHaveLength(0);
        expect(G.players['0']?.removedFromGame.map((c) => c.id)).toEqual([
            'cond-1',
        ]);
        expect(G.players['0']?.discard).toHaveLength(0);
    });

    it('séide défaussé depuis le champ → retiré du jeu de l’Ombre', () => {
        const minion = createMinion({ id: 'orc-1', instanceId: 'orc-1' });
        const G = stateAt(footSite());
        G.battlefield = [minion];
        expect(discardCardFromPlay(G, minion)).toBe(true);
        expect(G.battlefield).toHaveLength(0);
        expect(G.players['1']?.removedFromGame.map((c) => c.id)).toEqual([
            'orc-1',
        ]);
        expect(G.players['1']?.discard).toHaveLength(0);
    });

    it('hors Foot : la défausse reste la défausse', () => {
        const condition = createCard({
            id: 'cond-1',
            instanceId: 'cond-1',
            type: 'CONDITION',
            kind: 'FREE_PEOPLE',
        });
        const G = stateAt(createSite({ id: 'plain', siteNumber: 5 }));
        G.players['0']!.supportArea = [condition];
        expect(discardCardFromPlay(G, condition)).toBe(true);
        expect(G.players['0']?.discard.map((c) => c.id)).toEqual(['cond-1']);
        expect(G.players['0']?.removedFromGame).toHaveLength(0);
    });
});

describe('coût : défausse de main sous Foot', () => {
    it('discardCardsFromHand retire du jeu au lieu de défausser', () => {
        const inHand = createCard({ id: 'h1', instanceId: 'h1' });
        const G = stateAt(footSite());
        G.players['0']!.hand = [inHand];
        expect(discardCardsFromHand(G, '0', ['h1'])).toBe(true);
        expect(G.players['0']?.hand).toHaveLength(0);
        expect(G.players['0']?.removedFromGame.map((c) => c.id)).toEqual([
            'h1',
        ]);
        expect(G.players['0']?.discard).toHaveLength(0);
    });
});

describe('runtime — Foot of Mount Doom', () => {
    it('séide tué → retiré du jeu de l’Ombre (pas la défausse)', () => {
        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                path: [footSite()],
                battlefield: [createMinion({ id: 'orc-1', vitality: 1 })],
                players: {
                    '0': createPlayerState('0', { currentSiteIndex: 0 }),
                    '1': createPlayerState('1', { currentSiteIndex: 0 }),
                },
            },
        });

        engine.moves.applyWound('orc-1');
        engine.moves.cleanupPendingDeaths();

        expect(engine.getG().battlefield).toHaveLength(0);
        expect(engine.getG().players['1']?.removedFromGame[0]?.id).toBe(
            'orc-1'
        );
        expect(engine.getG().players['1']?.discard).toHaveLength(0);
        engine.stop();
    });

    it('événement FP joué → retiré du jeu (pas la défausse)', () => {
        const eventAbility: Ability = {
            id: '1U293:0',
            phases: ['SKIRMISH'],
            cost: [
                {
                    exert: [
                        {
                            count: 1,
                            target: [['HOBBIT']],
                            mode: 'DESIGNATION',
                        },
                    ],
                },
            ],
            effects: [
                {
                    type: 'ADD_TEMP_STAT',
                    stat: 'STRENGTH',
                    value: 3,
                    target: [['HOBBIT']],
                    expiresAtPhase: 'SKIRMISH',
                },
            ],
            source: 'SELF',
        };
        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                ...createSkirmishActionWindow('sk-1'),
                path: [footSite()],
                skirmishes: [
                    { id: 'sk-1', companionId: 'frodo', minionIds: ['orc'] },
                ],
                players: {
                    '0': createPlayerState('0', {
                        currentSiteIndex: 0,
                        fellowshipArea: [
                            createCompanion({
                                id: 'frodo',
                                title: 'Frodo',
                                race: 'HOBBIT',
                                vitality: 4,
                                strength: 3,
                            }),
                        ],
                        hand: [
                            createCard({
                                id: '1U293',
                                kind: 'FREE_PEOPLE',
                                type: 'EVENT',
                                title: 'Halfling Deftness',
                                phases: ['SKIRMISH'],
                                twilightCost: 0,
                                abilities: [eventAbility],
                            }),
                        ],
                    }),
                    '1': createPlayerState('1', { currentSiteIndex: 0 }),
                },
            },
        });

        engine.moves.beginPendingPlay(0, 'Choisissez un Hobbit.');
        engine.moves.playCard(0, 'frodo');

        const G = engine.getG();
        expect(G.players['0']?.hand).toHaveLength(0);
        expect(G.players['0']?.removedFromGame.map((c) => c.id)).toEqual([
            '1U293',
        ]);
        expect(G.players['0']?.discard).toHaveLength(0);
        engine.stop();
    });
});
