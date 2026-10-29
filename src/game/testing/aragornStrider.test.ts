import { describe, expect, it } from 'vitest';
import { parseAbilities } from '../../../scripts/convert/parsers';
import { getCardById } from '../cardsData';
import { tryOpenFellowshipMoves } from '../engine/responseWindow';
import type { Ability } from '../types';
import {
    createCompanion,
    createGameState,
    createPlayerState,
} from './createGameState';

const CSV_TEXT =
    '<keyword>Ranger.</keyword> Each time the fellowship moves, add <symbol>twilight1</symbol>.';

const STRIDER_MOVE: Ability = {
    id: '11R54:0',
    phases: ['RESPONSE'],
    trigger: { type: 'FELLOWSHIP_MOVES' },
    cost: [],
    effects: [{ type: 'ADD_TWILIGHT', count: 1 }],
    source: 'SELF',
    text: 'Each time the fellowship moves, add twilight1.',
};

describe('Aragorn Strider 11R54 — déplacement → +1 crépuscule', () => {
    it('analyse : FELLOWSHIP_MOVES + ADD_TWILIGHT forcé', () => {
        expect(parseAbilities(CSV_TEXT, 'Aragorn', '11R54')).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    phases: ['RESPONSE'],
                    trigger: { type: 'FELLOWSHIP_MOVES' },
                    effects: [{ type: 'ADD_TWILIGHT', count: 1 }],
                }),
            ])
        );
        const abs = parseAbilities(CSV_TEXT, 'Aragorn', '11R54') || [];
        expect(abs.some((ab) => ab.optional)).toBe(false);
        expect(
            getCardById('11R54')?.abilities?.some(
                (ab) =>
                    ab.trigger?.type === 'FELLOWSHIP_MOVES' &&
                    (ab.effects || []).some(
                        (e) => e.type === 'ADD_TWILIGHT' && e.count === 1
                    )
            )
        ).toBe(true);
    });

    it('déplacement : +1 crépuscule automatique, pas de fenêtre', () => {
        const aragorn = createCompanion({
            id: '11R54',
            instanceId: 'aragorn',
            title: 'Aragorn',
            culture: 'GONDOR',
            actionPhases: ['RESPONSE'],
            abilities: [STRIDER_MOVE],
        });
        const G = createGameState({
            fpPlayerId: '0',
            twilightPool: 0,
            players: {
                '0': createPlayerState('0', {
                    fellowshipArea: [aragorn],
                }),
                '1': createPlayerState('1'),
            },
        });

        expect(tryOpenFellowshipMoves(G)).toBe('APPLIED');
        expect(G.twilightPool).toBe(1);
        expect(G.responseWindow).toBeUndefined();
        expect(G.pendingEvent).toBeUndefined();
        expect(G.statusMessage).toMatch(/Aragorn/i);
    });

});
