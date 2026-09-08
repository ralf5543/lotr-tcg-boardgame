import { beforeEach, describe, expect, it, vi } from 'vitest';
import { audioService } from '../../services/audioService';
import {
    createCard,
    createCompanion,
    createMinion,
} from '../../game/testing/createGameState';
import { playCardExertAudio } from './useExertAudio';

vi.mock('../../services/audioService', () => ({
    audioService: { play: vi.fn() },
}));

const play = vi.mocked(audioService.play);

describe('playCardExertAudio', () => {
    beforeEach(() => {
        play.mockClear();
    });

    it('joue EXERT_GOLLUM pour la culture Gollum, Peuples Libres ou Ombre', () => {
        playCardExertAudio(
            createCompanion({ id: 'smeagol', culture: 'GOLLUM' })
        );
        expect(play).toHaveBeenCalledWith('EXERT_GOLLUM', {
            enablePitch: true,
        });

        play.mockClear();
        playCardExertAudio(
            createMinion({ id: 'gollum', culture: 'GOLLUM' })
        );
        expect(play).toHaveBeenCalledWith('EXERT_GOLLUM', {
            enablePitch: true,
        });
    });

    it('différencie homme / femme chez les Peuples Libres, avec le pitch des races', () => {
        playCardExertAudio(createCompanion({ id: 'aragorn', race: 'MAN' }));
        expect(play).toHaveBeenCalledWith('EXERT_HUMAN_MALE', {
            enablePitch: true,
        });

        play.mockClear();
        playCardExertAudio(
            createCompanion({ id: 'eowyn', race: 'MAN', isFemale: true })
        );
        expect(play).toHaveBeenCalledWith('EXERT_HUMAN_FEMALE', {
            enablePitch: true,
        });

        play.mockClear();
        playCardExertAudio(createCompanion({ id: 'gimli', race: 'DWARF' }));
        expect(play).toHaveBeenCalledWith('EXERT_HUMAN_MALE', {
            pitch: 0.8,
        });

        play.mockClear();
        playCardExertAudio(createCompanion({ id: 'legolas', race: 'ELF' }));
        expect(play).toHaveBeenCalledWith('EXERT_HUMAN_MALE', {
            pitch: 1.1,
        });

        play.mockClear();
        playCardExertAudio(createCompanion({ id: 'frodo', race: 'HOBBIT' }));
        expect(play).toHaveBeenCalledWith('EXERT_HUMAN_MALE', {
            pitch: 1.1,
        });
    });

    it('reprend les sons de blessure pour les cartes de l’Ombre, sans délai', () => {
        playCardExertAudio(createMinion({ id: 'orc', race: 'ORC' }));
        expect(play).toHaveBeenCalledWith('WOUND_ORC', {
            delay: 0,
            enablePitch: true,
        });

        play.mockClear();
        playCardExertAudio(
            createCard({
                id: 'uruk',
                kind: 'SHADOW',
                type: 'MINION',
                culture: 'ISENGARD',
                race: 'URUK-HAI',
            })
        );
        expect(play).toHaveBeenCalledWith('WOUND_ORC', {
            delay: 0,
            pitch: 0.75,
        });
    });
});
