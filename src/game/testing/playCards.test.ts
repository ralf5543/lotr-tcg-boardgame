import { describe, expect, it } from 'vitest';
import { createEngineClient } from './createEngineClient';
import {
    createCard,
    createCompanion,
    createMinion,
    createPlayerState,
} from './createGameState';
import { getCalculatedStrength } from '../logic/stats/statCalculator';
import type { Ability } from '../types';

describe('playShadowCard', () => {
    it('refuse un séide trop cher pour le pool de Crépuscule', () => {
        const minion = createMinion({
            id: 'minion-hand',
            twilightCost: 4,
        });

        const engine = createEngineClient({
            startPhase: 'shadow',
            playerID: '1',
            G: {
                twilightPool: 2,
                players: {
                    '1': createPlayerState('1', { hand: [minion] }),
                },
            },
        });

        engine.moves.playShadowCard(0);

        expect(engine.getG().players['1']?.hand).toHaveLength(1);
        expect(engine.getG().battlefield).toHaveLength(0);
        expect(engine.getG().twilightPool).toBe(2);
    });

    it('fait payer +2 d’errance et pose le séide', () => {
        const roaming = createMinion({
            id: 'roaming-orc',
            twilightCost: 2,
            minionSiteNumber: 4,
        });

        const engine = createEngineClient({
            startPhase: 'shadow',
            playerID: '1',
            G: {
                twilightPool: 4,
                players: {
                    '0': createPlayerState('0', { currentSiteIndex: 0 }),
                    '1': createPlayerState('1', { hand: [roaming] }),
                },
            },
        });

        engine.moves.playShadowCard(0);

        expect(engine.getG().twilightPool).toBe(0);
        expect(engine.getG().battlefield).toHaveLength(1);
        expect(engine.getG().players['1']?.hand).toHaveLength(0);
    });

    it('refuse que le joueur FP joue une carte d’Ombre', () => {
        const engine = createEngineClient({
            startPhase: 'shadow',
            playerID: '0',
            G: {
                twilightPool: 6,
                players: {
                    '1': createPlayerState('1', {
                        hand: [createMinion({ id: 'minion-hand' })],
                    }),
                },
            },
        });

        engine.moves.playShadowCard(0);

        expect(engine.getG().players['1']?.hand).toHaveLength(1);
        expect(engine.getG().battlefield).toHaveLength(0);
    });
});

describe('playCard', () => {
    it('pose un compagnon en Communauté et ajoute du Crépuscule', () => {
        const companion = createCompanion({
            id: 'boromir',
            title: 'Boromir',
            twilightCost: 3,
        });

        const engine = createEngineClient({
            startPhase: 'fellowship',
            playerID: '0',
            G: {
                twilightPool: 0,
                players: {
                    '0': createPlayerState('0', { hand: [companion] }),
                },
            },
        });

        engine.moves.playCard(0);

        expect(engine.getG().twilightPool).toBe(3);
        expect(engine.getG().players['0']?.fellowshipArea).toHaveLength(1);
        expect(engine.getG().players['0']?.hand).toHaveLength(0);
    });

    it('refuse un compagnon hors phase de Communauté', () => {
        const companion = createCompanion({ id: 'boromir', twilightCost: 2 });

        const engine = createEngineClient({
            startPhase: 'shadow',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', { hand: [companion] }),
                },
            },
        });

        engine.moves.playCard(0);

        expect(engine.getG().players['0']?.hand).toHaveLength(1);
        expect(engine.getG().players['0']?.fellowshipArea).toHaveLength(0);
        expect(engine.getG().twilightPool).toBe(0);
    });

    it('refuse un événement hors de sa phase', () => {
        const event = createCard({
            id: 'skirmish-event',
            kind: 'FREE_PEOPLE',
            type: 'EVENT',
            title: 'Skirmish Event',
            phases: ['SKIRMISH'],
            twilightCost: 1,
        });

        const engine = createEngineClient({
            startPhase: 'fellowship',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', { hand: [event] }),
                },
            },
        });

        engine.moves.playCard(0);

        expect(engine.getG().players['0']?.hand).toHaveLength(1);
        expect(engine.getG().players['0']?.discard).toHaveLength(0);
    });

    it('joue Impatient and Angry : exert Sam, force +3, event défaussé', () => {
        const impatient: Ability = {
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
        };

        const sam = createCompanion({
            id: '1C311',
            title: 'Sam',
            vitality: 4,
            strength: 3,
        });
        const event = createCard({
            id: '4R307',
            kind: 'FREE_PEOPLE',
            type: 'EVENT',
            title: 'Impatient and Angry',
            phases: ['SKIRMISH'],
            twilightCost: 0,
            abilities: [impatient],
        });

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                skirmishes: [
                    {
                        id: 'sk-1',
                        companionId: '1C311',
                        minionIds: ['orc'],
                    },
                ],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [sam],
                        hand: [event],
                    }),
                },
            },
        });

        engine.moves.selectSkirmish('sk-1');
        engine.moves.playCard(0);

        const samInPlay = engine.getG().players['0']?.fellowshipArea[0];
        expect(engine.getG().players['0']?.hand).toHaveLength(0);
        expect(engine.getG().players['0']?.discard[0]?.id).toBe('4R307');
        expect(samInPlay?.wounds).toBe(1);
        expect(getCalculatedStrength(engine.getG(), samInPlay)).toBe(6);
    });

    it('refuse Impatient and Angry si Sam n’est pas en jeu', () => {
        const event = createCard({
            id: '4R307',
            kind: 'FREE_PEOPLE',
            type: 'EVENT',
            title: 'Impatient and Angry',
            phases: ['SKIRMISH'],
            twilightCost: 0,
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

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createCompanion({ id: 'frodo', title: 'Frodo' }),
                        ],
                        hand: [event],
                    }),
                },
            },
        });

        engine.moves.playCard(0);

        expect(engine.getG().players['0']?.hand).toHaveLength(1);
        expect(engine.getG().players['0']?.discard).toHaveLength(0);
    });

    it('refuse une carte unique déjà en jeu', () => {
        const inPlay = createCompanion({
            id: 'aragorn-play',
            title: 'Aragorn',
            isUnique: true,
        });
        const inHand = createCompanion({
            id: 'aragorn-hand',
            title: 'Aragorn',
            isUnique: true,
            twilightCost: 4,
        });

        const engine = createEngineClient({
            startPhase: 'fellowship',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [inPlay],
                        hand: [inHand],
                    }),
                },
            },
        });

        engine.moves.playCard(0);

        expect(engine.getG().players['0']?.hand).toHaveLength(1);
        expect(engine.getG().players['0']?.fellowshipArea).toHaveLength(1);
    });

    it('pose un Allié en soutien et ajoute du Crépuscule', () => {
        const ally = createCard({
            id: 'ally-1',
            kind: 'FREE_PEOPLE',
            type: 'ALLY',
            title: 'Test Ally',
            twilightCost: 2,
        });

        const engine = createEngineClient({
            startPhase: 'fellowship',
            playerID: '0',
            G: {
                twilightPool: 0,
                players: {
                    '0': createPlayerState('0', { hand: [ally] }),
                },
            },
        });

        engine.moves.playCard(0);

        expect(engine.getG().twilightPool).toBe(2);
        expect(engine.getG().players['0']?.supportArea[0]?.id).toBe('ally-1');
        expect(engine.getG().players['0']?.hand).toHaveLength(0);
        expect(engine.getG().players['0']?.fellowshipArea).toHaveLength(0);
    });
});

describe('playShadowCard (soutien)', () => {
    it('pose une condition d’Ombre en soutien et paie le Crépuscule', () => {
        const condition = createCard({
            id: 'shadow-cond',
            kind: 'SHADOW',
            type: 'CONDITION',
            title: 'Shadow Condition',
            twilightCost: 1,
        });

        const engine = createEngineClient({
            startPhase: 'shadow',
            playerID: '1',
            G: {
                twilightPool: 3,
                players: {
                    '1': createPlayerState('1', { hand: [condition] }),
                },
            },
        });

        engine.moves.playShadowCard(0);

        expect(engine.getG().twilightPool).toBe(2);
        expect(engine.getG().players['1']?.supportArea[0]?.id).toBe(
            'shadow-cond'
        );
        expect(engine.getG().players['1']?.hand).toHaveLength(0);
        expect(engine.getG().battlefield).toHaveLength(0);
    });
});
