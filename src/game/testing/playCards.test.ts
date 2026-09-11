import { describe, expect, it } from 'vitest';
import { createEngineClient } from './createEngineClient';
import {
    createCard,
    createCompanion,
    createMinion,
    createPlayerState,
    createSkirmishActionWindow,
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
            effects: [{
                type: 'ADD_TEMP_STAT',
                stat: 'STRENGTH',
                value: 3,
                target: [['Sam']],
                expiresAtPhase: 'SKIRMISH',
            }],
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
        expect(engine.getG().actionWindow?.activePlayerId).toBe('1');
        expect(engine.getG().actionWindow?.passesCount).toBe(0);
    });

    it('Impatient and Angry ignore un Sam resté dans la fellowship de l’Ombre', () => {
        const impatient: Ability = {
            id: '4R307:0',
            phases: ['SKIRMISH'],
            cost: [{ exert: [{ count: 1, target: [['Sam']] }] }],
            effects: [{
                type: 'ADD_TEMP_STAT',
                stat: 'STRENGTH',
                value: 3,
                target: [['Sam']],
                expiresAtPhase: 'SKIRMISH',
            }],
            source: 'SELF',
        };

        const fpSam = createCompanion({
            id: '1C311',
            title: 'Sam',
            vitality: 4,
            strength: 3,
        });
        const shadowSam = createCompanion({
            id: '11U172',
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
                        fellowshipArea: [fpSam],
                        hand: [event],
                    }),
                    '1': createPlayerState('1', {
                        fellowshipArea: [shadowSam],
                    }),
                },
            },
        });

        engine.moves.selectSkirmish('sk-1');
        engine.moves.playCard(0);

        expect(engine.getG().players['0']?.discard[0]?.id).toBe('4R307');
        expect(engine.getG().players['0']?.fellowshipArea[0]?.wounds).toBe(1);
        expect(engine.getG().players['1']?.fellowshipArea[0]?.wounds || 0).toBe(
            0
        );
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
                    effects: [{
                        type: 'ADD_TEMP_STAT',
                        stat: 'STRENGTH',
                        value: 3,
                        target: [['Sam']],
                        expiresAtPhase: 'SKIRMISH',
                    }],
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

    const HALFLING: Ability = {
        id: '1U293:0',
        phases: ['SKIRMISH'],
        cost: [
            {
                exert: [
                    {
                        count: 1,
                        target: [['HOBBIT']],
                        mode: 'DESIGNATION',
                    },
                ],
            },
        ],
        effects: [{
            type: 'ADD_TEMP_STAT',
            stat: 'STRENGTH',
            value: 3,
            target: [['HOBBIT']],
            expiresAtPhase: 'SKIRMISH',
        }],
        source: 'SELF',
    };

    function createHalflingEvent() {
        return createCard({
            id: '1U293',
            kind: 'FREE_PEOPLE',
            type: 'EVENT',
            title: 'Halfling Deftness',
            phases: ['SKIRMISH'],
            twilightCost: 0,
            abilities: [HALFLING],
        });
    }

    it('refuse Halfling Deftness si deux Hobbits sans désignation', () => {
        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                ...createSkirmishActionWindow('sk-1'),
                skirmishes: [
                    {
                        id: 'sk-1',
                        companionId: 'frodo',
                        minionIds: ['orc'],
                    },
                ],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createCompanion({
                                id: 'frodo',
                                title: 'Frodo',
                                race: 'HOBBIT',
                                vitality: 4,
                                strength: 3,
                            }),
                            createCompanion({
                                id: 'sam',
                                title: 'Sam',
                                race: 'HOBBIT',
                                vitality: 4,
                                strength: 3,
                            }),
                        ],
                        hand: [createHalflingEvent()],
                    }),
                },
            },
        });

        engine.moves.playCard(0);

        expect(engine.getG().players['0']?.hand).toHaveLength(1);
        expect(engine.getG().players['0']?.discard).toHaveLength(0);
        expect(engine.getG().players['0']?.fellowshipArea[0]?.wounds || 0).toBe(
            0
        );
    });

    it('joue Halfling Deftness sur le Hobbit désigné', () => {
        const frodo = createCompanion({
            id: 'frodo',
            title: 'Frodo',
            race: 'HOBBIT',
            vitality: 4,
            strength: 3,
        });
        const sam = createCompanion({
            id: 'sam',
            title: 'Sam',
            race: 'HOBBIT',
            vitality: 4,
            strength: 3,
        });

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                ...createSkirmishActionWindow('sk-1'),
                skirmishes: [
                    {
                        id: 'sk-1',
                        companionId: 'frodo',
                        minionIds: ['orc'],
                    },
                ],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [frodo, sam],
                        hand: [createHalflingEvent()],
                    }),
                },
            },
        });

        engine.moves.playCard(0, 'frodo');

        const board = engine.getG().players['0']?.fellowshipArea || [];
        expect(engine.getG().players['0']?.hand).toHaveLength(0);
        expect(engine.getG().players['0']?.discard[0]?.id).toBe('1U293');
        expect(board.find((c) => c.id === 'frodo')?.wounds).toBe(1);
        expect(board.find((c) => c.id === 'sam')?.wounds || 0).toBe(0);
        expect(
            getCalculatedStrength(
                engine.getG(),
                board.find((c) => c.id === 'frodo')
            )
        ).toBe(6);
    });

    it('refuse Halfling Deftness s’il n’y a qu’un Hobbit sans désignation', () => {
        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                ...createSkirmishActionWindow('sk-1'),
                skirmishes: [
                    {
                        id: 'sk-1',
                        companionId: 'frodo',
                        minionIds: ['orc'],
                    },
                ],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createCompanion({
                                id: 'frodo',
                                title: 'Frodo',
                                race: 'HOBBIT',
                                vitality: 4,
                                strength: 3,
                            }),
                            createCompanion({
                                id: 'aragorn',
                                title: 'Aragorn',
                                race: 'MAN',
                                vitality: 4,
                            }),
                        ],
                        hand: [createHalflingEvent()],
                    }),
                },
            },
        });

        engine.moves.playCard(0);

        expect(engine.getG().players['0']?.hand).toHaveLength(1);
        expect(engine.getG().players['0']?.discard).toHaveLength(0);
        expect(engine.getG().players['0']?.fellowshipArea[0]?.wounds || 0).toBe(
            0
        );
    });

    const BATTLE_FURY: Ability = {
        id: '1C4:0',
        phases: ['SKIRMISH'],
        cost: [
            {
                exert: [
                    {
                        count: 1,
                        target: [['DWARF']],
                        mode: 'DESIGNATION',
                    },
                ],
            },
        ],
        effects: [
            {
                type: 'ADD_TEMP_STAT',
                stat: 'STRENGTH',
                value: 3,
                target: [['DWARF']],
                expiresAtPhase: 'SKIRMISH',
            },
            {
                type: 'ADD_TEMP_KEYWORD',
                keyword: 'DAMAGE +1',
                target: [['DWARF']],
                expiresAtPhase: 'SKIRMISH',
            },
        ],
        source: 'SELF',
    };

    const CLEAVING_BLOW: Ability = {
        id: '1C5:0',
        phases: ['SKIRMISH'],
        cost: [],
        effects: [
            {
                type: 'ADD_TEMP_STAT',
                stat: 'STRENGTH',
                value: 2,
                target: [['DWARF']],
                expiresAtPhase: 'SKIRMISH',
            },
            {
                type: 'ADD_TEMP_KEYWORD',
                keyword: 'DAMAGE +1',
                target: [['DWARF']],
                expiresAtPhase: 'SKIRMISH',
            },
        ],
        source: 'SELF',
    };

    function createDwarf(id: string, strength: number) {
        return createCompanion({
            id,
            title: id,
            race: 'DWARF',
            vitality: 3,
            strength,
        });
    }

    it('joue Fureur de la Bataille sur le Nain désigné : +3, damage +1, affaibli', () => {
        const gimli = createDwarf('gimli', 6);
        const guard = createDwarf('guard', 4);
        const event = createCard({
            id: '1C4',
            kind: 'FREE_PEOPLE',
            type: 'EVENT',
            title: 'Battle Fury',
            phases: ['SKIRMISH'],
            twilightCost: 0,
            abilities: [BATTLE_FURY],
        });

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                ...createSkirmishActionWindow('sk-1'),
                skirmishes: [
                    {
                        id: 'sk-1',
                        companionId: 'gimli',
                        minionIds: ['orc'],
                    },
                ],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [gimli, guard],
                        hand: [event],
                    }),
                },
            },
        });

        engine.moves.playCard(0, 'gimli');

        const board = engine.getG().players['0']?.fellowshipArea || [];
        const gimliInPlay = board.find((c) => c.id === 'gimli');
        const guardInPlay = board.find((c) => c.id === 'guard');
        expect(engine.getG().players['0']?.discard[0]?.id).toBe('1C4');
        expect(gimliInPlay?.wounds).toBe(1);
        expect(guardInPlay?.wounds || 0).toBe(0);
        expect(getCalculatedStrength(engine.getG(), gimliInPlay)).toBe(9);
        expect(getCalculatedStrength(engine.getG(), guardInPlay)).toBe(4);
        expect(gimliInPlay?.tempKeywords).toEqual([
            { keyword: 'DAMAGE +1', expiresAtPhase: 'SKIRMISH' },
        ]);
    });

    it('joue Coup Tranchant sur le Nain désigné : +2 et damage +1, sans affaiblir', () => {
        const gimli = createDwarf('gimli', 6);
        const guard = createDwarf('guard', 4);
        const event = createCard({
            id: '1C5',
            kind: 'FREE_PEOPLE',
            type: 'EVENT',
            title: 'Cleaving Blow',
            phases: ['SKIRMISH'],
            twilightCost: 1,
            abilities: [CLEAVING_BLOW],
        });

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                ...createSkirmishActionWindow('sk-1'),
                twilightPool: 0,
                skirmishes: [
                    {
                        id: 'sk-1',
                        companionId: 'gimli',
                        minionIds: ['orc'],
                    },
                ],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [gimli, guard],
                        hand: [event],
                    }),
                },
            },
        });

        engine.moves.playCard(0, 'gimli');

        const board = engine.getG().players['0']?.fellowshipArea || [];
        const gimliInPlay = board.find((c) => c.id === 'gimli');
        const guardInPlay = board.find((c) => c.id === 'guard');
        expect(engine.getG().players['0']?.discard[0]?.id).toBe('1C5');
        expect(engine.getG().twilightPool).toBe(1);
        expect(gimliInPlay?.wounds || 0).toBe(0);
        expect(getCalculatedStrength(engine.getG(), gimliInPlay)).toBe(8);
        expect(getCalculatedStrength(engine.getG(), guardInPlay)).toBe(4);
        expect(gimliInPlay?.tempKeywords).toEqual([
            { keyword: 'DAMAGE +1', expiresAtPhase: 'SKIRMISH' },
        ]);
    });

    const AXE_STRIKE: Ability = {
        id: '1C3:0',
        phases: ['SKIRMISH'],
        cost: [],
        effects: [
            {
                type: 'ADD_TEMP_STAT',
                stat: 'STRENGTH',
                value: 2,
                target: [['DWARF']],
                expiresAtPhase: 'SKIRMISH',
                bearingBonus: {
                    value: 3,
                    attachment: [['DWARVEN', 'HAND-WEAPON']],
                },
            },
        ],
        source: 'SELF',
    };

    const DELVING: Ability = {
        id: '1C6:0',
        phases: ['FELLOWSHIP'],
        cost: [
            {
                exert: [
                    {
                        count: 1,
                        target: [['DWARF', 'COMPANION']],
                        mode: 'DESIGNATION',
                    },
                ],
            },
        ],
        effects: [{ type: 'DRAW', count: 3 }],
        source: 'SELF',
    };

    it('joue Coup de Hache : +2 sans arme, +3 avec une arme de mêlée naine', () => {
        const gimli = createDwarf('gimli', 6);
        const guard = createDwarf('guard', 4);
        const event = createCard({
            id: '1C3',
            kind: 'FREE_PEOPLE',
            type: 'EVENT',
            title: 'Axe Strike',
            phases: ['SKIRMISH'],
            twilightCost: 0,
            abilities: [AXE_STRIKE],
        });

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                ...createSkirmishActionWindow('sk-1'),
                skirmishes: [
                    {
                        id: 'sk-1',
                        companionId: 'gimli',
                        minionIds: ['orc'],
                    },
                ],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [gimli, guard],
                        hand: [event],
                        deck: ['d1', 'd2', 'd3'].map((id) =>
                            createCard({ id, kind: 'FREE_PEOPLE' })
                        ),
                    }),
                },
            },
        });

        engine.moves.playCard(0, 'gimli');

        const board = engine.getG().players['0']?.fellowshipArea || [];
        expect(engine.getG().players['0']?.discard[0]?.id).toBe('1C3');
        expect(engine.getG().players['0']?.hand).toHaveLength(0);
        expect(engine.getG().players['0']?.deck).toHaveLength(3);
        expect(getCalculatedStrength(engine.getG(), board.find((c) => c.id === 'gimli'))).toBe(8);
        expect(getCalculatedStrength(engine.getG(), board.find((c) => c.id === 'guard'))).toBe(4);
    });

    it('Coup de Hache : +3 si le Nain porte une arme de mêlée naine', () => {
        const axe = createCard({
            id: '1C9',
            kind: 'FREE_PEOPLE',
            type: 'POSSESSION',
            subtype: 'HAND-WEAPON',
            culture: 'DWARVEN',
            title: 'Dwarven Axe',
        });
        const gimli = {
            ...createDwarf('gimli', 6),
            attachments: [axe],
        };
        const event = createCard({
            id: '1C3',
            kind: 'FREE_PEOPLE',
            type: 'EVENT',
            title: 'Axe Strike',
            phases: ['SKIRMISH'],
            twilightCost: 0,
            abilities: [AXE_STRIKE],
        });

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                ...createSkirmishActionWindow('sk-1'),
                skirmishes: [
                    {
                        id: 'sk-1',
                        companionId: 'gimli',
                        minionIds: ['orc'],
                    },
                ],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [gimli],
                        hand: [event],
                    }),
                },
            },
        });

        engine.moves.playCard(0, 'gimli');

        const gimliInPlay = engine.getG().players['0']?.fellowshipArea[0];
        expect(getCalculatedStrength(engine.getG(), gimliInPlay)).toBe(9);
    });

    it('joue Fouilles : affaiblit un Nain et pioche 3 cartes', () => {
        const gimli = createDwarf('gimli', 6);
        const event = createCard({
            id: '1C6',
            kind: 'FREE_PEOPLE',
            type: 'EVENT',
            title: 'Delving',
            phases: ['FELLOWSHIP'],
            twilightCost: 1,
            abilities: [DELVING],
        });
        const deck = ['d1', 'd2', 'd3', 'd4', 'd5'].map((id) =>
            createCard({ id, kind: 'FREE_PEOPLE', type: 'EVENT' })
        );

        const engine = createEngineClient({
            startPhase: 'fellowship',
            playerID: '0',
            G: {
                twilightPool: 0,
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [gimli],
                        hand: [event],
                        deck,
                    }),
                },
            },
        });

        engine.moves.playCard(0, 'gimli');

        const G = engine.getG();
        expect(G.players['0']?.discard[0]?.id).toBe('1C6');
        expect(G.players['0']?.hand.map((c) => c.id)).toEqual([
            'd1',
            'd2',
            'd3',
        ]);
        expect(G.players['0']?.deck).toHaveLength(2);
        expect(G.players['0']?.fellowshipArea[0]?.wounds).toBe(1);
        expect(G.twilightPool).toBe(1);
        expect(G.fellowshipCardsDrawn).toBe(3);
    });

    it('joue Solide et Robuste : guérit un Hobbit blessé', () => {
        const heal: Ability = {
            id: '1C315:0',
            phases: ['MANEUVER', 'SKIRMISH'],
            cost: [],
            effects: [{ type: 'HEAL', count: 1, target: [['HOBBIT']] }],
            source: 'SELF',
        };
        const frodo = createCompanion({
            id: 'frodo',
            title: 'Frodo',
            race: 'HOBBIT',
            vitality: 4,
            wounds: 1,
        });
        const event = createCard({
            id: '1C315',
            kind: 'FREE_PEOPLE',
            type: 'EVENT',
            title: 'Stout and Sturdy',
            phases: ['SKIRMISH'],
            twilightCost: 1,
            abilities: [heal],
        });

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                ...createSkirmishActionWindow('sk-1'),
                twilightPool: 0,
                skirmishes: [
                    {
                        id: 'sk-1',
                        companionId: 'frodo',
                        minionIds: ['orc'],
                    },
                ],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [frodo],
                        hand: [event],
                    }),
                },
            },
        });

        engine.moves.playCard(0, 'frodo');

        expect(engine.getG().players['0']?.discard[0]?.id).toBe('1C315');
        expect(engine.getG().players['0']?.fellowshipArea[0]?.wounds).toBe(0);
        expect(engine.getG().twilightPool).toBe(1);
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

describe('playShadowCard — When you play this', () => {
    it('Éclaireur de la Moria : spot un Elfe, ajoute 2 crépuscule', () => {
        const scout: Ability = {
            id: '1C191:0',
            phases: [],
            trigger: { type: 'WHEN_PLAYED' },
            cost: [{ spot: [{ count: 1, target: [['ELF']] }] }],
            effects: [{ type: 'ADD_TWILIGHT', count: 2 }],
            source: 'SELF',
        };
        const moriaScout = createMinion({
            id: '1C191',
            title: 'Moria Scout',
            twilightCost: 2,
            abilities: [scout],
        });
        const legolas = createCompanion({
            id: '1R50',
            title: 'Legolas',
            race: 'ELF',
        });

        const engine = createEngineClient({
            startPhase: 'shadow',
            playerID: '1',
            G: {
                twilightPool: 4,
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [legolas],
                    }),
                    '1': createPlayerState('1', { hand: [moriaScout] }),
                },
            },
        });

        engine.moves.playShadowCard(0);

        expect(engine.getG().battlefield).toHaveLength(1);
        expect(engine.getG().twilightPool).toBe(4);
    });

    it('Éclaireur de la Moria sans Elfe : pas de crépuscule ajouté', () => {
        const scout: Ability = {
            id: '1C191:0',
            phases: [],
            trigger: { type: 'WHEN_PLAYED' },
            cost: [{ spot: [{ count: 1, target: [['ELF']] }] }],
            effects: [{ type: 'ADD_TWILIGHT', count: 2 }],
            source: 'SELF',
        };

        const engine = createEngineClient({
            startPhase: 'shadow',
            playerID: '1',
            G: {
                twilightPool: 4,
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createCompanion({
                                id: 'aragorn',
                                race: 'MAN',
                            }),
                        ],
                    }),
                    '1': createPlayerState('1', {
                        hand: [
                            createMinion({
                                id: '1C191',
                                twilightCost: 2,
                                abilities: [scout],
                            }),
                        ],
                    }),
                },
            },
        });

        engine.moves.playShadowCard(0);

        expect(engine.getG().battlefield).toHaveLength(1);
        expect(engine.getG().twilightPool).toBe(2);
    });
});
