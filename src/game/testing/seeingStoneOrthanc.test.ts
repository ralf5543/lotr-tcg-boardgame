import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import { applyAbilityEffect } from '../engine/abilities/applyAbilityEffect';
import { formatAbilityLabelParts } from '../engine/abilities/collectAbilities';
import {
    canPayAbilityCost,
    payAbilityCost,
} from '../engine/abilities/payAbilityCost';
import { resolveForcedChoice } from '../engine/abilities/startOfSkirmish';
import type { Ability, CardState } from '../types';
import { createEngineClient } from './createEngineClient';
import {
    createCompanion,
    createGameState,
    createPlayerState,
} from './createGameState';

const CSV_TEXT =
    'To play, spot a <symbol>gondor</symbol> Man with 3 or more vitality (or spot a <symbol>gondor</symbol> Man and add 2 threats). <br><keyword>Regroup:</keyword> Add a threat or discard this artifact to remove <symbol>twilight2</symbol> or draw a card.';

const realCard = (id: string, instanceId: string): CardState => {
    const card = getCardById(id);
    if (!card) throw new Error(`Carte introuvable : ${id}`);
    return { ...card, instanceId };
};

function chooseEffect(ability: Ability) {
    const effect = ability.effects.find((e) => e.type === 'CHOOSE_ONE');
    if (!effect || effect.type !== 'CHOOSE_ONE') {
        throw new Error('CHOOSE_ONE manquant');
    }
    return effect;
}

function stateWithStone(threats = 0) {
    const stone = realCard('9R38', 'stone');
    const frodo = createCompanion({
        id: 'frodo',
        title: 'Frodo',
        culture: 'SHIRE',
        type: 'COMPANION',
    });
    const aragorn = createCompanion({
        id: 'aragorn',
        title: 'Aragorn',
        culture: 'GONDOR',
        race: 'MAN',
        type: 'COMPANION',
    });
    const G = createGameState({
        twilightPool: 4,
        players: {
            '0': createPlayerState('0', {
                threats,
                fellowshipArea: [frodo, aragorn],
                supportArea: [stone],
                deck: [
                    realCard('1C306', 'draw-1'),
                    realCard('1C306', 'draw-2'),
                ],
            }),
            '1': createPlayerState('1'),
        },
    });
    return { G, stone };
}

describe('Seeing Stone of Orthanc 9R38 — menace ou défausse, puis crépuscule ou pioche', () => {
    it('analyse CSV : deux coûts, même CHOOSE_ONE (crépuscule / pioche)', () => {
        const fromCsv = parseAbilities(
            CSV_TEXT,
            'Seeing Stone of Orthanc',
            '9R38'
        ) || [];
        const threat = fromCsv.find((ab) => ab.cost?.[0]?.addThreats === 1);
        const discard = fromCsv.find(
            (ab) => ab.cost?.[0]?.discardFromPlay?.[0]?.target === 'SELF'
        );
        expect(threat?.phases).toEqual(['REGROUP']);
        expect(discard?.phases).toEqual(['REGROUP']);
        expect(chooseEffect(threat as Ability).options).toHaveLength(2);
        expect(chooseEffect(discard as Ability).options).toHaveLength(2);
        expect(
            getCardById('9R38')?.abilities?.filter((ab) =>
                (ab.effects || []).some((e) => e.type === 'CHOOSE_ONE')
            )
        ).toHaveLength(2);
    });

    it('bulles FR : coût + choix d’effet', () => {
        const { stone } = stateWithStone();
        const threat = stone.abilities?.find((ab) => ab.cost?.[0]?.addThreats);
        const discard = stone.abilities?.find(
            (ab) => ab.cost?.[0]?.discardFromPlay
        );
        expect(threat).toBeTruthy();
        expect(discard).toBeTruthy();
        expect(formatAbilityLabelParts(threat!, stone)).toEqual({
            cost: 'Ajouter 1 menace',
            effect: 'retirer <symbol>twilight2</symbol> ou piocher une carte',
        });
        expect(formatAbilityLabelParts(discard!, stone).cost).toMatch(
            /Défausser/i
        );
        expect(formatAbilityLabelParts(discard!, stone).effect).toBe(
            'retirer <symbol>twilight2</symbol> ou piocher une carte'
        );
    });

    it('ajouter une menace puis retirer 2 crépuscule', () => {
        const { G, stone } = stateWithStone();
        const ability = stone.abilities!.find((ab) => ab.cost?.[0]?.addThreats)!;
        expect(canPayAbilityCost(G, stone, ability.cost)).toBe(true);
        expect(payAbilityCost(G, stone, ability.cost)).toBe(true);
        expect(G.players['0']!.threats).toBe(1);
        expect(applyAbilityEffect(G, stone, ability)).toBe(true);
        expect(G.pendingForcedChoice?.title).toBe('CHOISISSEZ');
        expect(resolveForcedChoice(G, '0', 0)).toBe(true);
        expect(G.twilightPool).toBe(2);
        expect(G.players['0']!.hand).toEqual([]);
        expect(G.pendingForcedChoice).toBeUndefined();
    });

    it('ajouter une menace puis piocher', () => {
        const { G, stone } = stateWithStone();
        const ability = stone.abilities!.find((ab) => ab.cost?.[0]?.addThreats)!;
        expect(payAbilityCost(G, stone, ability.cost)).toBe(true);
        expect(applyAbilityEffect(G, stone, ability)).toBe(true);
        expect(resolveForcedChoice(G, '0', 1)).toBe(true);
        expect(G.twilightPool).toBe(4);
        expect(G.players['0']!.hand.map((c) => c.instanceId)).toEqual([
            'draw-1',
        ]);
        expect(G.players['0']!.threats).toBe(1);
    });

    it('défausser l’artefact puis piocher (source en défausse)', () => {
        const { G, stone } = stateWithStone();
        const ability = stone.abilities!.find(
            (ab) => ab.cost?.[0]?.discardFromPlay
        )!;
        expect(payAbilityCost(G, stone, ability.cost)).toBe(true);
        expect(G.players['0']!.supportArea).toEqual([]);
        expect(G.players['0']!.discard.map((c) => c.instanceId)).toEqual([
            'stone',
        ]);
        expect(applyAbilityEffect(G, stone, ability)).toBe(true);
        expect(resolveForcedChoice(G, '0', 1)).toBe(true);
        expect(G.players['0']!.hand.map((c) => c.instanceId)).toEqual([
            'draw-1',
        ]);
    });

    it('plafond de menaces : le coût « ajouter » est illégal, la défausse reste', () => {
        const { G, stone } = stateWithStone(2);
        const threat = stone.abilities!.find((ab) => ab.cost?.[0]?.addThreats)!;
        const discard = stone.abilities!.find(
            (ab) => ab.cost?.[0]?.discardFromPlay
        )!;
        expect(canPayAbilityCost(G, stone, threat.cost)).toBe(false);
        expect(canPayAbilityCost(G, stone, discard.cost)).toBe(true);
    });

});

describe('Seeing Stone 9R38 — fenêtre de ralliement', () => {
    function regroupEngine() {
        return createEngineClient({
            startPhase: 'regroup',
            G: {
                twilightPool: 4,
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [
                            createCompanion({ id: 'frodo' }),
                            createCompanion({
                                id: 'aragorn',
                                culture: 'GONDOR',
                                race: 'MAN',
                            }),
                        ],
                        supportArea: [realCard('9R38', 'stone')],
                        deck: [realCard('1C306', 'draw-1')],
                    }),
                    '1': createPlayerState('1'),
                },
            },
        });
    }

    it('le coût n’est payé qu’au choix ; puis la priorité passe à l’Ombre', () => {
        const engine = regroupEngine();
        expect(engine.getG().actionWindow?.activePlayerId).toBe('0');
        engine.moves.activateAbility('stone', '9R38:0');
        expect(engine.getG().players['0']!.threats).toBe(0);
        expect(engine.getG().pendingForcedChoice?.cancelable).toBe(true);
        engine.moves.resolveForcedChoiceMove(0);
        expect(engine.getG().players['0']!.threats).toBe(1);
        expect(engine.getG().twilightPool).toBe(2);
        expect(engine.getG().pendingForcedChoice).toBeUndefined();
        expect(engine.getG().actionWindow?.activePlayerId).toBe('1');
        engine.stop();
    });

    it('Annuler / Échap : rien n’est payé, l’artefact reste, priorité FP', () => {
        const engine = regroupEngine();
        engine.moves.activateAbility('stone', '9R38:0');
        engine.moves.cancelForcedChoiceMove();
        expect(engine.getG().pendingForcedChoice).toBeUndefined();
        expect(engine.getG().players['0']!.threats).toBe(0);
        expect(engine.getG().players['0']!.supportArea.map((c) => c.instanceId)).toEqual(
            ['stone']
        );
        expect(engine.getG().actionWindow?.activePlayerId).toBe('0');
        engine.stop();
    });

    it('défausse reportée : l’artefact part au choix, puis pioche et priorité Ombre', () => {
        const engine = regroupEngine();
        engine.moves.activateAbility('stone', '9R38:1');
        expect(engine.getG().players['0']!.supportArea).toHaveLength(1);
        engine.moves.resolveForcedChoiceMove(1);
        expect(engine.getG().players['0']!.supportArea).toEqual([]);
        expect(engine.getG().players['0']!.hand.map((c) => c.instanceId)).toEqual([
            'draw-1',
        ]);
        expect(engine.getG().actionWindow?.activePlayerId).toBe('1');
        engine.stop();
    });
});
