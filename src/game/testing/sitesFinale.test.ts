import { describe, expect, it } from 'vitest';
import { getCalculatedStrength } from '../logic/stats/statCalculator';
import { getKeywordValue } from '../engine/keywords/keywordUtils';
import { shouldSkipPhase } from '../logic/stats/mechanics/whileModifier';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { playerHasInitiative } from '../logic/initiative';
import {
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
    createSite,
    createCard,
} from './createGameState';
import type { Ability } from '../types';

describe('Ransacker / Troop Tower / attaches site', () => {
    it('initiative : FP ≥ 4 cartes, sinon Ombre', () => {
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    hand: [
                        createCard({ id: 'a' }),
                        createCard({ id: 'b' }),
                        createCard({ id: 'c' }),
                        createCard({ id: 'd' }),
                    ],
                }),
                '1': createPlayerState('1'),
            },
        });
        expect(playerHasInitiative(G, '0')).toBe(true);
        expect(playerHasInitiative(G, '1')).toBe(false);
        G.players['0']!.hand.pop();
        expect(playerHasInitiative(G, '0')).toBe(false);
        expect(playerHasInitiative(G, '1')).toBe(true);
    });

    it('Ransacker empilé : défausse → force +5 ou +10 si initiative Ombre', () => {
        const ransacker = createMinion({
            id: '7C276',
            instanceId: 'ransacker',
            culture: 'SAURON',
            race: 'ORC',
            keywords: ['BESIEGER'],
        });
        const orc = createMinion({
            id: 'orc',
            instanceId: 'orc',
            culture: 'SAURON',
            race: 'ORC',
            strength: 8,
        });
        const ability: Ability = {
            id: '7C276:0',
            phases: ['SKIRMISH'],
            requiresStackedOnControlledSite: true,
            cost: [{ discardFromPlay: [{ count: 1, target: 'SELF' }] }],
            effects: [
                {
                    type: 'ADD_TEMP_STAT',
                    stat: 'STRENGTH',
                    value: 5,
                    valueIfInitiative: 10,
                    target: [['SAURON', 'ORC']],
                    expiresAtPhase: 'SKIRMISH',
                },
            ],
            source: 'SELF',
        };
        const site = createSite({
            id: 's1',
            instanceId: 's1',
            siteNumber: 1,
            ownerId: '0',
            controlledBy: '1',
        });
        site.stacked = [ransacker];
        const G = createGameState({
            path: [site, null, null, null, null, null, null, null, null],
            battlefield: [orc],
            players: {
                '0': createPlayerState('0', {
                    hand: [createCard({ id: '1' }), createCard({ id: '2' })],
                }),
                '1': createPlayerState('1'),
            },
        });

        expect(playerHasInitiative(G, '1')).toBe(true);
        expect(applyAbilityEffect(G, ransacker, ability, 'orc')).toBe(true);
        expect(
            G.tempModifiers?.find((m) => m.targetCardId === 'orc')?.value
        ).toBe(10);
    });

    it('Troop Tower : +1 force Sauron Orc par assiégeant empilé', () => {
        const tower = createCard({
            id: '7R316',
            instanceId: 'tower',
            kind: 'SHADOW',
            type: 'CONDITION',
            abilities: [
                {
                    id: '7R316:1',
                    phases: [],
                    trigger: { type: 'WHILE' },
                    cost: [],
                    effects: [
                        {
                            type: 'MODIFY_STAT',
                            stat: 'STRENGTH',
                            value: 1,
                            target: [['SAURON', 'ORC']],
                            perSpot: {
                                target: [['BESIEGER']],
                                stackedOnSites: true,
                            },
                        },
                    ],
                    source: 'SELF',
                },
            ],
        });
        const orc = createMinion({
            id: 'orc',
            instanceId: 'orc',
            culture: 'SAURON',
            race: 'ORC',
            strength: 10,
        });
        const site = createSite({
            id: 's1',
            instanceId: 's1',
            siteNumber: 1,
            ownerId: '0',
            controlledBy: '1',
        });
        site.stacked = [
            createMinion({
                id: 'b1',
                instanceId: 'b1',
                keywords: ['BESIEGER'],
            }),
            createMinion({
                id: 'b2',
                instanceId: 'b2',
                keywords: ['BESIEGER'],
            }),
        ];
        const G = createGameState({
            path: [site, null, null, null, null, null, null, null, null],
            battlefield: [orc],
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', {
                    supportArea: [tower],
                }),
            },
        });
        expect(getCalculatedStrength(G, orc)).toBe(12);
    });

    it('Strong Arms : Rohan Man force +1 au site hôte', () => {
        const arms = createCard({
            id: '7U252',
            instanceId: 'arms',
            kind: 'FREE_PEOPLE',
            type: 'CONDITION',
            grantsKeywords: ['PLAINS'],
            abilities: [
                {
                    id: '7U252:0',
                    phases: [],
                    trigger: { type: 'WHILE', atAttachedSite: true },
                    cost: [],
                    effects: [
                        {
                            type: 'MODIFY_STAT',
                            stat: 'STRENGTH',
                            value: 1,
                            target: [['ROHAN', 'MAN']],
                        },
                    ],
                    source: 'SELF',
                },
            ],
        });
        const theoden = createCompanion({
            id: 'theoden',
            instanceId: 'theoden',
            culture: 'ROHAN',
            race: 'MAN',
            strength: 7,
        });
        const site = createSite({
            id: 's1',
            instanceId: 's1',
            siteNumber: 1,
            ownerId: '0',
        });
        site.attachments = [arms];
        const G = createGameState({
            currentSiteIndex: 0,
            path: [site, null, null, null, null, null, null, null, null],
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    fellowshipArea: [theoden],
                }),
                '1': createPlayerState('1'),
            },
        });
        expect(getCalculatedStrength(G, theoden)).toBe(8);

        G.players['0']!.currentSiteIndex = 1;
        G.currentSiteIndex = 1;
        expect(getCalculatedStrength(G, theoden)).toBe(7);
    });

    it('Spies : skip archerie si compagnie au site hôte', () => {
        const spies = createCard({
            id: '1R140',
            instanceId: 'spies',
            kind: 'SHADOW',
            type: 'CONDITION',
            abilities: [
                {
                    id: '1R140:0',
                    phases: [],
                    trigger: { type: 'WHILE', atAttachedSite: true },
                    cost: [],
                    effects: [{ type: 'SKIP_PHASE', phase: 'ARCHERY' }],
                    source: 'SELF',
                },
            ],
        });
        const site = createSite({
            id: 's3',
            instanceId: 's3',
            siteNumber: 3,
            ownerId: '0',
        });
        site.attachments = [spies];
        const G = createGameState({
            currentSiteIndex: 2,
            path: [
                null,
                null,
                site,
                null,
                null,
                null,
                null,
                null,
                null,
            ],
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 2 }),
                '1': createPlayerState('1'),
            },
        });
        expect(shouldSkipPhase(G, 'ARCHERY')).toBe(true);
        G.players['0']!.currentSiteIndex = 0;
        G.currentSiteIndex = 0;
        expect(shouldSkipPhase(G, 'ARCHERY')).toBe(false);
        expect(getKeywordValue(spies, 'FIERCE')).toBe(-1);
    });
});
