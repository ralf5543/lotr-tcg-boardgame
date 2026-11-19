import { describe, expect, it } from 'vitest';
import { getCardById } from '../cardsData';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { payAbilityCost } from '../engine/abilities/payAbilityCost';
import { getCalculatedStrength } from '../logic/stats/statCalculator';
import { getKeywordValue } from '../engine/keywords/keywordUtils';
import {
    createCompanion,
    createGameState,
    createPlayerState,
} from './createGameState';

describe('Vague sceaux — fragments génériques', () => {
    it('4U275 Forth Eorlingas : défenseur +1 jusqu’au regroupement', () => {
        const card = getCardById('4U275')!;
        expect(card.abilities?.[0]).toMatchObject({
            phases: ['MANEUVER'],
            effects: [
                {
                    type: 'ADD_TEMP_KEYWORD',
                    keyword: 'DEFENDER +1',
                    target: [['COMPANION', 'SIGNET_THEODEN']],
                    expiresAtPhase: 'REGROUP',
                },
            ],
        });
    });

    it('4U123 Hard Choice : spot Aragorn → soigner ×2 un compagnon SIGNET_ARAGORN', () => {
        expect(
            parseAbilities(
                '<keyword>Fellowship:</keyword> Spot Aragorn to heal a companion who has the Aragorn signet twice.',
                'Hard Choice',
                '4U123'
            )?.[0]
        ).toMatchObject({
            phases: ['FELLOWSHIP'],
            cost: [{ spot: [{ target: [['Aragorn']] }] }],
            effects: [
                {
                    type: 'HEAL',
                    count: 2,
                    target: [['COMPANION', 'SIGNET_ARAGORN']],
                },
            ],
        });
        expect(getCardById('4U123')!.abilities?.[0]?.effects?.[0]).toMatchObject(
            { type: 'HEAL', count: 2 }
        );
    });

    it('3U35 Trust Me : force +1 par compagnon SIGNET_GANDALF (limit +3)', () => {
        expect(getCardById('3U35')!.abilities?.[0]).toMatchObject({
            phases: ['SKIRMISH'],
            effects: [
                {
                    type: 'ADD_TEMP_STAT',
                    stat: 'STRENGTH',
                    value: 1,
                    perSpot: {
                        target: [['COMPANION', 'SIGNET_GANDALF']],
                        limit: 3,
                    },
                },
            ],
        });
    });

    it('1P364 Gandalf : jouer compagnon SIGNET_GANDALF depuis la main (−2)', () => {
        expect(getCardById('1P364')!.abilities?.[0]).toMatchObject({
            phases: ['FELLOWSHIP'],
            effects: [
                {
                    type: 'PLAY_FROM_HAND',
                    target: [['COMPANION', 'SIGNET_GANDALF']],
                    twilightReduce: 2,
                },
            ],
        });
    });

    it('8C114 Straining : retirer 1 crépuscule par SIGNET_FRODO', () => {
        expect(getCardById('8C114')!.abilities?.[0]).toMatchObject({
            effects: [{ type: 'REMOVE_TWILIGHT', countFromSpot: true }],
        });
        const ability = getCardById('8C114')!.abilities![0]!;
        const frodo = createCompanion({
            id: 'frodo-src',
            instanceId: 'frodo-src',
            title: 'Frodo',
            signet: 'FRODO',
        });
        const other = createCompanion({
            id: 'sam',
            instanceId: 'sam',
            title: 'Sam',
            signet: 'FRODO',
        });
        const G = createGameState({
            twilightPool: 5,
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo, other],
                }),
                '1': createPlayerState('1'),
            },
        });
        // Coût : affaiblir Frodo (désignation) — on simule pay+effect avec source event
        const event = {
            ...getCardById('8C114')!,
            instanceId: 'strain',
        };
        expect(payAbilityCost(G, event, ability.cost, 'frodo-src')).toBe(true);
        expect(applyAbilityEffect(G, event, ability)).toBe(true);
        // 2 sceaux Frodo spotés → −2 crépuscule
        expect(G.twilightPool).toBe(3);
    });

    it('8C31 At His Command : +1 force par menace', () => {
        expect(getCardById('8C31')!.abilities?.[0]).toMatchObject({
            effects: [
                {
                    type: 'ADD_TEMP_STAT',
                    perThreats: true,
                    target: [['UNBOUND', 'COMPANION', 'SIGNET_ARAGORN']],
                },
            ],
        });
    });

    it('runtime Forth Eorlingas : DEFENDER +1 sur compagnon au sceau', () => {
        const ability = getCardById('4U275')!.abilities![0]!;
        const theoden = createCompanion({
            id: 'theoden',
            instanceId: 'theoden',
            title: 'Théoden',
            signet: 'THEODEN',
        });
        const eowyn = createCompanion({
            id: 'eowyn',
            instanceId: 'eowyn',
            title: 'Éowyn',
            signet: 'THEODEN',
            keywords: [],
        });
        const event = {
            ...getCardById('4U275')!,
            instanceId: 'forth',
        };
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [theoden, eowyn],
                    hand: [event],
                }),
                '1': createPlayerState('1'),
            },
        });
        expect(payAbilityCost(G, event, ability.cost, 'theoden')).toBe(true);
        expect(applyAbilityEffect(G, event, ability, 'eowyn')).toBe(true);
        expect(getKeywordValue(eowyn, 'DEFENDER', G)).toBe(1);
    });

    it('runtime Trust Me : plafond +3 même avec 5 sceaux', () => {
        const ability = getCardById('3U35')!.abilities![0]!;
        const gandalf = createCompanion({
            id: 'gandalf',
            instanceId: 'gandalf',
            title: 'Gandalf',
            signet: 'GANDALF',
        });
        const target = createCompanion({
            id: 'legolas',
            instanceId: 'legolas',
            title: 'Legolas',
            strength: 6,
            signet: 'GANDALF',
        });
        const extras = [1, 2, 3, 4].map((n) =>
            createCompanion({
                id: `g${n}`,
                instanceId: `g${n}`,
                signet: 'GANDALF',
            })
        );
        const cond = {
            ...getCardById('3U35')!,
            instanceId: 'trust',
        };
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [gandalf, target, ...extras],
                    supportArea: [cond],
                }),
                '1': createPlayerState('1'),
            },
        });
        expect(payAbilityCost(G, cond, ability.cost, 'gandalf')).toBe(true);
        expect(applyAbilityEffect(G, cond, ability, 'legolas')).toBe(true);
        // 5 sceaux ×1 plafonnés à +3
        expect(getCalculatedStrength(G, target)).toBe(9);
    });
});
