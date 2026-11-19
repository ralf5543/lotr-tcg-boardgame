import { describe, expect, it } from 'vitest';
import {
    createCompanion,
    createGameState,
    createPlayerState,
} from '../../../game/testing/createGameState';
import { collectInPlayCards } from './useBoardDiscardGhosts';

describe('collectInPlayCards', () => {
    it('indexe compagnons, soutien, champ et attachements', () => {
        const ring = createCompanion({
            id: 'ring',
            instanceId: 'ring',
            type: 'THE-ONE-RING' as never,
        });
        const frodo = createCompanion({
            id: 'frodo',
            instanceId: 'frodo',
            attachments: [ring],
        });
        const support = createCompanion({
            id: 'support',
            instanceId: 'support',
            type: 'CONDITION' as never,
        });
        const minion = createCompanion({
            id: 'minion',
            instanceId: 'minion',
            type: 'MINION' as never,
            kind: 'SHADOW',
        });
        const G = createGameState({
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [frodo],
                    supportArea: [support],
                }),
                '1': createPlayerState('1'),
            },
            battlefield: [minion],
        });

        const map = collectInPlayCards(G);
        expect([...map.keys()].sort()).toEqual([
            'frodo',
            'minion',
            'ring',
            'support',
        ]);
        expect(map.get('ring')?.parentId).toBe('frodo');
    });
});
