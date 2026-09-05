import { describe, expect, it } from 'vitest';
import { canPlayCard } from './canPlayCard';
import {
    createCard,
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
    createSkirmishActionWindow,
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

    it('refuse un événement Exert Sam si Sam n’est pas en jeu', () => {
        const event = createCard({
            id: '4R307',
            kind: 'FREE_PEOPLE',
            type: 'EVENT',
            title: 'Impatient and Angry',
            phases: ['SKIRMISH'],
            abilities: [
                {
                    id: '4R307:0',
                    phases: ['SKIRMISH'],
                    cost: [{ exert: [{ count: 1, target: [['Sam']] }] }],
                    effect: {
                        type: 'ADD_TEMP_STAT',
                        stat: 'STRENGTH',
                        value: 3,
                        target: [['Sam']],
                        expiresAtPhase: 'SKIRMISH',
                    },
                    source: 'SELF',
                },
            ],
        });

        const withoutSam = canPlayCard(event, {
            G: createGameState({
                ...createSkirmishActionWindow('sk-1'),
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createCompanion({ id: 'frodo', title: 'Frodo' }),
                        ],
                    }),
                },
            }),
            ctx: { phase: 'skirmish' },
            playerID: '0',
        });
        expect(withoutSam.valid).toBe(false);

        const withSam = canPlayCard(event, {
            G: createGameState({
                ...createSkirmishActionWindow('sk-1'),
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createCompanion({
                                id: 'sam',
                                title: 'Sam',
                                vitality: 4,
                            }),
                        ],
                    }),
                },
            }),
            ctx: { phase: 'skirmish' },
            playerID: '0',
        });
        expect(withSam.valid).toBe(true);
    });

    it('refuse un événement Skirmish hors fenêtre de combat', () => {
        const event = createCard({
            id: '4R307',
            kind: 'FREE_PEOPLE',
            type: 'EVENT',
            phases: ['SKIRMISH'],
        });

        const result = canPlayCard(event, {
            G: createGameState({
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createCompanion({
                                id: 'sam',
                                title: 'Sam',
                                vitality: 4,
                            }),
                        ],
                    }),
                },
            }),
            ctx: { phase: 'skirmish' },
            playerID: '0',
        });
        expect(result.valid).toBe(false);
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

    it('refuse une unique déjà dans la pile des morts', () => {
        const result = canPlayCard(
            createCompanion({
                id: 'aragorn-hand',
                title: 'Aragorn',
                isUnique: true,
            }),
            {
                G: createGameState({
                    players: {
                        '0': createPlayerState('0', {
                            deadPile: [
                                createCompanion({
                                    id: 'aragorn-dead',
                                    title: 'Aragorn',
                                    isUnique: true,
                                }),
                            ],
                        }),
                    },
                }),
                ctx: { phase: 'fellowship' },
                playerID: '0',
            }
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toMatch(/morts/i);
    });

    it('refuse un séide unique déjà en jeu', () => {
        const result = canPlayCard(
            createMinion({
                id: 'witchking-hand',
                title: 'Witch-king',
                isUnique: true,
                twilightCost: 8,
            }),
            {
                G: createGameState({
                    twilightPool: 10,
                    battlefield: [
                        createMinion({
                            id: 'witchking-play',
                            title: 'Witch-king',
                            isUnique: true,
                        }),
                    ],
                }),
                ctx: { phase: 'shadow' },
                playerID: '1',
            }
        );

        expect(result.valid).toBe(false);
        expect(result.reason).toMatch(/unique/i);
    });

    it('refuse en soutien une possession qui doit être attachée', () => {
        const mustAttach = {
            ...createCard({
                id: 'sword',
                kind: 'FREE_PEOPLE',
                type: 'POSSESSION',
            }),
            attachedTo: [['COMPANION']],
        };

        const result = canPlayCard(mustAttach as never, {
            G: createGameState(),
            ctx: { phase: 'fellowship' },
            playerID: '0',
        }, 'supportArea');

        expect(result.valid).toBe(false);
    });

    it('autorise un Allié en soutien, pas en Communauté', () => {
        const ally = createCard({
            id: 'ally',
            kind: 'FREE_PEOPLE',
            type: 'ALLY',
            title: 'Test Ally',
        });
        const ctx = {
            G: createGameState(),
            ctx: { phase: 'fellowship' },
            playerID: '0',
        };

        expect(canPlayCard(ally, ctx, 'supportArea').valid).toBe(true);
        expect(canPlayCard(ally, ctx, 'fellowshipArea').valid).toBe(false);
    });

    it('refuse discardFromHand si la main n’a pas assez de cartes (la carte jouée compte)', () => {
        const card = {
            ...createCard({
                id: 'discard-hand',
                kind: 'FREE_PEOPLE',
                type: 'CONDITION',
            }),
            toPlay: [{ discardFromHand: 1 }],
        };

        const tooFew = canPlayCard(card as never, {
            G: createGameState({
                players: {
                    '0': createPlayerState('0', {
                        hand: [createCard({ id: 'only-this' })],
                    }),
                },
            }),
            ctx: { phase: 'fellowship' },
            playerID: '0',
        });
        expect(tooFew.valid).toBe(false);

        const enough = canPlayCard(card as never, {
            G: createGameState({
                players: {
                    '0': createPlayerState('0', {
                        hand: [
                            createCard({ id: 'this-card' }),
                            createCard({ id: 'other' }),
                        ],
                    }),
                },
            }),
            ctx: { phase: 'fellowship' },
            playerID: '0',
        });
        expect(enough.valid).toBe(true);
    });

    it('refuse discardFromPlay si aucune carte en jeu ne matche', () => {
        const card = {
            ...createCard({
                id: 'discard-play',
                kind: 'FREE_PEOPLE',
                type: 'CONDITION',
            }),
            toPlay: [
                { discardFromPlay: [{ count: 1, target: [['CONDITION']] }] },
            ],
        };

        const none = canPlayCard(card as never, {
            G: createGameState({
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [createCompanion({ id: 'comp' })],
                    }),
                },
            }),
            ctx: { phase: 'fellowship' },
            playerID: '0',
        });
        expect(none.valid).toBe(false);

        const withCondition = canPlayCard(card as never, {
            G: createGameState({
                players: {
                    '0': createPlayerState('0', {
                        supportArea: [
                            createCard({
                                id: 'cond',
                                kind: 'FREE_PEOPLE',
                                type: 'CONDITION',
                            }),
                        ],
                    }),
                },
            }),
            ctx: { phase: 'fellowship' },
            playerID: '0',
        });
        expect(withCondition.valid).toBe(true);
    });

    it('refuse un spotThreats insuffisant', () => {
        const card = {
            ...createCard({
                id: 'threat-cond',
                kind: 'FREE_PEOPLE',
                type: 'CONDITION',
            }),
            toPlay: [{ spotThreats: 2 }],
        };

        const tooFew = canPlayCard(card as never, {
            G: createGameState({
                players: {
                    '0': createPlayerState('0', { threats: 1 }),
                },
            }),
            ctx: { phase: 'fellowship' },
            playerID: '0',
        });
        expect(tooFew.valid).toBe(false);

        const enough = canPlayCard(card as never, {
            G: createGameState({
                players: {
                    '0': createPlayerState('0', { threats: 2 }),
                },
            }),
            ctx: { phase: 'fellowship' },
            playerID: '0',
        });
        expect(enough.valid).toBe(true);
    });

    it('accepte toPlay si au moins une option est valide (OU)', () => {
        const card = {
            ...createCard({
                id: 'or-cond',
                kind: 'FREE_PEOPLE',
                type: 'CONDITION',
            }),
            toPlay: [
                { spot: [{ count: 1, target: [['DWARF']] }] },
                { spotBurdens: 2 },
            ],
        };

        const viaBurdens = canPlayCard(card as never, {
            G: createGameState({
                players: {
                    '0': createPlayerState('0', { burdens: 2 }),
                },
            }),
            ctx: { phase: 'fellowship' },
            playerID: '0',
        });
        expect(viaBurdens.valid).toBe(true);
    });

    it('le FP ne spotte pas les séides du champ de bataille', () => {
        const card = {
            ...createCard({
                id: 'spot-minion',
                kind: 'FREE_PEOPLE',
                type: 'CONDITION',
            }),
            toPlay: [{ spot: [{ count: 1, target: [['MINION']] }] }],
        };

        const result = canPlayCard(card as never, {
            G: createGameState({
                battlefield: [createMinion({ id: 'orc' })],
            }),
            ctx: { phase: 'fellowship' },
            playerID: '0',
        });
        expect(result.valid).toBe(false);
    });

    it('l’Ombre peut spotter un séide sur le champ de bataille', () => {
        const card = {
            ...createCard({
                id: 'shadow-spot',
                kind: 'SHADOW',
                type: 'CONDITION',
                twilightCost: 0,
            }),
            toPlay: [{ spot: [{ count: 1, target: [['MINION']] }] }],
        };

        const result = canPlayCard(card as never, {
            G: createGameState({
                twilightPool: 0,
                battlefield: [createMinion({ id: 'orc' })],
            }),
            ctx: { phase: 'shadow' },
            playerID: '1',
        });
        expect(result.valid).toBe(true);
    });
});
