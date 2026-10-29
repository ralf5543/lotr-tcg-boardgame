import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import { getCalculatedStrength } from '../logic/stats/statCalculator';
import type { CardState } from '../types';
import {
    createCompanion,
    createGameState,
    createPlayerState,
} from './createGameState';

const CSV_TEXT =
    '<keyword>Damage +1.</keyword>.  <br>A character skirmishing this minion does not gain strength bonuses from weapons.';

describe('Troop of Uruk-hai 1R143 — pas de bonus d’armes', () => {
    it('analyse CSV : SUPPRESS_WEAPON_STRENGTH sur adversaires', () => {
        const fromCsv =
            parseAbilities(CSV_TEXT, 'Troop of Uruk-hai', '1R143') || [];
        expect(fromCsv).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    trigger: { type: 'WHILE' },
                    effects: [
                        {
                            type: 'SUPPRESS_WEAPON_STRENGTH',
                            target: 'SKIRMISHING',
                        },
                    ],
                }),
            ])
        );
        expect(
            getCardById('1R143')?.abilities?.some((ab) =>
                (ab.effects || []).some(
                    (e) => e.type === 'SUPPRESS_WEAPON_STRENGTH'
                )
            )
        ).toBe(true);
    });

    it('ignore le +force de l’arme en escarmouche contre la Troupe', () => {
        const troop = {
            ...getCardById('1R143')!,
            instanceId: 'troop',
        } as CardState;
        const blade = {
            ...getCardById('1R95')!,
            instanceId: 'blade',
        } as CardState;
        const boromir = createCompanion({
            id: 'boromir',
            title: 'Boromir',
            strength: 7,
            attachments: [blade],
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [boromir],
                }),
                '1': createPlayerState('1'),
            },
            battlefield: [troop],
            skirmishes: [
                {
                    id: 'sk-1',
                    companionId: 'boromir',
                    minionIds: ['troop'],
                },
            ],
            activeSkirmishId: 'sk-1',
        });
        expect(getCalculatedStrength(undefined, boromir)).toBe(9);
        expect(getCalculatedStrength(G, boromir)).toBe(7);
    });

    it('garde le +force de l’arme contre un autre séide', () => {
        const warrior = {
            ...getCardById('4C165')!,
            instanceId: 'warrior',
        } as CardState;
        const blade = {
            ...getCardById('1R95')!,
            instanceId: 'blade',
        } as CardState;
        const boromir = createCompanion({
            id: 'boromir',
            title: 'Boromir',
            strength: 7,
            attachments: [blade],
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [boromir],
                }),
                '1': createPlayerState('1'),
            },
            battlefield: [warrior],
            skirmishes: [
                {
                    id: 'sk-1',
                    companionId: 'boromir',
                    minionIds: ['warrior'],
                },
            ],
            activeSkirmishId: 'sk-1',
        });
        expect(getCalculatedStrength(G, boromir)).toBe(9);
    });

    it('ignore aussi le +1 temp de Knight’s Spear (pas seulement le +imprimé)', () => {
        const troop = {
            ...getCardById('1R143')!,
            instanceId: 'troop',
        } as CardState;
        const spear = {
            ...getCardById('7C108')!,
            instanceId: 'spear',
        } as CardState;
        const man = createCompanion({
            id: 'knight',
            title: 'Knight',
            culture: 'GONDOR',
            race: 'MAN',
            strength: 6,
            attachments: [spear],
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [man],
                    threats: 0,
                }),
                '1': createPlayerState('1'),
            },
            battlefield: [troop],
            skirmishes: [
                {
                    id: 'sk-1',
                    companionId: 'knight',
                    minionIds: ['troop'],
                },
            ],
            activeSkirmishId: 'sk-1',
            tempModifiers: [
                {
                    id: '7C108:0:0',
                    sourceCardId: 'spear',
                    sourceCardTitle: "Knight's Spear",
                    targetCardId: 'knight',
                    stat: 'STRENGTH',
                    value: 1,
                    scope: 'SKIRMISH',
                    expiresAtPhase: 'SKIRMISH',
                },
            ],
        });
        // +2 imprimé + +1 temp = 9 hors suppress ; vs Troupe = 6
        expect(getCalculatedStrength(undefined, man)).toBe(8);
        expect(getCalculatedStrength(G, man)).toBe(6);
    });

    it('laisse l’effet non-force de l’arme (Épée → blesser)', () => {
        const blade = getCardById('1R95')!;
        expect(
            (blade.abilities || []).some((ab) =>
                (ab.effects || []).some((e) => e.type === 'WOUND')
            )
        ).toBe(true);
    });

});
