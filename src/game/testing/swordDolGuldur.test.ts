import { describe, expect, it } from 'vitest';
import { getCardById } from '../cardsData';
import { tryOpenWinsSkirmish } from '../engine/responseWindow';
import { resolvePendingFpDiscard } from '../logic/fpDiscardAbility';
import type { CardState } from '../types';
import {
    createCard,
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
} from './createGameState';

describe('Épée de Dol Guldur (6R85)', () => {
    it('Toldëa gagne → pendingFpDiscard → FP défausse une situation', () => {
        const swordBase = getCardById('6R85')!;
        const toldeaBase = getCardById('12U180')!;
        const condition = createCard({
            id: 'cond-1',
            instanceId: 'cond-1',
            type: 'CONDITION',
            kind: 'FREE_PEOPLE',
            title: 'Everyone Knows',
        });
        const sword: CardState = {
            ...swordBase,
            instanceId: 'dol-sword',
        };
        const toldea = createMinion({
            ...toldeaBase,
            id: '12U180',
            instanceId: 'toldea',
            title: toldeaBase.i18n?.en?.title || 'Úlairë Toldëa',
            attachments: [sword],
        });
        const frodo = createCompanion({
            id: 'frodo',
            instanceId: 'frodo',
            keywords: ['RING-BEARER'],
            vitality: 4,
        });

        const G = createGameState({
            battlefield: [toldea],
            activeSkirmishId: 'sk1',
            skirmishes: [
                {
                    id: 'sk1',
                    companionId: 'frodo',
                    minionIds: ['toldea'],
                    resolved: true,
                },
            ],
            pendingWinsSkirmish: {
                winnerIds: ['toldea'],
                skirmishId: 'sk1',
            },
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo],
                    supportArea: [condition],
                }),
                '1': createPlayerState('1'),
            },
        });

        expect(tryOpenWinsSkirmish(G)).toBe('APPLIED');
        expect(G.pendingFpDiscard?.playerId).toBe('0');
        expect(G.pendingFpDiscard?.sourceInstanceId).toBe('dol-sword');

        expect(resolvePendingFpDiscard(G, '0', 'cond-1')).toBe(true);
        expect(G.pendingFpDiscard).toBeUndefined();
        expect(G.players['0']?.supportArea).toHaveLength(0);
        expect(G.players['0']?.discard).toHaveLength(1);
    });
});
