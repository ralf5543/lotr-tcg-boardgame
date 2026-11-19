import { describe, expect, it } from 'vitest';
import {
    addCardToPlayerHand,
    announceInitiativeIfChanged,
    freePeoplesHasInitiative,
} from './initiative';
import { removeCardFromHand, stackCardOnHost } from './cardStack';
import {
    createCard,
    createGameState,
    createPlayerState,
} from '../testing/createGameState';

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

        addCardToPlayerHand(
            G,
            '0',
            createCard({ id: 'd', type: 'EVENT' })
        );
        expect(freePeoplesHasInitiative(G)).toBe(true);
        expect(G.statusMessage).toBe(
            'Les Peuples Libres gagnent l’initiative.'
        );
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

        addCardToPlayerHand(
            G,
            '0',
            createCard({ id: 'e', type: 'EVENT' })
        );
        expect(G.statusMessage).toBe(
            'Les Peuples Libres gagnent l’initiative.'
        );
    });

    it('removeCardFromHand / empiler depuis la main annonce la perte', () => {
        const toStack = createCard({
            id: 'sword',
            instanceId: 'sword',
            type: 'POSSESSION',
        });
        const host = createCard({
            id: 'narsil',
            instanceId: 'narsil',
            type: 'ARTIFACT',
        });
        const G = createGameState({
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', {
                    hand: [
                        createCard({ id: 'a', type: 'EVENT' }),
                        createCard({ id: 'b', type: 'EVENT' }),
                        createCard({ id: 'c', type: 'EVENT' }),
                        toStack,
                    ],
                    supportArea: [host],
                }),
                '1': createPlayerState('1'),
            },
        });
        expect(freePeoplesHasInitiative(G)).toBe(true);
        expect(
            stackCardOnHost(G, host, toStack, 'HAND', '0')
        ).toBe(true);
        expect(freePeoplesHasInitiative(G)).toBe(false);
        expect(G.statusMessage).toBe(
            'Les Peuples Libres perdent l’initiative.'
        );
        expect(removeCardFromHand(G, '0', 'missing')).toBeNull();
    });
});
