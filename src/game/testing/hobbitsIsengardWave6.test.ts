import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { getEffectDesignationCandidates } from '../engine/abilities/designation';
import { formatAbilityLabelParts } from '../engine/abilities/collectAbilities';
import { resolveWhenFpAssignsTo } from '../engine/abilities/whenAssigned';
import {
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
    createCard,
} from './createGameState';

describe('Hobbits / Isengard vague 6 — parse', () => {
    it('parse Pippin : remplacer en combat si résist. inférieure', () => {
        const abs = parseAbilities(
            '<keyword>Skirmish:</keyword> If Pippin is not assigned to a skirmish, spot an unbound companion who has less resistance than Pippin to have Pippin replace him or her in a skirmish.',
            'Pippin',
            '11R170'
        );
        expect(abs?.[0]).toEqual(
            expect.objectContaining({
                phases: ['SKIRMISH'],
                requiresUnassigned: true,
                effects: [
                    expect.objectContaining({
                        type: 'REPLACE_IN_SKIRMISH',
                        target: [['UNBOUND', 'COMPANION']],
                        lessResistanceThanSource: true,
                    }),
                ],
            })
        );
    });

    it('Pippin : libellé bulle non vide', () => {
        const pip = getCardById('11R170');
        expect(pip?.abilities?.[0]).toBeTruthy();
        const parts = formatAbilityLabelParts(
            pip!.abilities![0]!,
            pip!
        );
        expect(parts.effect).toMatch(/remplacer/i);
        expect(parts.effect.length).toBeGreaterThan(0);
    });

    it('parse Unferth : assign FP à Homme Isengard → affaiblir', () => {
        const abs = parseAbilities(
            'Each time the Free Peoples player assigns a companion or ally to an <symbol>isengard</symbol> Man, that companion or ally must exert.',
            'Unferth',
            '4C178'
        );
        expect(abs?.[0]).toEqual(
            expect.objectContaining({
                trigger: {
                    type: 'WHEN_FP_ASSIGNS_TO',
                    to: [['ISENGARD', 'MAN']],
                },
            })
        );
    });
});

describe('Hobbits / Isengard vague 6 — runtime', () => {
    it('Pippin remplace Merry dans le combat', () => {
        const pipAbs =
            getCardById('11R170')?.abilities ||
            parseAbilities(
                '<keyword>Skirmish:</keyword> If Pippin is not assigned to a skirmish, spot an unbound companion who has less resistance than Pippin to have Pippin replace him or her in a skirmish.',
                'Pippin',
                '11R170'
            );
        const pippin = createCompanion({
            id: '11R170',
            instanceId: 'pippin',
            title: 'Pippin',
            culture: 'SHIRE',
            race: 'HOBBIT',
            resistance: 8,
            abilities: pipAbs as never,
        });
        const merry = createCompanion({
            id: '11C168',
            instanceId: 'merry',
            title: 'Merry',
            culture: 'SHIRE',
            race: 'HOBBIT',
            resistance: 4,
            keywords: ['UNBOUND'],
        });
        const uruk = createMinion({
            id: '4C187',
            instanceId: 'uruk',
            title: 'Uruk',
        });

        const G = createGameState({
            fpPlayerId: '0',
            activeSkirmishId: 'sk-merry',
            skirmishes: [
                {
                    id: 'sk-merry',
                    companionId: 'merry',
                    minionIds: ['uruk'],
                },
            ],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [pippin, merry],
                }),
                '1': createPlayerState('1'),
            },
            battlefield: [uruk],
        });

        const ability = (pipAbs as { id: string }[])[0]!;
        const candidates = getEffectDesignationCandidates(
            G,
            pippin,
            ability as never
        );
        expect(candidates.some((c) => c.instanceId === 'merry')).toBe(true);

        expect(
            applyAbilityEffect(G, pippin, ability as never, 'merry')
        ).toBe(true);
        expect(G.skirmishes[0]!.companionId).toBe('pippin');
    });

    it('Unferth : assignation FP à Homme Isengard affaiblit le compagnon', () => {
        const unAbs =
            getCardById('4C178')?.abilities ||
            parseAbilities(
                'Each time the Free Peoples player assigns a companion or ally to an <symbol>isengard</symbol> Man, that companion or ally must exert.',
                'Unferth',
                '4C178'
            );
        const merry = createCompanion({
            id: '11C168',
            instanceId: 'merry',
            title: 'Merry',
            vitality: 3,
        });
        const unferth = createMinion({
            id: '4C178',
            instanceId: 'unferth',
            title: 'Unferth',
            culture: 'ISENGARD',
            race: 'MAN',
            abilities: unAbs as never,
        });
        const other = createMinion({
            id: '4C187',
            instanceId: 'uruk',
            title: 'Uruk',
            culture: 'ISENGARD',
            race: 'URUK-HAI',
        });

        const G = createGameState({
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', { fellowshipArea: [merry] }),
                '1': createPlayerState('1', {
                    supportArea: [
                        createCard({
                            id: 'dummy',
                            type: 'CONDITION',
                            kind: 'SHADOW',
                        }),
                    ],
                }),
            },
            battlefield: [unferth, other],
        });

        resolveWhenFpAssignsTo(G, merry, unferth);
        expect(merry.wounds || 0).toBe(1);

        const before = merry.wounds || 0;
        resolveWhenFpAssignsTo(G, merry, other);
        expect(merry.wounds || 0).toBe(before);
    });
});
