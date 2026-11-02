import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import {
    abilityHasLegalEffectTarget,
    getEffectDesignationCandidates,
    getHandEventDesignationTargetIds,
} from '../engine/abilities/designation';
import type { Ability } from '../types';
import {
    createCompanion,
    createGameState,
    createPlayerState,
} from './createGameState';

const CSV_TEXT =
    '<keyword>Fellowship or Maneuver:</keyword> Spot Gandalf to discard a Shadow possession or Shadow artifact.';

describe('Roll of Thunder 4U99', () => {
    it('analyse : Spot Gandalf → défausser possession/artefact Ombre (2 phases)', () => {
        const parsed = parseAbilities(CSV_TEXT, 'Roll of Thunder', '4U99');
        expect(parsed).toEqual([
            {
                id: '4U99:0',
                phases: ['FELLOWSHIP', 'MANEUVER'],
                cost: [{ spot: [{ count: 1, target: [['Gandalf']] }] }],
                effects: [
                    {
                        type: 'DISCARD',
                        count: 1,
                        target: [
                            ['SHADOW', 'POSSESSION'],
                            ['SHADOW', 'ARTIFACT'],
                        ],
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(
                    /Spot Gandalf to discard a Shadow possession/i
                ),
            },
        ]);
        const card = getCardById('4U99');
        expect(card?.abilities?.[0]?.effects?.[0]).toEqual(
            expect.objectContaining({
                type: 'DISCARD',
                count: 1,
                target: [
                    ['SHADOW', 'POSSESSION'],
                    ['SHADOW', 'ARTIFACT'],
                ],
            })
        );
        expect(card?.abilities?.[0]?.phases).toEqual([
            'FELLOWSHIP',
            'MANEUVER',
        ]);
    });

    it('défausse une possession Ombre ; ignore possession FP et situation Ombre', () => {
        const event = {
            ...getCardById('4U99')!,
            instanceId: 'rot',
        };
        const ability = (event.abilities || [])[0] as Ability;
        const sword = {
            ...getCardById('2R43')!,
            instanceId: 'sword',
            type: 'POSSESSION' as const,
            kind: 'SHADOW' as const,
        };
        const lurtz = {
            ...getCardById('11R194')!,
            instanceId: 'lurtz',
            type: 'MINION' as const,
            kind: 'SHADOW' as const,
            attachments: [sword],
        };
        const fpPipe = {
            ...getCardById('1U91')!,
            instanceId: 'pipe',
            type: 'POSSESSION' as const,
            kind: 'FREE_PEOPLE' as const,
        };
        const shCond = {
            ...getCardById('10C24')!,
            instanceId: 'cond',
            type: 'CONDITION' as const,
            kind: 'SHADOW' as const,
        };
        const G = createGameState({
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        createCompanion({
                            id: '8R15',
                            instanceId: 'gandalf',
                            title: 'Gandalf',
                            culture: 'GANDALF',
                            race: 'WIZARD',
                            i18n: {
                                en: { title: 'Gandalf' },
                                fr: { title: 'Gandalf' },
                            },
                        }),
                    ],
                    supportArea: [fpPipe],
                    hand: [event],
                }),
                '1': createPlayerState('1', {
                    supportArea: [shCond],
                }),
            },
            battlefield: [lurtz],
        });

        expect(abilityHasLegalEffectTarget(G, event, ability)).toBe(true);
        // Défausse = halo après drop (pas de flèche pendant le drag).
        expect(
            getHandEventDesignationTargetIds(G, event, 'fellowship')
        ).toEqual([]);
        expect(applyAbilityEffect(G, event, ability, ['sword'])).toBe(true);
        expect(G.battlefield[0]?.attachments?.length ?? 0).toBe(0);
        expect(
            G.players['1']!.supportArea?.some((c) => c.instanceId === 'cond')
        ).toBe(true);
        expect(
            G.players['0']!.supportArea?.some((c) => c.instanceId === 'pipe')
        ).toBe(true);
    });

    it('sans cible Ombre légale : pas jouable pour l’effet', () => {
        const event = {
            ...getCardById('4U99')!,
            instanceId: 'rot',
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
                            title: 'Gandalf',
                            culture: 'GANDALF',
                            race: 'WIZARD',
                        }),
                    ],
                    supportArea: [
                        {
                            ...getCardById('1U91')!,
                            instanceId: 'pipe',
                            type: 'POSSESSION',
                            kind: 'FREE_PEOPLE',
                        },
                    ],
                    hand: [event],
                }),
                '1': createPlayerState('1', {
                    supportArea: [
                        {
                            ...getCardById('10C24')!,
                            instanceId: 'cond',
                            type: 'CONDITION',
                            kind: 'SHADOW',
                        },
                    ],
                }),
            },
        });
        expect(abilityHasLegalEffectTarget(G, event, ability)).toBe(false);
    });

    it('cibles : épée + Palantír ciblables, situation non', () => {
        const event = {
            ...getCardById('4U99')!,
            instanceId: 'rot',
        };
        const ability = (event.abilities || [])[0] as Ability;
        const sword = {
            ...getCardById('2R43')!,
            instanceId: 'sword',
            type: 'POSSESSION' as const,
            kind: 'SHADOW' as const,
        };
        const lurtz = {
            ...getCardById('11R194')!,
            instanceId: 'lurtz',
            type: 'MINION' as const,
            kind: 'SHADOW' as const,
            attachments: [sword],
        };
        const palantir = {
            ...getCardById('3R67')!,
            instanceId: 'palantir',
            type: 'ARTIFACT' as const,
            kind: 'SHADOW' as const,
        };
        const unabated = {
            ...getCardById('10C24')!,
            instanceId: 'cond',
            type: 'CONDITION' as const,
            kind: 'SHADOW' as const,
        };
        const G = createGameState({
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        createCompanion({
                            id: '8R15',
                            instanceId: 'gandalf',
                            title: 'Gandalf',
                        }),
                    ],
                    hand: [event],
                }),
                '1': createPlayerState('1', {
                    supportArea: [palantir, unabated],
                }),
            },
            battlefield: [lurtz],
        });
        expect(abilityHasLegalEffectTarget(G, event, ability)).toBe(true);
        const ids = getEffectDesignationCandidates(G, event, ability).map(
            (c) => c.id
        );
        expect(ids).toEqual(expect.arrayContaining(['2R43', '3R67']));
        expect(ids).not.toContain('10C24');
    });
});
