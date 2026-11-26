import { describe, expect, it } from 'vitest';
import { isPlausibleMatchCode, normalizeMatchCode } from './matchCode';

describe('matchCode', () => {
    it('normalise espaces', () => {
        expect(normalizeMatchCode('  ab cd_EF  ')).toBe('abcd_EF');
    });

    it('accepte un nanoid typique', () => {
        expect(isPlausibleMatchCode('V1StGXR8_Z5')).toBe(true);
    });

    it('refuse trop court / caractères bizarres', () => {
        expect(isPlausibleMatchCode('ab')).toBe(false);
        expect(isPlausibleMatchCode('hello world!')).toBe(false);
    });
});
