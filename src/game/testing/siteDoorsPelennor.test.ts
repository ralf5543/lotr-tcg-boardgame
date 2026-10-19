import { describe, expect, it } from 'vitest';
import { parseSiteAbilities } from '../../../scripts/convert/parsers';
import { getEffectiveStrength } from '../../utils/cardStats';
import { getKeywordValue } from '../engine/keywords/keywordUtils';
import { abilityProjectsOnto } from '../engine/abilities/collectAbilities';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import type { Ability } from '../types';
import {
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
    createSite,
} from './createGameState';

describe('parseSiteAbilities — Doors / Northern Pelennor', () => {
    it('Doors of Durin : majority race companions strength −1', () => {
        const text =
            '**Marsh.** Each companion of a race that has the most companions is strength −1 until the regroup phase.';
        expect(parseSiteAbilities(text, '13U190')).toEqual([
            expect.objectContaining({
                trigger: { type: 'WHILE' },
                effects: [
                    {
                        type: 'MODIFY_STAT',
                        stat: 'STRENGTH',
                        value: -1,
                        target: [['COMPANION']],
                        majorityRaceCompanions: true,
                    },
                ],
            }),
        ]);
    });

    it('Northern Pelennor : Shadow lose lurker until regroup', () => {
        const text =
            '**Battleground. Plains. Shadow:** Make your lurker minion lose <keyword>lurker</keyword> until the regroup phase.';
        expect(parseSiteAbilities(text, '12S190')).toEqual([
            expect.objectContaining({
                phases: ['SHADOW'],
                cost: [
                    {
                        spot: [
                            {
                                count: 1,
                                target: [['LURKER', 'MINION']],
                                mode: 'DESIGNATION',
                            },
                        ],
                    },
                ],
                effects: [
                    {
                        type: 'SUPPRESS_KEYWORD',
                        keyword: 'LURKER',
                        target: 'COST_TARGET',
                        expiresAtPhase: 'REGROUP',
                    },
                ],
            }),
        ]);
    });
});

describe('runtime — Doors / Northern Pelennor', () => {
    it('Doors : race majoritaire −1 ; autres races intactes', () => {
        const site = createSite({
            id: '13U190',
            abilities: parseSiteAbilities(
                'Each companion of a race that has the most companions is strength -1 until the regroup phase.',
                '13U190'
            ) as never,
        });
        const aragorn = createCompanion({
            instanceId: 'aragorn',
            race: 'MAN',
            strength: 8,
        });
        const boromir = createCompanion({
            instanceId: 'boromir',
            race: 'MAN',
            strength: 7,
        });
        const gimli = createCompanion({
            instanceId: 'gimli',
            race: 'DWARF',
            strength: 6,
        });
        const G = createGameState({
            currentSiteIndex: 0,
            path: [site],
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    fellowshipArea: [aragorn, boromir, gimli],
                }),
                '1': createPlayerState('1'),
            },
        });
        expect(getEffectiveStrength(aragorn, G)).toBe(7);
        expect(getEffectiveStrength(boromir, G)).toBe(6);
        expect(getEffectiveStrength(gimli, G)).toBe(6);
    });

    it('Northern Pelennor : projeté sur lurker ; SUPPRESS retire LURKER', () => {
        const abilities = parseSiteAbilities(
            'Shadow: Make your lurker minion lose lurker until the regroup phase.',
            '12S190'
        ) as Ability[];
        const ability = abilities[0]!;
        const site = createSite({
            id: '12S190',
            abilities,
        });
        const lurker = createMinion({
            instanceId: 'lurker-1',
            keywords: ['LURKER'],
        });
        const plain = createMinion({
            instanceId: 'orc-1',
        });
        const G = createGameState({
            currentSiteIndex: 0,
            path: [site],
            battlefield: [lurker, plain],
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 0 }),
                '1': createPlayerState('1'),
            },
        });
        expect(abilityProjectsOnto(G, site, ability, lurker)).toBe(true);
        expect(abilityProjectsOnto(G, site, ability, plain)).toBe(false);
        expect(getKeywordValue(lurker, 'LURKER', G)).toBe(0);
        expect(
            applyAbilityEffect(
                G,
                site,
                ability,
                undefined,
                undefined,
                lurker.instanceId
            )
        ).toBe(true);
        expect(getKeywordValue(lurker, 'LURKER', G)).toBe(-1);
    });
});
