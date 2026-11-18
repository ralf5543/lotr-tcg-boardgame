import { describe, expect, it } from 'vitest';
import { getCardById } from '../cardsData';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { payAbilityCost } from '../engine/abilities/payAbilityCost';
import { parseAbilities } from '../../../scripts/convert/parsers';
import {
    createGameState,
    createPlayerState,
    createSite,
} from './createGameState';

describe('Meneur Chevronné (10R48)', () => {
    const text =
        'Bearer must be a Southron. Bearer is <keyword>Enduring.</keyword> <br><keyword>Skirmish:</keyword> Remove a threat to play a <symbol>raider</symbol> condition from your discard pile.';

    it('parse : Enduring en grants ; Combat −1 menace → situation Pillard depuis défausse', () => {
        expect(parseAbilities(text, 'Seasoned Leader', '10R48')?.[0]).toMatchObject({
            phases: ['SKIRMISH'],
            cost: [{ removeThreats: 1 }],
            effects: [
                {
                    type: 'PLAY_FROM_DECK_OR_DISCARD',
                    from: 'DISCARD',
                    target: [['RAIDER', 'CONDITION']],
                },
            ],
        });
    });

    it('cartes.json : grants + ability alignés', () => {
        const card = getCardById('10R48')!;
        expect(card.grantsKeywords).toEqual(['ENDURING']);
        expect(card.abilities?.[0]).toMatchObject({
            phases: ['SKIRMISH'],
            cost: [{ removeThreats: 1 }],
            effects: [
                {
                    type: 'PLAY_FROM_DECK_OR_DISCARD',
                    from: 'DISCARD',
                    target: [['RAIDER', 'CONDITION']],
                },
            ],
        });
    });

    it('retire 1 menace puis pose Champ des Vaincus depuis la défausse', () => {
        const leader = {
            ...getCardById('10R48')!,
            instanceId: 'leader',
        };
        const ability = leader.abilities![0]!;
        const southron = {
            ...getCardById('4U249')!,
            instanceId: 'southron',
            minionSiteNumber: 4,
            attachments: [leader],
        };
        const condition = {
            ...getCardById('10U43')!,
            instanceId: 'field-discard',
        };
        const ranger = {
            ...getCardById('7C116')!,
            instanceId: 'ranger',
        };
        const sites = [1, 2, 3, 4].map((n) =>
            createSite({ id: `s${n}`, siteNumber: n })
        );

        const G = createGameState({
            // Champ des Vaincus coûte 1 crépuscule.
            twilightPool: 1,
            currentSiteIndex: 3,
            path: [...sites, null, null, null, null, null],
            battlefield: [southron],
            skirmishes: [
                {
                    id: 'sk',
                    companionId: 'ranger',
                    minionIds: ['southron'],
                },
            ],
            activeSkirmishId: 'sk',
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [ranger],
                    threats: 2,
                    currentSiteIndex: 3,
                }),
                '1': createPlayerState('1', {
                    discard: [condition],
                    currentSiteIndex: 3,
                }),
            },
        });

        expect(payAbilityCost(G, leader, ability.cost)).toBe(true);
        expect(G.players['0']!.threats).toBe(1);
        expect(
            applyAbilityEffect(G, leader, ability, 'field-discard')
        ).toBe(true);
        expect(G.twilightPool).toBe(0);
        expect(G.players['1']!.discard).toHaveLength(0);
        expect(
            G.players['1']!.supportArea?.some(
                (c) => c.instanceId === 'field-discard'
            )
        ).toBe(true);
    });
});
