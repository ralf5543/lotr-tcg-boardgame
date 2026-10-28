import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { getEffectDesignationCandidates } from '../engine/abilities/designation';
import {
    canPayAbilityCost,
    payAbilityCost,
} from '../engine/abilities/payAbilityCost';
import { applyDevPreset } from '../dev/presets';
import { getEffectiveKeywords } from '../engine/keywords/keywordUtils';
import type { Ability, CardState } from '../types';
import {
    createCompanion,
    createGameState,
    createPlayerState,
} from './createGameState';

const CSV_TEXT =
    '<keyword>Damage +1.</keyword> <br><keyword>Maneuver:</keyword> Exert Lieutenant of Orthanc to make another Uruk-hai <keyword>fierce</keyword> until the regroup phase.';

const realCard = (id: string, instanceId: string): CardState => {
    const card = getCardById(id);
    if (!card) throw new Error(`Carte introuvable : ${id}`);
    return { ...card, instanceId };
};

function maneuverAbility(card: CardState): Ability {
    const ability = (card.abilities || []).find((ab) =>
        (ab.effects || []).some((e) => e.type === 'ADD_TEMP_KEYWORD')
    );
    if (!ability) throw new Error('Capacité Manœuvre manquante');
    return ability;
}

describe('Lieutenant of Orthanc 4R158 — autre Ourouk acharné', () => {
    it('analyse CSV : affaiblir SELF → FIERCE sur autre URUK-HAI', () => {
        const fromCsv =
            parseAbilities(CSV_TEXT, 'Lieutenant of Orthanc', '4R158') || [];
        expect(fromCsv).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    phases: ['MANEUVER'],
                    cost: [
                        {
                            exert: [{ count: 1, target: 'SELF' }],
                        },
                    ],
                    effects: [
                        expect.objectContaining({
                            type: 'ADD_TEMP_KEYWORD',
                            keyword: 'FIERCE',
                            target: [['URUK-HAI']],
                            excludeSource: true,
                            expiresAtPhase: 'REGROUP',
                        }),
                    ],
                }),
            ])
        );
        expect(
            getCardById('4R158')?.abilities?.some((ab) =>
                (ab.effects || []).some(
                    (e) =>
                        e.type === 'ADD_TEMP_KEYWORD' &&
                        e.excludeSource === true
                )
            )
        ).toBe(true);
    });

    it('désignation : autre Ourouk seulement (pas soi)', () => {
        const lieutenant = realCard('4R158', 'lieutenant');
        const other = realCard('11C195', 'other-uruk');
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [createCompanion({ id: 'frodo' })],
                }),
                '1': createPlayerState('1'),
            },
            battlefield: [lieutenant, other],
        });
        const ability = maneuverAbility(lieutenant);
        const candidates = getEffectDesignationCandidates(
            G,
            lieutenant,
            ability
        );
        expect(candidates.map((c) => c.instanceId)).toEqual(['other-uruk']);
    });

    it('applique Acharné sur l’autre Ourouk', () => {
        const lieutenant = realCard('4R158', 'lieutenant');
        const other = realCard('11C195', 'other-uruk');
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [createCompanion({ id: 'frodo' })],
                }),
                '1': createPlayerState('1'),
            },
            battlefield: [lieutenant, other],
        });
        const ability = maneuverAbility(lieutenant);
        expect(canPayAbilityCost(G, lieutenant, ability.cost)).toBe(true);
        expect(payAbilityCost(G, lieutenant, ability.cost)).toBe(true);
        expect(
            applyAbilityEffect(G, lieutenant, ability, 'other-uruk')
        ).toBe(true);
        expect(
            getEffectiveKeywords(other, G).some((k) => k.key === 'FIERCE')
        ).toBe(true);
        expect(
            getEffectiveKeywords(lieutenant, G).some((k) => k.key === 'FIERCE')
        ).toBe(false);
    });

    it('preset DEV : Lieutenant + autre Ourouk', () => {
        const G = createGameState();
        applyDevPreset(G, 'DECK_GAPS_LIEUTENANT_ORTHANC');
        expect(G.battlefield.map((c) => c.id)).toEqual(['4R158', '11C195']);
    });
});
