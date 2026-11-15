import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import {
    abilityIsCostlessOptionalResponse,
    collectVisibleAbilities,
    formatAbilityLabelParts,
} from '../engine/abilities/collectAbilities';
import { abilityHasLegalEffectTarget } from '../engine/abilities/designation';
import { canUseAbility } from '../engine/canUseAbility';
import { findOptionalToasterResponseAbility } from '../engine/responseWindow';
import {
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
} from './createGameState';

const SARUMAN_TEXT =
    '<keyword>Lurker.</keyword> <i>(Skirmishes involving lurker minions must be resolved after any others.)</i> <br><keyword>Skirmish:</keyword> Exert Saruman to make an <symbol>urukhai</symbol>\u00a0minion strength +2. <br>Each time a companion is killed, you may heal Saruman.';

describe('Hobbits / Isengard vague 7 — parse', () => {
    it('parse Saruman Lurker : skirmish + soin à la mort', () => {
        const abs = parseAbilities(SARUMAN_TEXT, 'Saruman', '12S144');
        expect(abs).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    phases: ['SKIRMISH'],
                    cost: [
                        expect.objectContaining({
                            exert: [
                                expect.objectContaining({
                                    target: 'SELF',
                                }),
                            ],
                        }),
                    ],
                    effects: [
                        expect.objectContaining({
                            type: 'ADD_TEMP_STAT',
                            value: 2,
                            target: [['URUK-HAI', 'MINION']],
                        }),
                    ],
                }),
                expect.objectContaining({
                    optional: true,
                    trigger: {
                        type: 'CHARACTER_DIES',
                        target: [['COMPANION']],
                    },
                    effects: [
                        expect.objectContaining({
                            type: 'HEAL',
                            target: 'SELF',
                        }),
                    ],
                }),
            ])
        );
    });

});

describe('Hobbits / Isengard vague 7 — runtime', () => {
    it('Saruman : skirmish donne +2 à un Ourouk', () => {
        const abs =
            getCardById('12S144')?.abilities ||
            parseAbilities(SARUMAN_TEXT, 'Saruman', '12S144');
        const skirmish = (abs as { phases?: string[] }[]).find((a) =>
            a.phases?.includes('SKIRMISH')
        );
        expect(skirmish).toBeTruthy();

        const saruman = createMinion({
            id: '12S144',
            instanceId: 'saruman',
            title: 'Saruman',
            culture: 'URUK-HAI',
            race: 'WIZARD',
            vitality: 4,
            abilities: abs as never,
            keywords: ['LURKER'],
        });
        const uruk = createMinion({
            id: '4C187',
            instanceId: 'uruk',
            title: 'Uruk',
            culture: 'ISENGARD',
            race: 'URUK-HAI',
            strength: 5,
        });
        const G = createGameState({
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        createCompanion({
                            id: 'frodo',
                            instanceId: 'frodo',
                        }),
                    ],
                }),
                '1': createPlayerState('1'),
            },
            battlefield: [saruman, uruk],
            activeSkirmishId: 'sk',
            skirmishes: [
                {
                    id: 'sk',
                    companionId: 'frodo',
                    minionIds: ['uruk'],
                },
            ],
        });

        expect(
            applyAbilityEffect(G, saruman, skirmish as never, 'uruk')
        ).toBe(true);
        expect(
            (G.tempModifiers || []).some(
                (m) =>
                    m.stat === 'STRENGTH' &&
                    m.value === 2 &&
                    m.targetCardId === 'uruk'
            )
        ).toBe(true);
    });

    it('Saruman : capacité skirmish utilisable (Ombre, fenêtre ouverte)', () => {
        const card = getCardById('12S144');
        expect(card?.abilities?.some((a) => a.phases?.includes('SKIRMISH'))).toBe(
            true
        );
        const saruman = {
            ...card!,
            instanceId: 'saruman',
            wounds: 1,
        };
        const uruk = {
            ...getCardById('4C187')!,
            instanceId: 'uruk',
        };
        const G = createGameState({
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        createCompanion({
                            id: 'merry',
                            instanceId: 'merry',
                        }),
                    ],
                }),
                '1': createPlayerState('1'),
            },
            battlefield: [saruman, uruk],
            activeSkirmishId: 'sk',
            skirmishes: [
                {
                    id: 'sk',
                    companionId: 'merry',
                    minionIds: ['uruk'],
                },
            ],
            actionWindow: {
                isOpen: true,
                activePlayerId: '1',
                canPass: true,
                passesCount: 0,
            },
        });
        expect(
            canUseAbility(saruman, {
                G,
                ctx: { phase: 'skirmish' },
                playerID: '1',
            }).valid
        ).toBe(true);
        expect(
            abilityHasLegalEffectTarget(G, saruman, card!.abilities![0], '1')
        ).toBe(true);
    });

    it('libellé Saruman skirmish non vide', () => {
        const card = getCardById('12S144');
        const sk = card?.abilities?.find((a) =>
            a.phases?.includes('SKIRMISH')
        );
        expect(sk).toBeTruthy();
        const parts = formatAbilityLabelParts(sk!, card!);
        expect(parts.effect.length).toBeGreaterThan(0);
    });

    it('Saruman soin à la mort : bulle + toaster générique (pas Activer site)', () => {
        const card = getCardById('12S144');
        const heal = card?.abilities?.find(
            (a) => a.trigger?.type === 'CHARACTER_DIES'
        );
        expect(heal).toBeTruthy();
        expect(abilityIsCostlessOptionalResponse(heal!)).toBe(true);
        expect(
            collectVisibleAbilities(undefined, card!).some(
                (row) => row.ability.id === heal!.id
            )
        ).toBe(true);
        const parts = formatAbilityLabelParts(heal!, card!);
        expect(parts.effect.toLowerCase()).toContain('saruman');

        const saruman = {
            ...card!,
            instanceId: 'saruman',
            wounds: 1,
        };
        const G = createGameState({
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        createCompanion({
                            id: 'merry',
                            instanceId: 'merry',
                            isDead: true,
                        }),
                    ],
                }),
                '1': createPlayerState('1'),
            },
            battlefield: [saruman],
            pendingEvent: {
                type: 'CHARACTER_DIES',
                deadCardId: 'merry',
            },
            responseWindow: {
                isOpen: true,
                activePlayerId: '1',
                canPass: true,
                passesCount: 0,
            },
        });
        expect(findOptionalToasterResponseAbility(G, '1')).toBeNull();
        expect(
            collectVisibleAbilities(G, saruman).some(
                (row) => row.ability.id === heal!.id
            )
        ).toBe(true);
    });
});
