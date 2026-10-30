import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import {
    passResponseWindow,
    preventPendingEffect,
} from '../engine/responseWindow';
import type { Ability } from '../types';
import {
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
} from './createGameState';

const CSV_TEXT =
    'When you play this minion, you may spot a Nazgûl to add 2 threats. The Free Peoples player may wound the Ring–bearer to prevent this. <br><keyword>Skirmish:</keyword> Remove a threat to make this minion strength +3.';

const WHEN_PLAYED: Ability = {
    id: '7U190:when',
    phases: [],
    trigger: { type: 'WHEN_PLAYED' },
    optional: true,
    cost: [{ spot: [{ count: 1, target: [['NAZGÛL']] }] }],
    effects: [
        {
            type: 'ADD_THREATS',
            count: 2,
            fpMayPrevent: { woundRingBearer: true },
        },
    ],
    source: 'SELF',
    text: 'When you play this minion, you may spot a Nazgûl to add 2 threats…',
};

describe('Morgul Destroyer 7U190 — when-played menaces + prévention', () => {
    it('analyse : WHEN_PLAYED spot Nazgûl → ADD_THREATS + fpMayPrevent', () => {
        expect(parseAbilities(CSV_TEXT, 'Morgul Destroyer', '7U190')).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    trigger: { type: 'WHEN_PLAYED' },
                    optional: true,
                    cost: [
                        {
                            spot: [
                                {
                                    count: 1,
                                    target: [['NAZGÛL']],
                                    mode: 'DESIGNATION',
                                },
                            ],
                        },
                    ],
                    effects: [
                        {
                            type: 'ADD_THREATS',
                            count: 2,
                            fpMayPrevent: { woundRingBearer: true },
                        },
                    ],
                }),
                expect.objectContaining({
                    phases: ['SKIRMISH'],
                    cost: [{ removeThreats: 1 }],
                }),
            ])
        );
        expect(
            getCardById('7U190')?.abilities?.some(
                (ab) =>
                    ab.trigger?.type === 'WHEN_PLAYED' &&
                    (ab.effects || []).some(
                        (e) =>
                            e.type === 'ADD_THREATS' &&
                            e.fpMayPrevent?.woundRingBearer
                    )
            )
        ).toBe(true);
    });

    it('passer → +2 menaces ; empêcher → blessure Porteur, 0 menace', () => {
        const frodo = createCompanion({
            id: 'frodo',
            instanceId: 'frodo',
            vitality: 4,
            wounds: 0,
            keywords: ['RING-BEARER'],
        });
        const sam = createCompanion({
            id: 'sam',
            instanceId: 'sam',
            vitality: 3,
        });
        const destroyer = createMinion({
            id: '7U190',
            instanceId: 'destroyer',
            culture: 'WRAITH',
            race: 'ORC',
            abilities: [WHEN_PLAYED],
        });
        const nazgul = createMinion({
            id: 'nazgul',
            instanceId: 'nazgul',
            culture: 'WRAITH',
            race: 'NAZGÛL',
        });

        const passG = createGameState({
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo, sam],
                    threats: 0,
                }),
                '1': createPlayerState('1'),
            },
            battlefield: [destroyer, nazgul],
        });
        expect(applyAbilityEffect(passG, destroyer, WHEN_PLAYED)).toBe(true);
        expect(passG.pendingEvent?.type).toBe('ABOUT_TO_ADD_THREATS');
        expect(passResponseWindow(passG, '0')).toBe('APPLIED');
        expect(passG.players['0']!.threats).toBe(2);
        expect(frodo.wounds || 0).toBe(0);

        const frodo2 = createCompanion({
            id: 'frodo2',
            instanceId: 'frodo2',
            vitality: 4,
            wounds: 0,
            keywords: ['RING-BEARER'],
        });
        const destroyer2 = createMinion({
            id: '7U190',
            instanceId: 'destroyer2',
            abilities: [WHEN_PLAYED],
        });
        const preventG = createGameState({
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo2, sam],
                    threats: 0,
                }),
                '1': createPlayerState('1'),
            },
            battlefield: [destroyer2, nazgul],
        });
        expect(applyAbilityEffect(preventG, destroyer2, WHEN_PLAYED)).toBe(
            true
        );
        expect(preventPendingEffect(preventG, '0')).toBe('APPLIED');
        expect(preventG.players['0']!.threats).toBe(0);
        expect(frodo2.wounds || 0).toBe(1);
    });

});
