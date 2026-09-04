import { describe, expect, it } from 'vitest';
import {
    parseGrantsKeywords,
    parseKeywords,
} from '../../../scripts/convert/parsers';

const RAIDER_BOW_TEXT =
    'Bearer must be a <symbol>raider</symbol> Man. <br>Bearer is an <keyword>archer</keyword> and <keyword>Ambush</keyword> <symbol>twilight5</symbol>.';

const DESERT_SNEAK_TEXT =
    '<keyword>Southron.</keyword> <keyword>Ambush</keyword> <symbol>twilight1</symbol>. <br>When the Free Peoples player assigns this minion to a character and you have initiative, you may wound that character.';

describe('parseKeywords / parseGrantsKeywords — Ambush', () => {
    it('extrait Ambush X sur un séide (Desert Sneak)', () => {
        expect(parseKeywords(DESERT_SNEAK_TEXT, 'Desert Sneak', 'MINION')).toEqual(
            expect.arrayContaining(['SOUTHRON', 'AMBUSH 1'])
        );
        expect(parseGrantsKeywords(DESERT_SNEAK_TEXT)).toBeUndefined();
    });

    it('confère Ambush X au porteur via une possession (Raider Bow)', () => {
        expect(parseGrantsKeywords(RAIDER_BOW_TEXT)).toEqual(
            expect.arrayContaining(['ARCHER', 'AMBUSH 5'])
        );
        expect(parseGrantsKeywords(RAIDER_BOW_TEXT)).not.toContain('AMBUSH');
        expect(parseKeywords(RAIDER_BOW_TEXT, 'Raider Bow', 'POSSESSION')).toBe(
            undefined
        );
    });

    it('accepte Ambush collé au symbole twilight (sans espace)', () => {
        const text =
            '<keyword>Southron.</keyword> <keyword>Ambush</keyword><symbol>twilight1</symbol><keyword>.</keyword>';
        expect(parseKeywords(text, 'Southron Invaders', 'MINION')).toEqual(
            expect.arrayContaining(['SOUTHRON', 'AMBUSH 1'])
        );
    });
});
