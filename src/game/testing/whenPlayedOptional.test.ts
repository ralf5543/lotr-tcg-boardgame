import { describe, expect, it } from 'vitest';
import { createEngineClient } from './createEngineClient';
import {
    createCard,
    createCompanion,
    createPlayerState,
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
