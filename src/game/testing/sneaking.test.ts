import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { abilityHasLegalEffectTarget } from '../engine/abilities/designation';
import { resolveForcedChoice } from '../engine/abilities/startOfSkirmish';
import { getEffectiveVitality } from '../../utils/cardStats';
import type { Ability } from '../types';
import {
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
} from './createGameState';

const CSV_TEXT =
    '**Stealth.** Heal Sméagol (or cancel Sméagol’s skirmish if he has more vitality than the minion or minions he is skirmishing).';

describe('Sneaking! 7R73', () => {
    it('analyse CSV : CHOOSE_ONE soin / annulation avec condition vitalité', () => {
        const parsed = parseAbilities(CSV_TEXT, 'Sneaking!', '7R73');
        expect(parsed).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    effects: [
                        expect.objectContaining({
                            type: 'CHOOSE_ONE',
                            options: expect.arrayContaining([
                                expect.objectContaining({
                                    label: 'Soigner Sméagol',
                                    effects: [
                                        {
                                            type: 'HEAL',
                                            count: 1,
                                            target: [['Sméagol']],
                                        },
                                    ],
                                }),
                                expect.objectContaining({
                                    label: 'Annuler l’escarmouche de Sméagol',
                                    requiresMoreVitalityThanSkirmishingMinions:
                                        true,
                                    effects: [
                                        {
                                            type: 'CANCEL_SKIRMISH',
                                            involving: [['Sméagol']],
                                        },
                                    ],
                                }),
                            ]),
                        }),
                    ],
                }),
            ])
        );
        expect(
            getCardById('7R73')?.abilities?.some((ab) =>
                (ab.effects || []).some((e) => e.type === 'CHOOSE_ONE')
            )
        ).toBe(true);
        expect(getCardById('7R73')?.phases).toEqual(['SKIRMISH']);
    });

    it('deux options légales → toaster ; annuler retire l’escarmouche', () => {
        const sneaking = {
            ...getCardById('7R73')!,
            instanceId: 'sneak',
        };
        const ability = sneaking.abilities![0] as Ability;
        const smeagol = createCompanion({
            id: '8R27',
            instanceId: 'smeagol',
            title: 'Sméagol',
            i18n: { en: { title: 'Sméagol' }, fr: { title: 'Sméagol' } },
            vitality: 4,
            wounds: 1,
        });
        const orc = createMinion({
            id: '1C261',
            instanceId: 'orc',
            vitality: 2,
        });
        const G = createGameState({
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [smeagol],
                    // Événement déjà « joué » → défausse (source du choix).
                    discard: [sneaking],
                }),
                '1': createPlayerState('1'),
            },
            battlefield: [orc],
            skirmishes: [
                {
                    id: 'sk1',
                    companionId: 'smeagol',
                    minionIds: ['orc'],
                },
            ],
            activeSkirmishId: 'sk1',
        });

        expect(getEffectiveVitality(smeagol)).toBe(3);
        expect(getEffectiveVitality(orc)).toBe(2);
        expect(abilityHasLegalEffectTarget(G, sneaking, ability)).toBe(true);
        expect(applyAbilityEffect(G, sneaking, ability)).toBe(true);
        expect(G.pendingForcedChoice?.options).toHaveLength(2);

        expect(resolveForcedChoice(G, '0', 1)).toBe(true);
        expect(G.skirmishes).toHaveLength(0);
        expect(smeagol.wounds).toBe(1);
    });

    it('sans avantage de vitalité : soin auto (pas d’annulation)', () => {
        const sneaking = {
            ...getCardById('7R73')!,
            instanceId: 'sneak',
        };
        const ability = sneaking.abilities![0] as Ability;
        const smeagol = createCompanion({
            id: '8R27',
            instanceId: 'smeagol',
            title: 'Sméagol',
            i18n: { en: { title: 'Sméagol' }, fr: { title: 'Sméagol' } },
            vitality: 4,
            wounds: 2,
        });
        const orc = createMinion({
            id: '1C261',
            instanceId: 'orc',
            vitality: 2,
        });
        const G = createGameState({
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [smeagol],
                }),
                '1': createPlayerState('1'),
            },
            battlefield: [orc],
            skirmishes: [
                {
                    id: 'sk1',
                    companionId: 'smeagol',
                    minionIds: ['orc'],
                },
            ],
            activeSkirmishId: 'sk1',
        });

        // vit 2 == vit 2 → pas d’annulation ; seul soin.
        expect(getEffectiveVitality(smeagol)).toBe(2);
        expect(applyAbilityEffect(G, sneaking, ability)).toBe(true);
        expect(G.pendingForcedChoice).toBeUndefined();
        expect(smeagol.wounds).toBe(1);
        expect(G.skirmishes).toHaveLength(1);
    });

});
