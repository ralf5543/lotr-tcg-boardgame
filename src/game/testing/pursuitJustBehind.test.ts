import { describe, expect, it } from 'vitest';
import { getCardById } from '../cardsData';
import { canPlayCard } from '../engine/canPlayCard';
import {
    abilityNeedsCostDesignation,
    abilityNeedsEffectDesignation,
    getCostDesignationCandidates,
    getEffectDesignationCandidates,
    getEffectDesignationCount,
} from '../engine/abilities/designation';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { applyEventAbility } from '../engine/abilities/playEventAbility';
import { createGameState, createPlayerState } from './createGameState';

describe('À leurs Trousses (1R111)', () => {
    const event = getCardById('1R111')!;
    const ability = event.abilities![0]!;

    it('parse : affaiblir rôdeur → blesser tous les séides', () => {
        expect(ability.phases).toEqual(['REGROUP']);
        expect(ability.cost).toEqual([
            {
                exert: [
                    {
                        count: 1,
                        target: [['RANGER', 'COMPANION']],
                        mode: 'DESIGNATION',
                    },
                ],
            },
        ]);
        expect(ability.effects).toEqual([
            {
                type: 'WOUND',
                count: 1,
                all: true,
                target: [['MINION']],
            },
        ]);
    });

    it('demande seulement le coût (pas de désignation d’effet)', () => {
        const frodo = {
            ...getCardById('11S164')!,
            instanceId: 'frodo',
        };
        const ranger = {
            ...getCardById('7C116')!,
            instanceId: 'ranger',
        };
        const minionA = {
            ...getCardById('4C252')!,
            instanceId: 'orc-a',
            minionSiteNumber: 4,
        };
        const minionB = {
            ...getCardById('5C74')!,
            instanceId: 'orc-b',
            minionSiteNumber: 4,
        };
        const pending = { ...event, instanceId: 'pursuit' };
        const G = createGameState({
            battlefield: [minionA, minionB],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo, ranger],
                    hand: [pending],
                }),
                '1': createPlayerState('1'),
            },
        });

        expect(
            canPlayCard(pending, {
                G,
                ctx: { phase: 'regroup' },
                playerID: '0',
            }).valid
        ).toBe(true);

        expect(abilityNeedsCostDesignation(G, pending, ability)).toBe(true);
        expect(abilityNeedsEffectDesignation(G, pending, ability)).toBe(false);
        expect(getEffectDesignationCount(G, pending, ability)).toBe(0);
        expect(
            getCostDesignationCandidates(G, pending, ability).map(
                (c) => c.instanceId
            )
        ).toEqual(['ranger']);
        expect(getEffectDesignationCandidates(G, pending, ability)).toEqual([]);
    });

    it('applique avec seulement l’id de coût (pas d’id d’effet)', () => {
        const frodo = {
            ...getCardById('11S164')!,
            instanceId: 'frodo',
        };
        const ranger = {
            ...getCardById('7C116')!,
            instanceId: 'ranger',
            wounds: 0,
        };
        const minionA = {
            ...getCardById('4C252')!,
            instanceId: 'orc-a',
            minionSiteNumber: 4,
            wounds: 0,
        };
        const minionB = {
            ...getCardById('5C74')!,
            instanceId: 'orc-b',
            minionSiteNumber: 4,
            wounds: 0,
        };
        const pending = { ...event, instanceId: 'pursuit' };
        const G = createGameState({
            currentPhase: 'regroup',
            battlefield: [minionA, minionB],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo, ranger],
                    hand: [pending],
                }),
                '1': createPlayerState('1'),
            },
        });

        expect(applyEventAbility(G, pending, 'regroup', 'ranger')).toBe(true);
        expect(ranger.wounds).toBe(1);
        expect(minionA.wounds).toBe(1);
        expect(minionB.wounds).toBe(1);
    });

    it('blesse tous les séides sans désignation', () => {
        const frodo = {
            ...getCardById('11S164')!,
            instanceId: 'frodo',
        };
        const minionA = {
            ...getCardById('4C252')!,
            instanceId: 'orc-a',
            minionSiteNumber: 4,
            wounds: 0,
        };
        const minionB = {
            ...getCardById('5C74')!,
            instanceId: 'orc-b',
            minionSiteNumber: 4,
            wounds: 0,
        };
        const pending = { ...event, instanceId: 'pursuit' };
        const G = createGameState({
            battlefield: [minionA, minionB],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo],
                    hand: [pending],
                }),
                '1': createPlayerState('1'),
            },
        });

        expect(applyAbilityEffect(G, pending, ability, [])).toBe(true);
        expect(minionA.wounds).toBe(1);
        expect(minionB.wounds).toBe(1);
    });
});
