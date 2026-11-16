import { beforeEach, describe, expect, it, vi } from 'vitest';
import { audioService } from '../../services/audioService';
import { playTargetingArrowHitSound } from './targetingArrowHitSound';

vi.mock('../../services/audioService', () => ({
    audioService: { play: vi.fn() },
}));

const play = vi.mocked(audioService.play);

describe('playTargetingArrowHitSound', () => {
    beforeEach(() => {
        play.mockClear();
    });

    it('SMASH par défaut', () => {
        playTargetingArrowHitSound({ sourceId: '2R93' });
        expect(play).toHaveBeenCalledWith('SMASH');
    });

    it('ARROW_IMPACT en phase archerie', () => {
        playTargetingArrowHitSound({
            sourceId: '2R93',
            gamePhase: 'archery',
        });
        expect(play).toHaveBeenCalledWith('ARROW_IMPACT');
    });

    it('ARROW_IMPACT si capacité ARCHERY', () => {
        playTargetingArrowHitSound({
            sourceId: '1R50',
            abilityPhases: ['ARCHERY'],
        });
        expect(play).toHaveBeenCalledWith('ARROW_IMPACT');
    });

    it('overrides cartes : Pieds-Ailés, Calaglin, Ennemis du Mordor', () => {
        for (const id of ['4P364', '3U10', '1U105']) {
            play.mockClear();
            playTargetingArrowHitSound({ sourceId: id });
            expect(play).toHaveBeenCalledWith('ARROW_IMPACT');
        }
    });
});
