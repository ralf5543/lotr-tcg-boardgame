import { describe, expect, it } from 'vitest';
import { getCardById } from '../cardsData';
import { canPlayCard } from '../engine/canPlayCard';
import {
    abilityNeedsEffectDesignation,
    getEffectDesignationCandidates,
} from '../engine/abilities/designation';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { getCalculatedStrength } from '../logic/stats/statCalculator';
import { createGameState, createPlayerState } from './createGameState';

describe('Fine Lame du Royaume du Nord (1C117)', () => {
    const event = getCardById('1C117')!;
    const ability = event.abilities![0]!;

    it('parse : rôdeur force +2 (ou +4 vs séide errant)', () => {
        expect(ability.phases).toEqual(['SKIRMISH']);
        expect(ability.cost).toEqual([]);
        expect(ability.effects).toEqual([
            {
                type: 'ADD_TEMP_STAT',
                stat: 'STRENGTH',
                value: 2,
                target: [['RANGER']],
                expiresAtPhase: 'SKIRMISH',
                valueIfSkirmishing: {
                    value: 4,
                    match: [['ROAMING', 'MINION']],
                },
            },
        ]);
    });

    it('demande une désignation de rôdeur', () => {
        const frodo = {
            ...getCardById('11S164')!,
            instanceId: 'frodo',
        };
        const ranger = {
            ...getCardById('7C116')!,
            instanceId: 'ranger',
        };
        const roaming = {
            ...getCardById('4C252')!,
            instanceId: 'roaming',
            minionSiteNumber: 4,
        };
        const pending = { ...event, instanceId: 'blade' };
        const G = createGameState({
            currentSiteIndex: 0,
            battlefield: [roaming],
            skirmishes: [
                {
                    id: 'sk',
                    companionId: 'ranger',
                    minionIds: ['roaming'],
                },
            ],
            activeSkirmishId: 'sk',
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    fellowshipArea: [frodo, ranger],
                    hand: [pending],
                }),
                '1': createPlayerState('1', { currentSiteIndex: 0 }),
            },
        });

        expect(
            canPlayCard(pending, {
                G,
                ctx: { phase: 'skirmish' },
                playerID: '0',
            }).valid
        ).toBe(true);
        expect(abilityNeedsEffectDesignation(G, pending, ability)).toBe(true);
        expect(
            getEffectDesignationCandidates(G, pending, ability).map(
                (c) => c.instanceId
            )
        ).toEqual(['ranger']);
    });

    it('applique +4 si le rôdeur escarmouche un séide errant', () => {
        const frodo = {
            ...getCardById('11S164')!,
            instanceId: 'frodo',
        };
        const ranger = {
            ...getCardById('7C116')!,
            instanceId: 'ranger',
        };
        const roaming = {
            ...getCardById('4C252')!,
            instanceId: 'roaming',
            minionSiteNumber: 4,
        };
        const pending = { ...event, instanceId: 'blade' };
        const G = createGameState({
            currentSiteIndex: 0,
            battlefield: [roaming],
            skirmishes: [
                {
                    id: 'sk',
                    companionId: 'ranger',
                    minionIds: ['roaming'],
                },
            ],
            activeSkirmishId: 'sk',
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    fellowshipArea: [frodo, ranger],
                    hand: [pending],
                }),
                '1': createPlayerState('1', { currentSiteIndex: 0 }),
            },
        });

        const base = getCalculatedStrength(G, ranger);
        expect(applyAbilityEffect(G, pending, ability, 'ranger')).toBe(true);
        expect(getCalculatedStrength(G, ranger)).toBe(base + 4);
    });

    it('applique +2 si le séide n’est pas errant', () => {
        const frodo = {
            ...getCardById('11S164')!,
            instanceId: 'frodo',
        };
        const ranger = {
            ...getCardById('7C116')!,
            instanceId: 'ranger',
        };
        const home = {
            ...getCardById('4C252')!,
            instanceId: 'home',
            minionSiteNumber: 1,
        };
        const pending = { ...event, instanceId: 'blade' };
        const G = createGameState({
            currentSiteIndex: 0,
            battlefield: [home],
            skirmishes: [
                {
                    id: 'sk',
                    companionId: 'ranger',
                    minionIds: ['home'],
                },
            ],
            activeSkirmishId: 'sk',
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    fellowshipArea: [frodo, ranger],
                    hand: [pending],
                }),
                '1': createPlayerState('1', { currentSiteIndex: 0 }),
            },
        });

        const base = getCalculatedStrength(G, ranger);
        expect(applyAbilityEffect(G, pending, ability, 'ranger')).toBe(true);
        expect(getCalculatedStrength(G, ranger)).toBe(base + 2);
    });
});
