import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import { applyDevPreset } from '../dev/presets';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { abilityMeetsPlayRestrictions } from '../engine/abilities/abilityRestrictions';
import { formatAbilityLabelParts } from '../engine/abilities/collectAbilities';
import { payAbilityCost } from '../engine/abilities/payAbilityCost';
import {
    requestAboutToUseAbility,
    passResponseWindow,
} from '../engine/responseWindow';
import { siteHasKeyword } from '../logic/sites';
import type { Ability, CardState } from '../types';
import {
    createCompanion,
    createGameState,
    createPlayerState,
    createSite,
} from './createGameState';

const CSV_TEXT =
    'Any site 9 is a mountain. \n**Shadow:** If the fellowship is at any site 9, play Gollum from your discard pile. \n**Response:** If the Free Peoples player uses a maneuver or archery special ability, exert Gollum to cancel its effect.';

const realCard = (id: string, instanceId: string): CardState => {
    const card = getCardById(id);
    if (!card) throw new Error(`Carte introuvable : ${id}`);
    return { ...card, instanceId };
};

function shadowPlayAbility(card: CardState): Ability {
    const ability = (card.abilities || []).find((ab) =>
        (ab.effects || []).some((e) => e.type === 'PLAY_FROM_DECK_OR_DISCARD')
    );
    if (!ability) throw new Error('Capacité Ombre manquante');
    return ability;
}

describe('Final Strike 10U20', () => {
    it('analyse : montagne + site 9 → Gollum + Response annuler', () => {
        const parsed = parseAbilities(CSV_TEXT, 'Final Strike', '10U20') || [];
        expect(parsed).toHaveLength(3);
        expect(parsed[0]).toEqual(
            expect.objectContaining({
                trigger: { type: 'WHILE' },
                effects: [
                    {
                        type: 'GRANT_SITE_KEYWORD',
                        keyword: 'MOUNTAIN',
                        siteNumber: 9,
                    },
                ],
            })
        );
        expect(parsed[1]).toEqual(
            expect.objectContaining({
                phases: ['SHADOW'],
                requiresAtSiteNumber: 9,
                effects: [
                    {
                        type: 'PLAY_FROM_DECK_OR_DISCARD',
                        from: 'DISCARD',
                        target: [['Gollum']],
                    },
                ],
            })
        );
        expect(parsed[2]).toEqual(
            expect.objectContaining({
                phases: ['RESPONSE'],
                trigger: {
                    type: 'ABOUT_TO_USE_ABILITY',
                    usedBy: 'FREE_PEOPLE',
                    abilityPhases: ['MANEUVER', 'ARCHERY'],
                },
                effects: [{ type: 'CANCEL_ABILITY_EFFECT' }],
            })
        );
        expect(getCardById('10U20')?.abilities).toHaveLength(3);
    });

    it('libellé Ombre : Si au site 9, jouer Gollum depuis la défausse', () => {
        const source = realCard('10U20', 'fs');
        const ability = shadowPlayAbility(source);
        expect(formatAbilityLabelParts(ability, source)).toEqual({
            cost: '',
            effect: 'Si au site 9, jouer Gollum depuis la défausse',
        });
    });

    it('site 9 est montagne tant que Final Strike est en soutien', () => {
        const finalStrike = realCard('10U20', 'fs');
        const path = Array.from({ length: 9 }, (_, i) =>
            createSite({
                id: `path-${i}`,
                siteNumber: i + 1,
                instanceId: `site-${i}`,
            })
        );
        const G = createGameState({
            currentSiteIndex: 8,
            path,
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 8,
                    fellowshipArea: [realCard('5U111', 'frodo')],
                }),
                '1': createPlayerState('1', {
                    currentSiteIndex: 8,
                    supportArea: [finalStrike],
                }),
            },
        });
        expect(siteHasKeyword(path[8]!, 'MOUNTAIN', G)).toBe(true);
        expect(siteHasKeyword(path[0]!, 'MOUNTAIN', G)).toBe(false);
    });

    it('runtime Ombre : jouable au site 9', () => {
        const source = realCard('10U20', 'fs');
        const gollum = realCard('7C59', 'gollum');
        const ability = shadowPlayAbility(source);
        const path = Array.from({ length: 9 }, (_, i) =>
            createSite({
                id: `path-${i}`,
                siteNumber: i + 1,
            })
        );
        const atNine = createGameState({
            twilightPool: 4,
            currentSiteIndex: 8,
            path,
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 8,
                    fellowshipArea: [realCard('5U111', 'frodo')],
                }),
                '1': createPlayerState('1', {
                    currentSiteIndex: 8,
                    supportArea: [source],
                    discard: [gollum],
                }),
            },
        });
        expect(abilityMeetsPlayRestrictions(atNine, source, ability)).toBe(
            true
        );
        expect(
            applyAbilityEffect(
                atNine,
                source,
                ability,
                ['gollum'],
                undefined,
                undefined,
                '1'
            )
        ).toBe(true);
        expect(
            atNine.battlefield?.some((c) => c.instanceId === 'gollum')
        ).toBe(true);
    });

    it('Response : affaiblir Gollum annule la Manœuvre FP', () => {
        const finalStrike = realCard('10U20', 'fs');
        const gollum = {
            ...realCard('7C59', 'gollum'),
            vitality: 4,
            wounds: 0,
        };
        const albert = realCard('1R69', 'albert');
        const ambition = realCard('1C133', 'ambition');
        const albertAbility = (albert.abilities || []).find((ab) =>
            (ab.phases || []).includes('MANEUVER')
        );
        expect(albertAbility).toBeTruthy();
        const cancelAbility = (finalStrike.abilities || []).find((ab) =>
            (ab.effects || []).some((e) => e.type === 'CANCEL_ABILITY_EFFECT')
        );
        expect(cancelAbility).toBeTruthy();

        const G = createGameState({
            twilightPool: 0,
            currentSiteIndex: 8,
            path: Array.from({ length: 9 }, (_, i) =>
                createSite({ id: `p-${i}`, siteNumber: i + 1 })
            ),
            battlefield: [gollum],
            players: {
                '0': createPlayerState('0', {
                    currentSiteIndex: 8,
                    fellowshipArea: [
                        realCard('5U111', 'frodo'),
                        albert,
                    ],
                }),
                '1': createPlayerState('1', {
                    currentSiteIndex: 8,
                    supportArea: [finalStrike, ambition],
                }),
            },
        });

        expect(
            requestAboutToUseAbility(G, albert, albertAbility!, '0')
        ).toBe(true);
        expect(G.pendingEvent?.type).toBe('ABOUT_TO_USE_ABILITY');
        expect(G.responseWindow?.isOpen).toBe(true);

        // Ombre : payer affaiblir Gollum + annuler.
        expect(payAbilityCost(G, finalStrike, cancelAbility!.cost)).toBe(
            true
        );
        expect(gollum.wounds).toBe(1);
        expect(applyAbilityEffect(G, finalStrike, cancelAbility!)).toBe(
            true
        );
        expect(G.pendingEvent).toBeUndefined();
        // Situation Isengard toujours là (effet Albert jamais appliqué).
        expect(
            G.players['1']!.supportArea?.some((c) => c.id === '1C133')
        ).toBe(true);
    });

    it('Passer la Response laisse conclure le pending', () => {
        const finalStrike = realCard('10U20', 'fs');
        const gollum = realCard('7C59', 'gollum');
        const albert = realCard('1R69', 'albert');
        const albertAbility = (albert.abilities || []).find((ab) =>
            (ab.phases || []).includes('MANEUVER')
        )!;

        const G = createGameState({
            currentSiteIndex: 8,
            path: Array.from({ length: 9 }, (_, i) =>
                createSite({ id: `p-${i}`, siteNumber: i + 1 })
            ),
            battlefield: [gollum],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        createCompanion({ id: 'frodo', title: 'Frodo' }),
                        albert,
                    ],
                }),
                '1': createPlayerState('1', {
                    supportArea: [finalStrike],
                }),
            },
        });

        expect(
            requestAboutToUseAbility(G, albert, albertAbility, '0')
        ).toBe(true);
        // Seule l’Ombre a une réponse → fenêtre active côté Ombre.
        expect(String(G.responseWindow?.activePlayerId)).toBe('1');
        const result = passResponseWindow(G, '1');
        expect(result).toBe('APPLIED');
        expect(G.pendingEvent).toBeUndefined();
    });

    it('preset DEV : site 9 + Final Strike + Gollum + Albert', () => {
        const G = createGameState();
        applyDevPreset(G, 'DECK_GAPS_FINAL_STRIKE');
        expect(G.currentSiteIndex).toBe(8);
        expect(
            G.players['1']!.supportArea?.some((c) => c.id === '10U20')
        ).toBe(true);
        expect(G.battlefield?.[0]?.id).toBe('7C59');
        expect(
            G.players['0']!.fellowshipArea?.some((c) => c.id === '1R69')
        ).toBe(true);
        expect(siteHasKeyword(G.path![8]!, 'MOUNTAIN', G)).toBe(true);
    });
});
