import { describe, expect, it } from 'vitest';
import { createEngineClient } from './createEngineClient';
import {
    createCard,
    createCompanion,
    createMinion,
    createPlayerState,
    createSite,
} from './createGameState';
import type { Ability } from '../types';

const oldTobyAbility: Ability = {
    id: '1C305:0',
    phases: [],
    trigger: { type: 'WHEN_PLAYED' },
    optional: true,
    cost: [],
    effects: [{ type: 'DRAW', count: 1 }],
    source: 'SELF',
    text: 'When you play this possession, you may draw a card.',
};

describe('When you play — optionnel (Old Toby)', () => {
    it('ouvre un choix après le jeu, puis pioche si on accepte', () => {
        const oldToby = createCard({
            id: '1C305',
            title: 'Old Toby',
            type: 'POSSESSION',
            kind: 'FREE_PEOPLE',
            culture: 'SHIRE',
            twilightCost: 1,
            keywords: ['PIPEWEED'],
            abilities: [oldTobyAbility],
        });
        const deckCard = createCard({
            id: 'deck-1',
            title: 'Drawn',
            type: 'EVENT',
            kind: 'FREE_PEOPLE',
        });

        const engine = createEngineClient({
            startPhase: 'fellowship',
            playerID: '0',
            G: {
                twilightPool: 0,
                players: {
                    '0': createPlayerState('0', {
                        hand: [oldToby],
                        deck: [deckCard],
                        fellowshipArea: [
                            createCompanion({ id: 'frodo', title: 'Frodo' }),
                        ],
                    }),
                },
            },
        });

        engine.moves.playCard(0);

        expect(engine.getG().players['0']?.supportArea[0]?.id).toBe('1C305');
        expect(engine.getG().pendingWhenPlayed?.abilityId).toBe('1C305:0');
        expect(engine.getG().players['0']?.hand).toHaveLength(0);

        engine.moves.resolveWhenPlayedChoice(true);

        expect(engine.getG().pendingWhenPlayed).toBeUndefined();
        expect(engine.getG().players['0']?.hand[0]?.id).toBe('deck-1');
        expect(engine.getG().fellowshipCardsDrawn).toBe(1);

        engine.stop();
    });

    it('ne pioche pas si on passe', () => {
        const oldToby = createCard({
            id: '1C305',
            title: 'Old Toby',
            type: 'POSSESSION',
            kind: 'FREE_PEOPLE',
            culture: 'SHIRE',
            twilightCost: 1,
            keywords: ['PIPEWEED'],
            abilities: [oldTobyAbility],
        });

        const engine = createEngineClient({
            startPhase: 'fellowship',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        hand: [oldToby],
                        deck: [
                            createCard({
                                id: 'deck-1',
                                type: 'EVENT',
                                kind: 'FREE_PEOPLE',
                            }),
                        ],
                    }),
                },
            },
        });

        engine.moves.playCard(0);
        engine.moves.resolveWhenPlayedChoice(false);

        expect(engine.getG().pendingWhenPlayed).toBeUndefined();
        expect(engine.getG().players['0']?.hand).toHaveLength(0);
        expect(engine.getG().players['0']?.deck).toHaveLength(1);

        engine.stop();
    });
});

const longbottomAbility: Ability = {
    id: '1C300:0',
    phases: [],
    trigger: { type: 'WHEN_PLAYED' },
    optional: true,
    cost: [],
    effects: [{ type: 'DISCARD_FROM_HAND', count: 2, upTo: true }],
    source: 'SELF',
    text: 'When you play this possession, you may discard up to 2 cards from hand.',
};

describe('When you play — optionnel (Longbottom Leaf)', () => {
    function playLongbottom(handExtras: ReturnType<typeof createCard>[]) {
        const leaf = createCard({
            id: '1C300',
            title: 'Longbottom Leaf',
            type: 'POSSESSION',
            kind: 'FREE_PEOPLE',
            culture: 'SHIRE',
            twilightCost: 1,
            keywords: ['PIPEWEED'],
            abilities: [longbottomAbility],
        });
        const engine = createEngineClient({
            startPhase: 'fellowship',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        hand: [leaf, ...handExtras],
                    }),
                },
            },
        });
        engine.moves.playCard(0);
        return engine;
    }

    it('ouvre un choix, puis défausse les cartes choisies (jusqu’à 2)', () => {
        const engine = playLongbottom([
            createCard({
                id: 'hand-1',
                type: 'EVENT',
                kind: 'FREE_PEOPLE',
            }),
            createCard({
                id: 'hand-2',
                type: 'EVENT',
                kind: 'FREE_PEOPLE',
            }),
            createCard({
                id: 'hand-3',
                type: 'EVENT',
                kind: 'FREE_PEOPLE',
            }),
        ]);

        expect(engine.getG().pendingWhenPlayed?.abilityId).toBe('1C300:0');
        expect(engine.getG().players['0']?.hand).toHaveLength(3);

        engine.moves.resolveWhenPlayedChoice(true, ['hand-1', 'hand-2']);

        expect(engine.getG().pendingWhenPlayed).toBeUndefined();
        expect(engine.getG().players['0']?.hand.map((c) => c.id)).toEqual([
            'hand-3',
        ]);
        expect(engine.getG().players['0']?.discard.map((c) => c.id)).toEqual([
            'hand-1',
            'hand-2',
        ]);

        engine.stop();
    });

    it('accepte 0 carte (up to) sans défausser', () => {
        const engine = playLongbottom([
            createCard({
                id: 'hand-1',
                type: 'EVENT',
                kind: 'FREE_PEOPLE',
            }),
        ]);

        engine.moves.resolveWhenPlayedChoice(true, []);

        expect(engine.getG().pendingWhenPlayed).toBeUndefined();
        expect(engine.getG().players['0']?.hand.map((c) => c.id)).toEqual([
            'hand-1',
        ]);
        expect(engine.getG().players['0']?.discard).toHaveLength(0);

        engine.stop();
    });

    it('ne défausse pas si on passe', () => {
        const engine = playLongbottom([
            createCard({
                id: 'hand-1',
                type: 'EVENT',
                kind: 'FREE_PEOPLE',
            }),
        ]);

        engine.moves.resolveWhenPlayedChoice(false);

        expect(engine.getG().pendingWhenPlayed).toBeUndefined();
        expect(engine.getG().players['0']?.hand.map((c) => c.id)).toEqual([
            'hand-1',
        ]);

        engine.stop();
    });

    it('refuse plus de 2 cartes', () => {
        const engine = playLongbottom([
            createCard({
                id: 'hand-1',
                type: 'EVENT',
                kind: 'FREE_PEOPLE',
            }),
            createCard({
                id: 'hand-2',
                type: 'EVENT',
                kind: 'FREE_PEOPLE',
            }),
            createCard({
                id: 'hand-3',
                type: 'EVENT',
                kind: 'FREE_PEOPLE',
            }),
        ]);

        engine.moves.resolveWhenPlayedChoice(true, [
            'hand-1',
            'hand-2',
            'hand-3',
        ]);

        expect(engine.getG().pendingWhenPlayed?.abilityId).toBe('1C300:0');
        expect(engine.getG().players['0']?.hand).toHaveLength(3);

        engine.stop();
    });
});

const watchfulAbility: Ability = {
    id: '11R143:0',
    phases: [],
    trigger: { type: 'WHEN_PLAYED' },
    optional: true,
    cost: [
        {
            spot: [
                {
                    count: 1,
                    target: [['ORC', 'MINION']],
                    excludeSource: true,
                },
            ],
        },
    ],
    effects: [
        {
            type: 'REPLACE_SITE',
            scope: 'CURRENT',
            from: 'SITES_DECK',
            siteKeyword: 'UNDERGROUND',
        },
    ],
    source: 'SELF',
    text: "When you play this minion, you may spot another orc minion to replace the fellowship's current site with an underground site from your adventure deck.",
};

describe('When you play — Watchful Orc (replace site)', () => {
    it('ouvre le choix si un autre orc et un site underground sont dispo, puis remplace', () => {
        const watchful = createMinion({
            id: '11R143',
            instanceId: 'watchful',
            culture: 'ORC',
            race: 'ORC',
            twilightCost: 4,
            abilities: [watchfulAbility],
        });
        const otherOrc = createMinion({
            id: 'other-orc',
            culture: 'ORC',
            race: 'ORC',
        });
        const plains = createSite({
            id: 'plains',
            keywords: ['PLAINS'],
            siteNumber: 1,
            ownerId: '0',
        });
        const cave = createSite({
            id: 'cave',
            instanceId: 'cave',
            keywords: ['UNDERGROUND'],
            ownerId: '1',
        });

        const engine = createEngineClient({
            startPhase: 'shadow',
            playerID: '1',
            G: {
                twilightPool: 10,
                path: [plains, null, null, null, null, null, null, null, null],
                battlefield: [otherOrc],
                players: {
                    '0': createPlayerState('0', { currentSiteIndex: 0 }),
                    '1': createPlayerState('1', {
                        hand: [watchful],
                        sitesDeck: [cave],
                    }),
                },
            },
        });

        engine.moves.playShadowCard(0);

        expect(engine.getG().battlefield.some((c) => c.id === '11R143')).toBe(
            true
        );
        expect(engine.getG().pendingWhenPlayed?.abilityId).toBe('11R143:0');

        engine.moves.resolveWhenPlayedChoice(true, undefined, 'cave');

        expect(engine.getG().pendingWhenPlayed).toBeUndefined();
        expect(engine.getG().path[0]?.id).toBe('cave');
        expect(engine.getG().path[0]?.siteNumber).toBe(1);
        expect(
            engine.getG().players['0']?.sitesDeck.some((s) => s.id === 'plains')
        ).toBe(true);

        engine.stop();
    });

    it('n’ouvre pas le choix s’il n’y a pas d’autre orc', () => {
        const watchful = createMinion({
            id: '11R143',
            culture: 'ORC',
            race: 'ORC',
            twilightCost: 4,
            abilities: [watchfulAbility],
        });
        const plains = createSite({
            id: 'plains',
            keywords: ['PLAINS'],
            siteNumber: 1,
            ownerId: '0',
        });
        const cave = createSite({
            id: 'cave',
            keywords: ['UNDERGROUND'],
            ownerId: '1',
        });

        const engine = createEngineClient({
            startPhase: 'shadow',
            playerID: '1',
            G: {
                twilightPool: 10,
                path: [plains, null, null, null, null, null, null, null, null],
                battlefield: [],
                players: {
                    '0': createPlayerState('0', { currentSiteIndex: 0 }),
                    '1': createPlayerState('1', {
                        hand: [watchful],
                        sitesDeck: [cave],
                    }),
                },
            },
        });

        engine.moves.playShadowCard(0);

        expect(engine.getG().pendingWhenPlayed).toBeUndefined();
        engine.stop();
    });
});
