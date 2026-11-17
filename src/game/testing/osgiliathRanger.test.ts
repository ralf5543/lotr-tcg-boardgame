import { describe, expect, it } from 'vitest';
import { getCardById } from '../cardsData';
import {
    abilityNeedsEffectDesignation,
    getEffectDesignationCandidates,
} from '../engine/abilities/designation';
import {
    abilityDiscardFromHandCount,
    abilityNeedsHandDiscard,
} from '../engine/abilities/payAbilityCost';
import { canUseAbility } from '../engine/canUseAbility';
import { createGameState, createPlayerState } from './createGameState';

describe('Rôdeur d’Osgiliath (7C116)', () => {
    const ranger = getCardById('7C116')!;
    const ability = ranger.abilities![0]!;

    it('parse : défausser 2 → épuiser un séide', () => {
        expect(ability.phases).toEqual(['REGROUP']);
        expect(ability.cost).toEqual([{ discardFromHand: 2 }]);
        expect(ability.effects).toEqual([
            {
                type: 'EXHAUST',
                target: [['MINION']],
            },
        ]);
    });

    it('demande défausse main puis désignation d’effet', () => {
        const frodo = {
            ...getCardById('11S164')!,
            instanceId: 'frodo',
        };
        const source = { ...ranger, instanceId: 'osgiliath' };
        // Vitalité ≥ 2 : l’épuisement refuse les séides à 1 PV restant.
        const minion = {
            ...getCardById('4U249')!,
            instanceId: 'commander',
            minionSiteNumber: 4,
        };
        const G = createGameState({
            currentPhase: 'regroup',
            battlefield: [minion],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo, source],
                    hand: [
                        { ...getCardById('1C119')!, instanceId: 'h1' },
                        { ...getCardById('1C106')!, instanceId: 'h2' },
                    ],
                }),
                '1': createPlayerState('1'),
            },
        });

        expect(
            canUseAbility(source, {
                G,
                ctx: { phase: 'regroup' },
                playerID: '0',
            }).valid
        ).toBe(true);
        expect(abilityNeedsHandDiscard(ability)).toBe(true);
        expect(abilityDiscardFromHandCount(ability)).toBe(2);
        expect(abilityNeedsEffectDesignation(G, source, ability)).toBe(true);
        expect(
            getEffectDesignationCandidates(G, source, ability).map(
                (c) => c.instanceId
            )
        ).toEqual(['commander']);
    });
});
