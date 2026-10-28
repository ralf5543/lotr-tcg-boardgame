import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import { canPlayCard } from '../engine/canPlayCard';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import {
    abilityHasLegalEffectTarget,
    abilityNeedsEffectDesignation,
    getEffectDesignationCandidates,
} from '../engine/abilities/designation';
import { getHandPlayCandidates } from '../logic/playFromOutOfPlay';
import { formatAbilityLabelParts } from '../engine/abilities/collectAbilities';
import type { Ability, CardState } from '../types';
import {
    createCompanion,
    createGameState,
    createPlayerState,
} from './createGameState';

const CSV_TEXT =
    '<keyword>Skirmish:</keyword> Discard this condition to discard each minion skirmishing a Wizard. Place that Wizard in your dead pile. <br><keyword>Fellowship</keyword> or <keyword>Regroup:</keyword> Play a Wizard (even if another copy of that Wizard is in your dead pile).';

const PLAY_ABILITY: Ability = {
    id: '9R27:play-hand-dead',
    phases: ['FELLOWSHIP', 'REGROUP'],
    cost: [],
    effects: [
        {
            type: 'PLAY_FROM_HAND',
            target: [['WIZARD']],
            ignoreDeadPile: true,
        },
    ],
    source: 'SELF',
    text: 'Fellowship or Regroup: Play a Wizard (even if another copy of that Wizard is in your dead pile).',
};

const realCard = (id: string, instanceId: string): CardState => {
    const card = getCardById(id);
    if (!card) throw new Error(`Carte introuvable : ${id}`);
    return { ...card, instanceId };
};

function stateWithSentBack() {
    const sentBack = realCard('9R27', 'sent-back');
    sentBack.abilities = [...(sentBack.abilities || [])];
    const gandalfHand = realCard('1R72', 'gandalf-hand');
    const gandalfDead = realCard('4C90', 'gandalf-dead');
    const frodo = createCompanion({
        id: 'frodo',
        title: 'Frodo',
        culture: 'SHIRE',
    });
    const G = createGameState({
        twilightPool: 0,
        players: {
            '0': createPlayerState('0', {
                fellowshipArea: [frodo],
                supportArea: [sentBack],
                hand: [gandalfHand],
                deadPile: [gandalfDead],
            }),
            '1': createPlayerState('1'),
        },
    });
    return { G, sentBack, gandalfHand, gandalfDead, frodo };
}

describe('Sent Back 9R27 — jouer un Magicien malgré la pile de mort', () => {
    it('analyse CSV et markdown : Fellowship/Regroup, PLAY_FROM_HAND, ignoreDeadPile', () => {
        const fromCsv = parseAbilities(CSV_TEXT, 'Sent Back', '9R27') || [];
        const play = fromCsv.find((ab) =>
            (ab.effects || []).some(
                (e: { type?: string }) => e.type === 'PLAY_FROM_HAND'
            )
        );
        expect(play).toEqual(
            expect.objectContaining({
                phases: ['FELLOWSHIP', 'REGROUP'],
                effects: [
                    {
                        type: 'PLAY_FROM_HAND',
                        target: [['WIZARD']],
                        ignoreDeadPile: true,
                    },
                ],
            })
        );
        expect(getCardById('9R27')?.abilities?.some((ab) =>
            (ab.effects || []).some(
                (e) => e.type === 'PLAY_FROM_HAND' && e.ignoreDeadPile
            )
        )).toBe(true);
        expect(
            formatAbilityLabelParts(PLAY_ABILITY, realCard('9R27', 'sent-back'))
        ).toEqual({
            cost: '',
            effect:
                'Jouer un Magicien depuis la main (même si une autre copie est dans votre pile de mort)',
        });
    });

    it('sans la capacité : Gandalf en main est illégal (copie unique dans la pile de mort)', () => {
        const { G, gandalfHand } = stateWithSentBack();
        const check = canPlayCard(gandalfHand, {
            G,
            ctx: { phase: 'fellowship' },
            playerID: '0',
        });
        expect(check.valid).toBe(false);
        expect(
            getHandPlayCandidates(G, '0', [['WIZARD']], 'fellowship')
        ).toEqual([]);
    });

    it('avec ignoreDeadPile : Gandalf en main est un candidat, puis rejoint la communauté', () => {
        const { G, sentBack, gandalfHand } = stateWithSentBack();
        expect(
            getHandPlayCandidates(G, '0', [['WIZARD']], 'fellowship', 0, {
                ignoreDeadPileUniqueness: true,
            }).map((c) => c.instanceId)
        ).toEqual(['gandalf-hand']);
        expect(abilityHasLegalEffectTarget(G, sentBack, PLAY_ABILITY)).toBe(
            true
        );
        expect(abilityNeedsEffectDesignation(G, sentBack, PLAY_ABILITY)).toBe(
            true
        );
        expect(
            getEffectDesignationCandidates(G, sentBack, PLAY_ABILITY).map(
                (c) => c.instanceId
            )
        ).toEqual(['gandalf-hand']);

        expect(
            applyAbilityEffect(G, sentBack, PLAY_ABILITY, 'gandalf-hand')
        ).toBe(true);
        expect(G.players['0']!.fellowshipArea.map((c) => c.id)).toEqual([
            'frodo',
            '1R72',
        ]);
        expect(G.players['0']!.hand).toEqual([]);
        expect(G.players['0']!.deadPile.map((c) => c.id)).toEqual(['4C90']);
        expect(G.twilightPool).toBe(4);
    });

    it('unicité en jeu : un Gandalf déjà en communauté bloque encore', () => {
        const { G, sentBack, gandalfHand } = stateWithSentBack();
        G.players['0']!.fellowshipArea.push(
            realCard('4C90', 'gandalf-already-in-play')
        );
        // La pile de mort n’est plus le blocage, mais la copie en jeu l’est.
        G.players['0']!.deadPile = [];
        expect(
            getHandPlayCandidates(G, '0', [['WIZARD']], 'fellowship', 0, {
                ignoreDeadPileUniqueness: true,
            })
        ).toEqual([]);
        expect(abilityHasLegalEffectTarget(G, sentBack, PLAY_ABILITY)).toBe(
            false
        );
        expect(
            applyAbilityEffect(G, sentBack, PLAY_ABILITY, gandalfHand.instanceId)
        ).toBe(false);
    });
});
