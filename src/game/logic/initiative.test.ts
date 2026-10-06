import { describe, expect, it } from 'vitest';
import {
    announceInitiativeIfChanged,
    freePeoplesHasInitiative,
} from './initiative';
import { createCard, createGameState, createPlayerState } from '../testing/createGameState';

describe('initiative', () => {
    it('FP a l’initiative dès 4 cartes en main', () => {
        const G = createGameState({
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', {
                    hand: [
                        createCard({ id: 'a', type: 'EVENT' }),
                        createCard({ id: 'b', type: 'EVENT' }),
                        createCard({ id: 'c', type: 'EVENT' }),
                    ],
                }),
                '1': createPlayerState('1'),
            },
        });
        expect(freePeoplesHasInitiative(G)).toBe(false);

        G.players['0']!.hand.push(createCard({ id: 'd', type: 'EVENT' }));
        expect(freePeoplesHasInitiative(G)).toBe(true);
    });

    it('annonce gain / perte dans statusMessage', () => {
        const G = createGameState({
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', {
                    hand: [
                        createCard({ id: 'a', type: 'EVENT' }),
                        createCard({ id: 'b', type: 'EVENT' }),
                        createCard({ id: 'c', type: 'EVENT' }),
                        createCard({ id: 'd', type: 'EVENT' }),
                    ],
                }),
                '1': createPlayerState('1'),
            },
        });

        G.players['0']!.hand.pop();
        announceInitiativeIfChanged(G, true);
        expect(G.statusMessage).toBe(
            'Les Peuples Libres perdent l’initiative.'
        );

        G.players['0']!.hand.push(createCard({ id: 'e', type: 'EVENT' }));
        announceInitiativeIfChanged(G, false);
        expect(G.statusMessage).toBe(
            'Les Peuples Libres gagnent l’initiative.'
        );
    });
});
