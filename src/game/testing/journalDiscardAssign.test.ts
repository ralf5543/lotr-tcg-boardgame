import { describe, expect, it } from 'vitest';
import { discardCardFromPlay } from '../../utils/discardCardFromPlay';
import { formatJournalEntry } from '../logic/journal';
import { assignMinion } from '../moves/assignmentMoves';
import {
    createCompanion,
    createGameState,
    createMinion,
    createPlayerState,
} from './createGameState';

describe('journal — défausse et affectation', () => {
    it('défausse en jeu → ligne journal', () => {
        const condition = {
            ...createCompanion({
                id: 'cond',
                instanceId: 'cond-1',
                title: 'Contes pervertis',
            }),
            type: 'CONDITION' as const,
            kind: 'SHADOW' as const,
        };
        const G = createGameState({
            players: {
                '0': createPlayerState('0'),
                '1': createPlayerState('1', { supportArea: [condition] }),
            },
        });
        expect(discardCardFromPlay(G, condition)).toBe(true);
        expect(G.journalLog?.some((e) => /Contes pervertis.*défauss/i.test(
            formatJournalEntry(e, '0')
        ))).toBe(true);
    });

    it('affectation → ligne journal', () => {
        const frodo = createCompanion({
            id: 'frodo',
            instanceId: 'frodo',
            title: 'Frodo',
            i18n: { fr: { title: 'Frodo' }, en: { title: 'Frodo' } },
        });
        const orc = createMinion({
            id: 'orc',
            instanceId: 'orc',
            title: 'Orque',
            i18n: { fr: { title: 'Orque' }, en: { title: 'Orc' } },
        });
        const G = createGameState({
            assignmentStep: 'FP_ASSIGN',
            battlefield: [orc],
            players: {
                '0': createPlayerState('0', { fellowshipArea: [frodo] }),
                '1': createPlayerState('1'),
            },
        });
        const result = assignMinion(
            {
                G,
                ctx: { phase: 'assignment' } as never,
                playerID: '0',
                events: {},
            } as never,
            'orc',
            'frodo'
        );
        expect(result).not.toBe('INVALID_MOVE');
        expect(
            G.journalLog?.some((e) =>
                /Orque.*assigné.*Frodo/i.test(formatJournalEntry(e, '0'))
            )
        ).toBe(true);
    });
});
