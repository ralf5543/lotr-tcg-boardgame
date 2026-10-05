import { describe, expect, it } from 'vitest';
import {
    abilityEffectWantsTargetingArrow,
    abilityNeedsCostDesignation,
    abilityNeedsDesignation,
    abilityNeedsEffectDesignation,
    getCostDesignationCandidates,
    getDesignationCandidates,
    getHandEventDesignationTargetIds,
    isDesignationTargetId,
} from '../engine/abilities/designation';
import type { Ability } from '../types';
import {
    createCard,
    createCompanion,
    createMinion,
    createGameState,
    createPlayerState,
    createSite,
} from './createGameState';

const SAM_ABILITY: Ability = {
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

const HOBBIT_ABILITY: Ability = {
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

describe('designation', () => {
    const event = createCard({
        id: 'event',
        kind: 'FREE_PEOPLE',
        type: 'EVENT',
        title: 'Test Event',
    });

    it('Exert Sam nommé : le joueur désigne, le Sam dormant de l’Ombre est ignoré', () => {
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        createCompanion({
                            id: '1C311',
                            title: 'Sam',
                            race: 'HOBBIT',
                            vitality: 4,
                        }),
                    ],
                }),
                '1': createPlayerState('1', {
                    fellowshipArea: [
                        createCompanion({
                            id: '11U172',
                            title: 'Sam',
                            race: 'HOBBIT',
                            vitality: 4,
                        }),
                    ],
                }),
            },
        });

        expect(abilityNeedsDesignation(G, event, SAM_ABILITY)).toBe(true);
        const candidates = getDesignationCandidates(G, event, SAM_ABILITY);
        expect(candidates).toHaveLength(1);
        expect(candidates[0]?.id).toBe('1C311');
    });

    it('un Hobbit : le joueur doit quand même désigner', () => {
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        createCompanion({
                            id: 'frodo',
                            title: 'Frodo',
                            race: 'HOBBIT',
                            vitality: 4,
                        }),
                    ],
                }),
            },
        });

        expect(abilityNeedsDesignation(G, event, HOBBIT_ABILITY)).toBe(true);
        expect(getDesignationCandidates(G, event, HOBBIT_ABILITY)).toHaveLength(
            1
        );
    });

    it('deux Hobbits : le joueur doit désigner', () => {
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        createCompanion({
                            id: 'frodo',
                            title: 'Frodo',
                            race: 'HOBBIT',
                            vitality: 4,
                        }),
                        createCompanion({
                            id: 'sam',
                            title: 'Sam',
                            race: 'HOBBIT',
                            vitality: 4,
                        }),
                    ],
                }),
            },
        });

        expect(abilityNeedsDesignation(G, event, HOBBIT_ABILITY)).toBe(true);
        expect(getDesignationCandidates(G, event, HOBBIT_ABILITY)).toHaveLength(
            2
        );
    });

    it('blesser un séide : désignation même s’il n’y en a qu’un', () => {
        const G = createGameState({
            battlefield: [createMinion({ id: 'orc', vitality: 3 })],
        });
        const ability: Ability = {
            id: '1R50:0',
            phases: ['ARCHERY'],
            cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
            effects: [{ type: 'WOUND', count: 1, target: [['MINION']] }],
            source: 'SELF',
        };
        const source = createCompanion({ id: '1R50', title: 'Legolas' });
        expect(abilityNeedsDesignation(G, source, ability)).toBe(true);
        expect(getDesignationCandidates(G, source, ability)).toHaveLength(1);
    });

    it('event en main avec coût à désigner : pas de flèche pendant le drag', () => {
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        createCompanion({
                            id: 'frodo',
                            title: 'Frodo',
                            race: 'HOBBIT',
                            vitality: 4,
                        }),
                    ],
                }),
            },
        });
        const eventCard = createCard({
            id: '1U293',
            kind: 'FREE_PEOPLE',
            type: 'EVENT',
            title: 'Halfling Deftness',
            phases: ['SKIRMISH'],
            twilightCost: 0,
            abilities: [HOBBIT_ABILITY],
        });

        expect(abilityNeedsCostDesignation(G, eventCard, HOBBIT_ABILITY)).toBe(
            true
        );
        // Coût à désigner → halo après drop, pas de flèche pendant le drag
        expect(
            getHandEventDesignationTargetIds(G, eventCard, 'skirmish')
        ).toEqual([]);
        expect(
            getHandEventDesignationTargetIds(G, eventCard, 'fellowship')
        ).toEqual([]);
        expect(isDesignationTargetId(['frodo'], 'frodo')).toBe(true);
        expect(isDesignationTargetId(['frodo'], 'sam')).toBe(false);
    });

    it('Make a Dwarf sans coût : flèche même s’il n’y a qu’un Nain', () => {
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        createCompanion({
                            id: 'gimli',
                            title: 'Gimli',
                            race: 'DWARF',
                            vitality: 3,
                        }),
                    ],
                }),
            },
        });
        const ability: Ability = {
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
            ],
            source: 'SELF',
        };
        const event = createCard({
            id: '1C5',
            kind: 'FREE_PEOPLE',
            type: 'EVENT',
            title: 'Cleaving Blow',
            phases: ['SKIRMISH'],
            twilightCost: 1,
            abilities: [ability],
        });

        expect(abilityNeedsDesignation(G, event, ability)).toBe(true);
        expect(getDesignationCandidates(G, event, ability)).toHaveLength(1);
        expect(getHandEventDesignationTargetIds(G, event, 'skirmish')).toContain(
            'gimli'
        );
    });

    it('Heal a Hobbit : uniquement les Hobbits déjà blessés', () => {
        const heal: Ability = {
            id: '1C315:0',
            phases: ['SKIRMISH'],
            cost: [],
            effects: [{ type: 'HEAL', count: 1, target: [['HOBBIT']] }],
            source: 'SELF',
        };
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        createCompanion({
                            id: 'frodo',
                            race: 'HOBBIT',
                            vitality: 4,
                            wounds: 1,
                        }),
                        createCompanion({
                            id: 'sam',
                            race: 'HOBBIT',
                            vitality: 4,
                            wounds: 0,
                        }),
                    ],
                }),
            },
        });
        const event = createCard({
            id: '1C315',
            kind: 'FREE_PEOPLE',
            type: 'EVENT',
            title: 'Stout and Sturdy',
            phases: ['SKIRMISH'],
            abilities: [heal],
        });
        expect(abilityNeedsDesignation(G, event, heal)).toBe(true);
        expect(getDesignationCandidates(G, event, heal).map((c) => c.id)).toEqual(
            ['frodo']
        );
        expect(getHandEventDesignationTargetIds(G, event, 'skirmish')).toContain(
            'frodo'
        );
        expect(
            getHandEventDesignationTargetIds(G, event, 'skirmish')
        ).not.toContain('sam');
    });

    it('Traveled Leader : flèche sur les sites path de la région courante', () => {
        const site1 = createSite({
            id: 'site-a',
            siteNumber: 1,
            keywords: ['PLAINS'],
        });
        const site2 = createSite({
            id: 'site-b',
            siteNumber: 2,
            keywords: ['FOREST'],
        });
        const deckSite = createSite({
            id: 'site-deck',
            keywords: ['RIVER'],
        });
        const G = createGameState({
            currentSiteIndex: 0,
            path: [
                site1,
                site2,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
            ],
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    fellowshipArea: [
                        createCompanion({
                            id: 'gandalf',
                            culture: 'GANDALF',
                            race: 'WIZARD',
                        }),
                    ],
                    sitesDeck: [deckSite],
                }),
            },
        });
        const ability: Ability = {
            id: '12C34:0',
            phases: [],
            cost: [{ spot: [{ count: 1, target: [['GANDALF', 'WIZARD']] }] }],
            effects: [
                {
                    type: 'REPLACE_SITE',
                    scope: 'REGION',
                    from: 'SITES_DECK',
                },
            ],
            source: 'SELF',
        };
        const event = createCard({
            id: '12C34',
            kind: 'FREE_PEOPLE',
            type: 'EVENT',
            title: 'Traveled Leader',
            phases: ['MANEUVER', 'REGROUP'],
            abilities: [ability],
        });

        const ids = getHandEventDesignationTargetIds(G, event, 'maneuver');
        expect(ids).toEqual(expect.arrayContaining(['site-a', 'site-b']));
        expect(abilityNeedsDesignation(G, event, ability)).toBe(false);
    });

    it('Remove token → heal : même 1 carte à jetons = coût à désigner (pas de flèche depuis la main)', () => {
        const tokenCard = createCard({
            id: '18U2',
            instanceId: 'run-until',
            kind: 'FREE_PEOPLE',
            type: 'CONDITION',
            culture: 'DWARVEN',
            cultureTokens: { DWARVEN: 2 },
        });
        const gimli = createCompanion({
            id: 'gimli',
            instanceId: 'gimli',
            race: 'DWARF',
            vitality: 3,
            wounds: 1,
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [gimli],
                    supportArea: [tokenCard],
                }),
            },
        });
        const ability: Ability = {
            id: '13C7:0',
            phases: [],
            cost: [
                {
                    removeCultureTokens: {
                        culture: 'DWARVEN',
                        count: 1,
                    },
                },
            ],
            effects: [{ type: 'HEAL', count: 1, target: [['DWARF']] }],
            source: 'SELF',
        };
        const event = createCard({
            id: '13C7',
            kind: 'FREE_PEOPLE',
            type: 'EVENT',
            title: 'Sorrow Shared',
            phases: ['MANEUVER'],
            abilities: [ability],
        });

        expect(abilityNeedsCostDesignation(G, event, ability)).toBe(true);
        expect(getCostDesignationCandidates(G, event, ability)).toHaveLength(1);
        expect(abilityNeedsEffectDesignation(G, event, ability)).toBe(true);
        // Coût + effet distincts → pas de flèche pendant le drag (halo après drop)
        expect(
            getHandEventDesignationTargetIds(G, event, 'maneuver')
        ).toEqual([]);
    });

    it('War Preparations : reinforce = halo only, pas de flèche pendant le drag main', () => {
        const orcCondition = createCard({
            id: 'orc-holder',
            instanceId: 'orc-holder',
            kind: 'SHADOW',
            type: 'CONDITION',
            culture: 'ORC',
            cultureTokens: { ORC: 1 },
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', { threats: 1 }),
                '1': createPlayerState('1', {
                    supportArea: [orcCondition],
                }),
            },
        });
        const ability: Ability = {
            id: '18U92:0',
            phases: [],
            cost: [{ removeThreats: 1 }],
            effects: [
                {
                    type: 'REINFORCE_CULTURE_TOKEN',
                    culture: 'ORC',
                    count: 1,
                },
            ],
            source: 'SELF',
        };
        const event = createCard({
            id: '18U92',
            kind: 'SHADOW',
            type: 'EVENT',
            title: 'War Preparations',
            phases: ['SHADOW'],
            abilities: [ability],
        });

        expect(abilityNeedsCostDesignation(G, event, ability)).toBe(false);
        expect(abilityNeedsEffectDesignation(G, event, ability)).toBe(true);
        expect(abilityEffectWantsTargetingArrow(ability)).toBe(false);
        expect(getHandEventDesignationTargetIds(G, event, 'shadow')).toEqual(
            []
        );
    });

    it('Sauron’s Might : remove FP token → add threat = pas de flèche pendant le drag', () => {
        const fpToken = createCard({
            id: 'garrison',
            instanceId: 'garrison',
            kind: 'FREE_PEOPLE',
            type: 'CONDITION',
            culture: 'GONDOR',
            cultureTokens: { GONDOR: 1 },
        });
        const frodo = createCompanion({
            id: 'frodo',
            instanceId: 'frodo',
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo],
                    supportArea: [fpToken],
                    threats: 0,
                }),
                '1': createPlayerState('1'),
            },
        });
        const ability: Ability = {
            id: '19P27:0',
            phases: [],
            cost: [
                {
                    removeCultureTokens: {
                        culture: 'FREE_PEOPLES',
                        count: 1,
                    },
                },
            ],
            effects: [{ type: 'ADD_THREATS', count: 1 }],
            source: 'SELF',
        };
        const event = createCard({
            id: '19P27',
            kind: 'SHADOW',
            type: 'EVENT',
            title: "Sauron's Might",
            phases: ['SHADOW'],
            abilities: [ability],
        });

        expect(abilityNeedsCostDesignation(G, event, ability)).toBe(true);
        expect(abilityNeedsEffectDesignation(G, event, ability)).toBe(false);
        expect(abilityEffectWantsTargetingArrow(ability)).toBe(false);
        expect(getHandEventDesignationTargetIds(G, event, 'shadow')).toEqual(
            []
        );
        expect(getCostDesignationCandidates(G, event, ability).map((c) => c.instanceId)).toEqual(
            ['garrison']
        );
    });
});
