import { describe, expect, it } from 'vitest';
import {
    addThreats,
    beginThreatWoundAssignment,
    canAddThreats,
    countCompanionsInPlay,
    getThreatLimit,
} from './threats';
import {
    createCompanion,
    createGameState,
    createPlayerState,
} from '../testing/createGameState';

const withCompanions = (count: number, threats = 0) =>
    createGameState({
        players: {
            '0': createPlayerState('0', {
                threats,
                fellowshipArea: Array.from({ length: count }, (_, i) =>
                    createCompanion({ id: `comp-${i}` })
                ),
            }),
        },
    });

describe('countCompanionsInPlay', () => {
    it('ignore les alliés', () => {
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [
                        createCompanion({ id: 'aragorn' }),
                        createCompanion({ id: 'elrond', type: 'ALLY' }),
                    ],
                }),
            },
        });
        expect(countCompanionsInPlay(G)).toBe(1);
    });
});

describe('addThreats', () => {
    it('plafonne à l’ajout au nombre de compagnons', () => {
        const G = withCompanions(3, 2);
        expect(getThreatLimit(G)).toBe(3);
        expect(addThreats(G, 5)).toBe(1);
        expect(G.players['0']?.threats).toBe(3);
        expect(canAddThreats(G)).toBe(false);
        expect(addThreats(G, 1)).toBe(0);
    });

    it('n’ajoute rien s’il n’y a plus de compagnons', () => {
        const G = withCompanions(0, 0);
        expect(addThreats(G, 2)).toBe(0);
        expect(G.players['0']?.threats).toBe(0);
    });

    it('ne rabote pas un total déjà au-dessus de la limite', () => {
        const G = withCompanions(2, 4);
        expect(addThreats(G, 1)).toBe(0);
        expect(G.players['0']?.threats).toBe(4);
    });

    it('retire sans passer sous zéro', () => {
        const G = withCompanions(3, 2);
        expect(addThreats(G, -5)).toBe(-2);
        expect(G.players['0']?.threats).toBe(0);
    });
});

describe('beginThreatWoundAssignment', () => {
    it('retire les menaces et ouvre l’assignation sur les compagnons restants', () => {
        const G = withCompanions(3, 2);
        beginThreatWoundAssignment(G);
        expect(G.players['0']?.threats).toBe(0);
        expect(G.threatWoundsToAssign).toBe(2);
    });

    it('ne relance pas une assignation déjà en cours', () => {
        const G = withCompanions(3, 2);
        G.threatWoundsToAssign = 1;
        beginThreatWoundAssignment(G);
        expect(G.players['0']?.threats).toBe(2);
        expect(G.threatWoundsToAssign).toBe(1);
    });

    it('retire les menaces sans assignation s’il n’y a plus de compagnon', () => {
        const G = withCompanions(0, 3);
        beginThreatWoundAssignment(G);
        expect(G.players['0']?.threats).toBe(0);
        expect(G.threatWoundsToAssign).toBeUndefined();
    });
});
