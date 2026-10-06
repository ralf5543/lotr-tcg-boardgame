import { describe, expect, it } from 'vitest';
import { createEngineClient } from './createEngineClient';
import {
    createCard,
    createCompanion,
    createMinion,
    createPlayerState,
} from './createGameState';
import type { Ability } from '../types';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getEffectiveVitality } from '../../utils/cardStats';

const PROTECT_ME_ABILITY: Ability = {
    id: '3R50:0',
    phases: ['MANEUVER'],
    cost: [
        {
            spot: [
                {
                    count: 1,
                    target: [['ISENGARD', 'MINION']],
                    mode: 'DESIGNATION',
                },
            ],
        },
    ],
    effects: [
        {
            type: 'EXHAUST',
            target: [['Aragorn']],
            fpMayPrevent: { addBurdens: 2 },
        },
    ],
    source: 'SELF',
    text: 'Maneuver: Spot an isengard minion to exhaust Aragorn.',
};

function protectMeSetup(burdens = 0) {
    const event = createCard({
        id: '3R50',
        title: 'Can You Protect Me From Yourself?',
        type: 'EVENT',
        kind: 'SHADOW',
        culture: 'ISENGARD',
        phases: ['MANEUVER'],
        twilightCost: 0,
        abilities: [PROTECT_ME_ABILITY],
    });
    const aragorn = createCompanion({
        id: '1R89',
        title: 'Aragorn',
        instanceId: 'dev-aragorn',
        vitality: 4,
        wounds: 0,
    });
    const uruk = createMinion({
        id: 'uruk',
        instanceId: 'dev-uruk',
        culture: 'ISENGARD',
        title: 'Uruk Scout',
        vitality: 2,
    });

    const engine = createEngineClient({
        startPhase: 'maneuver',
        playerID: '0',
        G: {
            fpPlayerId: '0',
            battlefield: [uruk],
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [aragorn],
                    burdens,
                }),
                '1': createPlayerState('1', {
                    hand: [event],
                }),
            },
        },
    });

    // Manœuvre ouvre sur le FP : passer pour donner la priorité à l’Ombre.
    engine.moves.passActionWindow();
    engine.updatePlayerID('1');
    return engine;
}

describe('parseAbilities — Spot to exhaust + FP prevent', () => {
    it('Can You Protect Me : spot isengard minion → exhaust Aragorn + FP +2 fardeaux', () => {
        const text =
            '<keyword>Maneuver:</keyword> Spot an <symbol>isengard</symbol> minion to exhaust Aragorn.  The Free Peoples player may add 2 burdens to prevent this.';
        expect(
            parseAbilities(text, 'Can You Protect Me From Yourself?', '3R50')
        ).toEqual([
            {
                id: '3R50:0',
                phases: ['MANEUVER'],
                cost: [
                    {
                        spot: [
                            {
                                count: 1,
                                target: [['ISENGARD', 'MINION']],
                                mode: 'DESIGNATION',
                            },
                        ],
                    },
                ],
                effects: [
                    {
                        type: 'EXHAUST',
                        target: [['Aragorn']],
                        fpMayPrevent: { addBurdens: 2 },
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(/Spot .* to exhaust Aragorn/i),
            },
        ]);
    });

    it('refuse leftover prevent inconnu (inerte)', () => {
        const text =
            '<keyword>Maneuver:</keyword> Spot an <symbol>isengard</symbol> minion to exhaust Aragorn. Discard a card to prevent this.';
        expect(
            parseAbilities(text, 'Can You Protect Me From Yourself?', '3R50')
        ).toBeUndefined();
    });
});

describe('EXHAUST + prévention FP (fardeaux)', () => {
    it('FP passe → Aragorn est épuisé', () => {
        const engine = protectMeSetup();

        engine.moves.playCard(0, 'dev-aragorn');

        let G = engine.getG();
        expect(G.players['1']?.discard[0]?.id).toBe('3R50');
        expect(G.pendingEvent).toEqual({
            type: 'ABOUT_TO_EXHAUST',
            targetId: 'dev-aragorn',
            addBurdens: 2,
        });
        expect(G.responseWindow?.isOpen).toBe(true);
        expect(G.responseWindow?.activePlayerId).toBe('0');
        expect(getEffectiveVitality(G.players['0']!.fellowshipArea[0]!)).toBe(
            4
        );

        engine.updatePlayerID('0');
        engine.moves.passResponseWindow();

        G = engine.getG();
        expect(G.pendingEvent).toBeUndefined();
        expect(G.responseWindow).toBeUndefined();
        expect(G.players['0']?.burdens).toBe(0);
        expect(getEffectiveVitality(G.players['0']!.fellowshipArea[0]!)).toBe(
            1
        );

        engine.stop();
    });

    it('FP ajoute 2 fardeaux → prevent, Aragorn intact', () => {
        const engine = protectMeSetup(1);

        engine.moves.playCard(0, 'dev-aragorn');
        engine.updatePlayerID('0');
        engine.moves.preventPendingEffect();

        const G = engine.getG();
        expect(G.pendingEvent).toBeUndefined();
        expect(G.responseWindow).toBeUndefined();
        expect(G.players['0']?.burdens).toBe(3);
        expect(getEffectiveVitality(G.players['0']!.fellowshipArea[0]!)).toBe(
            4
        );
        expect(G.players['0']!.fellowshipArea[0]!.wounds || 0).toBe(0);

        engine.stop();
    });

    it('sans séide isengard → jouabilité refusée', () => {
        const event = createCard({
            id: '3R50',
            title: 'Can You Protect Me From Yourself?',
            type: 'EVENT',
            kind: 'SHADOW',
            culture: 'ISENGARD',
            phases: ['MANEUVER'],
            twilightCost: 0,
            abilities: [PROTECT_ME_ABILITY],
        });
        const aragorn = createCompanion({
            id: '1R89',
            title: 'Aragorn',
            instanceId: 'dev-aragorn',
            vitality: 4,
        });
        const moria = createMinion({
            id: 'goblin',
            culture: 'MORIA',
            title: 'Goblin Runner',
        });

        const engine = createEngineClient({
            startPhase: 'maneuver',
            playerID: '0',
            G: {
                fpPlayerId: '0',
                battlefield: [moria],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [aragorn],
                    }),
                    '1': createPlayerState('1', {
                        hand: [event],
                    }),
                },
            },
        });

        engine.moves.passActionWindow();
        engine.updatePlayerID('1');
        engine.moves.playCard(0, 'dev-aragorn');
        expect(engine.getG().players['1']?.hand).toHaveLength(1);
        expect(engine.getG().pendingEvent).toBeUndefined();

        engine.stop();
    });
});
