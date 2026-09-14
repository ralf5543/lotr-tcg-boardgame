import { describe, expect, it } from 'vitest';
import { groupCardsForDisplay } from './groupCardsForDisplay';
import { createCard } from '../game/testing/createGameState';

describe('groupCardsForDisplay', () => {
    it('regroupe les doublons et garde l’ordre LIFO par id', () => {
        const a1 = createCard({ id: '1C1', title: 'A', instanceId: 'a-old' });
        const b = createCard({ id: '2C2', title: 'B', instanceId: 'b-1' });
        const a2 = createCard({ id: '1C1', title: 'A', instanceId: 'a-new' });

        const grouped = groupCardsForDisplay([a1, b, a2]);

        expect(grouped).toHaveLength(2);
        expect(grouped[0]?.card.instanceId).toBe('a-new');
        expect(grouped[0]?.count).toBe(2);
        expect(grouped[1]?.card.id).toBe('2C2');
        expect(grouped[1]?.count).toBe(1);
    });

    it('renvoie un tableau vide si la pile est vide', () => {
        expect(groupCardsForDisplay([])).toEqual([]);
    });
});
