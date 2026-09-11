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

    it('Legolas : si une réponse peut empêcher, ouvre le toaster sans blesser tout de suite', () => {
        const shamanAbility: Ability = {
            id: '3C59:0',
            phases: ['RESPONSE'],
            trigger: {
                type: 'ABOUT_TO_WOUND',
                target: [['ISENGARD', 'ORC']],
            },
            cost: [{ removeTwilight: 2 }],
            effects: [{ type: 'PREVENT_WOUND' }],
            source: 'SELF',
        };

        const engine = createEngineClient({
            startPhase: 'archery',
            playerID: '0',
            G: {
                twilightPool: 3,
                battlefield: [
                    createMinion({
                        id: 'orc-b',
                        culture: 'ISENGARD',
                        race: 'ORC',
                        vitality: 3,
                    }),
                    createMinion({
                        id: '3C59',
                        title: 'Isengard Shaman',
                        culture: 'ISENGARD',
                        race: 'ORC',
                        vitality: 2,
                        actionPhases: ['RESPONSE'],
                        abilities: [shamanAbility],
                    }),
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

        const afterShot = engine.getG();
        expect(afterShot.players['0']?.fellowshipArea[0]?.wounds).toBe(1);
        expect(afterShot.battlefield.find((c) => c.id === 'orc-b')?.wounds || 0).toBe(
            0
        );
        expect(afterShot.responseWindow?.isOpen).toBe(true);
        expect(afterShot.responseWindow?.activePlayerId).toBe('1');
        expect(afterShot.actionWindow?.activePlayerId).toBe('0');

        engine.updatePlayerID('1');
        engine.moves.activateAbility('3C59', '3C59:0');

        const afterPrevent = engine.getG();
        expect(
            afterPrevent.battlefield.find((c) => c.id === 'orc-b')?.wounds || 0
        ).toBe(0);
        expect(afterPrevent.responseWindow).toBeUndefined();
        expect(afterPrevent.actionWindow?.isOpen).toBe(true);
        expect(afterPrevent.actionWindow?.activePlayerId).toBe('1');
    });

    it('Faramir affaiblit SELF et donne +2 au Hobbit dissocié désigné', () => {
        const faramirAbility: Ability = {
            id: '7R91:0',
            phases: ['SKIRMISH'],
            cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
            effects: [
                {
                    type: 'ADD_TEMP_STAT',
                    stat: 'STRENGTH',
                    value: 2,
                    target: [['UNBOUND', 'HOBBIT']],
                    expiresAtPhase: 'SKIRMISH',
                },
            ],
            source: 'SELF',
        };

        const faramir = createCompanion({
            id: '7R91',
            title: 'Faramir',
            vitality: 3,
            strength: 7,
            actionPhases: ['SKIRMISH'],
            abilities: [faramirAbility],
        });
        const merry = createCompanion({
            id: '1C303',
            title: 'Merry',
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
                        companionId: '7R91',
                        minionIds: ['orc'],
                    },
                ],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [faramir, merry],
                    }),
                },
            },
        });

        engine.moves.activateAbility('7R91', '7R91:0', '1C303');

        const after = engine.getG().players['0']?.fellowshipArea || [];
        const faramirInPlay = after.find((c) => c.id === '7R91');
        const merryInPlay = after.find((c) => c.id === '1C303');
        expect(faramirInPlay?.wounds).toBe(1);
        expect(getCalculatedStrength(engine.getG(), faramirInPlay)).toBe(7);
        expect(getCalculatedStrength(engine.getG(), merryInPlay)).toBe(5);
    });

    it('Sylvebarbe : Dégâts +1 sur lui-même (Ent) s’ajoute au Dégâts +1 imprimé', () => {
        const treebeardAbility: Ability = {
            id: '0P21:1',
            phases: ['SKIRMISH'],
            cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
            effects: [
                {
                    type: 'ADD_TEMP_KEYWORD',
                    keyword: 'DAMAGE +1',
                    target: [['ENT']],
                    expiresAtPhase: 'SKIRMISH',
                },
            ],
            source: 'SELF',
        };
        const treebeard = createCompanion({
            id: '0P21',
            title: 'Treebeard',
            race: 'ENT',
            keywords: ['UNHASTY', 'DAMAGE +1'],
            vitality: 4,
            strength: 12,
            actionPhases: ['SKIRMISH'],
            abilities: [treebeardAbility],
        });

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                ...createSkirmishActionWindow('sk-1'),
                skirmishes: [
                    {
                        id: 'sk-1',
                        companionId: '0P21',
                        minionIds: ['orc'],
                    },
                ],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [treebeard],
                    }),
                },
            },
        });

        engine.moves.activateAbility('0P21', '0P21:1', '0P21');

        const after = engine.getG().players['0']?.fellowshipArea[0];
        expect(after?.wounds).toBe(1);
        expect(getKeywordValue(after!, 'DAMAGE')).toBe(2);
        expect(getCalculatedStrength(engine.getG(), after)).toBe(12);
    });

    it('Soldat orque blesse le compagnon qu’il combat', () => {
        const soldierAbility: Ability = {
            id: '1C271:0',
            phases: ['SKIRMISH'],
            cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
            effects: [{ type: 'WOUND', count: 1, target: 'SKIRMISHING' }],
            source: 'SELF',
        };

        const companion = createCompanion({
            id: 'aragorn',
            title: 'Aragorn',
            vitality: 4,
            strength: 8,
        });
        const soldier = createMinion({
            id: '1C271',
            title: 'Orc Soldier',
            vitality: 2,
            strength: 7,
            actionPhases: ['SKIRMISH'],
            abilities: [soldierAbility],
        });

        const engine = createEngineClient({
            startPhase: 'skirmish',
            playerID: '1',
            G: {
                ...createSkirmishActionWindow('sk-1', '1'),
                battlefield: [soldier],
                skirmishes: [
                    {
                        id: 'sk-1',
                        companionId: 'aragorn',
                        minionIds: ['1C271'],
                    },
                ],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [companion],
                    }),
                    '1': createPlayerState('1'),
                },
            },
        });

        engine.moves.activateAbility('1C271', '1C271:0', 'aragorn');

        expect(engine.getG().battlefield[0]?.wounds).toBe(1);
        expect(engine.getG().players['0']?.fellowshipArea[0]?.wounds).toBe(1);
    });

    it('Celeborn : affaiblit et guérit un allié elfe blessé', () => {
        const celebornAbility: Ability = {
            id: '1R34:0',
            phases: ['FELLOWSHIP'],
            cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
            effects: [
                { type: 'HEAL', count: 1, target: [['ELVEN', 'ALLY']] },
            ],
            source: 'SELF',
        };
        const celeborn = createCard({
            id: '1R34',
            kind: 'FREE_PEOPLE',
            type: 'ALLY',
            title: 'Celeborn',
            culture: 'ELVEN',
            race: 'ELF',
            vitality: 3,
            actionPhases: ['FELLOWSHIP'],
            abilities: [celebornAbility],
        });
        const elrond = createCard({
            id: '1R40',
            kind: 'FREE_PEOPLE',
            type: 'ALLY',
            title: 'Elrond',
            culture: 'ELVEN',
            race: 'ELF',
            vitality: 4,
            wounds: 2,
        });

        const engine = createEngineClient({
            startPhase: 'fellowship',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        supportArea: [celeborn, elrond],
                    }),
                },
            },
        });

        engine.moves.activateAbility('1R34', '1R34:0', '1R40');

        const board = engine.getG().players['0']?.supportArea || [];
        expect(board.find((c) => c.id === '1R34')?.wounds).toBe(1);
        expect(board.find((c) => c.id === '1R40')?.wounds).toBe(1);
    });

    it('Celeborn : refuse s’il n’y a aucun allié elfe blessé', () => {
        const celebornAbility: Ability = {
            id: '1R34:0',
            phases: ['FELLOWSHIP'],
            cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
            effects: [
                { type: 'HEAL', count: 1, target: [['ELVEN', 'ALLY']] },
            ],
            source: 'SELF',
        };
        const celeborn = createCard({
            id: '1R34',
            kind: 'FREE_PEOPLE',
            type: 'ALLY',
            title: 'Celeborn',
            culture: 'ELVEN',
            race: 'ELF',
            vitality: 3,
            actionPhases: ['FELLOWSHIP'],
            abilities: [celebornAbility],
        });

        const engine = createEngineClient({
            startPhase: 'fellowship',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        supportArea: [celeborn],
                    }),
                },
            },
        });

        engine.moves.activateAbility('1R34', '1R34:0', '1R34');

        expect(engine.getG().players['0']?.supportArea[0]?.wounds || 0).toBe(0);
    });

    it('Elrond : affaiblit et pioche une carte', () => {
        const elrondAbility: Ability = {
            id: '1R40:0',
            phases: ['FELLOWSHIP'],
            cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
            effects: [{ type: 'DRAW', count: 1 }],
            source: 'SELF',
        };
        const elrond = createCard({
            id: '1R40',
            kind: 'FREE_PEOPLE',
            type: 'ALLY',
            title: 'Elrond',
            culture: 'ELVEN',
            vitality: 4,
            actionPhases: ['FELLOWSHIP'],
            abilities: [elrondAbility],
        });

        const engine = createEngineClient({
            startPhase: 'fellowship',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        supportArea: [elrond],
                        deck: [
                            createCard({
                                id: 'drawn',
                                kind: 'FREE_PEOPLE',
                                type: 'EVENT',
                            }),
                        ],
                    }),
                },
            },
        });

        engine.moves.activateAbility('1R40', '1R40:0');

        expect(engine.getG().players['0']?.supportArea[0]?.wounds).toBe(1);
        expect(engine.getG().players['0']?.hand[0]?.id).toBe('drawn');
        expect(engine.getG().fellowshipCardsDrawn).toBe(1);
    });

    it('Cape de Boromir : affaiblit Boromir et défausse une situation climat', () => {
        const cloakAbility: Ability = {
            id: '1U98:0',
            phases: ['MANEUVER'],
            cost: [{ exert: [{ count: 1, target: 'BEARER' }] }],
            effects: [
                {
                    type: 'DISCARD',
                    count: 1,
                    target: [['WEATHER', 'CONDITION']],
                },
            ],
            source: 'ATTACHMENT',
        };
        const cloak = createCard({
            id: '1U98',
            kind: 'FREE_PEOPLE',
            type: 'POSSESSION',
            title: "Boromir's Cloak",
            actionPhases: ['MANEUVER'],
            abilities: [cloakAbility],
        });
        const boromir = createCompanion({
            id: '1R96',
            title: 'Boromir',
            vitality: 3,
            attachments: [cloak],
        });
        const snows = createCard({
            id: '1C138',
            kind: 'SHADOW',
            type: 'CONDITION',
            title: "Saruman's Snows",
            keywords: ['WEATHER'],
        });

        const engine = createEngineClient({
            startPhase: 'maneuver',
            playerID: '0',
            G: {
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [boromir],
                    }),
                    '1': createPlayerState('1', {
                        supportArea: [snows],
                    }),
                },
            },
        });

        engine.moves.activateAbility('1U98', '1U98:0', '1C138');

        expect(engine.getG().players['0']?.fellowshipArea[0]?.wounds).toBe(1);
        expect(engine.getG().players['1']?.supportArea).toHaveLength(0);
        expect(engine.getG().players['1']?.discard[0]?.id).toBe('1C138');
    });
});
