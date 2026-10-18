import { describe, expect, it } from 'vitest';
import { parseSiteAbilities } from '../../../scripts/convert/parsers';
import { getEffectiveResistance } from '../../utils/cardStats';
import { getWhileTwilightCostModifier } from '../logic/stats/mechanics/whileModifier';
import { afterCardPlayed } from '../engine/abilities/eachTimeYouPlay';
import {
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
    createSite,
} from './createGameState';

describe('parseSiteAbilities — vague passifs durs', () => {
    it('Breeding pit : first hunter minion each Shadow phase −2', () => {
        const text =
            '**Underground.** The twilight cost of the first hunter minion played each Shadow phase is −2.';
        expect(parseSiteAbilities(text, '15S188')).toEqual([
            expect.objectContaining({
                trigger: { type: 'WHILE' },
                effects: [
                    {
                        type: 'MODIFY_STAT',
                        stat: 'TWILIGHT_COST',
                        value: -2,
                        target: [['HUNTER', 'MINION']],
                        firstHunterMinionEachShadowPhase: true,
                    },
                ],
            }),
        ]);
    });

    it('Hill of Sight : spot 3 minions OR 6 companions → unbound resistance −2', () => {
        // Tiret cadratin comme dans le CSV / sites.json.
        const text =
            '**Battleground. Forest.** While you can spot 3 minions (or 6 companions), each unbound companion is resistance –2.';
        expect(parseSiteAbilities(text, '12S188')).toEqual([
            expect.objectContaining({
                trigger: {
                    type: 'WHILE',
                    spotAny: [
                        { count: 3, target: [['MINION']] },
                        { count: 6, target: [['COMPANION']] },
                    ],
                },
                effects: [
                    {
                        type: 'MODIFY_STAT',
                        stat: 'RESISTANCE',
                        value: -2,
                        target: [['UNBOUND', 'COMPANION']],
                    },
                ],
            }),
        ]);
    });
});

describe('runtime — Breeding pit / Hill of Sight', () => {
    it('Breeding pit : −2 sur le premier hunter, puis 0', () => {
        const site = createSite({
            id: '15S188',
            abilities: parseSiteAbilities(
                'The twilight cost of the first hunter minion played each Shadow phase is -2.',
                '15S188'
            ) as never,
        });
        const hunter = createMinion({
            instanceId: 'hunter-1',
            keywords: ['HUNTER 1'],
            twilightCost: 3,
        });
        const G = createGameState({
            currentSiteIndex: 0,
            path: [site],
            hunterMinionPlayedThisShadowPhase: false,
            players: {
                '0': createPlayerState('0', { currentSiteIndex: 0 }),
                '1': createPlayerState('1'),
            },
        });
        expect(getWhileTwilightCostModifier(G, hunter)).toBe(-2);
        afterCardPlayed(G, hunter, { phase: 'shadow' });
        expect(G.hunterMinionPlayedThisShadowPhase).toBe(true);
        expect(getWhileTwilightCostModifier(G, hunter)).toBe(0);
    });

    it('Hill of Sight : 3 séides → unbound −2 ; Ring-bearer intact', () => {
        const site = createSite({
            id: '12S188',
            abilities: parseSiteAbilities(
                'While you can spot 3 minions (or 6 companions), each unbound companion is resistance -2.',
                '12S188'
            ) as never,
        });
        const frodo = createCompanion({
            instanceId: 'frodo',
            title: 'Frodo',
            keywords: ['RING-BEARER'],
            resistance: 10,
        });
        const gimli = createCompanion({
            instanceId: 'gimli',
            title: 'Gimli',
            resistance: 6,
        });
        const G = createGameState({
            currentSiteIndex: 0,
            path: [site],
            battlefield: [
                createMinion({ instanceId: 'm1' }),
                createMinion({ instanceId: 'm2' }),
                createMinion({ instanceId: 'm3' }),
            ],
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    fellowshipArea: [frodo, gimli],
                    burdens: 0,
                }),
                '1': createPlayerState('1'),
            },
        });
        expect(getEffectiveResistance(gimli, 0, G)).toBe(4);
        expect(getEffectiveResistance(frodo, 0, G)).toBe(10);
    });

    it('Hill of Sight : sans 3 séides ni 6 compagnons → pas de malus', () => {
        const site = createSite({
            id: '12S188',
            abilities: parseSiteAbilities(
                'While you can spot 3 minions (or 6 companions), each unbound companion is resistance -2.',
                '12S188'
            ) as never,
        });
        const gimli = createCompanion({
            instanceId: 'gimli',
            resistance: 6,
        });
        const G = createGameState({
            currentSiteIndex: 0,
            path: [site],
            battlefield: [createMinion({ instanceId: 'm1' })],
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 0,
                    fellowshipArea: [gimli],
                }),
                '1': createPlayerState('1'),
            },
        });
        expect(getEffectiveResistance(gimli, 0, G)).toBe(6);
    });
});
