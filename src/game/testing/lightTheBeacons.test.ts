import { describe, expect, it } from 'vitest';
import { getCardById } from '../cardsData';
import { applyDevPreset } from '../dev/presets';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { formatAbilityLabelParts } from '../engine/abilities/collectAbilities';
import {
    cancelForcedChoice,
    resolveForcedChoice,
} from '../engine/abilities/startOfSkirmish';
import { applyEventAbility } from '../engine/abilities/playEventAbility';
import { canPayAbilityCost, payAbilityCost } from '../engine/abilities/payAbilityCost';
import { getCalculatedStrength } from '../logic/stats/statCalculator';
import type { Ability, CardState } from '../types';
import {
    createGameState,
    createPlayerState,
} from './createGameState';

const realCard = (id: string, instanceId: string): CardState => {
    const card = getCardById(id);
    if (!card) throw new Error(`Carte introuvable : ${id}`);
    return { ...card, instanceId };
};

describe('Light the Beacons 7R43', () => {
    it('exception : Manœuvre, exert ×3 / ×2 initiative, CHOOSE_ONE cultures', () => {
        const card = getCardById('7R43');
        expect(card?.abilities).toHaveLength(1);
        const ability = card!.abilities![0] as Ability;
        expect(ability.phases).toEqual(['MANEUVER']);
        expect(ability.cost[0]?.exert?.[0]).toEqual(
            expect.objectContaining({
                count: 3,
                countIfInitiative: 2,
                target: [['Gandalf']],
            })
        );
        const choose = ability.effects.find((e) => e.type === 'CHOOSE_ONE');
        expect(choose?.type).toBe('CHOOSE_ONE');
        if (choose?.type === 'CHOOSE_ONE') {
            expect(choose.options.length).toBeGreaterThanOrEqual(5);
            expect(
                choose.options.every((o) =>
                    o.effects.some(
                        (e) =>
                            e.type === 'ADD_TEMP_STAT' &&
                            e.all === true &&
                            e.value === 3
                    )
                )
            ).toBe(true);
        }

        const parts = formatAbilityLabelParts(ability, card!);
        expect(parts.cost).toMatch(/Gandalf/i);
        expect(parts.cost).toMatch(/initiative/i);
    });

    it('sans initiative : affaiblir ×3 ; choix Gondor → Faramir +3', () => {
        const beacons = realCard('7R43', 'beacons');
        const ability = beacons.abilities![0] as Ability;
        const gandalf = realCard('8R15', 'gandalf');
        const faramir = realCard('7R91', 'faramir');
        const merry = realCard('1R302', 'merry');
        const frodo = {
            ...realCard('1C290', 'frodo'),
            keywords: ['RING-BEARER', 'RING-BOUND'] as const,
        };
        const G = createGameState({
            fpPlayerId: '0',
            twilightPool: 10,
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo, gandalf, faramir, merry],
                    // 3 cartes → pas d’initiative après jeu
                    hand: [
                        beacons,
                        realCard('1C305', 'pad1'),
                        realCard('1C305', 'pad2'),
                    ],
                }),
                '1': createPlayerState('1'),
            },
        });

        expect(canPayAbilityCost(G, beacons, ability.cost)).toBe(true);
        expect(payAbilityCost(G, beacons, ability.cost)).toBe(true);
        expect(gandalf.wounds || gandalf.tokens?.wound || 0).toBeGreaterThanOrEqual(
            3
        );

        const beforeFaramir = getCalculatedStrength(G, faramir);
        const beforeMerry = getCalculatedStrength(G, merry);

        expect(applyAbilityEffect(G, beacons, ability)).toBe(true);
        expect(G.pendingForcedChoice?.options.length).toBeGreaterThanOrEqual(5);

        const gondorIndex = G.pendingForcedChoice!.options.findIndex((o) =>
            /gondor/i.test(o.label)
        );
        expect(gondorIndex).toBeGreaterThanOrEqual(0);
        // Event déjà en défausse (comme au jeu) — source retrouvée.
        G.players['0']!.discard = [beacons];
        expect(resolveForcedChoice(G, '0', gondorIndex)).toBe(true);

        expect(getCalculatedStrength(G, faramir)).toBe(beforeFaramir + 3);
        expect(getCalculatedStrength(G, merry)).toBe(beforeMerry);
    });

    it('avec initiative : affaiblir ×2', () => {
        const beacons = realCard('7R43', 'beacons');
        const ability = beacons.abilities![0] as Ability;
        const gandalf = realCard('8R15', 'gandalf');
        const G = createGameState({
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        {
                            ...realCard('1C290', 'frodo'),
                            keywords: ['RING-BEARER', 'RING-BOUND'],
                        },
                        gandalf,
                    ],
                    hand: [
                        beacons,
                        realCard('1C305', 'a'),
                        realCard('1C305', 'b'),
                        realCard('1C305', 'c'),
                        realCard('1C305', 'd'),
                    ],
                }),
                '1': createPlayerState('1'),
            },
        });
        // Simule l’événement déjà sorti de la main (4 cartes restantes).
        G.players['0']!.hand = G.players['0']!.hand!.filter(
            (c) => c.instanceId !== 'beacons'
        );
        expect(G.players['0']!.hand).toHaveLength(4);
        expect(payAbilityCost(G, beacons, ability.cost)).toBe(true);
        expect(gandalf.wounds || gandalf.tokens?.wound || 0).toBe(2);
    });

    it('événement : coût reporté, Annuler rend la carte et le crépuscule', () => {
        const beacons = realCard('7R43', 'beacons');
        const gandalf = realCard('8R15', 'gandalf');
        const G = createGameState({
            fpPlayerId: '0',
            twilightPool: 0,
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        {
                            ...realCard('1C290', 'frodo'),
                            keywords: ['RING-BEARER', 'RING-BOUND'],
                        },
                        gandalf,
                        realCard('7R91', 'faramir'),
                    ],
                    hand: [
                        realCard('1C305', 'a'),
                        realCard('1C305', 'b'),
                        realCard('1C305', 'c'),
                        realCard('1C305', 'd'),
                    ],
                    discard: [],
                }),
                '1': createPlayerState('1'),
            },
        });
        // Comme playCard : crépuscule déjà payé, événement en défausse.
        G.twilightPool = 3;
        G.players['0']!.discard = [beacons];
        expect(applyEventAbility(G, beacons, 'maneuver')).toBe(true);
        expect(G.pendingForcedChoice?.cancelable).toBe(true);
        expect(G.pendingForcedChoice?.unpaidCost).toBeTruthy();
        expect(gandalf.wounds || 0).toBe(0);

        G.pendingForcedChoice!.cancelRestoreEvent = {
            playerId: '0',
            twilightDelta: -3,
        };
        expect(cancelForcedChoice(G, '0')).toBe(true);
        expect(G.pendingForcedChoice).toBeUndefined();
        expect(G.players['0']!.hand?.some((c) => c.id === '7R43')).toBe(true);
        expect(G.players['0']!.discard).toHaveLength(0);
        expect(G.twilightPool).toBe(0);
    });

    it('preset DEV : Beacons en main + Gandalf + Faramir + Merry', () => {
        const G = createGameState();
        applyDevPreset(G, 'DECK_GAPS_LIGHT_THE_BEACONS');
        expect(G.players['0']!.hand?.some((c) => c.id === '7R43')).toBe(true);
        expect(
            G.players['0']!.fellowshipArea?.some((c) => c.id === '8R15')
        ).toBe(true);
        expect(G.players['0']!.hand).toHaveLength(5);
        expect(G.players['0']!.hand?.every((c) => c.id !== '1C84')).toBe(true);
    });
});
