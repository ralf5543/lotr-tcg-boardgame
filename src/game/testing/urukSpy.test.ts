import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { formatAbilityLabelParts } from '../engine/abilities/collectAbilities';
import { payAbilityCost } from '../engine/abilities/payAbilityCost';
import {
    tryOpenPutsOnTheOneRing,
    passResponseWindow,
} from '../engine/responseWindow';
import type { CardState } from '../types';
import {
    createGameState,
    createPlayerState,
    createSite,
} from './createGameState';

const CSV_TEXT =
    '**Response:** If the Ring-bearer puts on The One Ring, exert this minion.  Discard a card from the top of your draw deck for each <symbol>isengard</symbol> minion you spot.  Add a burden for each Shadow card discarded in this way.';

const realCard = (id: string, instanceId: string): CardState => {
    const card = getCardById(id);
    if (!card) throw new Error(`Carte introuvable : ${id}`);
    return { ...card, instanceId };
};

describe('Uruk Spy 1R155', () => {
    it('analyse : Response puts on ring → défausse / fardeaux', () => {
        const parsed = parseAbilities(CSV_TEXT, 'Uruk Spy', '1R155') || [];
        expect(parsed).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    phases: ['RESPONSE'],
                    trigger: { type: 'PUTS_ON_THE_ONE_RING' },
                    cost: [
                        {
                            exert: [{ count: 1, target: 'SELF' }],
                        },
                    ],
                    effects: [
                        expect.objectContaining({
                            type: 'DISCARD_TOP_OF_DECK',
                            count: 1,
                            whose: 'OWNER',
                            perSpot: { target: [['ISENGARD', 'MINION']] },
                            addBurdenPerShadowDiscarded: true,
                        }),
                    ],
                }),
            ])
        );
    });

    it('libellé : Affaiblir → défausser le dessus de la pioche', () => {
        // Après convert, la carte doit avoir l’ability.
        const source = {
            ...realCard('1R155', 'spy'),
            abilities: parseAbilities(CSV_TEXT, 'Uruk Spy', '1R155') || [],
        };
        const ability = source.abilities![0];
        const parts = formatAbilityLabelParts(ability, source);
        expect(parts.cost).toMatch(/Affaiblir/i);
        expect(parts.effect.length).toBeGreaterThan(0);
    });

    it('WEAR_RING → fenêtre PUTS_ON ; affaiblir défausse + fardeaux', () => {
        const spy = {
            ...realCard('1R155', 'spy'),
            abilities: parseAbilities(CSV_TEXT, 'Uruk Spy', '1R155') || [],
            vitality: 2,
            wounds: 0,
            culture: 'ISENGARD' as const,
            type: 'MINION' as const,
            kind: 'SHADOW' as const,
        };
        const warrior = realCard('1C156', 'warrior');

        const shadowDeck: CardState[] = [
            {
                ...realCard('1C133', 'deck-shadow'),
                kind: 'SHADOW',
            },
            {
                ...realCard('1C84', 'deck-fp'),
                kind: 'FREE_PEOPLE',
            },
        ];

        const G = createGameState({
            fpPlayerId: '0',
            players: {
                '0': createPlayerState('0', {
                    burdens: 1,
                    fellowshipArea: [
                        {
                            ...realCard('5U111', 'frodo'),
                            attachments: [realCard('4R1', 'ring')],
                        },
                    ],
                }),
                '1': createPlayerState('1', {
                    deck: shadowDeck,
                }),
            },
            path: [createSite({ id: '11S265', siteNumber: 4 })],
            battlefield: [spy, warrior],
            wearingTheOneRing: undefined,
            pendingPutsOnTheOneRing: true,
        });

        expect(tryOpenPutsOnTheOneRing(G)).toBe('WAITING');
        expect(G.pendingEvent?.type).toBe('PUTS_ON_THE_ONE_RING');
        expect(G.responseWindow?.isOpen).toBe(true);

        const ability = spy.abilities![0];
        expect(payAbilityCost(G, spy, ability.cost)).toBe(true);
        expect(applyAbilityEffect(G, spy, ability)).toBe(true);

        // 2 Isengard → 2 défaussées ; 1 Ombre + 1 FP → +1 fardeau
        expect(G.players['1']!.deck).toHaveLength(0);
        expect(G.players['1']!.discard).toHaveLength(2);
        expect(G.players['0']!.burdens).toBe(2);
        expect(spy.wounds || spy.tokens?.wound || 0).toBeGreaterThanOrEqual(1);

        expect(passResponseWindow(G, '1')).not.toBe('INVALID');
    });

});
