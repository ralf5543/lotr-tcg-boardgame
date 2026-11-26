import { describe, expect, it } from 'vitest';
import { getSeedDecks } from '../../decks/deckStorage';
import { setupGame } from '../index';
import { createEngineClient } from './createEngineClient';
import { createBiddingSetupState, createPlayerState } from './createGameState';

const fakeRandom = {
    Shuffle: <T>(deck: T[]) => deck,
    Die: () => 1,
};

describe('antichambre (LOBBY)', () => {
    it('setup antichamber : hôte assemblé, invité stub, étape LOBBY', () => {
        const [hostDeck] = getSeedDecks();
        const G = setupGame(
            { random: fakeRandom },
            {
                antichamber: true,
                decks: { '0': hostDeck },
                profiles: {
                    '0': { name: 'Hôte', avatar: 'avatars/test.png' },
                },
            }
        );

        expect(G.setupState?.step).toBe('LOBBY');
        expect(G.setupState?.loadouts?.['0']?.ready).toBe(true);
        expect(G.setupState?.loadouts?.['1']?.ready).toBe(false);
        expect(G.players['0']?.deck.length).toBeGreaterThan(0);
        expect(G.players['0']?.fellowshipArea.length).toBeGreaterThan(0);
        expect(G.players['1']?.deck).toEqual([]);
        expect(G.players['1']?.fellowshipArea).toEqual([]);
        expect(G.statusNotice?.key).toBe('LOBBY_WAITING');
    });

    it('readyWithLoadout invité → BIDDING quand les deux sont prêts', () => {
        const [, guestDeck] = getSeedDecks();
        const engine = createEngineClient({
            startPhase: 'setup',
            playerID: '1',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        profile: {
                            name: 'Hôte',
                            avatar: 'avatars/a.png',
                            faction: 'freePeoples',
                        },
                    }),
                    '1': createPlayerState('1', {
                        profile: {
                            name: 'Invité',
                            avatar: 'avatars/b.png',
                            faction: 'shadow',
                        },
                        deck: [],
                        fellowshipArea: [],
                        sitesDeck: [],
                    }),
                },
                setupState: {
                    ...createBiddingSetupState(),
                    step: 'LOBBY',
                    loadouts: {
                        '0': { ready: true, deckName: 'Host' },
                        '1': { ready: false },
                    },
                },
            },
        });

        engine.moves.readyWithLoadout(guestDeck, {
            name: 'Invité',
            avatar: 'avatars/b.png',
        });

        const G = engine.getG();
        expect(G.setupState?.loadouts?.['1']?.ready).toBe(true);
        expect(G.setupState?.step).toBe('BIDDING');
        expect(G.players['1']?.deck.length).toBeGreaterThan(0);
        expect(G.players['1']?.fellowshipArea.length).toBeGreaterThan(0);
        expect(G.statusNotice?.key).toBe('BIDDING_SETUP');
    });

    it('refuse un second readyWithLoadout sur le même siège', () => {
        const [deck] = getSeedDecks();
        const engine = createEngineClient({
            startPhase: 'setup',
            G: {
                setupState: {
                    ...createBiddingSetupState(),
                    step: 'LOBBY',
                    loadouts: {
                        '0': { ready: true, deckName: 'A' },
                        '1': { ready: false },
                    },
                },
            },
        });

        // Hôte déjà prêt — no-op (pas d’erreur fatale).
        engine.moves.readyWithLoadout(deck, { name: 'Hôte' });
        expect(engine.getG().setupState?.step).toBe('LOBBY');
        expect(engine.getG().setupState?.loadouts?.['1']?.ready).toBe(false);
    });
});
