import { describe, expect, it } from 'vitest';
import { parsePlayFromDiscard } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import {
    canPlayCardFromDiscard,
    getPlayableFromDiscardCards,
} from '../logic/playFromOutOfPlay';
import { playCardFromDiscard } from '../moves/commonMoves';
import { getCalculatedStrength } from '../logic/stats/statCalculator';
import { applyDevPreset } from '../dev/presets';
import type { CardState } from '../types';
import {
    createCard,
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
    createSkirmishActionWindow,
} from './createGameState';

const EVENT_TEXT =
    'Spot Gollum or Sméagol to make a Nazgûl, <symbol>sauron</symbol> minion or <symbol>gollum</symbol> minion strength +2. If you have initiative, you may play this event from your discard pile; place it under your draw deck instead of discarding it.';
const CONDITION_TEXT =
    'To play, spot Gollum or Sméagol. Bearer must be a minion. Limit 1 per bearer. Bearer is Damage +1. If you have initiative during the Shadow phase, you may play this condition from your discard pile.';

const realCard = (id: string, instanceId: string): CardState => {
    const card = getCardById(id);
    if (!card) throw new Error(`Carte introuvable : ${id}`);
    return { ...card, instanceId };
};

const filler = (id: string): CardState =>
    createCard({ id, instanceId: id, kind: 'SHADOW', type: 'MINION' });

/** Ombre avec initiative (main des Peuples Libres < 4), Gollum + Nazgûl en jeu. */
function baseState(fpHandCount: number) {
    const gollum = createMinion({
        id: 'gollum',
        title: 'Gollum',
        culture: 'GOLLUM',
        strength: 5,
    });
    const nazgul = createMinion({
        id: 'nazgul',
        title: 'Úlairë Attëa',
        race: 'NAZGÛL',
        culture: 'WRAITH',
        strength: 12,
    });
    const event = realCard('7R61', 'event-61');
    const condition = realCard('7R63', 'condition-63');
    const G = createGameState({
        twilightPool: 10,
        ...createSkirmishActionWindow('sk-1', '1'),
        skirmishes: [
            { id: 'sk-1', companionId: 'aragorn', minionIds: ['nazgul'] },
        ],
        battlefield: [gollum, nazgul],
        players: {
            '0': createPlayerState('0', {
                hand: Array.from({ length: fpHandCount }, (_, i) =>
                    createCompanion({ id: `fp-hand-${i}` })
                ),
                fellowshipArea: [
                    createCompanion({ id: 'aragorn', title: 'Aragorn' }),
                ],
            }),
            '1': createPlayerState('1', {
                discard: [event, condition],
                deck: [filler('deck-a'), filler('deck-b')],
            }),
        },
    });
    return { G, gollum, nazgul, event, condition };
}

describe('Jouer depuis la défausse si initiative (7R61 / 7R63)', () => {
    it('analyse : les deux clauses sont reconnues, formes proches refusées', () => {
        expect(parsePlayFromDiscard(EVENT_TEXT)).toEqual({
            requiresInitiative: true,
            underDeckInsteadOfDiscard: true,
        });
        expect(parsePlayFromDiscard(CONDITION_TEXT)).toEqual({
            requiresInitiative: true,
            phase: 'SHADOW',
        });
        expect(
            parsePlayFromDiscard('You may play this event from your discard pile.')
        ).toBeUndefined();
        expect(getCardById('7R61')?.playFromDiscard).toEqual({
            requiresInitiative: true,
            underDeckInsteadOfDiscard: true,
        });
        expect(getCardById('7R63')?.playFromDiscard).toEqual({
            requiresInitiative: true,
            phase: 'SHADOW',
        });
    });

    it('initiative côté Ombre : l’événement est jouable depuis la défausse en escarmouche', () => {
        const { G, event } = baseState(3);
        expect(
            canPlayCardFromDiscard(G, '1', event, 'skirmish').valid
        ).toBe(true);
        expect(
            getPlayableFromDiscardCards(G, '1', 'skirmish').map((c) => c.id)
        ).toEqual(['7R61']);
    });

    it('sans initiative (main des Peuples Libres de 4 cartes) : rien n’est jouable', () => {
        const { G, event } = baseState(4);
        const check = canPlayCardFromDiscard(G, '1', event, 'skirmish');
        expect(check.valid).toBe(false);
        expect(getPlayableFromDiscardCards(G, '1', 'skirmish')).toEqual([]);
    });

    it('7R63 : jouable depuis la défausse en phase d’Ombre seulement', () => {
        const { G, condition } = baseState(3);
        expect(
            canPlayCardFromDiscard(G, '1', condition, 'shadow').valid
        ).toBe(true);
        expect(
            canPlayCardFromDiscard(G, '1', condition, 'skirmish').valid
        ).toBe(false);
    });

    it('move 7R61 : Nazgûl +2, événement sous la pioche, crépuscule payé', () => {
        const { G, nazgul } = baseState(3);
        const result = playCardFromDiscard(
            { G, ctx: { phase: 'skirmish', currentPlayer: '1' }, playerID: '1' } as never,
            'event-61',
            ['gollum', 'nazgul']
        );
        expect(result).not.toBe('INVALID_MOVE');
        expect(getCalculatedStrength(G, nazgul)).toBe(14);
        expect(G.twilightPool).toBe(9);
        const shadow = G.players['1']!;
        expect(shadow.discard.map((c) => c.id)).toEqual(['7R63']);
        // Sous la pioche = dernière carte de la pioche.
        expect(shadow.deck.map((c) => c.id)).toEqual([
            'deck-a',
            'deck-b',
            '7R61',
        ]);
    });

    it('move 7R61 sans initiative : refusé, la carte reste en défausse', () => {
        const { G } = baseState(4);
        const result = playCardFromDiscard(
            { G, ctx: { phase: 'skirmish', currentPlayer: '1' }, playerID: '1' } as never,
            'event-61',
            ['gollum', 'nazgul']
        );
        expect(result).toBe('INVALID_MOVE');
        expect(G.players['1']!.discard.map((c) => c.id)).toEqual([
            '7R61',
            '7R63',
        ]);
        expect(G.twilightPool).toBe(10);
    });

    it('move 7R63 : attachée au séide désigné, limite 1 par porteur', () => {
        const { G } = baseState(3);
        const ctx = {
            G,
            ctx: { phase: 'shadow', currentPlayer: '1' },
            playerID: '1',
        } as never;
        expect(playCardFromDiscard(ctx, 'condition-63', 'nazgul')).not.toBe(
            'INVALID_MOVE'
        );
        const nazgul = G.battlefield!.find((c) => c.id === 'nazgul')!;
        expect(nazgul.attachments?.map((c) => c.id)).toEqual(['7R63']);
        expect(G.players['1']!.discard.map((c) => c.id)).toEqual(['7R61']);
        expect(G.twilightPool).toBe(9);
    });

    it('preset DEV : défausse Ombre avec les deux cartes, initiative Ombre', () => {
        const G = createGameState();
        applyDevPreset(G, 'DECK_GAPS_HOBBITSES');

        const shadow = G.players['1']!;
        expect(shadow.discard.map((c) => c.id)).toEqual(['7R61', '7R63']);
        expect(shadow.discard[0]?.playFromDiscard).toBeTruthy();
        expect(shadow.hand.map((c) => c.id)).toEqual(['7R58', '7R210']);
        expect((G.players['0']!.hand || []).length).toBeLessThan(4);
        expect(G.path).toHaveLength(9);
    });
});
