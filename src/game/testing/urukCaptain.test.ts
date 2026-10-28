import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { formatAbilityLabelParts } from '../engine/abilities/collectAbilities';
import {
    canPayAbilityCost,
    payAbilityCost,
} from '../engine/abilities/payAbilityCost';
import { applyDevPreset } from '../dev/presets';
import type { Ability, CardState } from '../types';
import {
    createCompanion,
    createGameState,
    createPlayerState,
} from './createGameState';

const CSV_TEXT =
    '<keyword>Damage +1.</keyword> <br><keyword>Shadow:</keyword> Remove <symbol>twilight1</symbol> and exert Uruk Captain to play an Uruk-hai from your discard pile.';

const realCard = (id: string, instanceId: string): CardState => {
    const card = getCardById(id);
    if (!card) throw new Error(`Carte introuvable : ${id}`);
    return { ...card, instanceId };
};

function shadowAbility(card: CardState): Ability {
    const ability = (card.abilities || []).find((ab) =>
        (ab.effects || []).some((e) => e.type === 'PLAY_FROM_DECK_OR_DISCARD')
    );
    if (!ability) throw new Error('Capacité Ombre manquante');
    return ability;
}

describe('Uruk Captain 2R46 — Ourouk depuis la défausse', () => {
    it('analyse CSV : crépuscule + affaiblir SELF → URUK-HAI défausse', () => {
        const fromCsv =
            parseAbilities(CSV_TEXT, 'Uruk Captain', '2R46') || [];
        expect(fromCsv).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    phases: ['SHADOW'],
                    cost: [
                        {
                            removeTwilight: 1,
                            exert: [{ count: 1, target: 'SELF' }],
                        },
                    ],
                    effects: [
                        {
                            type: 'PLAY_FROM_DECK_OR_DISCARD',
                            from: 'DISCARD',
                            target: [['URUK-HAI']],
                        },
                    ],
                }),
            ])
        );
        expect(
            getCardById('2R46')?.abilities?.some((ab) =>
                (ab.effects || []).some(
                    (e) =>
                        e.type === 'PLAY_FROM_DECK_OR_DISCARD' &&
                        e.from === 'DISCARD'
                )
            )
        ).toBe(true);
    });

    it('bulle FR : coût + jouer un Ourouk depuis la défausse', () => {
        const captain = realCard('2R46', 'captain');
        const ability = shadowAbility(captain);
        const parts = formatAbilityLabelParts(ability, captain);
        expect(parts.cost.toLowerCase()).toMatch(/crépuscule|twilight|affaibl/);
        expect(parts.effect.toLowerCase()).toMatch(/défausse/);
    });

    it('joue l’Ourouk de la défausse (paie crépuscule + affaiblit)', () => {
        const captain = realCard('2R46', 'captain');
        const uruk = realCard('11C195', 'uruk');
        const G = createGameState({
            twilightPool: 6,
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        createCompanion({ id: 'frodo' }),
                    ],
                }),
                '1': createPlayerState('1', {
                    discard: [uruk],
                }),
            },
            battlefield: [captain],
        });
        const ability = shadowAbility(captain);
        expect(canPayAbilityCost(G, captain, ability.cost)).toBe(true);
        expect(payAbilityCost(G, captain, ability.cost)).toBe(true);
        expect(G.twilightPool).toBe(5);
        expect(captain.exerted ?? captain.wounds).toBeTruthy();
        expect(
            applyAbilityEffect(G, captain, ability, ['uruk'], undefined, undefined, '1')
        ).toBe(true);
        expect(G.players['1']!.discard).toHaveLength(0);
        expect(G.battlefield.map((c) => c.instanceId)).toContain('uruk');
    });

    it('preset DEV : Capitaine + Ourouk en défausse', () => {
        const G = createGameState();
        applyDevPreset(G, 'DECK_GAPS_URUK_CAPTAIN');
        expect(G.battlefield.map((c) => c.id)).toEqual(['2R46']);
        expect(G.players['1']!.discard.map((c) => c.id)).toEqual(['11C195']);
        expect(G.twilightPool).toBe(6);
    });
});
