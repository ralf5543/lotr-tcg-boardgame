import { describe, expect, it } from 'vitest';
import { getCardById } from '../cardsData';
import { getEffectiveTwilightCost } from '../../utils/roamingDetection';
import { getWhileTwilightCostModifier } from '../logic/stats/mechanics/whileModifier';
import { parseAbilities } from '../../../scripts/convert/parsers';
import {
    createGameState,
    createPlayerState,
    createSite,
} from './createGameState';

describe('Marcheur Suderon (5C74)', () => {
    const walker = getCardById('5C74')!;

    it('parse : Ambush déjà en keywords ; While spot Suderon → coût –2', () => {
        expect(walker.keywords).toEqual(
            expect.arrayContaining(['AMBUSH 2', 'SOUTHRON'])
        );
        const parsed = parseAbilities(
            '**Southron.** **Ambush** <symbol>twilight2</symbol>. While you can spot a Southron, this minion’s twilight cost is -2.',
            'Southron Traveler',
            '5C74'
        );
        expect(parsed?.[0]).toMatchObject({
            trigger: {
                type: 'WHILE',
                spot: [{ count: 1, target: [['SOUTHRON']] }],
            },
            effects: [
                {
                    type: 'MODIFY_STAT',
                    stat: 'TWILIGHT_COST',
                    value: -2,
                    target: 'SELF',
                },
            ],
        });
        expect(walker.abilities?.[0]?.effects).toEqual(parsed![0]!.effects);
    });

    it('avec un Suderon en jeu : coût effectif 2 ; sans : 4', () => {
        const scout = {
            ...getCardById('4C252')!,
            instanceId: 'scout',
            minionSiteNumber: 4,
        };
        // Site d’origine 4 dans les données : on teste hors errance (chemin site 4).
        const inHand = {
            ...walker,
            instanceId: 'walker-hand',
            abilities: walker.abilities,
        };
        const sites = [1, 2, 3, 4].map((n) =>
            createSite({ id: `s${n}`, siteNumber: n })
        );
        const path = [
            ...sites,
            null,
            null,
            null,
            null,
            null,
        ] as ReturnType<typeof createSite>[];

        const withSpot = createGameState({
            twilightPool: 2,
            currentSiteIndex: 3,
            path,
            battlefield: [scout],
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 3 }),
                '1': createPlayerState('1', {
                    hand: [inHand],
                    currentSiteIndex: 3,
                }),
            },
        });
        expect(getWhileTwilightCostModifier(withSpot, inHand)).toBe(-2);
        expect(getEffectiveTwilightCost(inHand, 3, -2)).toBe(2);

        const alone = createGameState({
            twilightPool: 4,
            currentSiteIndex: 3,
            path,
            battlefield: [],
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 3 }),
                '1': createPlayerState('1', {
                    hand: [inHand],
                    currentSiteIndex: 3,
                }),
            },
        });
        expect(getWhileTwilightCostModifier(alone, inHand)).toBe(0);
        expect(getEffectiveTwilightCost(inHand, 3, 0)).toBe(4);
    });
});
