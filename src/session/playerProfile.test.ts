import { describe, expect, it } from 'vitest';
import {
    MAX_DISPLAY_NAME_LENGTH,
    normalizeDisplayName,
    normalizeSessionProfile,
    SESSION_AVATARS,
} from './playerProfile';

describe('session playerProfile', () => {
    it('normalise le nom (trim, espaces, longueur)', () => {
        expect(normalizeDisplayName('  Aragorn  ')).toBe('Aragorn');
        expect(normalizeDisplayName('A   B')).toBe('A B');
        expect(normalizeDisplayName('x'.repeat(40)).length).toBe(
            MAX_DISPLAY_NAME_LENGTH
        );
        expect(normalizeDisplayName(null)).toBe('');
    });

    it('reprend un avatar inconnu vers le premier de la liste', () => {
        const p = normalizeSessionProfile({
            name: 'Éowyn',
            avatarId: 'inconnu',
        });
        expect(p.name).toBe('Éowyn');
        expect(p.avatarId).toBe(SESSION_AVATARS[0].id);
    });

    it('conserve un avatar valide', () => {
        const id = SESSION_AVATARS[1].id;
        expect(
            normalizeSessionProfile({ name: 'Tom', avatarId: id }).avatarId
        ).toBe(id);
    });
});
