import { describe, expect, it } from 'vitest';
import { parseSiteAbilities } from '../../../scripts/convert/parsers';
import { getKeywordValue } from '../engine/keywords/keywordUtils';
import { getCalculatedStrength } from '../logic/stats/statCalculator';
import { getWhileTwilightCostModifier } from '../logic/stats/mechanics/whileModifier';
import {
    getAssignableMinionCapacity,
    getSiteMaxMinionsPerSkirmish,
} from '../logic/assignment';
import { calculateArcheryTotals } from '../logic/archery';
import type { Ability } from '../types';
import {
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
    createSite,
} from './createGameState';

describe('parseSiteAbilities — vague passifs', () => {
    it("Helm's Gate : bearing hand weapon → strength +2", () => {
        const text =
            '**Battleground.** Each character bearing a hand weapon is strength +2.';
        expect(parseSiteAbilities(text, '11S245')).toEqual([
            expect.objectContaining({
                trigger: { type: 'WHILE' },
                effects: [
                    {
                        type: 'MODIFY_STAT',
                        stat: 'STRENGTH',
                        value: 2,
                        target: [['CHARACTER']],
                        bearing: [['HAND-WEAPON']],
                    },
                ],
            }),
        ]);
    });

    it('East Road : each companion twilight cost +2', () => {
        const text = '**Forest.** Each companion is twilight cost +2.';
        expect(parseSiteAbilities(text, '11S236')).toEqual([
            expect.objectContaining({
                effects: [
                    {
                        type: 'MODIFY_STAT',
                        stat: 'TWILIGHT_COST',
                        value: 2,
                        target: [['COMPANION']],
                    },
                ],
            }),
        ]);
    });

    it('Pelennor Fields : men minion gains ambush 1', () => {
        const text =
            '**Plains.** Each <symbol>men</symbol> minion gains ambush <symbol>twilight1</symbol>.';
        expect(parseSiteAbilities(text, '11S253')).toEqual([
            expect.objectContaining({
                effects: [
                    {
                        type: 'MODIFY_KEYWORD',
                        keyword: 'AMBUSH 1',
                        target: [['MEN', 'MINION']],
                    },
                ],
            }),
        ]);
    });

    it('Caras Galadhon : limit 1 minion per skirmish', () => {
        const text =
            '**Forest.** No more than 1 minion can be assigned to each skirmish.';
        expect(parseSiteAbilities(text, '11S231')).toEqual([
            expect.objectContaining({
                effects: [{ type: 'LIMIT_ASSIGN_MINIONS', count: 1 }],
            }),
        ]);
    });

    it('Flats of Rohan : unbound + more than 1 minion → strength +3', () => {
        const text =
            '**Plains.** Each unbound companion skirmishing more than 1 minion is strength +3.';
        expect(parseSiteAbilities(text, '11S240')).toEqual([
            expect.objectContaining({
                effects: [
                    {
                        type: 'MODIFY_STAT',
                        stat: 'STRENGTH',
                        value: 3,
                        target: [['UNBOUND', 'COMPANION']],
                        skirmishingMinionsAtLeast: 2,
                    },
                ],
            }),
        ]);
    });

    it('Anduin River : fellowship archery −3', () => {
        const text = '**River.** The fellowship archery total is –3.';
        expect(parseSiteAbilities(text, '15U187')).toEqual([
            expect.objectContaining({
                effects: [
                    {
                        type: 'MODIFY_ARCHERY_TOTAL',
                        side: 'FREE_PEOPLE',
                        value: -3,
                    },
                ],
            }),
        ]);
    });
});

describe('runtime — vague passifs sites', () => {
    it("Helm's Gate : +2 force si arme de mêlée", () => {
        const ability = parseSiteAbilities(
            'Each character bearing a hand weapon is strength +2.',
            '11S245'
        )![0] as Ability;
        const site = createSite({
            id: '11S245',
            abilities: [ability],
        });
        const axe = {
            ...createCompanion({ id: 'axe', strength: 0 }),
            type: 'POSSESSION' as const,
            subtype: 'HAND-WEAPON' as const,
            kind: 'FREE_PEOPLE' as const,
            instanceId: 'axe',
        };
        const gimli = createCompanion({
            id: 'gimli',
            instanceId: 'gimli',
            strength: 6,
            attachments: [axe],
        });
        const bare = createCompanion({
            id: 'farin',
            instanceId: 'farin',
            strength: 5,
        });
        const path = Array(9).fill(null);
        path[0] = site;
        const G = createGameState({
            path,
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    fellowshipArea: [gimli, bare],
                }),
            },
        });
        expect(getCalculatedStrength(G, gimli)).toBe(8);
        expect(getCalculatedStrength(G, bare)).toBe(5);
    });

    it('East Road : +2 crépuscule sur compagnon', () => {
        const ability = parseSiteAbilities(
            'Each companion is twilight cost +2.',
            '11S236'
        )![0] as Ability;
        const site = createSite({ id: '11S236', abilities: [ability] });
        const companion = createCompanion({
            id: 'c1',
            twilightCost: 2,
        });
        const path = Array(9).fill(null);
        path[0] = site;
        const G = createGameState({
            path,
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    fellowshipArea: [companion],
                }),
            },
        });
        expect(getWhileTwilightCostModifier(G, companion)).toBe(2);
    });

    it('Pelennor Fields : embuscade 1 aux séides Men', () => {
        const ability = parseSiteAbilities(
            'Each <symbol>men</symbol> minion gains ambush <symbol>twilight1</symbol>.',
            '11S253'
        )![0] as Ability;
        const site = createSite({ id: '11S253', abilities: [ability] });
        const men = createMinion({
            id: 'm1',
            culture: 'MEN',
            instanceId: 'm1',
        });
        const orc = createMinion({
            id: 'o1',
            culture: 'MORIA',
            instanceId: 'o1',
        });
        const path = Array(9).fill(null);
        path[0] = site;
        const G = createGameState({
            path,
            battlefield: [men, orc],
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 0 }),
            },
        });
        expect(getKeywordValue(men, 'AMBUSH', G)).toBe(1);
        expect(getKeywordValue(orc, 'AMBUSH', G)).toBe(-1);
    });

    it('Caras Galadhon : plafond 1 même avec Defender +1', () => {
        const ability = parseSiteAbilities(
            'No more than 1 minion can be assigned to each skirmish.',
            '11S231'
        )![0] as Ability;
        const site = createSite({ id: '11S231', abilities: [ability] });
        const path = Array(9).fill(null);
        path[0] = site;
        const boromir = createCompanion({
            id: 'boromir',
            keywords: ['DEFENDER +1'],
        });
        const G = createGameState({
            path,
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    fellowshipArea: [boromir],
                }),
            },
        });
        expect(getSiteMaxMinionsPerSkirmish(G)).toBe(1);
        expect(getAssignableMinionCapacity(boromir, G)).toBe(1);
    });

    it('Flats of Rohan : +3 si ≥2 séides au combat', () => {
        const ability = parseSiteAbilities(
            'Each unbound companion skirmishing more than 1 minion is strength +3.',
            '11S240'
        )![0] as Ability;
        const site = createSite({ id: '11S240', abilities: [ability] });
        const aragorn = createCompanion({
            id: 'aragorn',
            instanceId: 'aragorn',
            strength: 8,
            keywords: ['UNBOUND'],
        });
        const path = Array(9).fill(null);
        path[0] = site;
        const G = createGameState({
            path,
            skirmishes: [
                {
                    id: 'sk1',
                    companionId: 'aragorn',
                    minionIds: ['m1', 'm2'],
                },
            ],
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    fellowshipArea: [aragorn],
                }),
            },
        });
        expect(getCalculatedStrength(G, aragorn)).toBe(11);
        G.skirmishes = [
            { id: 'sk1', companionId: 'aragorn', minionIds: ['m1'] },
        ];
        expect(getCalculatedStrength(G, aragorn)).toBe(8);
    });

    it('Anduin River : archerie FP −3', () => {
        const ability = parseSiteAbilities(
            'The fellowship archery total is –3.',
            '15U187'
        )![0] as Ability;
        const site = createSite({ id: '15U187', abilities: [ability] });
        const path = Array(9).fill(null);
        path[0] = site;
        const archer = createCompanion({
            id: 'legolas',
            keywords: ['ARCHER'],
        });
        const G = createGameState({
            path,
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    fellowshipArea: [archer],
                }),
            },
        });
        const totals = calculateArcheryTotals(G);
        expect(totals.fpTotal).toBe(1 - 3);
    });
});
