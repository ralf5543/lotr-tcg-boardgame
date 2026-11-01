import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import { applyDevPreset } from '../dev/presets';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { formatAbilityLabelParts } from '../engine/abilities/collectAbilities';
import { payAbilityCost } from '../engine/abilities/payAbilityCost';
import { confirmPendingReveal } from '../logic/pendingReveal';
import type { CardState } from '../types';
import {
    createGameState,
    createPlayerState,
} from './createGameState';

const CSV_TEXT =
    'To play, exert an Uruk-hai. <br><keyword>Shadow:</keyword> Remove <symbol>twilight3</symbol> and spot X burdens to make the Free Peoples player reveal X cards at random from hand. You may discard 1 revealed card.';

const realCard = (id: string, instanceId: string): CardState => {
    const card = getCardById(id);
    if (!card) throw new Error(`Carte introuvable : ${id}`);
    return { ...card, instanceId };
};

describe('Alive and Unspoiled 1R120', () => {
    it('analyse : Ombre −3 crépuscule → révéler X au hasard + défausse optionnelle', () => {
        const parsed = parseAbilities(CSV_TEXT, 'Alive and Unspoiled', '1R120') || [];
        expect(parsed).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    phases: ['SHADOW'],
                    cost: [{ removeTwilight: 3 }],
                    effects: [
                        {
                            type: 'REVEAL_HAND',
                            whose: 'OPPONENT',
                            countEqualToBurdens: true,
                            random: true,
                            aftermath: { mayDiscardOne: true },
                        },
                    ],
                }),
            ])
        );
        const card = getCardById('1R120');
        expect(
            (card?.abilities || []).some((ab) =>
                (ab.effects || []).some((e) => e.type === 'REVEAL_HAND')
            )
        ).toBe(true);
        expect(card?.toPlay).toEqual([
            { exert: [{ count: 1, target: [['URUK-HAI']] }] },
        ]);
    });

    it('libellé Ombre', () => {
        const source = realCard('1R120', 'aau');
        const ability = (source.abilities || []).find((ab) =>
            (ab.effects || []).some((e) => e.type === 'REVEAL_HAND')
        )!;
        // Libellé issu du textFr papier (préféré à la génération modèle).
        expect(formatAbilityLabelParts(ability, source)).toEqual({
            cost: 'Retirez <symbol>twilight3</symbol> et désignez X points-fardeau',
            effect:
                'obliger le joueur des Peuples Libres à révéler X cartes de sa main au hasard. Vous pouvez défausser 1 carte révélée',
        });
    });

    it('Ombre : retire 3 crépuscule, révèle min(fardeaux, main) cartes', () => {
        const condition = realCard('1R120', 'aau');
        const ability = (condition.abilities || []).find((ab) =>
            (ab.effects || []).some((e) => e.type === 'REVEAL_HAND')
        )!;
        const hand = [
            realCard('1C84', 'h1'),
            realCard('3R50', 'h2'),
            realCard('7C108', 'h3'),
            realCard('11S176', 'h4'),
            realCard('4U99', 'h5'),
        ];

        const G = createGameState({
            twilightPool: 5,
            players: {
                '0': createPlayerState('0', {
                    burdens: 3,
                    fellowshipArea: [realCard('5U111', 'frodo')],
                    hand,
                }),
                '1': createPlayerState('1', {
                    supportArea: [condition],
                }),
            },
        });

        expect(payAbilityCost(G, condition, ability.cost)).toBe(true);
        expect(G.twilightPool).toBe(2);
        expect(applyAbilityEffect(G, condition, ability)).toBe(true);
        expect(G.pendingReveal?.zone).toBe('HAND');
        expect(G.pendingReveal?.cardIds).toHaveLength(3);
        expect(G.pendingReveal?.aftermath?.mayDiscardOne).toBe(true);
        for (const id of G.pendingReveal!.cardIds) {
            expect(hand.some((c) => c.instanceId === id)).toBe(true);
        }
    });

    it('défausse optionnelle d’une carte révélée', () => {
        const condition = realCard('1R120', 'aau');
        const ability = (condition.abilities || []).find((ab) =>
            (ab.effects || []).some((e) => e.type === 'REVEAL_HAND')
        )!;
        const target = realCard('1C84', 'h1');
        const other = realCard('3R50', 'h2');

        const G = createGameState({
            twilightPool: 3,
            players: {
                '0': createPlayerState('0', {
                    burdens: 2,
                    hand: [target, other],
                }),
                '1': createPlayerState('1', {
                    supportArea: [condition],
                }),
            },
        });

        expect(payAbilityCost(G, condition, ability.cost)).toBe(true);
        expect(applyAbilityEffect(G, condition, ability)).toBe(true);
        const revealed = G.pendingReveal!.cardIds;
        expect(revealed).toHaveLength(2);
        const pick = revealed[0]!;
        expect(confirmPendingReveal(G, '1', pick)).toBe(true);
        expect(G.pendingReveal).toBeUndefined();
        expect(G.players['0']!.hand).toHaveLength(1);
        expect(
            G.players['0']!.discard?.some(
                (c) => c.instanceId === pick || c.id === pick
            )
        ).toBe(true);
    });

    it('valider sans défausser laisse la main intacte', () => {
        const condition = realCard('1R120', 'aau');
        const ability = (condition.abilities || []).find((ab) =>
            (ab.effects || []).some((e) => e.type === 'REVEAL_HAND')
        )!;

        const G = createGameState({
            twilightPool: 3,
            players: {
                '0': createPlayerState('0', {
                    burdens: 1,
                    hand: [realCard('1C84', 'h1'), realCard('3R50', 'h2')],
                }),
                '1': createPlayerState('1', {
                    supportArea: [condition],
                }),
            },
        });

        expect(payAbilityCost(G, condition, ability.cost)).toBe(true);
        expect(applyAbilityEffect(G, condition, ability)).toBe(true);
        expect(confirmPendingReveal(G, '1')).toBe(true);
        expect(G.players['0']!.hand).toHaveLength(2);
        expect(G.players['0']!.discard || []).toHaveLength(0);
    });

    it('preset DEV : Alive and Unspoiled + 3 fardeaux + main FP', () => {
        const G = createGameState();
        applyDevPreset(G, 'DECK_GAPS_ALIVE_AND_UNSPOILED');
        expect(
            G.players['1']!.supportArea?.some((c) => c.id === '1R120')
        ).toBe(true);
        expect(G.players['0']!.burdens).toBe(3);
        expect(G.players['0']!.hand).toHaveLength(5);
        expect(G.twilightPool).toBe(5);
    });
});
