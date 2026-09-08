import { describe, expect, it } from 'vitest';
import { isWoundRecoilDown } from './woundRecoil';

describe('isWoundRecoilDown', () => {
    it('projette mes persos vers le bas, Peuples Libres ou Ombre', () => {
        expect(isWoundRecoilDown('FREE_PEOPLE', 'FREE_PEOPLE')).toBe(true);
        expect(isWoundRecoilDown('SHADOW', 'SHADOW')).toBe(true);
    });

    it('projette les persos ennemis vers le haut, quel que soit mon camp', () => {
        expect(isWoundRecoilDown('SHADOW', 'FREE_PEOPLE')).toBe(false);
        expect(isWoundRecoilDown('FREE_PEOPLE', 'SHADOW')).toBe(false);
    });

    it('ignore la position haut/bas du plateau quand le camp de la carte est connu', () => {
        expect(isWoundRecoilDown('SHADOW', 'SHADOW', true)).toBe(true);
        expect(isWoundRecoilDown('FREE_PEOPLE', 'FREE_PEOPLE', true)).toBe(true);
        expect(isWoundRecoilDown('SHADOW', 'FREE_PEOPLE', false)).toBe(false);
    });
});
