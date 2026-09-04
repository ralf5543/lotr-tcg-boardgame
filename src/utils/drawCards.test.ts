import { describe, expect, it } from 'vitest';
import { drawCardsForPlayer } from './drawCards';
import {
    createCard,
    createGameState,
    createPlayerState,
} from '../game/testing/createGameState';

describe('drawCardsForPlayer', () => {
    it('plafonne à 4 cartes pendant la phase de Communauté', () => {
        const player = createPlayerState('0', {
            deck: Array.from({ length: 10 }, (_, i) =>
                createCard({ id: `d-${i}` })
            ),
            hand: [],
        });
        const G = createGameState({
            fellowshipCardsDrawn: 0,
            players: { '0': player },
        });

        const first = drawCardsForPlayer(G, player, 3, true);
        expect(first).toBe(3);
        expect(player.hand).toHaveLength(3);
        expect(G.fellowshipCardsDrawn).toBe(3);

        const second = drawCardsForPlayer(G, player, 3, true);
        expect(second).toBe(1);
        expect(player.hand).toHaveLength(4);
        expect(G.fellowshipCardsDrawn).toBe(4);
    });

    it('s’arrête si la pioche est vide', () => {
        const player = createPlayerState('0', {
            deck: [createCard({ id: 'last' })],
            hand: [],
        });
        const G = createGameState({ players: { '0': player } });

        const drawn = drawCardsForPlayer(G, player, 8, false);
        expect(drawn).toBe(1);
        expect(player.hand).toHaveLength(1);
        expect(player.deck).toHaveLength(0);
    });
});
