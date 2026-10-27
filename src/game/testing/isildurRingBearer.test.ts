import { describe, expect, it } from 'vitest';
import {
    applyStartOfSkirmishTriggers,
    resolveForcedChoice,
} from '../engine/abilities/startOfSkirmish';
import type { Ability, CardState } from '../types';
import {
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
} from './createGameState';
import { applyDevPreset } from '../dev/presets';
import { isRingBearerCard } from '../../utils/cardUtils';

const ISILDUR_ABILITY: Ability = {
    id: '9R+33:0:rb-start-choice-exert',
    phases: [],
    trigger: {
        type: 'START_OF_SKIRMISH',
        involving: 'SELF',
        whileRingBearer: true,
    },
    cost: [],
    effects: [
        {
            type: 'CHOOSE_ONE',
            options: [
                {
                    label: 'Ajouter 2 fardeaux',
                    effects: [{ type: 'ADD_BURDENS', count: 2 }],
                },
                {
                    label: 'Exercer 3 compagnons',
                    effects: [
                        {
                            type: 'EXERT',
                            count: 1,
                            multiCount: 3,
                            target: [['COMPANION']],
                        },
                    ],
                },
            ],
        },
    ],
    source: 'SELF',
    text: 'While Isildur is the Ring-bearer, at the start of each skirmish involving him, add 2 burdens or exert 3 companions.',
};

function isildurCompanion(): CardState {
    return createCompanion({
        id: 'isildur',
        title: 'Isildur',
        keywords: ['RING-BEARER'],
        abilities: [ISILDUR_ABILITY],
    });
}

function stateWithFellowship(fellowship: CardState[]) {
    return createGameState({
        skirmishes: [
            { id: 'sk-1', companionId: 'isildur', minionIds: ['orc'] },
        ],
        battlefield: [createMinion({ id: 'orc' })],
        players: {
            '0': createPlayerState('0', {
                burdens: 1,
                fellowshipArea: fellowship,
            }),
            '1': createPlayerState('1'),
        },
    });
}

describe('Isildur RB — début d’escarmouche', () => {
    it('ouvre le choix forcé quand Isildur (Porteur) entre en escarmouche', () => {
        const G = stateWithFellowship([isildurCompanion()]);

        expect(applyStartOfSkirmishTriggers(G, 'sk-1')).toBe(true);
        expect(G.pendingForcedChoice).toMatchObject({
            playerId: '0',
            abilityId: ISILDUR_ABILITY.id,
            skirmishId: 'sk-1',
        });
    });

    it('ne se déclenche pas si Isildur n’est pas le Porteur', () => {
        const notBearer = createCompanion({
            id: 'isildur',
            title: 'Isildur',
            abilities: [ISILDUR_ABILITY],
        });
        const G = stateWithFellowship([notBearer]);

        expect(applyStartOfSkirmishTriggers(G, 'sk-1')).toBe(false);
        expect(G.pendingForcedChoice).toBeUndefined();
    });

    it('option fardeaux : +2 fardeaux, aucun exercice', () => {
        const isildur = isildurCompanion();
        const G = stateWithFellowship([isildur]);
        applyStartOfSkirmishTriggers(G, 'sk-1');

        expect(resolveForcedChoice(G, '0', 0)).toBe(true);
        expect(G.pendingForcedChoice).toBeUndefined();
        expect(G.players['0']?.burdens).toBe(3);
        expect(isildur.wounds || 0).toBe(0);
    });

    it('option exercer : demande 3 désignations, puis exerce 3 compagnons distincts', () => {
        const isildur = isildurCompanion();
        const aragorn = createCompanion({ id: 'aragorn', title: 'Aragorn' });
        const legolas = createCompanion({ id: 'legolas', title: 'Legolas' });
        const gimli = createCompanion({ id: 'gimli', title: 'Gimli' });
        const G = stateWithFellowship([isildur, aragorn, legolas, gimli]);
        applyStartOfSkirmishTriggers(G, 'sk-1');

        // Premier clic : en attente de désignation.
        expect(resolveForcedChoice(G, '0', 1)).toBe(true);
        expect(G.pendingForcedChoice).toMatchObject({
            pendingOptionIndex: 1,
            needsExertTargets: 3,
        });
        expect(aragorn.wounds || 0).toBe(0);

        expect(
            resolveForcedChoice(G, '0', 1, undefined, [
                'aragorn',
                'legolas',
                'gimli',
            ])
        ).toBe(true);
        expect(G.pendingForcedChoice).toBeUndefined();
        expect(G.players['0']?.burdens).toBe(1);
        expect(aragorn.wounds).toBe(1);
        expect(legolas.wounds).toBe(1);
        expect(gimli.wounds).toBe(1);
        expect(isildur.wounds || 0).toBe(0);
    });

    it('option exercer refusée si moins de 3 compagnons exerçables', () => {
        const isildur = isildurCompanion();
        const exhausted = createCompanion({
            id: 'fatigue',
            title: 'Fatigué',
            wounds: 2,
        });
        const G = stateWithFellowship([isildur, exhausted]);
        applyStartOfSkirmishTriggers(G, 'sk-1');

        expect(resolveForcedChoice(G, '0', 1)).toBe(false);
        // Le choix reste ouvert : il faut prendre les fardeaux.
        expect(G.pendingForcedChoice).toBeDefined();
        expect(resolveForcedChoice(G, '0', 0)).toBe(true);
        expect(G.players['0']?.burdens).toBe(3);
    });

    it('preset DEV : Isildur Porteur, 3 compagnons, 2 séides pour 2 combats', () => {
        const G = createGameState();
        applyDevPreset(G, 'DECK_GAPS_ISILDUR');

        const fellowship = G.players['0']?.fellowshipArea || [];
        expect(fellowship.map((c) => c.id)).toEqual([
            '9R+33',
            '1R89',
            '1R13',
            '1C311',
        ]);
        expect(isRingBearerCard(fellowship[0])).toBe(true);
        expect(fellowship[0]?.abilities?.length).toBeGreaterThan(0);
        expect(G.players['0']?.burdens).toBe(4);
        expect(G.players['1']?.hand).toHaveLength(2);
        expect(G.path).toHaveLength(9);
        expect(G.currentSiteIndex).toBe(0);
    });

    it('désignations en double refusées', () => {
        const isildur = isildurCompanion();
        const aragorn = createCompanion({ id: 'aragorn', title: 'Aragorn' });
        const legolas = createCompanion({ id: 'legolas', title: 'Legolas' });
        const gimli = createCompanion({ id: 'gimli', title: 'Gimli' });
        const G = stateWithFellowship([isildur, aragorn, legolas, gimli]);
        applyStartOfSkirmishTriggers(G, 'sk-1');
        resolveForcedChoice(G, '0', 1);

        expect(
            resolveForcedChoice(G, '0', 1, undefined, [
                'aragorn',
                'aragorn',
                'gimli',
            ])
        ).toBe(false);
        expect(G.pendingForcedChoice).toBeDefined();
        expect(aragorn.wounds || 0).toBe(0);
    });
});
