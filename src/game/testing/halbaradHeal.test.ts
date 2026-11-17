import { describe, expect, it } from 'vitest';
import { getCardById } from '../cardsData';
import { canUseAbility } from '../engine/canUseAbility';
import {
    abilityDiscardFromHandFilters,
    canPayAbilityCost,
} from '../engine/abilities/payAbilityCost';
import { getEffectDesignationCandidates } from '../engine/abilities/designation';
import { createGameState, createPlayerState } from './createGameState';

describe('Halbarad (14R9) — début de manœuvre soin', () => {
    const base = getCardById('14R9')!;
    const healAbility = base.abilities!.find((a) =>
        a.phases?.includes('START_OF_MANEUVER')
    )!;

    it('parse : défausse Gondor en main → soigne compagnon Gondor', () => {
        expect(healAbility).toBeDefined();
        expect(healAbility.optional).toBe(true);
        expect(healAbility.cost).toEqual([
            {
                discardFromHand: 1,
                discardFromHandFilters: [['GONDOR']],
            },
        ]);
        expect(healAbility.effects).toEqual([
            {
                type: 'HEAL',
                count: 1,
                target: [['GONDOR', 'COMPANION']],
            },
        ]);
        expect(abilityDiscardFromHandFilters(healAbility)).toEqual([
            ['GONDOR'],
        ]);
    });

    it('activable en startOfManeuver si Gondor en main + compagnon Gondor blessé', () => {
        const frodo = {
            ...getCardById('11S164')!,
            instanceId: 'frodo',
        };
        const ranger = {
            ...getCardById('7C116')!,
            instanceId: 'ranger',
            wounds: 1,
        };
        const halbarad = {
            ...base,
            instanceId: 'halbarad',
            wounds: 1,
        };
        const gondorHand = {
            ...getCardById('1C106')!,
            instanceId: 'gondor-hand',
        };
        const merryHand = {
            ...getCardById('11C168')!,
            instanceId: 'merry-hand',
        };
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo, ranger, halbarad],
                    hand: [gondorHand, merryHand],
                }),
                '1': createPlayerState('1'),
            },
        });

        expect(
            canUseAbility(halbarad, {
                G,
                ctx: { phase: 'startOfManeuver' },
                playerID: '0',
            }).valid
        ).toBe(true);

        expect(
            canPayAbilityCost(G, halbarad, healAbility.cost || [], '0')
        ).toBe(true);

        const healTargets = getEffectDesignationCandidates(
            G,
            halbarad,
            healAbility
        );
        expect(healTargets.map((c) => c.instanceId).sort()).toEqual([
            'halbarad',
            'ranger',
        ]);
    });

    it('non payable si seule carte en main hors Gondor', () => {
        const frodo = {
            ...getCardById('11S164')!,
            instanceId: 'frodo',
        };
        const ranger = {
            ...getCardById('7C116')!,
            instanceId: 'ranger',
            wounds: 1,
        };
        const halbarad = {
            ...base,
            instanceId: 'halbarad',
            wounds: 1,
        };
        const merryHand = {
            ...getCardById('11C168')!,
            instanceId: 'merry-hand',
        };
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo, ranger, halbarad],
                    hand: [merryHand],
                }),
                '1': createPlayerState('1'),
            },
        });

        expect(
            canPayAbilityCost(G, halbarad, healAbility.cost || [], '0')
        ).toBe(false);
        expect(
            canUseAbility(halbarad, {
                G,
                ctx: { phase: 'startOfManeuver' },
                playerID: '0',
            }).valid
        ).toBe(false);
    });
});
