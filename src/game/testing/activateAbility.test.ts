import { describe, expect, it } from 'vitest';
import { createEngineClient } from './createEngineClient';
import {
    createCard,
    createCompanion,
    createMinion,
    createPlayerState,
    createSkirmishActionWindow,
} from './createGameState';
import { getKeywordValue } from '../engine/keywords/keywordUtils';
import { getCalculatedStrength } from '../logic/stats/statCalculator';
import type { Ability } from '../types';

const ARAGORN_ABILITY: Ability = {
    id: '1R89:0',
    phases: ['MANEUVER'],
    cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
    effects: [{
        type: 'ADD_TEMP_KEYWORD',
        keyword: 'DEFENDER +1',
        target: 'SELF',
        expiresAtPhase: 'REGROUP',
    }],
    source: 'SELF',
    text: 'Maneuver: Exert Aragorn to make him defender +1 until the regroup phase.',
};

function createAragorn(overrides: Record<string, unknown> = {}) {
    return createCompanion({
        id: '1R89',
        title: 'Aragorn',
        vitality: 4,
        actionPhases: ['MANEUVER'],
        abilities: [ARAGORN_ABILITY],
        ...overrides,
    });
}

describe('activateAbility', () => {
    it('en maneuver : exert Aragorn et lui donne defender +1', () => {
        const engine = createEngineClient({
            startPhase: 'maneuver',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [createAragorn()],
                    }),
                },
            },
        });

        engine.moves.activateAbility('1R89', '1R89:0');

        const aragorn = engine.getG().players['0']?.fellowshipArea[0];
        expect(aragorn?.wounds).toBe(1);
        expect(aragorn?.isDead).not.toBe(true);
        expect(getKeywordValue(aragorn!, 'DEFENDER')).toBe(1);
        expect(engine.getG().actionWindow?.isOpen).toBe(true);
        expect(engine.getG().actionWindow?.activePlayerId).toBe('1');
        expect(engine.getG().actionWindow?.passesCount).toBe(0);
    });

    it('refuse hors phase (fellowship)', () => {
        const engine = createEngineClient({
            startPhase: 'fellowship',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [createAragorn()],
                    }),
                },
            },
        });

        engine.moves.activateAbility('1R89', '1R89:0');

        const aragorn = engine.getG().players['0']?.fellowshipArea[0];
        expect(aragorn?.wounds || 0).toBe(0);
        expect(aragorn?.tempKeywords).toBeUndefined();
    });

    it('refuse si la vitalité restante est 1', () => {
        const engine = createEngineClient({
            startPhase: 'maneuver',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [createAragorn({ vitality: 1 })],
                    }),
                },
            },
        });

        engine.moves.activateAbility('1R89', '1R89:0');

        const aragorn = engine.getG().players['0']?.fellowshipArea[0];
        expect(aragorn?.wounds || 0).toBe(0);
        expect(aragorn?.tempKeywords).toBeUndefined();
    });

    it('expire le mot-clé temporaire au début du regroupement', () => {
        const engine = createEngineClient({
            startPhase: 'startOfRegroup',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createAragorn({
                                tempKeywords: [
                                    {
                                        keyword: 'DEFENDER +1',
                                        expiresAtPhase: 'REGROUP',
                                    },
                                ],
                            }),
                        ],
                    }),
                },
            },
        });

        const aragorn = engine.getG().players['0']?.fellowshipArea[0];
        expect(aragorn?.tempKeywords).toBeFalsy();
        expect(getKeywordValue(aragorn!, 'DEFENDER')).toBe(-1);
    });

    it('une possession Exert bearer blesse le porteur', () => {
        const draught: Ability = {
            id: '9R24:0',
            phases: ['SKIRMISH'],
            cost: [{ exert: [{ count: 1, target: 'BEARER' }] }],
            effects: [{
                type: 'ADD_TEMP_KEYWORD',
                keyword: 'DAMAGE +1',
                target: 'BEARER',
                expiresAtPhase: 'SKIRMISH',
            }],
            source: 'ATTACHMENT',
        };

        const companion = createCompanion({
            id: 'comp-1',
            vitality: 3,
            attachments: [
                createCard({
                    id: '9R24',
                    type: 'POSSESSION',
                    kind: 'FREE_PEOPLE',
                    actionPhases: ['SKIRMISH'],
                    abilities: [draught],
                }),
            ],
        });

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                ...createSkirmishActionWindow('sk-1'),
                skirmishes: [
                    {
                        id: 'sk-1',
                        companionId: 'comp-1',
                        minionIds: ['orc'],
                    },
                ],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [companion],
                    }),
                },
            },
        });

        engine.moves.activateAbility('9R24', '9R24:0');

        const host = engine.getG().players['0']?.fellowshipArea[0];
        expect(host?.wounds).toBe(1);
        expect(getKeywordValue(host!, 'DAMAGE')).toBe(1);
    });

    it('en skirmish : exert Gimli et lui donne force +2', () => {
        const gimliAbility: Ability = {
            id: '0P12:0',
            phases: ['SKIRMISH'],
            cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
            effects: [{
                type: 'ADD_TEMP_STAT',
                stat: 'STRENGTH',
                value: 2,
                target: 'SELF',
                expiresAtPhase: 'SKIRMISH',
            }],
            source: 'SELF',
        };

        const gimli = createCompanion({
            id: '0P12',
            title: 'Gimli',
            vitality: 3,
            strength: 6,
            actionPhases: ['SKIRMISH'],
            abilities: [gimliAbility],
        });

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                ...createSkirmishActionWindow('sk-1'),
                skirmishes: [
                    {
                        id: 'sk-1',
                        companionId: '0P12',
                        minionIds: ['orc'],
                    },
                ],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [gimli],
                    }),
                },
            },
        });

        engine.moves.activateAbility('0P12', '0P12:0');

        const card = engine.getG().players['0']?.fellowshipArea[0];
        expect(card?.wounds).toBe(1);
        expect(getCalculatedStrength(engine.getG(), card)).toBe(8);
        expect(engine.getG().actionWindow?.isOpen).toBe(true);
        expect(engine.getG().actionWindow?.activePlayerId).toBe('1');
        expect(engine.getG().actionWindow?.passesCount).toBe(0);
    });

    it('enchaîne force +2 et damage +1 après un seul exert', () => {
        const ability: Ability = {
            id: 'compound:0',
            phases: ['SKIRMISH'],
            cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
            effects: [
                {
                    type: 'ADD_TEMP_STAT',
                    stat: 'STRENGTH',
                    value: 2,
                    target: 'SELF',
                    expiresAtPhase: 'SKIRMISH',
                },
                {
                    type: 'ADD_TEMP_KEYWORD',
                    keyword: 'DAMAGE +1',
                    target: 'SELF',
                    expiresAtPhase: 'SKIRMISH',
                },
            ],
            source: 'SELF',
        };

        const companion = createCompanion({
            id: 'comp-2fx',
            vitality: 3,
            strength: 6,
            actionPhases: ['SKIRMISH'],
            abilities: [ability],
        });

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                ...createSkirmishActionWindow('sk-1'),
                skirmishes: [
                    {
                        id: 'sk-1',
                        companionId: 'comp-2fx',
                        minionIds: ['orc'],
                    },
                ],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [companion],
                    }),
                },
            },
        });

        engine.moves.activateAbility('comp-2fx', 'compound:0');

        const card = engine.getG().players['0']?.fellowshipArea[0];
        expect(card?.wounds).toBe(1);
        expect(getCalculatedStrength(engine.getG(), card)).toBe(8);
        expect(getKeywordValue(card!, 'DAMAGE')).toBe(1);
        expect(engine.getG().actionWindow?.activePlayerId).toBe('1');
    });

    it('Exert Sam nommé : blesse Sam et lui donne force +3 (pas la source)', () => {
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

        const condition = createCard({
            id: 'named-exert',
            kind: 'FREE_PEOPLE',
            type: 'CONDITION',
            title: 'Named Exert',
            actionPhases: ['SKIRMISH'],
            abilities: [impatient],
        });

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                ...createSkirmishActionWindow('sk-1'),
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
                        supportArea: [condition],
                    }),
                },
            },
        });

        engine.moves.activateAbility('named-exert', '4R307:0', '1C311');

        const samInPlay = engine.getG().players['0']?.fellowshipArea[0];
        expect(samInPlay?.wounds).toBe(1);
        expect(getCalculatedStrength(engine.getG(), samInPlay)).toBe(6);
    });

    const GIMLI_SKIRMISH_ABILITY: Ability = {
        id: '0P12:0',
        phases: ['SKIRMISH'],
        cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
        effects: [{
            type: 'ADD_TEMP_STAT',
            stat: 'STRENGTH',
            value: 2,
            target: 'SELF',
            expiresAtPhase: 'SKIRMISH',
        }],
        source: 'SELF',
    };

    function createGimli() {
        return createCompanion({
            id: '0P12',
            title: 'Gimli',
            vitality: 3,
            strength: 6,
            actionPhases: ['SKIRMISH'],
            abilities: [GIMLI_SKIRMISH_ABILITY],
        });
    }

    it('refuse une action Skirmish hors fenêtre de combat', () => {
        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                skirmishes: [
                    {
                        id: 'sk-1',
                        companionId: '0P12',
                        minionIds: ['orc'],
                    },
                ],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [createGimli()],
                    }),
                },
            },
        });

        engine.moves.activateAbility('0P12', '0P12:0');

        const gimli = engine.getG().players['0']?.fellowshipArea[0];
        expect(gimli?.wounds || 0).toBe(0);
        expect(getCalculatedStrength(engine.getG(), gimli)).toBe(6);
    });

    it('le +2 expire à la fin du combat en cours, même si ce n’est pas celui de Gimli', () => {
        const gimli = createGimli();
        const frodo = createCompanion({
            id: 'frodo',
            title: 'Frodo',
            vitality: 4,
            strength: 3,
        });

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                ...createSkirmishActionWindow('sk-frodo'),
                battlefield: [
                    createMinion({ id: 'orc', strength: 1, vitality: 2 }),
                ],
                skirmishes: [
                    {
                        id: 'sk-frodo',
                        companionId: 'frodo',
                        minionIds: ['orc'],
                    },
                    {
                        id: 'sk-gimli',
                        companionId: '0P12',
                        minionIds: ['other-orc'],
                    },
                ],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [frodo, gimli],
                    }),
                },
            },
        });

        engine.moves.activateAbility('0P12', '0P12:0');
        expect(
            getCalculatedStrength(
                engine.getG(),
                engine.getG().players['0']?.fellowshipArea[1]
            )
        ).toBe(8);

        engine.moves.resolveActiveSkirmish();
        engine.moves.cleanupPendingDeaths();

        const gimliAfter = engine.getG().players['0']?.fellowshipArea.find(
            (c) => c.id === '0P12'
        );
        expect(getCalculatedStrength(engine.getG(), gimliAfter)).toBe(6);
        expect(engine.getG().activeSkirmishId).toBeUndefined();
        expect(engine.getG().skirmishes.some((s) => s.id === 'sk-gimli')).toBe(
            true
        );
    });

    it('un exert pendant le combat ne clôture pas l’escarmouche ni n’expire le bonus', () => {
        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                ...createSkirmishActionWindow('sk-1'),
                skirmishes: [
                    {
                        id: 'sk-1',
                        companionId: '0P12',
                        minionIds: ['orc'],
                    },
                ],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [createGimli()],
                    }),
                },
            },
        });

        engine.moves.activateAbility('0P12', '0P12:0');
        engine.moves.cleanupPendingDeaths();

        expect(engine.getG().activeSkirmishId).toBe('sk-1');
        expect(engine.getG().skirmishes).toHaveLength(1);
        expect(
            getCalculatedStrength(
                engine.getG(),
                engine.getG().players['0']?.fellowshipArea[0]
            )
        ).toBe(8);
    });

    it('après Aragorn, un Passer de l’Ombre ne clôt pas la manœuvre', () => {
        const engine = createEngineClient({
            startPhase: 'maneuver',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [createAragorn()],
                    }),
                },
            },
        });

        engine.moves.activateAbility('1R89', '1R89:0');
        engine.updatePlayerID('1');
        engine.moves.passActionWindow();

        expect(engine.getCtx().phase).toBe('maneuver');
        expect(engine.getG().actionWindow?.isOpen).toBe(true);
        expect(engine.getG().actionWindow?.activePlayerId).toBe('0');
        expect(engine.getG().actionWindow?.passesCount).toBe(1);
    });

    it('refuse d’activer si ce n’est pas sa fenêtre d’action', () => {
        const engine = createEngineClient({
            startPhase: 'maneuver',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [createAragorn()],
                    }),
                },
            },
        });

        engine.moves.passActionWindow();
        expect(engine.getG().actionWindow?.activePlayerId).toBe('1');

        engine.moves.activateAbility('1R89', '1R89:0');

        const aragorn = engine.getG().players['0']?.fellowshipArea[0];
        expect(aragorn?.wounds || 0).toBe(0);
        expect(engine.getG().actionWindow?.activePlayerId).toBe('1');
    });

    const GREENLEAF: Ability = {
        id: '1R50:0',
        phases: ['ARCHERY'],
        cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
        effects: [{ type: 'WOUND', count: 1, target: [['MINION']] }],
        source: 'SELF',
        omitFromArcheryTotal: true,
    };

    it('refuse Legolas Vertefeuille sans séide désigné', () => {
        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                battlefield: [createMinion({ id: 'orc', vitality: 3 })],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createCompanion({
                                id: '1R50',
                                title: 'Legolas',
                                vitality: 3,
                                keywords: ['ARCHER'],
                                actionPhases: ['ARCHERY'],
                                abilities: [GREENLEAF],
                            }),
                        ],
                    }),
                },
            },
        });

        engine.moves.activateAbility('1R50', '1R50:0');
        expect(engine.getG().players['0']?.fellowshipArea[0]?.wounds || 0).toBe(
            0
        );
        expect(engine.getG().battlefield[0]?.wounds || 0).toBe(0);
    });

    it('Legolas Vertefeuille blesse le séide désigné et sort du total d’archerie', () => {
        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                battlefield: [
                    createMinion({ id: 'orc-a', vitality: 3 }),
                    createMinion({ id: 'orc-b', vitality: 3 }),
                ],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createCompanion({
                                id: '1R50',
                                title: 'Legolas',
                                vitality: 3,
                                keywords: ['ARCHER'],
                                actionPhases: ['ARCHERY'],
                                abilities: [GREENLEAF],
                            }),
                        ],
                    }),
                },
            },
        });

        engine.moves.activateAbility('1R50', '1R50:0', 'orc-b');

        expect(engine.getG().players['0']?.fellowshipArea[0]?.wounds).toBe(1);
        expect(engine.getG().players['0']?.fellowshipArea[0]?.omitFromArcheryTotal).toBe(
            true
        );
        expect(engine.getG().battlefield.find((c) => c.id === 'orc-a')?.wounds || 0).toBe(
            0
        );
        expect(engine.getG().battlefield.find((c) => c.id === 'orc-b')?.wounds).toBe(
            1
        );
    });
});
