import { describe, expect, it } from 'vitest';
import { getCardById } from '../cardsData';
import { displayFullName } from '../../decks/cardMeta';
import { appendCardPlayedJournal, formatJournalEntry } from '../logic/journal';
import { createGameState } from './createGameState';

describe('appendCardPlayedJournal', () => {
    it('écrit un libellé i18n (pas undefined) + playedCard', () => {
        const G = createGameState();
        G.players['0']!.profile = {
            name: 'Tom',
            avatar: 'avatars/avatar_p0.webp',
            faction: 'freePeoples',
        };
        const aragorn = getCardById('1R89');
        expect(aragorn).toBeTruthy();
        const label = displayFullName(aragorn!);
        expect(label).toBe('Aragorn, Rôdeur du Nord');
        expect(label).not.toMatch(/undefined/i);

        appendCardPlayedJournal(G, '0', aragorn!);
        const entry = G.journalLog![G.journalLog!.length - 1];
        expect(entry.playedCard?.label).toBe(label);
        expect(entry.actorAvatar).toBe('avatars/avatar_p0.webp');
        expect(formatJournalEntry(entry, '1')).toBe(`Tom a joué ${label}.`);
        expect(formatJournalEntry(entry, '0')).toBe(`Vous avez joué ${label}.`);
    });
});
