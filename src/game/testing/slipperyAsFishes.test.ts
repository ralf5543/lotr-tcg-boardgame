import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import { applyDevPreset } from '../dev/presets';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { getEffectiveStrength } from '../../utils/cardStats';
import type { Ability } from '../types';
import {
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
    createSite,
} from './createGameState';

const CSV_TEXT =
    'While Gollum is at a mountain, river, or underground site, he is strength +2. <br><keyword>Regroup:</keyword> Spot Gollum to reveal your hand. Place all Shadow cards revealed beneath your draw deck. Discard this condition.';

describe('Slippery as Fishes 9R+29', () => {
    it('analyse CSV : While multi-terrains + Regroup main sous pioche', () => {
        const parsed = parseAbilities(
            CSV_TEXT,
            'Slippery as Fishes',
            '9R+29'
        );
        expect(parsed).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    trigger: {
                        type: 'WHILE',
                        atSiteKeywords: [
                            'MOUNTAIN',
                            'RIVER',
                            'UNDERGROUND',
                        ],
                    },
                    effects: [
                        expect.objectContaining({
                            type: 'MODIFY_STAT',
                            stat: 'STRENGTH',
                            value: 2,
                            target: [['Gollum']],
                        }),
                    ],
                }),
                expect.objectContaining({
                    phases: ['REGROUP'],
                    cost: [
                        {
                            spot: [
                                { count: 1, target: [['Gollum']] },
                            ],
                        },
                    ],
                    effects: [
                        { type: 'PUT_HAND_UNDER_DECK', kind: 'SHADOW' },
                        { type: 'DISCARD', count: 1, target: 'SELF' },
                    ],
                }),
            ])
        );
        expect(
            getCardById('9R+29')?.abilities?.some(
                (ab) =>
                    ab.trigger?.type === 'WHILE' &&
                    (ab.trigger.atSiteKeywords || []).includes('MOUNTAIN')
            )
        ).toBe(true);
    });

    it('While : +2 sur montagne si Gollum en jeu', () => {
        const gollum = createMinion({
            id: '7C59',
            instanceId: 'gollum',
            title: 'Gollum',
            i18n: { en: { title: 'Gollum' }, fr: { title: 'Gollum' } },
            strength: 5,
        });
        const condition = {
            ...getCardById('9R+29')!,
            instanceId: 'fish',
        };
        const mountain = createSite({
            id: '11S248',
            instanceId: 's1',
            siteNumber: 1,
            keywords: ['MOUNTAIN'],
        });
        const plains = createSite({
            id: '11S228',
            instanceId: 's2',
            siteNumber: 2,
            keywords: ['PLAINS'],
        });

        const onMountain = createGameState({
            fpPlayerId: '0',
            currentSiteIndex: 0,
            path: [mountain, plains, null, null, null, null, null, null, null],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        createCompanion({ id: '5U111', instanceId: 'frodo' }),
                    ],
                    currentSiteIndex: 0,
                }),
                '1': createPlayerState('1', {
                    supportArea: [condition],
                    currentSiteIndex: 0,
                }),
            },
            battlefield: [gollum],
        });
        expect(getEffectiveStrength(gollum, onMountain)).toBe(7);

        const onPlains = createGameState({
            fpPlayerId: '0',
            currentSiteIndex: 1,
            path: [mountain, plains, null, null, null, null, null, null, null],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        createCompanion({ id: '5U111', instanceId: 'frodo' }),
                    ],
                    currentSiteIndex: 1,
                }),
                '1': createPlayerState('1', {
                    supportArea: [condition],
                    currentSiteIndex: 1,
                }),
            },
            battlefield: [gollum],
        });
        expect(getEffectiveStrength(gollum, onPlains)).toBe(5);
    });

    it('Regroup : Ombre sous pioche + défausse la situation', () => {
        const condition = {
            ...getCardById('9R+29')!,
            instanceId: 'fish',
        };
        const ability = (condition.abilities || []).find((ab) =>
            ab.phases?.includes('REGROUP')
        ) as Ability;
        const gollum = createMinion({
            id: '7C59',
            instanceId: 'gollum',
            title: 'Gollum',
            i18n: { en: { title: 'Gollum' }, fr: { title: 'Gollum' } },
        });
        const shadowCard = createMinion({
            id: '1C261',
            instanceId: 'orc-hand',
            kind: 'SHADOW',
        });
        const G = createGameState({
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', {
                    supportArea: [condition],
                    hand: [shadowCard],
                    deck: [],
                }),
            },
            battlefield: [gollum],
        });

        expect(applyAbilityEffect(G, condition, ability)).toBe(true);
        expect(G.players['1']!.hand).toHaveLength(0);
        expect(G.players['1']!.deck.map((c) => c.instanceId)).toEqual([
            'orc-hand',
        ]);
        expect(
            G.players['1']!.supportArea?.some((c) => c.instanceId === 'fish')
        ).toBe(false);
        expect(
            G.players['1']!.discard?.some((c) => c.instanceId === 'fish')
        ).toBe(true);
    });

    it('preset DEV', () => {
        const G = createGameState();
        applyDevPreset(G, 'DECK_GAPS_SLIPPERY_FISHES');
        expect(G.players['1']!.supportArea?.[0]?.id).toBe('9R+29');
        expect(G.battlefield[0]?.id).toBe('7C59');
    });
});
