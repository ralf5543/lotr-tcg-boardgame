import { describe, expect, it } from 'vitest';
import { getEffectiveKeywords } from '../game/engine/keywords/keywordUtils';
import { getKeywordIconPath } from './getKeywordIconPath';
import { createMinion } from '../game/testing/createGameState';

describe('getKeywordIconPath', () => {
    it('mappe Ambush 1 vers AMBUSH.webp', () => {
        expect(getKeywordIconPath('AMBUSH 1')).toBe(
            '/interface/pictos/AMBUSH.webp'
        );
    });

    it('reçoit « AMBUSH 1 » depuis getEffectiveKeywords, pas « AMBUSH +1 »', () => {
        const keywords = getEffectiveKeywords(
            createMinion({ keywords: ['AMBUSH 1'] })
        );
        const ambush = keywords.find((k) => k.key === 'AMBUSH');

        expect(ambush?.raw).toBe('AMBUSH 1');
        expect(getKeywordIconPath(ambush!.raw)).toBe(
            '/interface/pictos/AMBUSH.webp'
        );
    });
});

describe('getEffectiveKeywords — cumul', () => {
    it('cumule Dégâts imprimé et temporaire', () => {
        const keywords = getEffectiveKeywords(
            createMinion({
                keywords: ['DAMAGE +1'],
                tempKeywords: [
                    { keyword: 'DAMAGE +1', expiresAtPhase: 'SKIRMISH' },
                ],
            })
        );
        const damage = keywords.find((k) => k.key === 'DAMAGE');
        expect(damage?.raw).toBe('DAMAGE +2');
        expect(damage?.value).toBe(2);
    });
});
