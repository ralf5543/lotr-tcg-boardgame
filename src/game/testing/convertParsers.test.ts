import { describe, expect, it } from 'vitest';
import {
    parseAbilities,
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

const ARAGORN_TEXT =
    '<keyword>Ranger.</keyword> <br><keyword>Maneuver:</keyword> Exert Aragorn to make him <keyword>defender +1</keyword> until the regroup phase.';

const ENT_DRAUGHT_TEXT =
    'To play, spot an Ent. <br>Bearer must be a companion. Limit 1 per bearer. <br><keyword>Skirmish:</keyword> Exert bearer to make him or her damage +1. ';

const SAM_TEXT =
    '<keyword>Maneuver:</keyword> Exert Sam twice to make him <keyword>defender +1</keyword> until the regroup phase.  <br><keyword>Response:</keyword> If Frodo dies, make Sam the <keyword>Ring-bearer (resistance 5).</keyword>';

const MORIA_AXE_TEXT =
    'Bearer must be a <symbol>moria</symbol> Orc.  <br>Bearer is <keyword>damage +1.</keyword>  <br><keyword>Skirmish:</keyword> Exert bearer to make him strength +2.';

describe('parseAbilities — Exert … to make KEYWORD', () => {
    it('parse Aragorn : Maneuver, exert SELF, defender +1 until regroup', () => {
        expect(parseAbilities(ARAGORN_TEXT, 'Aragorn', '1R89')).toEqual([
            {
                id: '1R89:0',
                phases: ['MANEUVER'],
                cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
                effect: {
                    type: 'ADD_TEMP_KEYWORD',
                    keyword: 'DEFENDER +1',
                    target: 'SELF',
                    expiresAtPhase: 'REGROUP',
                },
                source: 'SELF',
                text: expect.stringMatching(/MANEUVER: Exert Aragorn/i),
            },
        ]);
    });

    it('parse Exert bearer (Ent Draught) : BEARER, damage +1, durée implicite SKIRMISH', () => {
        const abilities = parseAbilities(
            ENT_DRAUGHT_TEXT,
            'Ent Draught',
            '9R24'
        );
        expect(abilities).toHaveLength(1);
        expect(abilities?.[0]).toMatchObject({
            id: '9R24:0',
            phases: ['SKIRMISH'],
            cost: [{ exert: [{ count: 1, target: 'BEARER' }] }],
            effect: {
                type: 'ADD_TEMP_KEYWORD',
                keyword: 'DAMAGE +1',
                target: 'BEARER',
                expiresAtPhase: 'SKIRMISH',
            },
            source: 'ATTACHMENT',
        });
    });

    it('parse Exert twice (Sam)', () => {
        const abilities = parseAbilities(SAM_TEXT, 'Sam', '2C114');
        expect(abilities).toHaveLength(1);
        expect(abilities?.[0]).toMatchObject({
            phases: ['MANEUVER'],
            cost: [{ exert: [{ count: 2, target: 'SELF' }] }],
            effect: {
                type: 'ADD_TEMP_KEYWORD',
                keyword: 'DEFENDER +1',
                expiresAtPhase: 'REGROUP',
            },
        });
    });

    it('parse Gimli : Skirmish, exert SELF, force +2 jusqu’à la fin d’escarmouche', () => {
        const text =
            '<keyword>Damage +1.</keyword>. <br><keyword>Skirmish:</keyword> Exert Gimli to make him strength +2.';
        expect(parseAbilities(text, 'Gimli', '0P12')).toEqual([
            {
                id: '0P12:0',
                phases: ['SKIRMISH'],
                cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
                effect: {
                    type: 'ADD_TEMP_STAT',
                    stat: 'STRENGTH',
                    value: 2,
                    target: 'SELF',
                    expiresAtPhase: 'SKIRMISH',
                },
                source: 'SELF',
                text: expect.stringMatching(/SKIRMISH: Exert Gimli/i),
            },
        ]);
    });

    it('parse Exert bearer → force +2 (Hache de la Moria)', () => {
        const abilities = parseAbilities(MORIA_AXE_TEXT, 'Moria Axe', '1R190');
        expect(abilities).toHaveLength(1);
        expect(abilities?.[0]).toMatchObject({
            id: '1R190:0',
            phases: ['SKIRMISH'],
            cost: [{ exert: [{ count: 1, target: 'BEARER' }] }],
            effect: {
                type: 'ADD_TEMP_STAT',
                stat: 'STRENGTH',
                value: 2,
                target: 'BEARER',
                expiresAtPhase: 'SKIRMISH',
            },
            source: 'ATTACHMENT',
        });
    });

    it('n’émet rien si le complément est une autre cible (unbound Hobbit strength +2)', () => {
        const text =
            '<keyword>Skirmish:</keyword> Exert Faramir to make an unbound Hobbit strength +2.';
        expect(parseAbilities(text, 'Faramir', '7R91')).toBeUndefined();
    });

    it('n’émet rien si le coût combine exert et autre verbe (and)', () => {
        const text =
            '<keyword>Maneuver:</keyword> Exert bearer and discard a follower from play to make him <keyword>defender +1</keyword> until the regroup phase.';
        expect(parseAbilities(text, 'Banner of the White Tree', '18R53')).toBeUndefined();
    });

    it('n’émet rien si le coût est un OU (Gwemegil)', () => {
        const text =
            'Bearer must be Arwen.  She is <keyword>Damage +1.</keyword>.  <keyword>Skirmish:</keyword> Exert Arwen or discard 2 cards from hand to make her strength +1.';
        expect(parseAbilities(text, 'Gwemegil', '1R47')).toBeUndefined();
    });

    it('n’émet rien si la cible du coût est une classe (a Hobbit) — désignation plus tard', () => {
        const text =
            '<keyword>Skirmish:</keyword> Exert a Hobbit to make him strength +3.';
        expect(parseAbilities(text, 'Halfling Deftness', '1U293')).toBeUndefined();
    });

    it('n’émet rien si le bonus scale (for each)', () => {
        const text =
            'Bearer must be Pippin.  <keyword>Skirmish:</keyword> Exert Pippin twice to make him strength +1 for each <symbol>gondor</symbol> companion you spot.';
        expect(parseAbilities(text, "Pippin's Sword", '7R114')).toBeUndefined();
    });

    it('parse un événement : Exert Sam (pas SELF), force +3, ignore la phrase suivante', () => {
        const text =
            '<keyword>Skirmish:</keyword> Exert Sam to make him strength +3.  If Sam wins this skirmish, you may remove a burden.';
        expect(parseAbilities(text, 'Impatient and Angry', '4R307')).toEqual([
            {
                id: '4R307:0',
                phases: ['SKIRMISH'],
                cost: [{ exert: [{ count: 1, target: [['Sam']] }] }],
                effect: {
                    type: 'ADD_TEMP_STAT',
                    stat: 'STRENGTH',
                    value: 3,
                    target: [['Sam']],
                    expiresAtPhase: 'SKIRMISH',
                },
                source: 'SELF',
                text: expect.stringMatching(/SKIRMISH: Exert Sam to make him strength \+3/i),
            },
        ]);
    });

    it('n’émet rien si le coût est Play a possession (Gamling)', () => {
        const text =
            '<keyword>Valiant.</keyword> To play, spot a <symbol>rohan</symbol> Man. \n<keyword>Skirmish:</keyword> Play a <symbol>rohan</symbol> possession on Gamling to make him strength +2 and <keyword>damage +1.</keyword>';
        expect(parseAbilities(text, 'Gamling', '5R82')).toBeUndefined();
    });
});
