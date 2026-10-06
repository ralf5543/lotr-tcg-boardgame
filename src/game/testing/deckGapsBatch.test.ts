import { describe, expect, it } from 'vitest';
import { parseAbilities, parseSiteAbilities } from '../../../scripts/convert/parsers';
import { getKeywordValue } from '../engine/keywords/keywordUtils';
import {
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
    createSite,
} from './createGameState';
import type { Ability } from '../types';

describe('parseAbilities — Spot named → make + damage (Still Sharp)', () => {
    it('Still Sharp : spot Fragments de Narsil → compagnon gondor +3 et Damage +1', () => {
        const text =
            '<keyword>Skirmish:</keyword> Spot The Shards of Narsil to make a <symbol>gondor</symbol> companion strength +3 and **damage +1.**';
        expect(parseAbilities(text, 'Still Sharp', '3U46')).toEqual([
            {
                id: '3U46:0',
                phases: ['SKIRMISH'],
                cost: [
                    {
                        spot: [
                            {
                                count: 1,
                                target: [['The Shards of Narsil']],
                            },
                        ],
                    },
                ],
                effects: [
                    {
                        type: 'ADD_TEMP_STAT',
                        stat: 'STRENGTH',
                        value: 3,
                        target: [['GONDOR', 'COMPANION']],
                        expiresAtPhase: 'SKIRMISH',
                    },
                    {
                        type: 'ADD_TEMP_KEYWORD',
                        keyword: 'DAMAGE +1',
                        target: [['GONDOR', 'COMPANION']],
                        expiresAtPhase: 'SKIRMISH',
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(
                    /Spot The Shards of Narsil to make a gondor companion/i
                ),
            },
        ]);
    });
});

describe('parseAbilities — Heal for each spot (Unharmed)', () => {
    it('Unharmed : heal Hobbit for each minion spotted', () => {
        expect(
            parseAbilities(
                'Heal a Hobbit for each minion you spot.',
                'Unharmed',
                '11S176'
            )
        ).toEqual([
            {
                id: '11S176:0',
                phases: [],
                cost: [{ spot: [{ count: 1, target: [['MINION']] }] }],
                effects: [
                    {
                        type: 'HEAL',
                        multiFromSpot: true,
                        target: [['HOBBIT']],
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(
                    /Heal a Hobbit for each minion you spot/i
                ),
            },
        ]);
    });
});

describe('parseSiteAbilities — Each unwounded → defender (Window on the West)', () => {
    it('Window on the West : each unwounded gondor Man defender +1', () => {
        const text =
            '<keyword>Underground.</keyword> Each unwounded <symbol>gondor</symbol> Man is **defender +1. **';
        expect(parseSiteAbilities(text, '11S265')).toEqual([
            expect.objectContaining({
                trigger: { type: 'WHILE' },
                effects: [
                    {
                        type: 'MODIFY_KEYWORD',
                        keyword: 'DEFENDER +1',
                        target: [['GONDOR', 'UNWOUNDED', 'MAN']],
                    },
                ],
            }),
        ]);
    });
});

describe('Window on the West — runtime', () => {
    const windowAbility: Ability = {
        id: '11S265:0',
        phases: [],
        trigger: { type: 'WHILE' },
        cost: [],
        effects: [
            {
                type: 'MODIFY_KEYWORD',
                keyword: 'DEFENDER +1',
                target: [['GONDOR', 'UNWOUNDED', 'MAN']],
            },
        ],
        source: 'SELF',
    };

    it('accorde defender +1 aux Hommes Gondor sans blessure sur le site', () => {
        const site = createSite({
            id: '11S265',
            name: 'Window on the West',
            keywords: ['UNDERGROUND'],
            abilities: [windowAbility],
        });
        const boromir = createCompanion({
            id: 'boromir',
            title: 'Boromir',
            culture: 'GONDOR',
            race: 'MAN',
            wounds: 0,
        });
        const wounded = createCompanion({
            id: 'faramir',
            title: 'Faramir',
            culture: 'GONDOR',
            race: 'MAN',
            wounds: 1,
        });
        const hobbit = createCompanion({
            id: 'sam',
            title: 'Sam',
            culture: 'SHIRE',
            race: 'HOBBIT',
        });

        const path = Array(9).fill(null) as ReturnType<typeof createSite>[];
        path[0] = site;

        const G = createGameState({
            path,
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    fellowshipArea: [boromir, wounded, hobbit],
                }),
            },
        });

        expect(getKeywordValue(boromir, 'DEFENDER', G)).toBe(1);
        expect(getKeywordValue(wounded, 'DEFENDER', G)).toBe(-1);
        expect(getKeywordValue(hobbit, 'DEFENDER', G)).toBe(-1);
    });
});
