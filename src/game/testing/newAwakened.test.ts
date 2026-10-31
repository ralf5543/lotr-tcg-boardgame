import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import { applyDevPreset } from '../dev/presets';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import {
    abilityHasLegalEffectTarget,
    getEffectDesignationCount,
} from '../engine/abilities/designation';
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
                                expect.objectContaining({
                                    count: 1,
                                    target: [['GANDALF', 'WIZARD']],
                                }),
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
        expect(
            getCardById('11U38')?.abilities?.some(
                (ab) =>
                    ab.effects?.[0]?.type === 'DISCARD' &&
                    (ab.effects[0] as { count?: number }).count === 2
            )
        ).toBe(true);
    });

    it('applique : défausse exactement 2 situations désignées', () => {
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
        expect(abilityHasLegalEffectTarget(G, event, ability)).toBe(true);
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
        expect(
            G.players['0']!.discard?.some((c) => c.instanceId === 'cond-a') ||
                G.players['1']!.discard?.some((c) => c.instanceId === 'cond-a')
        ).toBe(true);
    });

    it('refuse s’il y a moins de 2 situations', () => {
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
                }),
                '1': createPlayerState('1'),
            },
        });
        expect(abilityHasLegalEffectTarget(G, event, ability)).toBe(false);
    });

    it('preset DEV', () => {
        const G = createGameState();
        applyDevPreset(G, 'DECK_GAPS_NEW_AWAKENED');
        expect(G.players['0']!.hand?.[0]?.id).toBe('11U38');
        expect(
            G.players['0']!.fellowshipArea?.some((c) => c.id === '8R15')
        ).toBe(true);
    });
});
