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
