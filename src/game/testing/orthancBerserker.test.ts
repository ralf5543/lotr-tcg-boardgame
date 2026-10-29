import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { getEffectDesignationCandidates } from '../engine/abilities/designation';
import {
    canPayAbilityCost,
    payAbilityCost,
} from '../engine/abilities/payAbilityCost';
import { getEffectiveVitality } from '../../utils/cardStats';
import type { Ability, CardState } from '../types';
import {
    createCompanion,
    createGameState,
    createPlayerState,
} from './createGameState';

const CSV_TEXT =
    '<keyword>Damage +1.</keyword> <br><keyword>Maneuver:</keyword> Spot 5 burdens and exert Orthanc Berserker twice to exhaust a companion (except the Ring-bearer).';

const realCard = (id: string, instanceId: string): CardState => {
    const card = getCardById(id);
    if (!card) throw new Error(`Carte introuvable : ${id}`);
    return { ...card, instanceId };
};

function maneuverAbility(card: CardState): Ability {
    const ability = (card.abilities || []).find((ab) =>
        (ab.effects || []).some((e) => e.type === 'EXHAUST')
    );
    if (!ability) throw new Error('Capacité Manœuvre manquante');
    return ability;
}

describe('Orthanc Berserker 3R66 — épuiser un compagnon', () => {
    it('analyse CSV : 5 fardeaux + affaiblir ×2 → EXHAUST compagnon (sauf RB)', () => {
        const fromCsv =
            parseAbilities(CSV_TEXT, 'Orthanc Berserker', '3R66') || [];
        expect(fromCsv).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    phases: ['MANEUVER'],
                    cost: [
                        {
                            spotBurdens: 5,
                            exert: [{ count: 2, target: 'SELF' }],
                        },
                    ],
                    effects: [
                        {
                            type: 'EXHAUST',
                            target: [['COMPANION']],
                            excludeRingBearer: true,
                        },
                    ],
                }),
            ])
        );
        expect(
            getCardById('3R66')?.abilities?.some((ab) =>
                (ab.effects || []).some(
                    (e) =>
                        e.type === 'EXHAUST' && e.excludeRingBearer === true
                )
            )
        ).toBe(true);
    });

    it('désignation : compagnons sauf Porteur', () => {
        const berserker = realCard('3R66', 'berserker');
        const frodo = createCompanion({
            id: 'frodo',
            title: 'Frodo',
            keywords: ['RING-BEARER'],
        });
        const aragorn = createCompanion({
            id: 'aragorn',
            title: 'Aragorn',
            vitality: 4,
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    burdens: 5,
                    fellowshipArea: [frodo, aragorn],
                }),
                '1': createPlayerState('1'),
            },
            battlefield: [berserker],
        });
        const ability = maneuverAbility(berserker);
        const candidates = getEffectDesignationCandidates(
            G,
            berserker,
            ability
        );
        expect(candidates.map((c) => c.instanceId || c.id)).toEqual([
            'aragorn',
        ]);
    });

    it('épuise Aragorn (vitalité → 1)', () => {
        const berserker = realCard('3R66', 'berserker');
        const aragorn = createCompanion({
            id: 'aragorn',
            title: 'Aragorn',
            vitality: 4,
            wounds: 0,
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    burdens: 5,
                    fellowshipArea: [
                        createCompanion({
                            id: 'frodo',
                            keywords: ['RING-BEARER'],
                        }),
                        aragorn,
                    ],
                }),
                '1': createPlayerState('1'),
            },
            battlefield: [berserker],
        });
        const ability = maneuverAbility(berserker);
        expect(canPayAbilityCost(G, berserker, ability.cost)).toBe(true);
        expect(payAbilityCost(G, berserker, ability.cost)).toBe(true);
        expect(getEffectiveVitality(berserker)).toBe(1);
        expect(applyAbilityEffect(G, berserker, ability, 'aragorn')).toBe(
            true
        );
        expect(getEffectiveVitality(aragorn)).toBe(1);
    });

    it('refuse si moins de 5 fardeaux', () => {
        const berserker = realCard('3R66', 'berserker');
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    burdens: 4,
                    fellowshipArea: [
                        createCompanion({ id: 'aragorn', vitality: 4 }),
                    ],
                }),
                '1': createPlayerState('1'),
            },
            battlefield: [berserker],
        });
        const ability = maneuverAbility(berserker);
        expect(canPayAbilityCost(G, berserker, ability.cost)).toBe(false);
    });

});
