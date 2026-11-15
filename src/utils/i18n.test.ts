import { describe, expect, it } from 'vitest';
import { getCardById } from '../game/cardsData';
import { getAbilityToastClause } from './i18n';

describe('getAbilityToastClause', () => {
    it('Saruman TTT : toaster = seule la clause « lorsque vous jouez »', () => {
        const card = getCardById('4R173');
        const ability = card?.abilities?.find(
            (a) => a.trigger?.type === 'WHEN_PLAYED'
        );
        expect(ability).toBeTruthy();
        const clause = getAbilityToastClause(ability, card, 'fr');
        expect(clause).toMatch(/lorsque vous jouez saroumane/i);
        expect(clause).not.toMatch(/archerie/i);
        expect(clause).not.toMatch(/ombre/i);
    });

    it('Throne : toaster = condition + effet fierce (pas seulement spot)', () => {
        const card = getCardById('17R39');
        const ability = card?.abilities?.find(
            (a) => a.trigger?.type === 'YOU_PLAY'
        );
        expect(ability).toBeTruthy();
        const clause = getAbilityToastClause(ability, card, 'fr');
        expect(clause).toMatch(/each time you play saruman/i);
        expect(clause).toMatch(/fierce/i);
        expect(clause).not.toMatch(/each wizard/i);
    });
});
