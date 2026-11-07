import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { abilityMeetsPlayRestrictions } from '../engine/abilities/abilityRestrictions';
import { findEventAbilityForPhase } from '../engine/abilities/playEventAbility';
import { getCalculatedStrength } from '../logic/stats/statCalculator';
import { resolveSkirmish } from '../logic/skirmish';
import type { Ability, CardState } from '../types';
import {
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
} from './createGameState';

const INTUITION_CSV =
    '<keyword>Stealth.</keyword><br><keyword>Skirmish:</keyword> At sites 1 to 4, cancel a skirmish involving a Hobbit. At any other site, make a Hobbit strength +3.';

const EVERYONE_CSV =
    '<keyword>Tale.</keyword> Each unbound Hobbit is strength +1 for each vitality over 3 he or she has. <br><keyword>Skirmish:</keyword> Prevent an unbound Hobbit from being overwhelmed unless his or her strength is tripled. Discard this condition.';

describe('Hobbit Intuition 1C296', () => {
    it('parse : sites 1–4 annulent ; sinon Hobbit +3', () => {
        const parsed = parseAbilities(
            INTUITION_CSV,
            'Hobbit Intuition',
            '1C296'
        );
        expect(parsed).toEqual([
            expect.objectContaining({
                phases: ['SKIRMISH'],
                requiresAtSiteNumberAtMost: 4,
                effects: [
                    {
                        type: 'CANCEL_SKIRMISH',
                        involving: [['HOBBIT']],
                    },
                ],
            }),
            expect.objectContaining({
                phases: ['SKIRMISH'],
                requiresAtSiteNumberAtLeast: 5,
                effects: [
                    expect.objectContaining({
                        type: 'ADD_TEMP_STAT',
                        stat: 'STRENGTH',
                        value: 3,
                        target: [['HOBBIT']],
                    }),
                ],
            }),
        ]);
        expect(
            getCardById('1C296')?.abilities?.some(
                (ab) => ab.requiresAtSiteNumberAtMost === 4
            )
        ).toBe(true);
    });

    it('findEventAbilityForPhase choisit selon le site', () => {
        const event = {
            ...getCardById('1C296')!,
            instanceId: 'intuition',
        } as CardState;
        const atSite1 = createGameState({
            currentSiteIndex: 0,
            path: Array.from({ length: 9 }, (_, i) => ({
                id: `site-${i}`,
                instanceId: `site-${i}`,
                siteNumber: i + 1,
                kind: 'SITE' as const,
                type: 'SITE' as const,
                culture: 'SHIRE' as const,
                set: 11,
                rarity: 'C',
            })),
        });
        const cancel = findEventAbilityForPhase(event, 'skirmish', atSite1);
        expect(cancel?.requiresAtSiteNumberAtMost).toBe(4);

        const atSite5 = {
            ...atSite1,
            currentSiteIndex: 4,
        };
        Object.values(atSite5.players).forEach((p) => {
            if (p) p.currentSiteIndex = 4;
        });
        const buff = findEventAbilityForPhase(event, 'skirmish', atSite5);
        expect(buff?.requiresAtSiteNumberAtLeast).toBe(5);
        expect(abilityMeetsPlayRestrictions(atSite5, event, buff!)).toBe(true);
        expect(abilityMeetsPlayRestrictions(atSite5, event, cancel!)).toBe(
            false
        );
    });
});

describe('Everyone Knows 9R50', () => {
    it('parse : passif vit over 3 + combat anti-submersion ×3', () => {
        const parsed = parseAbilities(EVERYONE_CSV, 'Everyone Knows', '9R50');
        expect(parsed).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    trigger: { type: 'WHILE' },
                    effects: [
                        expect.objectContaining({
                            type: 'MODIFY_STAT',
                            stat: 'STRENGTH',
                            value: 1,
                            target: [['UNBOUND', 'HOBBIT']],
                            perVitalityOver: 3,
                        }),
                    ],
                }),
                expect.objectContaining({
                    phases: ['SKIRMISH'],
                    effects: [
                        expect.objectContaining({
                            type: 'SET_OVERWHELM_FACTOR',
                            factor: 3,
                            target: [['UNBOUND', 'HOBBIT']],
                        }),
                    ],
                }),
            ])
        );
        expect(
            getCardById('9R50')?.abilities?.some(
                (ab) =>
                    ab.trigger?.type === 'WHILE' &&
                    ab.effects?.[0]?.type === 'MODIFY_STAT' &&
                    ab.effects[0].perVitalityOver === 3
            )
        ).toBe(true);
    });

    it('passif : Merry vit 4 → +1 force ; Frodon ring-bound → 0', () => {
        const everyone = {
            ...getCardById('9R50')!,
            instanceId: 'everyone',
        };
        const merry = createCompanion({
            id: '1C303',
            instanceId: 'merry',
            title: 'Merry',
            race: 'HOBBIT',
            strength: 3,
            vitality: 4,
        });
        const frodo = createCompanion({
            id: '2C102',
            instanceId: 'frodo',
            title: 'Frodo',
            race: 'HOBBIT',
            strength: 3,
            vitality: 4,
            keywords: ['RING-BEARER', 'RING-BOUND'],
        });
        const G = createGameState({
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo, merry],
                    supportArea: [everyone],
                }),
                '1': createPlayerState('1'),
            },
        });
        expect(getCalculatedStrength(G, merry)).toBe(4);
        expect(getCalculatedStrength(G, frodo)).toBe(3);
    });

    it('combat : seuil ×3 empêche la submersion à ×2', () => {
        const everyone = {
            ...getCardById('9R50')!,
            instanceId: 'everyone',
        };
        const ability = everyone.abilities!.find((ab) =>
            ab.phases?.includes('SKIRMISH')
        ) as Ability;
        // vit 3 → pas de +force du passif Everyone Knows.
        const merry = createCompanion({
            id: '1C303',
            instanceId: 'merry',
            title: 'Merry',
            race: 'HOBBIT',
            strength: 3,
            vitality: 3,
        });
        const orc = createMinion({
            id: '1C266',
            instanceId: 'orc',
            strength: 6,
            vitality: 2,
        });
        const G = createGameState({
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [merry],
                    supportArea: [everyone],
                }),
                '1': createPlayerState('1'),
            },
            battlefield: [orc],
            skirmishes: [
                {
                    id: 'sk1',
                    companionId: 'merry',
                    minionIds: ['orc'],
                },
            ],
            activeSkirmishId: 'sk1',
        });

        // Sans effet : 6 >= 2×3 → submergé.
        resolveSkirmish(G);
        expect(merry.isOverwhelmed || merry.isDead).toBe(true);

        // Reset + seuil ×3 : 6 < 3×3 → blessure seule.
        merry.isDead = false;
        merry.isOverwhelmed = false;
        merry.wounds = 0;
        G.skirmishes = [
            { id: 'sk2', companionId: 'merry', minionIds: ['orc'] },
        ];
        G.activeSkirmishId = 'sk2';
        G.pendingWinsSkirmish = undefined;
        G.pendingLosesSkirmish = undefined;

        expect(applyAbilityEffect(G, everyone, ability, 'merry')).toBe(true);
        expect(merry.tempOverwhelmFactor?.factor).toBe(3);
        resolveSkirmish(G);
        expect(merry.isOverwhelmed).not.toBe(true);
        expect(merry.isDead).not.toBe(true);
        expect(
            (merry.wounds || 0) > 0 || Boolean(G.responseWindow?.isOpen)
        ).toBe(true);
    });
});
