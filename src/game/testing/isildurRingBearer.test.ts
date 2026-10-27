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
import { getCalculatedStrength } from '../logic/stats/statCalculator';
import { createCard } from './createGameState';

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
                    label: 'Affaiblir 3 compagnons',
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

    it('option fardeaux : +2 fardeaux, aucun affaiblissement', () => {
        const isildur = isildurCompanion();
        const G = stateWithFellowship([isildur]);
        applyStartOfSkirmishTriggers(G, 'sk-1');

        expect(resolveForcedChoice(G, '0', 0)).toBe(true);
        expect(G.pendingForcedChoice).toBeUndefined();
        expect(G.players['0']?.burdens).toBe(3);
        expect(isildur.wounds || 0).toBe(0);
    });

    it('option affaiblir : demande 3 désignations, puis affaiblit 3 compagnons distincts', () => {
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

    it('option affaiblir refusée si moins de 3 compagnons affaiblissables', () => {
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

    it('2ᵉ clause : chevalier du Gondor force +1 si Isildur porte l’Anneau ou un artefact', () => {
        const knightAbility: Ability = {
            id: '9R+33:1:while-bearing-ring-artifact',
            phases: [],
            trigger: {
                type: 'WHILE',
                bearing: { target: [['RING'], ['ARTIFACT']] },
            },
            cost: [],
            effects: [
                {
                    type: 'MODIFY_STAT',
                    stat: 'STRENGTH',
                    value: 1,
                    target: [['GONDOR', 'KNIGHT']],
                },
            ],
            source: 'SELF',
            text: 'While Isildur bears The One Ring or an artifact, each Gondor knight is strength +1.',
        };
        const ring = createCard({
            id: 'ring',
            kind: 'FREE_PEOPLE',
            type: 'RING',
        });
        const artifact = createCard({
            id: 'artifact',
            kind: 'FREE_PEOPLE',
            type: 'ARTIFACT',
        });
        const knight = () =>
            createCompanion({
                id: 'knight',
                title: 'Chevalier',
                strength: 6,
                keywords: ['KNIGHT'],
            });
        const nonKnight = () =>
            createCompanion({ id: 'sam', title: 'Sam', strength: 3 });

        const withRing = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        {
                            ...isildurCompanion(),
                            abilities: [knightAbility],
                            attachments: [ring],
                        },
                        knight(),
                        nonKnight(),
                    ],
                }),
                '1': createPlayerState('1'),
            },
        });
        const fellowshipRing = withRing.players['0']?.fellowshipArea || [];
        expect(getCalculatedStrength(withRing, fellowshipRing[1])).toBe(7);
        // Pas chevalier : aucun bonus.
        expect(getCalculatedStrength(withRing, fellowshipRing[2])).toBe(3);

        const withArtifact = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        {
                            ...isildurCompanion(),
                            abilities: [knightAbility],
                            attachments: [artifact],
                        },
                        knight(),
                    ],
                }),
                '1': createPlayerState('1'),
            },
        });
        const fellowshipArtifact =
            withArtifact.players['0']?.fellowshipArea || [];
        expect(
            getCalculatedStrength(withArtifact, fellowshipArtifact[1])
        ).toBe(7);

        const bare = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        {
                            ...isildurCompanion(),
                            abilities: [knightAbility],
                        },
                        knight(),
                    ],
                }),
                '1': createPlayerState('1'),
            },
        });
        const fellowshipBare = bare.players['0']?.fellowshipArea || [];
        expect(getCalculatedStrength(bare, fellowshipBare[1])).toBe(6);
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
