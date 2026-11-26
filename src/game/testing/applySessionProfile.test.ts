import { describe, expect, it } from 'vitest';
import { applySessionProfile } from '../moves/setupMoves';
import { createGameState } from './createGameState';
import { SESSION_AVATARS } from '../../session/playerProfile';

describe('applySessionProfile', () => {
    it('met à jour le profil du siège courant', () => {
        const G = createGameState();
        const avatar = SESSION_AVATARS[1] ?? SESSION_AVATARS[0];
        applySessionProfile(
            { G, playerID: '0' } as any,
            '  Éowyn  ',
            avatar.id
        );
        expect(G.players['0']?.profile.name).toBe('Éowyn');
        expect(G.players['0']?.profile.avatar).toBe(avatar.path);
    });

    it('refuse un avatar hors liste', () => {
        const G = createGameState();
        const before = G.players['0']!.profile.name;
        const result = applySessionProfile(
            { G, playerID: '0' } as any,
            'Aragorn',
            'pas-un-avatar'
        );
        expect(result).toBe('INVALID_MOVE');
        expect(G.players['0']?.profile.name).toBe(before);
    });
});
