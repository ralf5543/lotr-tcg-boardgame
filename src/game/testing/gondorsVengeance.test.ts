import { describe, expect, it } from 'vitest';
import { getCardById } from '../cardsData';
import { canPlayCard } from '../engine/canPlayCard';
import {
    abilityNeedsCostDesignation,
    abilityNeedsEffectDesignation,
    getCostDesignationCandidates,
    getEffectDesignationCandidates,
} from '../engine/abilities/designation';
import { createGameState, createPlayerState } from './createGameState';

describe('La Vengeance de Gondor (1C106)', () => {
    const event = getCardById('1C106')!;
    const ability = event.abilities![0]!;

    it('parse : affaiblir rôdeur → défausser séide', () => {
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
                type: 'DISCARD',
                count: 1,
                target: [['MINION']],
            },
        ]);
    });

    it('demande coût puis effet (deux désignations)', () => {
        const frodo = {
            ...getCardById('11S164')!,
            instanceId: 'frodo',
        };
        const ranger = {
            ...getCardById('7C116')!,
            instanceId: 'ranger',
        };
        const minion = {
            ...getCardById('4C252')!,
            instanceId: 'orc',
            minionSiteNumber: 4,
        };
        const pending = { ...event, instanceId: 'vengeance' };
        const G = createGameState({
            battlefield: [minion],
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
        expect(abilityNeedsEffectDesignation(G, pending, ability)).toBe(true);
        expect(
            getCostDesignationCandidates(G, pending, ability).map(
                (c) => c.instanceId
            )
        ).toEqual(['ranger']);
        expect(
            getEffectDesignationCandidates(G, pending, ability).map(
                (c) => c.instanceId
            )
        ).toEqual(['orc']);
    });
});
