import { describe, expect, it } from 'vitest';
import { getCardById } from '../cardsData';
import { displayTitle } from '../../decks/cardMeta';
import {
    appendAbilityUsedJournal,
    appendActorJournal,
    appendPhaseJournal,
    formatJournalEntry,
} from '../logic/journal';
import type { Ability } from '../types';
import {
    createCompanion,
    createGameState,
} from './createGameState';

describe('journal défausse / phase / capacité', () => {
    it('défausse : titre i18n (pas undefined)', () => {
        const G = createGameState();
        G.players['0']!.profile = {
            name: 'Raphaël',
            avatar: '',
            faction: 'freePeoples',
        };
        const warrior = getCardById('4C165');
        expect(warrior).toBeTruthy();
        const label = displayTitle(warrior!);
        expect(label).toBe("Guerrier d'Orthanc");
        expect(label).not.toMatch(/undefined/i);

        appendActorJournal(G, '0', {
            vous: `Vous avez défaussé ${label}.`,
            named: `Raphaël a défaussé ${label}.`,
        });
        const entry = G.journalLog![G.journalLog!.length - 1];
        expect(formatJournalEntry(entry, '0')).toBe(
            `Vous avez défaussé ${label}.`
        );
        expect(formatJournalEntry(entry, '1')).toBe(
            `Raphaël a défaussé ${label}.`
        );
    });

    it('marqueur de phase', () => {
        const G = createGameState();
        appendPhaseJournal(G, 'startOfFellowship');
        const entry = G.journalLog![G.journalLog!.length - 1];
        expect(entry.kind).toBe('phase');
        expect(entry.phaseKey).toBe('FELLOWSHIP');
        expect(entry.named).toBe('Phase Compagnie');
    });

    it('capacité : phrase riche avec cible d’effet', () => {
        const G = createGameState();
        const faramir = createCompanion({
            id: '7R91',
            title: 'Faramir',
            i18n: { fr: { title: 'Faramir' } },
        });
        const pippin = createCompanion({
            id: '1C305',
            instanceId: 'pippin-1',
            title: 'Pippin',
            i18n: { fr: { title: 'Pippin' } },
        });
        G.players['0']!.fellowshipArea = [faramir, pippin];

        const ability: Ability = {
            id: '7R91:0',
            phases: ['SKIRMISH'],
            cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
            effects: [
                {
                    type: 'ADD_TEMP_STAT',
                    stat: 'STRENGTH',
                    value: 2,
                    target: [['UNBOUND', 'HOBBIT']],
                    expiresAtPhase: 'SKIRMISH',
                },
            ],
            source: 'SELF',
        };

        appendAbilityUsedJournal(G, faramir, ability, 'pippin-1');
        expect(G.journalLog![G.journalLog!.length - 1].named).toBe(
            'Faramir s’est affaibli pour donner +2 en force à Pippin.'
        );
    });
});
