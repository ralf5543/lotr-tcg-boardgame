import { describe, expect, it } from 'vitest';
import { getCardById } from '../cardsData';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { canUseAbility } from '../engine/canUseAbility';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import {
    abilityNeedsHandDiscard,
    abilityDiscardFromHandCount,
} from '../engine/abilities/payAbilityCost';
import {
    abilityNeedsEffectDesignation,
    getEffectDesignationCandidates,
} from '../engine/abilities/designation';
import {
    getEffectiveMinionSiteNumber,
    isMinionRoaming,
} from '../../utils/roamingDetection';
import {
    createGameState,
    createPlayerState,
    createSite,
} from './createGameState';

const TEXT =
    '<keyword>Maneuver:</keyword> If you have initiative, discard 2 cards from hand to make the site number of a minion +2 until the regroup phase.';

describe('Marchand gondorien (7R97)', () => {
    it('parse : initiative + défausse 2 → site séide +2 jusqu’au ralliement', () => {
        expect(
            parseAbilities(TEXT, 'Gondorian Merchant', '7R97')?.[0]
        ).toMatchObject({
            phases: ['MANEUVER'],
            requiresInitiative: true,
            cost: [{ discardFromHand: 2 }],
            effects: [
                {
                    type: 'ADD_TEMP_SITE_NUMBER',
                    target: [['MINION']],
                    value: 2,
                    expiresAtPhase: 'REGROUP',
                },
            ],
        });
    });

    it('cartes.json : ability alignée', () => {
        const card = getCardById('7R97')!;
        expect(card.abilities?.[0]).toMatchObject({
            phases: ['MANEUVER'],
            requiresInitiative: true,
            cost: [{ discardFromHand: 2 }],
            effects: [
                {
                    type: 'ADD_TEMP_SITE_NUMBER',
                    target: [['MINION']],
                    value: 2,
                    expiresAtPhase: 'REGROUP',
                },
            ],
        });
    });

    it('avec initiative : activable → désignation séide → site +2 et errant', () => {
        const merchant = {
            ...getCardById('7R97')!,
            instanceId: 'merchant',
        };
        const ability = merchant.abilities![0]!;
        const frodo = {
            ...getCardById('11S164')!,
            instanceId: 'frodo',
        };
        const minion = {
            ...getCardById('5C76')!,
            instanceId: 'southron',
            minionSiteNumber: 4,
        };
        const sites = [1, 2, 3, 4].map((n) =>
            createSite({ id: `s${n}`, siteNumber: n })
        );
        const G = createGameState({
            currentPhase: 'maneuver',
            currentSiteIndex: 3,
            path: [...sites, null, null, null, null, null],
            battlefield: [minion],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo, merchant],
                    hand: [
                        { ...getCardById('1C119')!, instanceId: 'h1' },
                        { ...getCardById('1C106')!, instanceId: 'h2' },
                        { ...getCardById('1C117')!, instanceId: 'h3' },
                        { ...getCardById('1C119')!, instanceId: 'h4' },
                    ],
                    currentSiteIndex: 3,
                }),
                '1': createPlayerState('1', {
                    hand: [],
                    currentSiteIndex: 3,
                }),
            },
        });

        expect(
            canUseAbility(merchant, {
                G,
                ctx: { phase: 'maneuver' },
                playerID: '0',
            }).valid
        ).toBe(true);
        expect(abilityNeedsHandDiscard(ability)).toBe(true);
        expect(abilityDiscardFromHandCount(ability)).toBe(2);
        expect(abilityNeedsEffectDesignation(G, merchant, ability)).toBe(
            true
        );
        expect(
            getEffectDesignationCandidates(G, merchant, ability).map(
                (c) => c.instanceId
            )
        ).toEqual(['southron']);

        expect(isMinionRoaming(minion, 3)).toBe(false);
        expect(
            applyAbilityEffect(G, merchant, ability, 'southron')
        ).toBe(true);
        expect(getEffectiveMinionSiteNumber(minion)).toBe(6);
        expect(isMinionRoaming(minion, 3)).toBe(true);
    });

    it('sans initiative : pas activable', () => {
        const merchant = {
            ...getCardById('7R97')!,
            instanceId: 'merchant',
        };
        const frodo = {
            ...getCardById('11S164')!,
            instanceId: 'frodo',
        };
        const minion = {
            ...getCardById('5C76')!,
            instanceId: 'southron',
            minionSiteNumber: 4,
        };
        const G = createGameState({
            currentPhase: 'maneuver',
            currentSiteIndex: 3,
            battlefield: [minion],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo, merchant],
                    hand: [
                        { ...getCardById('1C119')!, instanceId: 'h1' },
                        { ...getCardById('1C106')!, instanceId: 'h2' },
                    ],
                }),
                '1': createPlayerState('1'),
            },
        });
        expect(
            canUseAbility(merchant, {
                G,
                ctx: { phase: 'maneuver' },
                playerID: '0',
            }).valid
        ).toBe(false);
    });
});
