import { describe, expect, it } from 'vitest';
import { canPlayCard } from './canPlayCard';
import {
    createCard,
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
} from '../testing/createGameState';

describe('canPlayCard', () => {
    it('refuse une carte FP hors phase de Communauté', () => {
        const result = canPlayCard(createCompanion({ id: 'comp' }), {
            G: createGameState(),
            ctx: { phase: 'shadow' },
            playerID: '0',
        });

        expect(result.valid).toBe(false);
        expect(result.reason).toMatch(/Communauté/i);
    });

    it('refuse un séide si le Crépuscule ne suffit pas', () => {
        const result = canPlayCard(
            createMinion({ id: 'orc', twilightCost: 5 }),
            {
                G: createGameState({ twilightPool: 2 }),
                ctx: { phase: 'shadow' },
                playerID: '1',
            }
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toMatch(/Crépuscule/i);
    });

    it('refuse un spot non satisfait', () => {
        const card = {
            ...createCard({
                id: 'dwarven-event',
                kind: 'FREE_PEOPLE',
                type: 'EVENT',
                phases: ['FELLOWSHIP'],
            }),
            toPlay: [{ spot: [{ count: 1, target: [['DWARF']] }] }],
        };

        const withoutDwarf = canPlayCard(card as never, {
            G: createGameState({
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createCompanion({ id: 'man', race: 'MAN' }),
                        ],
                    }),
                },
            }),
            ctx: { phase: 'fellowship' },
            playerID: '0',
        });
        expect(withoutDwarf.valid).toBe(false);

        const withDwarf = canPlayCard(card as never, {
            G: createGameState({
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createCompanion({ id: 'gimli', race: 'DWARF' }),
                        ],
                    }),
                },
            }),
            ctx: { phase: 'fellowship' },
            playerID: '0',
        });
        expect(withDwarf.valid).toBe(true);
    });

    it('refuse un exert si le personnage n’a pas assez de vitalité', () => {
        const card = {
            ...createCard({
                id: 'exert-event',
                kind: 'FREE_PEOPLE',
                type: 'EVENT',
                phases: ['FELLOWSHIP'],
            }),
            toPlay: [{ exert: [{ count: 1, target: [['COMPANION']] }] }],
        };

        const exhausted = canPlayCard(card as never, {
            G: createGameState({
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createCompanion({
                                id: 'wounded',
                                vitality: 2,
                                wounds: 1,
                            }),
                        ],
                    }),
                },
            }),
            ctx: { phase: 'fellowship' },
            playerID: '0',
        });
        expect(exhausted.valid).toBe(false);

        const fresh = canPlayCard(card as never, {
            G: createGameState({
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createCompanion({
                                id: 'fresh',
                                vitality: 3,
                                wounds: 0,
                            }),
                        ],
                    }),
                },
            }),
            ctx: { phase: 'fellowship' },
            playerID: '0',
        });
        expect(fresh.valid).toBe(true);
    });

    it('refuse un spotBurdens insuffisant', () => {
        const card = {
            ...createCard({
                id: 'burden-event',
                kind: 'FREE_PEOPLE',
                type: 'EVENT',
                phases: ['FELLOWSHIP'],
            }),
            toPlay: [{ spotBurdens: 3 }],
        };

        const tooFew = canPlayCard(card as never, {
            G: createGameState({
                players: {
                    '0': createPlayerState('0', { burdens: 1 }),
                },
            }),
            ctx: { phase: 'fellowship' },
            playerID: '0',
        });
        expect(tooFew.valid).toBe(false);

        const enough = canPlayCard(card as never, {
            G: createGameState({
                players: {
                    '0': createPlayerState('0', { burdens: 3 }),
                },
            }),
            ctx: { phase: 'fellowship' },
            playerID: '0',
        });
        expect(enough.valid).toBe(true);
    });
});
