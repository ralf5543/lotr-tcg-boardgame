import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import {
    abilityHasLegalEffectTarget,
    abilityNeedsCostDesignation,
    getEffectDesignationCount,
    getHandEventDesignationTargetIds,
} from '../engine/abilities/designation';
import {
    getToilAmount,
    getToilCandidates,
    getTwilightCostWithToil,
} from '../logic/toil';
import type { Ability } from '../types';
import {
    createCompanion,
    createGameState,
    createPlayerState,
} from './createGameState';

const CSV_TEXT =
    '<keyword>Spell.</keyword> <keyword>Toil 2.</keyword> (For each <symbol>gandalf</symbol> character you exert when playing this, its twilight cost is –2.) Spot a <symbol>gandalf</symbol> Wizard to discard 2 conditions from play.';

describe('New-awakened 11U38', () => {
    it('analyse CSV : Spot Magicien Gandalf → défausser 2 situations', () => {
        const parsed = parseAbilities(CSV_TEXT, 'New-awakened', '11U38');
        expect(parsed).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    cost: [
                        {
                            spot: [
                                {
                                    count: 1,
                                    target: [['GANDALF', 'WIZARD']],
                                },
                            ],
                        },
                    ],
                    effects: [
                        {
                            type: 'DISCARD',
                            count: 2,
                            target: [['CONDITION']],
                        },
                    ],
                }),
            ])
        );
        expect(parsed?.[0]?.cost?.[0]?.spot?.[0]?.mode).toBeUndefined();
        expect(
            getCardById('11U38')?.abilities?.some(
                (ab) =>
                    ab.effects?.[0]?.type === 'DISCARD' &&
                    (ab.effects[0] as { count?: number }).count === 2
            )
        ).toBe(true);
    });

    it('3 situations : défausse 2 au choix', () => {
        const event = {
            ...getCardById('11U38')!,
            instanceId: 'awakened',
        };
        const ability = (event.abilities || [])[0] as Ability;
        const gandalf = createCompanion({
            id: '8R15',
            instanceId: 'gandalf',
            title: 'Gandalf',
            culture: 'GANDALF',
            race: 'WIZARD',
            i18n: { en: { title: 'Gandalf' }, fr: { title: 'Gandalf' } },
        });
        const condA = {
            ...getCardById('1R120')!,
            instanceId: 'cond-a',
            type: 'CONDITION' as const,
        };
        const condB = {
            ...getCardById('9R+29')!,
            instanceId: 'cond-b',
            type: 'CONDITION' as const,
        };
        const condC = {
            ...getCardById('10C24')!,
            instanceId: 'cond-c',
            type: 'CONDITION' as const,
        };
        const G = createGameState({
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [gandalf],
                    supportArea: [condA],
                    hand: [event],
                }),
                '1': createPlayerState('1', {
                    supportArea: [condB, condC],
                }),
            },
        });

        expect(getEffectDesignationCount(G, event, ability)).toBe(2);
        expect(abilityNeedsCostDesignation(G, event, ability)).toBe(false);
        expect(abilityHasLegalEffectTarget(G, event, ability)).toBe(true);
        expect(
            getHandEventDesignationTargetIds(G, event, 'fellowship')
        ).toEqual([]);
        expect(
            applyAbilityEffect(G, event, ability, ['cond-a', 'cond-b'])
        ).toBe(true);
        expect(
            G.players['0']!.supportArea?.some((c) => c.instanceId === 'cond-a')
        ).toBe(false);
        expect(
            G.players['1']!.supportArea?.some((c) => c.instanceId === 'cond-b')
        ).toBe(false);
        expect(
            G.players['1']!.supportArea?.some((c) => c.instanceId === 'cond-c')
        ).toBe(true);
    });

    it('1 situation : jouable, défausse celle-là (autant que possible)', () => {
        const event = {
            ...getCardById('11U38')!,
            instanceId: 'awakened',
        };
        const ability = (event.abilities || [])[0] as Ability;
        const G = createGameState({
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        createCompanion({
                            id: '8R15',
                            instanceId: 'gandalf',
                            culture: 'GANDALF',
                            race: 'WIZARD',
                        }),
                    ],
                    supportArea: [
                        {
                            ...getCardById('1R120')!,
                            instanceId: 'only',
                            type: 'CONDITION',
                        },
                    ],
                    hand: [event],
                }),
                '1': createPlayerState('1'),
            },
        });
        expect(abilityHasLegalEffectTarget(G, event, ability)).toBe(true);
        expect(getEffectDesignationCount(G, event, ability)).toBe(1);
        expect(applyAbilityEffect(G, event, ability, ['only'])).toBe(true);
        expect(
            G.players['0']!.supportArea?.some((c) => c.instanceId === 'only')
        ).toBe(false);
    });

    it('0 situation : jouable, effet vide', () => {
        const event = {
            ...getCardById('11U38')!,
            instanceId: 'awakened',
        };
        const ability = (event.abilities || [])[0] as Ability;
        const G = createGameState({
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        createCompanion({
                            id: '8R15',
                            instanceId: 'gandalf',
                            culture: 'GANDALF',
                            race: 'WIZARD',
                        }),
                    ],
                    hand: [event],
                }),
                '1': createPlayerState('1'),
            },
        });
        expect(abilityHasLegalEffectTarget(G, event, ability)).toBe(true);
        expect(getEffectDesignationCount(G, event, ability)).toBe(0);
        expect(applyAbilityEffect(G, event, ability)).toBe(true);
    });

    it('Éreintement 2 : chaque compagnon Gandalf affaibli réduit de 2', () => {
        const event = {
            ...getCardById('11U38')!,
            instanceId: 'awakened',
        };
        expect(getToilAmount(event)).toBe(2);
        const gandalf = createCompanion({
            id: '8R15',
            instanceId: 'gandalf',
            culture: 'GANDALF',
            race: 'WIZARD',
            vitality: 4,
            wounds: 0,
        });
        const G = createGameState({
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [gandalf],
                    hand: [event],
                }),
                '1': createPlayerState('1'),
            },
        });
        expect(getToilCandidates(G, '0', event).map((c) => c.instanceId)).toEqual([
            'gandalf',
        ]);
        expect(getTwilightCostWithToil(G, event, 0)).toBe(6);
        expect(getTwilightCostWithToil(G, event, 1)).toBe(4);
        expect(getTwilightCostWithToil(G, event, 2)).toBe(2);
    });

});
