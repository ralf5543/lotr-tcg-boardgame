import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import { canCardTakeWound } from '../logic/sites';
import type { CardState } from '../types';
import {
    createCompanion,
    createGameState,
    createPlayerState,
} from './createGameState';

const CSV_TEXT =
    '<keyword>Damage +1.</keyword> While this minion is skirmishing a Free Peoples character who has resistance 5 or less, this minion cannot take wounds.';

describe('Patrol of Uruk-hai 11C198 — immunité While résistance', () => {
    it('analyse CSV : WHILE skirmishing res≤5 → FORBID_WOUNDS', () => {
        const fromCsv =
            parseAbilities(CSV_TEXT, 'Patrol of Uruk-hai', '11C198') || [];
        expect(fromCsv).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    trigger: {
                        type: 'WHILE',
                        skirmishing: {
                            target: [['CHARACTER']],
                            resistanceAtMost: 5,
                        },
                    },
                    effects: [
                        { type: 'FORBID_WOUNDS', target: 'SELF' },
                    ],
                }),
            ])
        );
        expect(
            getCardById('11C198')?.abilities?.some((ab) =>
                (ab.effects || []).some((e) => e.type === 'FORBID_WOUNDS')
            )
        ).toBe(true);
    });

    it('refuse les blessures si adversaire résistance ≤5', () => {
        const patrol = {
            ...getCardById('11C198')!,
            instanceId: 'patrol',
        } as CardState;
        const frodo = createCompanion({
            id: 'frodo',
            title: 'Frodo',
            resistance: 5,
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    burdens: 0,
                    fellowshipArea: [frodo],
                }),
                '1': createPlayerState('1'),
            },
            battlefield: [patrol],
            skirmishes: [
                {
                    id: 'sk-1',
                    companionId: 'frodo',
                    minionIds: ['patrol'],
                },
            ],
            activeSkirmishId: 'sk-1',
        });
        expect(canCardTakeWound(G, patrol)).toBe(false);
    });

    it('autorise les blessures si adversaire résistance >5', () => {
        const patrol = {
            ...getCardById('11C198')!,
            instanceId: 'patrol',
        } as CardState;
        const aragorn = createCompanion({
            id: 'aragorn',
            title: 'Aragorn',
            resistance: 8,
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    burdens: 0,
                    fellowshipArea: [aragorn],
                }),
                '1': createPlayerState('1'),
            },
            battlefield: [patrol],
            skirmishes: [
                {
                    id: 'sk-1',
                    companionId: 'aragorn',
                    minionIds: ['patrol'],
                },
            ],
            activeSkirmishId: 'sk-1',
        });
        expect(canCardTakeWound(G, patrol)).toBe(true);
    });

    it('autorise les blessures hors escarmouche', () => {
        const patrol = {
            ...getCardById('11C198')!,
            instanceId: 'patrol',
        } as CardState;
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        createCompanion({ id: 'frodo', resistance: 4 }),
                    ],
                }),
                '1': createPlayerState('1'),
            },
            battlefield: [patrol],
        });
        expect(canCardTakeWound(G, patrol)).toBe(true);
    });

});
