import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { formatAbilityLabelParts } from '../engine/abilities/collectAbilities';
import {
    canPayAbilityCost,
    payAbilityCost,
} from '../engine/abilities/payAbilityCost';
import type { Ability, CardState } from '../types';
import {
    createCompanion,
    createGameState,
    createPlayerState,
} from './createGameState';

const CSV_TEXT =
    '<keyword>Ring-bearer (resistance 10).</keyword> <br><keyword>Fellowship:</keyword> Add a burden to play Sméagol from your discard pile.';

const realCard = (id: string, instanceId: string): CardState => {
    const card = getCardById(id);
    if (!card) throw new Error(`Carte introuvable : ${id}`);
    return { ...card, instanceId };
};

function fellowshipAbility(card: CardState): Ability {
    const ability = (card.abilities || []).find((ab) =>
        (ab.effects || []).some((e) => e.type === 'PLAY_FROM_DECK_OR_DISCARD')
    );
    if (!ability) throw new Error('Capacité Fellowship manquante');
    return ability;
}

describe('Frodo Master of the Precious 5U111 — Sméagol depuis la défausse', () => {
    it('analyse CSV : fardeau → PLAY_FROM_DECK_OR_DISCARD (Sméagol, défausse)', () => {
        const fromCsv =
            parseAbilities(CSV_TEXT, 'Frodo', '5U111') || [];
        expect(fromCsv).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    phases: ['FELLOWSHIP'],
                    cost: [{ addBurdens: 1 }],
                    effects: [
                        {
                            type: 'PLAY_FROM_DECK_OR_DISCARD',
                            from: 'DISCARD',
                            target: [['Sméagol']],
                        },
                    ],
                }),
            ])
        );
        expect(
            getCardById('5U111')?.abilities?.some((ab) =>
                (ab.effects || []).some(
                    (e) =>
                        e.type === 'PLAY_FROM_DECK_OR_DISCARD' &&
                        e.from === 'DISCARD'
                )
            )
        ).toBe(true);
    });

    it('bulle FR : ajouter un fardeau → jouer Sméagol depuis la défausse', () => {
        const frodo = realCard('5U111', 'frodo');
        const ability = fellowshipAbility(frodo);
        expect(formatAbilityLabelParts(ability, frodo)).toEqual({
            cost: 'Ajoutez un point-fardeau',
            effect: 'jouer Sméagol de votre pile de défausse',
        });
    });

    it('joue Sméagol de la défausse ; coût Frodon + toPlay Sméagol', () => {
        const frodo = realCard('5U111', 'frodo');
        const smeagol = realCard('8R27', 'smeagol');
        const G = createGameState({
            twilightPool: 0,
            players: {
                '0': createPlayerState('0', {
                    burdens: 2,
                    fellowshipArea: [
                        frodo,
                        createCompanion({ id: 'sam', title: 'Sam' }),
                    ],
                    discard: [smeagol],
                }),
                '1': createPlayerState('1'),
            },
        });
        const ability = fellowshipAbility(frodo);
        expect(canPayAbilityCost(G, frodo, ability.cost)).toBe(true);
        expect(payAbilityCost(G, frodo, ability.cost)).toBe(true);
        expect(G.players['0']!.burdens).toBe(3);
        expect(
            applyAbilityEffect(G, frodo, ability, ['smeagol'])
        ).toBe(true);
        expect(G.players['0']!.discard).toHaveLength(0);
        expect(
            G.players['0']!.fellowshipArea.map((c) => c.instanceId)
        ).toContain('smeagol');
        // toPlay de Sméagol : encore un fardeau
        expect(G.players['0']!.burdens).toBe(4);
    });

    it('sans Sméagol en défausse : pas de candidats (effet refuse)', () => {
        const frodo = realCard('5U111', 'frodo');
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    burdens: 2,
                    fellowshipArea: [frodo],
                    discard: [],
                }),
                '1': createPlayerState('1'),
            },
        });
        const ability = fellowshipAbility(frodo);
        expect(applyAbilityEffect(G, frodo, ability, [])).toBe(false);
        expect(G.players['0']!.fellowshipArea).toHaveLength(1);
    });

});
