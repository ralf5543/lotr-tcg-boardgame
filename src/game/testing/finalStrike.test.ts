import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import { applyDevPreset } from '../dev/presets';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { abilityMeetsPlayRestrictions } from '../engine/abilities/abilityRestrictions';
import { formatAbilityLabelParts } from '../engine/abilities/collectAbilities';
import type { Ability, CardState } from '../types';
import {
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
    it('analyse : site 9 → jouer Gollum depuis la défausse (pas montagne / Response)', () => {
        const parsed = parseAbilities(CSV_TEXT, 'Final Strike', '10U20') || [];
        expect(parsed).toHaveLength(1);
        expect(parsed[0]).toEqual(
            expect.objectContaining({
                phases: ['SHADOW'],
                cost: [],
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
        const card = getCardById('10U20');
        expect(card?.abilities).toHaveLength(1);
        expect(card?.abilities?.[0]?.requiresAtSiteNumber).toBe(9);
    });

    it('libellé : Si au site 9, jouer Gollum depuis la défausse', () => {
        const source = realCard('10U20', 'fs');
        const ability = shadowPlayAbility(source);
        expect(formatAbilityLabelParts(ability, source)).toEqual({
            cost: '',
            effect: 'Si au site 9, jouer Gollum depuis la défausse',
        });
    });

    it('runtime : jouable au site 9, refuseée ailleurs', () => {
        const source = realCard('10U20', 'fs');
        const gollum = realCard('7C59', 'gollum');
        const ability = shadowPlayAbility(source);
        const path = Array.from({ length: 9 }, (_, i) =>
            createSite({
                id: `path-${i}`,
                siteNumber: i + 1,
            })
        );
        const atSite = (siteIndex: number) =>
            createGameState({
                twilightPool: 4,
                currentSiteIndex: siteIndex,
                path,
                players: {
                    '0': createPlayerState('0', {
                        currentSiteIndex: siteIndex,
                        fellowshipArea: [
                            realCard('5U111', 'frodo'),
                        ],
                    }),
                    '1': createPlayerState('1', {
                        currentSiteIndex: siteIndex,
                        supportArea: [source],
                        discard: [gollum],
                    }),
                },
            });

        const tooEarly = atSite(4);
        expect(
            abilityMeetsPlayRestrictions(tooEarly, source, ability)
        ).toBe(false);

        const atNine = atSite(8);
        expect(
            abilityMeetsPlayRestrictions(atNine, source, ability)
        ).toBe(true);
        expect(
            applyAbilityEffect(atNine, source, ability, ['gollum'], undefined, undefined, '1')
        ).toBe(true);
        expect(atNine.players['1']!.discard).toHaveLength(0);
        expect(
            atNine.battlefield?.some((c) => c.instanceId === 'gollum')
        ).toBe(true);
    });

    it('preset DEV : site 9 + Final Strike + Gollum en défausse', () => {
        const G = createGameState();
        applyDevPreset(G, 'DECK_GAPS_FINAL_STRIKE');
        expect(G.currentSiteIndex).toBe(8);
        expect(
            G.players['1']!.supportArea?.some((c) => c.id === '10U20')
        ).toBe(true);
        expect(G.players['1']!.discard?.[0]?.id).toBe('7C59');
    });
});
