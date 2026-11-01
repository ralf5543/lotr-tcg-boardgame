import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import { applyDevPreset } from '../dev/presets';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { formatAbilityLabelParts } from '../engine/abilities/collectAbilities';
import { payAbilityCost } from '../engine/abilities/payAbilityCost';
import {
    requestAboutToUseAbility,
    passResponseWindow,
} from '../engine/responseWindow';
import type { CardState } from '../types';
import {
    createGameState,
    createPlayerState,
    createSite,
} from './createGameState';

const CSV_TEXT =
    '**Damage +1.** \n**Response:** If a special ability of a companion who has resistance 5 or less is used, exert this minion to cancel its effect.';

const realCard = (id: string, instanceId: string): CardState => {
    const card = getCardById(id);
    if (!card) throw new Error(`Carte introuvable : ${id}`);
    return { ...card, instanceId };
};

describe('Brawling Uruk 11R179', () => {
    it('analyse : Response annuler capacité compagnon rés. ≤5', () => {
        const parsed = parseAbilities(CSV_TEXT, 'Brawling Uruk', '11R179') || [];
        expect(parsed).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    phases: ['RESPONSE'],
                    trigger: {
                        type: 'ABOUT_TO_USE_ABILITY',
                        sourceTarget: [['COMPANION']],
                        resistanceAtMost: 5,
                    },
                    cost: [
                        {
                            exert: [{ count: 1, target: 'SELF' }],
                        },
                    ],
                    effects: [{ type: 'CANCEL_ABILITY_EFFECT' }],
                }),
            ])
        );
        const card = getCardById('11R179');
        expect(
            (card?.abilities || []).some((ab) =>
                (ab.effects || []).some((e) => e.type === 'CANCEL_ABILITY_EFFECT')
            )
        ).toBe(true);
    });

    it('libellé : Affaiblir → annuler la capacité', () => {
        const source = realCard('11R179', 'bu');
        const ability = (source.abilities || []).find((ab) =>
            (ab.effects || []).some((e) => e.type === 'CANCEL_ABILITY_EFFECT')
        )!;
        expect(formatAbilityLabelParts(ability, source)).toEqual({
            cost: 'Affaiblir Brawling Uruk',
            effect: 'annuler la capacité',
        });
    });

    it('Response : Frodon rés. 5 → fenêtre ; affaiblir annule', () => {
        const uruk = {
            ...realCard('11R179', 'bu'),
            vitality: 3,
            wounds: 0,
        };
        const frodo = realCard('5U111', 'frodo');
        const frodoAbility = (frodo.abilities || []).find((ab) =>
            (ab.phases || []).includes('FELLOWSHIP')
        )!;
        const cancelAbility = (uruk.abilities || []).find((ab) =>
            (ab.effects || []).some((e) => e.type === 'CANCEL_ABILITY_EFFECT')
        )!;

        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    burdens: 5,
                    fellowshipArea: [frodo],
                    discard: [realCard('7C59', 'smeagol')],
                }),
                '1': createPlayerState('1', {}),
            },
            battlefield: [uruk],
            path: Array.from({ length: 9 }, (_, i) =>
                createSite({ id: `p-${i}`, siteNumber: i + 1 })
            ),
        });

        expect(requestAboutToUseAbility(G, frodo, frodoAbility, '0')).toBe(
            true
        );
        expect(G.pendingEvent?.type).toBe('ABOUT_TO_USE_ABILITY');
        expect(payAbilityCost(G, uruk, cancelAbility.cost)).toBe(true);
        expect(uruk.wounds).toBe(1);
        expect(applyAbilityEffect(G, uruk, cancelAbility)).toBe(true);
        expect(G.pendingEvent).toBeUndefined();
        expect(
            G.players['0']!.fellowshipArea?.some((c) => c.id === '7C59')
        ).toBe(false);
    });

    it('Albert rés. 6 : pas de fenêtre Response', () => {
        const uruk = realCard('11R179', 'bu');
        const albert = realCard('1R69', 'albert');
        const albertAbility = (albert.abilities || []).find((ab) =>
            (ab.phases || []).includes('MANEUVER')
        )!;

        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    burdens: 0,
                    fellowshipArea: [
                        realCard('5U111', 'frodo'),
                        albert,
                    ],
                }),
                '1': createPlayerState('1', {
                    supportArea: [realCard('1C133', 'ambition')],
                }),
            },
            battlefield: [uruk],
        });

        expect(
            requestAboutToUseAbility(G, albert, albertAbility, '0')
        ).toBe(false);
        expect(G.pendingEvent).toBeUndefined();
    });

    it('Passer la Response laisse conclure le pending', () => {
        const uruk = realCard('11R179', 'bu');
        const frodo = realCard('5U111', 'frodo');
        const frodoAbility = (frodo.abilities || []).find((ab) =>
            (ab.phases || []).includes('FELLOWSHIP')
        )!;

        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    burdens: 5,
                    fellowshipArea: [frodo],
                    discard: [realCard('7C59', 'smeagol')],
                }),
                '1': createPlayerState('1', {}),
            },
            battlefield: [uruk],
        });

        expect(requestAboutToUseAbility(G, frodo, frodoAbility, '0')).toBe(
            true
        );
        expect(String(G.responseWindow?.activePlayerId)).toBe('1');
        const result = passResponseWindow(G, '1');
        expect(result).toBe('APPLIED');
        expect(G.pendingEvent).toBeUndefined();
    });

    it('preset DEV : Brawling Uruk + Frodon 5 fardeaux + Albert + Haethen', () => {
        const G = createGameState();
        applyDevPreset(G, 'DECK_GAPS_BRAWLING_URUK');
        expect(G.battlefield?.[0]?.id).toBe('11R179');
        expect(G.players['0']!.burdens).toBe(5);
        expect(
            G.players['0']!.fellowshipArea?.some((c) => c.id === '5U111')
        ).toBe(true);
        expect(
            G.players['0']!.fellowshipArea?.some((c) => c.id === '1R69')
        ).toBe(true);
        expect(
            G.players['0']!.fellowshipArea?.some((c) => c.id === '12R116')
        ).toBe(true);
    });
});
