import { describe, expect, it } from 'vitest';
import { reconcileActiveSkirmishAfterLeave } from '../logic/skirmishVacated';
import {
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
} from './createGameState';

describe('reconcileActiveSkirmishAfterLeave', () => {
    it('défausse d’un séide : fin sans vainqueur', () => {
        const companion = createCompanion({
            id: 'merry',
            title: 'Merry',
            vitality: 4,
        });
        const minion = createMinion({
            id: 'gollum',
            title: 'Gollum',
            vitality: 4,
        });
        const G = createGameState({
            activeSkirmishId: 'sk-1',
            skirmishes: [
                {
                    id: 'sk-1',
                    companionId: 'merry',
                    minionIds: ['gollum'],
                },
            ],
            battlefield: [minion],
            players: {
                '0': createPlayerState('0', { fellowshipArea: [companion] }),
                '1': createPlayerState('1'),
            },
        });

        reconcileActiveSkirmishAfterLeave(G, 'gollum', 'DISCARD');

        expect(G.activeSkirmishId).toBeUndefined();
        expect(G.pendingWinsSkirmish).toBeUndefined();
        expect(G.pendingLosesSkirmish).toBeUndefined();
        expect(G.statusMessage).toMatch(/Pas de vainqueur/i);
    });

    it('mort du séide : victoire du compagnon (WINS)', () => {
        const companion = createCompanion({
            id: 'merry',
            title: 'Merry',
            vitality: 4,
        });
        const minion = createMinion({
            id: 'gollum',
            title: 'Gollum',
            vitality: 0,
            isDead: true,
        });
        const G = createGameState({
            activeSkirmishId: 'sk-1',
            skirmishes: [
                {
                    id: 'sk-1',
                    companionId: 'merry',
                    minionIds: ['gollum'],
                },
            ],
            battlefield: [minion],
            players: {
                '0': createPlayerState('0', { fellowshipArea: [companion] }),
                '1': createPlayerState('1'),
            },
        });

        reconcileActiveSkirmishAfterLeave(G, 'gollum', 'DEATH');

        expect(G.skirmishes[0]?.resolved).toBe(true);
        // tryOpenWinsSkirmish consomme pendingWins ; sans réponse éligible
        // l’événement est appliqué puis nettoyé.
        expect(
            G.pendingWinsSkirmish?.winnerIds ||
                (G.pendingEvent?.type === 'WINS_SKIRMISH'
                    ? G.pendingEvent.winnerIds
                    : undefined) ||
                (G.statusMessage || '')
        ).toBeTruthy();
        expect(G.statusMessage).toMatch(/victoire des Peuples Libres/i);
    });
});
