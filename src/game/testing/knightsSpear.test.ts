import { describe, expect, it } from 'vitest';
import { createEngineClient } from './createEngineClient';
import {
    createCard,
    createCompanion,
    createMinion,
    createPlayerState,
    createSkirmishActionWindow,
} from './createGameState';
import type { Ability } from '../types';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCalculatedStrength } from '../logic/stats/statCalculator';

const SPEAR_ABILITY: Ability = {
    id: '7C108:0',
    phases: ['SKIRMISH'],
    cost: [{ cannotSpotThreats: 2, addThreats: 1 }],
    effects: [
        {
            type: 'ADD_TEMP_STAT',
            stat: 'STRENGTH',
            value: 1,
            target: 'BEARER',
            expiresAtPhase: 'SKIRMISH',
        },
    ],
    source: 'ATTACHMENT',
    text: 'Skirmish: If you cannot spot 2 threats, add a threat to make bearer strength +1.',
};

describe('parseAbilities — cannot spot threats + add threat make', () => {
    it("Knight's Spear : if cannot spot 2 threats, add threat → make bearer +1", () => {
        const text =
            'Bearer must be a <symbol>gondor</symbol> Man. <br><keyword>Skirmish:</keyword> If you cannot spot 2 threats, add a threat to make bearer strength +1.';
        expect(parseAbilities(text, "Knight's Spear", '7C108')).toEqual([
            {
                id: '7C108:0',
                phases: ['SKIRMISH'],
                cost: [{ cannotSpotThreats: 2, addThreats: 1 }],
                effects: [
                    {
                        type: 'ADD_TEMP_STAT',
                        stat: 'STRENGTH',
                        value: 1,
                        target: 'BEARER',
                        expiresAtPhase: 'SKIRMISH',
                    },
                ],
                source: 'ATTACHMENT',
                text: expect.stringMatching(
                    /If you cannot spot 2 threats, add a threat to make bearer strength \+1/i
                ),
            },
        ]);
    });
});

describe("Knight's Spear — runtime", () => {
    function setup(threats: number, companionCount = 2) {
        const spear = createCard({
            id: '7C108',
            title: "Knight's Spear",
            type: 'POSSESSION',
            kind: 'FREE_PEOPLE',
            culture: 'GONDOR',
            actionPhases: ['SKIRMISH'],
            abilities: [SPEAR_ABILITY],
        });
        const knight = createCompanion({
            id: 'knight',
            title: 'Gondor Knight',
            instanceId: 'dev-knight',
            culture: 'GONDOR',
            race: 'MAN',
            strength: 6,
            vitality: 3,
            attachments: [spear],
        });
        const extras = Array.from({ length: companionCount - 1 }, (_, i) =>
            createCompanion({
                id: `extra-${i}`,
                title: `Companion ${i}`,
                instanceId: `dev-extra-${i}`,
                strength: 5,
                vitality: 3,
            })
        );
        const orc = createMinion({
            id: 'orc',
            instanceId: 'dev-orc',
            strength: 5,
            vitality: 2,
        });

        return createEngineClient({
            startPhase: 'skirmish',
            playerID: '0',
            G: {
                ...createSkirmishActionWindow('skirmish_dev-knight'),
                battlefield: [orc],
                skirmishes: [
                    {
                        id: 'skirmish_dev-knight',
                        companionId: 'dev-knight',
                        minionIds: ['dev-orc'],
                    },
                ],
                players: {
                    '0': createPlayerState('0', {
                        fellowshipArea: [knight, ...extras],
                        threats,
                    }),
                    '1': createPlayerState('1'),
                },
            },
        });
    }

    it('0 menace : ajoute 1 menace et +1 force au porteur', () => {
        const engine = setup(0);

        engine.moves.activateAbility('7C108', '7C108:0');

        const G = engine.getG();
        const knight = G.players['0']?.fellowshipArea[0];
        expect(G.players['0']?.threats).toBe(1);
        expect(getCalculatedStrength(G, knight)).toBe(7);

        engine.stop();
    });

    it('1 menace : encore jouable (cannot spot 2)', () => {
        const engine = setup(1);

        engine.moves.activateAbility('7C108', '7C108:0');

        const G = engine.getG();
        expect(G.players['0']?.threats).toBe(2);
        expect(
            getCalculatedStrength(G, G.players['0']?.fellowshipArea[0])
        ).toBe(7);

        engine.stop();
    });

    it('2 menaces : capacité refusée', () => {
        const engine = setup(2);

        engine.moves.activateAbility('7C108', '7C108:0');

        const G = engine.getG();
        expect(G.players['0']?.threats).toBe(2);
        expect(
            getCalculatedStrength(G, G.players['0']?.fellowshipArea[0])
        ).toBe(6);

        engine.stop();
    });
});
