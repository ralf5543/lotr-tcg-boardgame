import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getWhileTwilightCostModifier } from '../logic/stats/mechanics/whileModifier';
import { getEffectiveTwilightCost } from '../../utils/roamingDetection';
import { enforceWhileSelfDiscards } from '../engine/abilities/enforceWhileDiscard';
import { placeCultureTokens } from '../logic/cultureTokens';
import { applyHeal } from '../../utils/applyHeal';
import { tryOpenHealResponse } from '../engine/responseWindow';
import {
    createCard,
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
} from './createGameState';
import type { Ability } from '../types';

describe('parseAbilities — cinq gaps hobbits / Nazgûl', () => {
    it('Frodo : coût −1 artéfact / possession / conte Shire joués sur lui', () => {
        const text =
            '<keyword>Ring-bound.</keyword> <keyword>Ring-bearer</keyword> (resistance 10). The cost of each artifact, possession, and <symbol>shire</symbol> tale played on Frodo is -1.';
        expect(parseAbilities(text, 'Frodo', '2C102')).toEqual([
            expect.objectContaining({
                trigger: { type: 'WHILE' },
                effects: [
                    {
                        type: 'MODIFY_STAT',
                        stat: 'TWILIGHT_COST',
                        value: -1,
                        target: [
                            ['ARTIFACT'],
                            ['POSSESSION'],
                            ['SHIRE', 'TALE'],
                        ],
                        playedOn: 'SELF',
                    },
                ],
            }),
        ]);
    });

    it('Scouring : 4 jetons → défausse + réponse empêcher défausse Ombre', () => {
        const text =
            '<keyword>Tale.</keyword> When there are 4 <symbol>shire</symbol> tokens here, discard this condition from play. <keyword>Response:</keyword> If a <symbol>shire</symbol> condition or <symbol>shire</symbol> possession is about to be discarded from play by a Shadow card, add a <symbol>shire</symbol> token here to prevent that.';
        expect(parseAbilities(text, 'Scouring of the Shire', '18R112')).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    trigger: {
                        type: 'WHILE',
                        tokensOnSelf: { culture: 'SHIRE', count: 4 },
                    },
                    effects: [{ type: 'DISCARD', count: 1, target: 'SELF' }],
                }),
                expect.objectContaining({
                    phases: ['RESPONSE'],
                    trigger: {
                        type: 'ABOUT_TO_DISCARD',
                        target: [
                            ['SHIRE', 'CONDITION'],
                            ['SHIRE', 'POSSESSION'],
                        ],
                        byShadowCard: true,
                    },
                    cost: [
                        {
                            placeCultureTokens: {
                                culture: 'SHIRE',
                                count: 1,
                                on: 'SELF',
                            },
                        },
                    ],
                    effects: [{ type: 'PREVENT_DISCARD' }],
                }),
            ])
        );
    });

    it('Tolman : empêcher fardeau Ombre', () => {
        const text =
            '<keyword>Response:</keyword> If a burden is about to be added by a Shadow card, spot another Hobbit and exert Tolman Cotton to prevent that.';
        expect(parseAbilities(text, 'Tolman Cotton', '12S133')).toEqual([
            expect.objectContaining({
                phases: ['RESPONSE'],
                trigger: {
                    type: 'ABOUT_TO_ADD_BURDEN',
                    byShadowCard: true,
                },
                effects: [{ type: 'PREVENT_BURDEN' }],
            }),
        ]);
    });
});

describe('runtime — Frodo / Scouring / Enquëa', () => {
    const frodoCostAbility: Ability = {
        id: '2C102:0',
        phases: [],
        trigger: { type: 'WHILE' },
        cost: [],
        effects: [
            {
                type: 'MODIFY_STAT',
                stat: 'TWILIGHT_COST',
                value: -1,
                target: [['ARTIFACT'], ['POSSESSION'], ['SHIRE', 'TALE']],
                playedOn: 'SELF',
            },
        ],
        source: 'SELF',
    };

    it('Frodo : −1 si joué sur lui, pas sur un autre', () => {
        const frodo = createCompanion({
            id: '2C102',
            title: 'Frodo',
            instanceId: 'dev-frodo',
            culture: 'SHIRE',
            abilities: [frodoCostAbility],
        });
        const sam = createCompanion({
            id: '10P122',
            title: 'Sam',
            instanceId: 'dev-sam',
            culture: 'SHIRE',
        });
        const sting = createCard({
            id: '11R173',
            title: 'Sting',
            type: 'POSSESSION',
            kind: 'FREE_PEOPLE',
            culture: 'SHIRE',
            twilightCost: 1,
            keywords: ['HAND-WEAPON'],
        });

        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo, sam],
                    hand: [sting],
                }),
                '1': createPlayerState('1'),
            },
        });

        expect(getWhileTwilightCostModifier(G, sting, frodo)).toBe(-1);
        expect(getEffectiveTwilightCost(sting, 0, -1)).toBe(0);
        expect(getWhileTwilightCostModifier(G, sting, sam)).toBe(0);
        expect(getWhileTwilightCostModifier(G, sting)).toBe(0);
    });

    it('Scouring : 4 jetons Shire → auto-défausse', () => {
        const scouring = createCard({
            id: '18R112',
            title: 'Scouring of the Shire',
            type: 'CONDITION',
            kind: 'FREE_PEOPLE',
            culture: 'SHIRE',
            instanceId: 'dev-scouring',
            abilities: [
                {
                    id: '18R112:1',
                    phases: [],
                    trigger: {
                        type: 'WHILE',
                        tokensOnSelf: { culture: 'SHIRE', count: 4 },
                    },
                    cost: [],
                    effects: [{ type: 'DISCARD', count: 1, target: 'SELF' }],
                    source: 'SELF',
                },
            ],
        });
        placeCultureTokens(scouring, 'SHIRE', 4);
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    supportArea: [scouring],
                    discard: [],
                }),
                '1': createPlayerState('1'),
            },
        });
        enforceWhileSelfDiscards(G);
        expect(G.players['0']!.supportArea).toHaveLength(0);
        expect(G.players['0']!.discard).toHaveLength(1);
    });

    it('Enquëa : soin compagnon → fenêtre HEAL Ombre', () => {
        const enqueaAbility: Ability = {
            id: '17R140:1',
            phases: ['RESPONSE'],
            optional: true,
            responsePlayer: 'SHADOW',
            trigger: {
                type: 'HEAL',
                target: [['COMPANION']],
                byFreePeoples: true,
            },
            cost: [],
            effects: [{ type: 'ADD_BURDENS', count: 1 }],
            source: 'SELF',
        };
        const enquea = createMinion({
            id: '17R140',
            title: 'Úlairë Enquëa',
            instanceId: 'dev-enquea',
            culture: 'WRAITH',
            abilities: [enqueaAbility],
        });
        const frodo = createCompanion({
            id: '2C102',
            title: 'Frodo',
            instanceId: 'dev-frodo',
            culture: 'SHIRE',
            race: 'HOBBIT',
            wounds: 1,
        });
        const G = createGameState({
            fpPlayerId: '0',
            battlefield: [enquea],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo],
                    burdens: 0,
                }),
                '1': createPlayerState('1'),
            },
        });

        applyHeal(G, frodo, 1, { byFreePeoples: true });
        expect(frodo.wounds).toBe(0);
        tryOpenHealResponse(G);
        expect(G.pendingEvent?.type).toBe('HEAL');
        expect(G.responseWindow?.isOpen).toBe(true);
    });
});
