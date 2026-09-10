import { describe, expect, it } from 'vitest';
import {
    parseAbilities,
    parseGrantsKeywords,
    parseKeywords,
    coerceOrphanGameTextAsLore,
    buildLangBlock,
} from '../../../scripts/convert/parsers';

describe('coerceOrphanGameTextAsLore', () => {
    it('replace le Text traduit par du lore si l’anglais n’a pas de texte de jeu', () => {
        expect(
            coerceOrphanGameTextAsLore(
                'Seule la mort du roi de Rohan pouvait mettre un terme à la furie de Ceux du Pays de Dun.',
                '',
                false
            )
        ).toEqual({
            lore: 'Seule la mort du roi de Rohan pouvait mettre un terme à la furie de Ceux du Pays de Dun.',
        });
    });

    it('ne touche pas une carte qui a un vrai texte de jeu anglais', () => {
        expect(
            coerceOrphanGameTextAsLore(
                '<keyword>Damage +1.</keyword>',
                'A lore.',
                true
            )
        ).toEqual({
            gameText: '<keyword>Damage +1.</keyword>',
            lore: 'A lore.',
        });
    });

    it('ne vole pas le Text s’il y a déjà un Lore traduit', () => {
        expect(
            coerceOrphanGameTextAsLore('un texte', 'un lore', false)
        ).toEqual({
            gameText: 'un texte',
            lore: 'un lore',
        });
    });

    it('buildLangBlock : 4C17 FR n’a que du lore, pas de gameText', () => {
        const coerced = coerceOrphanGameTextAsLore(
            'Seule la mort du roi de Rohan pouvait mettre un terme à la furie de Ceux du Pays de Dun.',
            '',
            false
        );
        expect(
            buildLangBlock(
                'Sauvage Dun',
                '',
                coerced.gameText,
                coerced.lore
            )
        ).toEqual({
            title: 'Sauvage Dun',
            loreText:
                'Seule la mort du roi de Rohan pouvait mettre un terme à la furie de Ceux du Pays de Dun.',
        });
    });
});

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
    it('n’écrit pas Unbound sur un compagnon : ce n’est pas un mot-clé imprimé', () => {
        expect(parseKeywords(ARAGORN_TEXT, 'Aragorn', 'COMPANION')).toEqual([
            'RANGER',
        ]);
    });

    it('parse Aragorn : Maneuver, exert SELF, defender +1 until regroup', () => {
        expect(parseAbilities(ARAGORN_TEXT, 'Aragorn', '1R89')).toEqual([
            {
                id: '1R89:0',
                phases: ['MANEUVER'],
                cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
                effects: [{
                    type: 'ADD_TEMP_KEYWORD',
                    keyword: 'DEFENDER +1',
                    target: 'SELF',
                    expiresAtPhase: 'REGROUP',
                }],
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
            effects: [{
                type: 'ADD_TEMP_KEYWORD',
                keyword: 'DAMAGE +1',
                target: 'BEARER',
                expiresAtPhase: 'SKIRMISH',
            }],
            source: 'ATTACHMENT',
        });
    });

    it('parse Exert twice (Sam)', () => {
        const abilities = parseAbilities(SAM_TEXT, 'Sam', '2C114');
        expect(abilities).toHaveLength(1);
        expect(abilities?.[0]).toMatchObject({
            phases: ['MANEUVER'],
            cost: [{ exert: [{ count: 2, target: 'SELF' }] }],
            effects: [{
                type: 'ADD_TEMP_KEYWORD',
                keyword: 'DEFENDER +1',
                expiresAtPhase: 'REGROUP',
            }],
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
                effects: [{
                    type: 'ADD_TEMP_STAT',
                    stat: 'STRENGTH',
                    value: 2,
                    target: 'SELF',
                    expiresAtPhase: 'SKIRMISH',
                }],
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
            effects: [{
                type: 'ADD_TEMP_STAT',
                stat: 'STRENGTH',
                value: 2,
                target: 'BEARER',
                expiresAtPhase: 'SKIRMISH',
            }],
            source: 'ATTACHMENT',
        });
    });

    it('parse Faramir : Exert SELF, Hobbit dissocié force +2 (autre cible)', () => {
        const text =
            '<keyword>Ranger.</keyword> <br><keyword>Fellowship:</keyword> Play a <symbol>rohan</symbol> Man to heal Faramir. <br><keyword>Skirmish:</keyword> Exert Faramir to make an unbound Hobbit strength +2. <br><keyword>Skirmish:</keyword> Exert Gandalf to prevent all wounds to Faramir.';
        expect(parseAbilities(text, 'Faramir', '7R91')).toEqual([
            {
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
                text: expect.stringMatching(
                    /SKIRMISH: Exert Faramir to make an unbound Hobbit strength \+2/i
                ),
            },
        ]);
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

    it('parse Exert a Hobbit (désignation) : Halfling Deftness', () => {
        const text =
            '<keyword>Skirmish:</keyword> Exert a Hobbit to make him strength +3.';
        expect(parseAbilities(text, 'Halfling Deftness', '1U293')).toEqual([
            {
                id: '1U293:0',
                phases: ['SKIRMISH'],
                cost: [
                    {
                        exert: [
                            {
                                count: 1,
                                target: [['HOBBIT']],
                                mode: 'DESIGNATION',
                            },
                        ],
                    },
                ],
                effects: [{
                    type: 'ADD_TEMP_STAT',
                    stat: 'STRENGTH',
                    value: 3,
                    target: [['HOBBIT']],
                    expiresAtPhase: 'SKIRMISH',
                }],
                source: 'SELF',
                text: expect.stringMatching(/SKIRMISH: Exert a Hobbit to make him strength \+3/i),
            },
        ]);
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
                effects: [{
                    type: 'ADD_TEMP_STAT',
                    stat: 'STRENGTH',
                    value: 3,
                    target: [['Sam']],
                    expiresAtPhase: 'SKIRMISH',
                }],
                source: 'SELF',
                text: expect.stringMatching(/SKIRMISH: Exert Sam to make him strength \+3/i),
            },
        ]);
    });

    it('parse force +2 et damage +1 après un seul exert', () => {
        const text =
            '<keyword>Skirmish:</keyword> Exert Gimli to make him strength +2 and <keyword>damage +1.</keyword>';
        expect(parseAbilities(text, 'Gimli', '0P12')).toEqual([
            {
                id: '0P12:0',
                phases: ['SKIRMISH'],
                cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
                effects: [
                    {
                        type: 'ADD_TEMP_STAT',
                        stat: 'STRENGTH',
                        value: 2,
                        target: 'SELF',
                        expiresAtPhase: 'SKIRMISH',
                    },
                    {
                        type: 'ADD_TEMP_KEYWORD',
                        keyword: 'DAMAGE +1',
                        target: 'SELF',
                        expiresAtPhase: 'SKIRMISH',
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(
                    /SKIRMISH: Exert Gimli to make him strength \+2 and damage \+1/i
                ),
            },
        ]);
    });

    it('n’émet rien si le coût est Play a possession (Gamling)', () => {
        const text =
            '<keyword>Valiant.</keyword> To play, spot a <symbol>rohan</symbol> Man. \n<keyword>Skirmish:</keyword> Play a <symbol>rohan</symbol> possession on Gamling to make him strength +2 and <keyword>damage +1.</keyword>';
        expect(parseAbilities(text, 'Gamling', '5R82')).toBeUndefined();
    });

    it('parse Legolas Vertefeuille : Archerie, exert SELF, blesser un séide', () => {
        const text =
            '<keyword>Archer.</keyword> <br><keyword>Archery:</keyword> Exert Legolas to wound a minion; Legolas does not add to the fellowship archery total.';
        expect(parseAbilities(text, 'Legolas', '1R50')).toEqual([
            {
                id: '1R50:0',
                phases: ['ARCHERY'],
                cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
                effects: [{
                    type: 'WOUND',
                    count: 1,
                    target: [['MINION']],
                }],
                source: 'SELF',
                text: expect.stringMatching(/ARCHERY: Exert Legolas to wound a minion/i),
                omitFromArcheryTotal: true,
            },
        ]);
    });

    it('parse Treebeard : Assignment allow skirmish + Skirmish make an Ent damage +1', () => {
        const text =
            '<keyword>Unhasty.</keyword> <keyword>Assignment:</keyword> Exert an unbound Hobbit to allow Treebeard to skirmish. <keyword>Skirmish:</keyword> Exert Treebeard to make an Ent <keyword>Damage +1.</keyword>.';
        expect(parseAbilities(text, 'Treebeard', '0P21')).toEqual([
            {
                id: '0P21:0',
                phases: ['ASSIGNMENT'],
                cost: [
                    {
                        exert: [
                            {
                                count: 1,
                                target: [['UNBOUND', 'HOBBIT']],
                                mode: 'DESIGNATION',
                            },
                        ],
                    },
                ],
                effects: [{ type: 'ALLOW_SKIRMISH', target: 'SELF' }],
                source: 'SELF',
                text: expect.stringMatching(
                    /ASSIGNMENT: Exert an unbound Hobbit to allow Treebeard to skirmish/i
                ),
            },
            {
                id: '0P21:1',
                phases: ['SKIRMISH'],
                cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
                effects: [
                    {
                        type: 'ADD_TEMP_KEYWORD',
                        keyword: 'DAMAGE +1',
                        target: [['ENT']],
                        expiresAtPhase: 'SKIRMISH',
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(
                    /SKIRMISH: Exert Treebeard to make an Ent Damage \+1/i
                ),
            },
        ]);
    });

    it('refuse Assignment allow skirmish si le coût a un « or » (Birchseed)', () => {
        const text =
            '<keyword>Unhasty.</keyword><br><keyword>Assignment:</keyword> Exert an unbound Hobbit or discard 2 cards from hand to allow Birchseed to skirmish.';
        expect(parseAbilities(text, 'Birchseed', '5U15')).toBeUndefined();
    });

    it('parse Soldat orque : blesser le personnage qu’il combat', () => {
        const text =
            '<keyword>Skirmish:</keyword> Exert this minion to wound a character he is skirmishing.';
        expect(parseAbilities(text, 'Orc Soldier', '1C271')).toEqual([
            {
                id: '1C271:0',
                phases: ['SKIRMISH'],
                cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
                effects: [
                    {
                        type: 'WOUND',
                        count: 1,
                        target: 'SKIRMISHING',
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(
                    /SKIRMISH: Exert this minion to wound a character he is skirmishing/i
                ),
            },
        ]);
    });
});

const EOWYN_RESPONSE_TEXT =
    '<keyword>Valiant.</keyword> <br><keyword>Response:</keyword> If an unbound companion is about to take a wound, exert Éowyn and add <symbol>twilight1</symbol> to prevent that wound.';

const ONE_RING_TEXT =
    '<keyword>Response:</keyword> If bearer is about to take a wound, he wears The One Ring until the regroup phase. <br>While wearing The One Ring, each time the Ring-bearer is about to take a wound, add two burdens instead.';

describe('parseAbilities — Response prevent wound', () => {
    it('parse Éowyn : trigger unbound companion, exert SELF, add twilight, PREVENT_WOUND', () => {
        expect(parseAbilities(EOWYN_RESPONSE_TEXT, 'Éowyn', '4C270')).toEqual([
            {
                id: '4C270:0',
                phases: ['RESPONSE'],
                trigger: {
                    type: 'ABOUT_TO_WOUND',
                    target: [['UNBOUND', 'COMPANION']],
                },
                cost: [
                    {
                        exert: [{ count: 1, target: 'SELF' }],
                        addTwilight: 1,
                    },
                ],
                effects: [{ type: 'PREVENT_WOUND' }],
                source: 'SELF',
                text: expect.stringMatching(
                    /RESPONSE: If an unbound companion is about to take a wound/i
                ),
            },
        ]);
    });

    it('parse 1R1 : mettre l’Anneau (réponse) + 2 fardeaux (While)', () => {
        expect(
            parseAbilities(ONE_RING_TEXT, 'The One Ring', '1R1')
        ).toEqual([
            {
                id: '1R1:0',
                phases: ['RESPONSE'],
                trigger: {
                    type: 'ABOUT_TO_WOUND',
                    target: 'BEARER',
                },
                cost: [],
                effects: [
                    {
                        type: 'WEAR_RING',
                        expiresAtPhase: 'REGROUP',
                        replaceWoundWithBurdens: 2,
                    },
                ],
                source: 'ATTACHMENT',
                text: expect.stringMatching(
                    /RESPONSE: If bearer is about to take a wound/i
                ),
            },
        ]);
    });

    it('parse The Ruling Ring : blessure d’escarmouche, 1 fardeau', () => {
        const text =
            '<keyword>Response:</keyword> If bearer is about to take a wound in a skirmish, he wears The One Ring until the regroup phase. <br>While wearing The One Ring, each time the Ring-bearer is about to take a wound during a skirmish, add a burden instead.';
        expect(parseAbilities(text, 'The One Ring', '1C2')).toEqual([
            {
                id: '1C2:0',
                phases: ['RESPONSE'],
                trigger: {
                    type: 'ABOUT_TO_WOUND',
                    target: 'BEARER',
                    inSkirmish: true,
                },
                cost: [],
                effects: [
                    {
                        type: 'WEAR_RING',
                        expiresAtPhase: 'REGROUP',
                        replaceWoundWithBurdens: 1,
                        onlyInSkirmish: true,
                    },
                ],
                source: 'ATTACHMENT',
                text: expect.stringMatching(/in a skirmish/i),
            },
        ]);
    });

    it('parse 11R1 : Ring-bearer, 1 fardeau, toute blessure', () => {
        const text =
            '<keyword>Response:</keyword> If the Ring-bearer is about to take a wound, he or she wears The One Ring until the regroup phase. While the Ring-bearer is wearing The One Ring, each time he or she is about to take a wound, add a burden instead.';
        expect(parseAbilities(text, 'The One Ring', '11R1')).toEqual([
            {
                id: '11R1:0',
                phases: ['RESPONSE'],
                trigger: {
                    type: 'ABOUT_TO_WOUND',
                    target: 'BEARER',
                },
                cost: [],
                effects: [
                    {
                        type: 'WEAR_RING',
                        expiresAtPhase: 'REGROUP',
                        replaceWoundWithBurdens: 1,
                    },
                ],
                source: 'ATTACHMENT',
                text: expect.stringMatching(/Ring-bearer is about to take a wound/i),
            },
        ]);
    });

    it('n’émet rien pour 4R1 (While avec +2 force + Combat pour mettre)', () => {
        const text =
            'While wearing The One Ring, the Ring-bearer is strength +2, and each time he is about to take a wound in a skirmish, add a burden instead.\n<keyword>Skirmish:</keyword> Add a burden to wear The One Ring until the regroup phase.';
        expect(
            parseAbilities(text, 'The One Ring', '4R1')
        ).toBeUndefined();
    });

    it('parse Intimidate : spot Gandalf', () => {
        const text =
            '<keyword>Spell.</keyword> <br><keyword>Response:</keyword> If a companion is about to take a wound, spot Gandalf to prevent that wound.';
        expect(parseAbilities(text, 'Intimidate', '1C76')).toEqual([
            {
                id: '1C76:0',
                phases: ['RESPONSE'],
                trigger: {
                    type: 'ABOUT_TO_WOUND',
                    target: [['COMPANION']],
                },
                cost: [{ spot: [{ count: 1, target: [['Gandalf']] }] }],
                effects: [{ type: 'PREVENT_WOUND' }],
                source: 'SELF',
                text: expect.stringMatching(/spot Gandalf to prevent that wound/i),
            },
        ]);
    });

    it('parse Périls inconnus : spot 4 twilight + exert Gandalf', () => {
        const text =
            '<keyword>Response:</keyword> If a companion is about to take a wound, spot 4 twilight tokens and exert Gandalf to prevent that wound.';
        expect(parseAbilities(text, 'Unknown Perils', '3C36')).toEqual([
            {
                id: '3C36:0',
                phases: ['RESPONSE'],
                trigger: {
                    type: 'ABOUT_TO_WOUND',
                    target: [['COMPANION']],
                },
                cost: [
                    {
                        spotTwilight: 4,
                        exert: [{ count: 1, target: [['Gandalf']] }],
                    },
                ],
                effects: [{ type: 'PREVENT_WOUND' }],
                source: 'SELF',
                text: expect.stringMatching(
                    /spot 4 twilight tokens and exert Gandalf to prevent that wound/i
                ),
            },
        ]);
    });

    it('parse Goblin Armory : défausser cette condition, culture Moria', () => {
        const text =
            'Each time you play a <symbol>moria</symbol> weapon, add <symbol>twilight1</symbol>.  <br><keyword>Response:</keyword> If a <symbol>moria</symbol> Orc is about to take a wound, discard this condition to prevent that wound.';
        expect(parseAbilities(text, 'Goblin Armory', '1R173')).toEqual([
            {
                id: '1R173:0',
                phases: ['RESPONSE'],
                trigger: {
                    type: 'ABOUT_TO_WOUND',
                    target: [['MORIA', 'ORC']],
                },
                cost: [
                    {
                        discardFromPlay: [{ count: 1, target: 'SELF' }],
                    },
                ],
                effects: [{ type: 'PREVENT_WOUND' }],
                source: 'SELF',
                text: expect.stringMatching(
                    /discard this condition to prevent that wound/i
                ),
            },
        ]);
    });

    it('parse Hides : retirer du crépuscule OU défausser (deux abilities)', () => {
        const text =
            'When you play this possession, you may draw a card. <br><keyword>Response: </keyword>If a <symbol>dunland</symbol> Man is about to take a wound, remove <symbol>twilight2</symbol> or discard this possession to prevent that wound.';
        expect(parseAbilities(text, 'Hides', '4R19')).toEqual([
            {
                id: '4R19:0',
                phases: ['RESPONSE'],
                trigger: {
                    type: 'ABOUT_TO_WOUND',
                    target: [['DUNLAND', 'MAN']],
                },
                cost: [{ removeTwilight: 2 }],
                effects: [{ type: 'PREVENT_WOUND' }],
                source: 'SELF',
                text: expect.stringMatching(/remove twilight2 to prevent that wound/i),
            },
            {
                id: '4R19:1',
                phases: ['RESPONSE'],
                trigger: {
                    type: 'ABOUT_TO_WOUND',
                    target: [['DUNLAND', 'MAN']],
                },
                cost: [
                    {
                        discardFromPlay: [{ count: 1, target: 'SELF' }],
                    },
                ],
                effects: [{ type: 'PREVENT_WOUND' }],
                source: 'SELF',
                text: expect.stringMatching(
                    /discard this possession to prevent that wound/i
                ),
            },
        ]);
    });

    it('parse Isengard Shaman : retirer du crépuscule', () => {
        const text =
            '<keyword>Response:</keyword> If an <symbol>isengard</symbol> Orc is about to take a wound, remove <symbol>twilight2</symbol> to prevent that wound.';
        expect(parseAbilities(text, 'Isengard Shaman', '3C59')).toEqual([
            {
                id: '3C59:0',
                phases: ['RESPONSE'],
                trigger: {
                    type: 'ABOUT_TO_WOUND',
                    target: [['ISENGARD', 'ORC']],
                },
                cost: [{ removeTwilight: 2 }],
                effects: [{ type: 'PREVENT_WOUND' }],
                source: 'SELF',
                text: expect.stringMatching(/remove twilight2 to prevent that wound/i),
            },
        ]);
    });

    it('parse Dwarven Bracers : bearer + défausser cette possession', () => {
        const text =
            'Bearer must be a Dwarf.<br><keyword>Response:</keyword> If bearer is about to take a wound, discard this possession to prevent that wound.';
        expect(parseAbilities(text, 'Dwarven Bracers', '2U3')).toEqual([
            {
                id: '2U3:0',
                phases: ['RESPONSE'],
                trigger: {
                    type: 'ABOUT_TO_WOUND',
                    target: 'BEARER',
                },
                cost: [
                    {
                        discardFromPlay: [{ count: 1, target: 'SELF' }],
                    },
                ],
                effects: [{ type: 'PREVENT_WOUND' }],
                source: 'SELF',
                text: expect.stringMatching(
                    /If bearer is about to take a wound, discard this possession/i
                ),
            },
        ]);
    });

    it('n’émet rien pour Arwen (défausse depuis la main)', () => {
        const text =
            '<keyword>Ranger.</keyword> <br><keyword>Response:</keyword> If the Ring-bearer is about to take a wound, discard 3 cards from hand to prevent that wound.';
        expect(parseAbilities(text, 'Arwen', '3U7')).toBeUndefined();
    });
});

describe('parseAbilities — When you play this', () => {
    it('parse Éclaireur de la Moria : spot un Elfe, ajouter du crépuscule (requis)', () => {
        const text =
            'When you play this minion, spot an Elf to add <symbol>twilight2</symbol>.';
        expect(parseAbilities(text, 'Moria Scout', '1C191')).toEqual([
            {
                id: '1C191:0',
                phases: [],
                trigger: { type: 'WHEN_PLAYED' },
                cost: [{ spot: [{ count: 1, target: [['ELF']] }] }],
                effects: [{ type: 'ADD_TWILIGHT', count: 2 }],
                source: 'SELF',
                text: expect.stringMatching(
                    /When you play this minion, spot an Elf to add/i
                ),
            },
        ]);
    });

    it('n’émet rien pour Coureur Gobelin (you may)', () => {
        const text =
            'When you play this minion, you may add <symbol>twilight2</symbol>.';
        expect(parseAbilities(text, 'Goblin Runner', '1U178')).toBeUndefined();
    });
});

const RAMPAGE_TEXT =
    'To play, spot an Uruk-hai. <br><keyword>Response:</keyword> If your Uruk-hai wins a skirmish, remove <symbol>twilight3</symbol> to make him <keyword>fierce</keyword> until the regroup phase.';

const ENHEARTENED_FOE_TEXT =
    '<keyword>Response:</keyword> If a <symbol>sauron</symbol> Orc wins a skirmish, make that Orc <keyword>fierce</keyword> until the regroup phase.';

const WAR_CRY_TEXT =
    '<keyword>Response:</keyword> If a <symbol>dunland</symbol> Man wins a skirmish, make him <keyword>fierce</keyword> and strength +4 until the regroup phase.';

describe('parseAbilities — Response wins a skirmish', () => {
    it('parse Frénésie Ourouk-Haï : your Uruk-hai, retirer 3, vainqueur acharné', () => {
        expect(parseAbilities(RAMPAGE_TEXT, 'Uruk-hai Rampage', '1U159')).toEqual([
            {
                id: '1U159:0',
                phases: ['RESPONSE'],
                trigger: {
                    type: 'WINS_SKIRMISH',
                    winner: [['URUK-HAI']],
                    yours: true,
                },
                cost: [{ removeTwilight: 3 }],
                effects: [
                    {
                        type: 'ADD_TEMP_KEYWORD',
                        keyword: 'FIERCE',
                        target: 'WINNER',
                        expiresAtPhase: 'REGROUP',
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(
                    /RESPONSE: If your Uruk-hai wins a skirmish/i
                ),
            },
        ]);
    });

    it('parse Ennemi sans Pitié : Orque Sauron, pas de coût, that Orc acharné', () => {
        expect(
            parseAbilities(ENHEARTENED_FOE_TEXT, 'Enheartened Foe', '1R247')
        ).toEqual([
            {
                id: '1R247:0',
                phases: ['RESPONSE'],
                trigger: {
                    type: 'WINS_SKIRMISH',
                    winner: [['SAURON', 'ORC']],
                },
                cost: [],
                effects: [
                    {
                        type: 'ADD_TEMP_KEYWORD',
                        keyword: 'FIERCE',
                        target: 'WINNER',
                        expiresAtPhase: 'REGROUP',
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(
                    /If a sauron Orc wins a skirmish/i
                ),
            },
        ]);
    });

    it('parse Cri de Guerre du Pays de Dun : acharné et force +4', () => {
        expect(
            parseAbilities(WAR_CRY_TEXT, 'War Cry of Dunland', '4C37')
        ).toEqual([
            {
                id: '4C37:0',
                phases: ['RESPONSE'],
                trigger: {
                    type: 'WINS_SKIRMISH',
                    winner: [['DUNLAND', 'MAN']],
                },
                cost: [],
                effects: [
                    {
                        type: 'ADD_TEMP_KEYWORD',
                        keyword: 'FIERCE',
                        target: 'WINNER',
                        expiresAtPhase: 'REGROUP',
                    },
                    {
                        type: 'ADD_TEMP_STAT',
                        stat: 'STRENGTH',
                        value: 4,
                        target: 'WINNER',
                        expiresAtPhase: 'REGROUP',
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(
                    /If a dunland Man wins a skirmish/i
                ),
            },
        ]);
    });

    it('n’émet rien pour Encore du Souffle (soigner)', () => {
        const text =
            '<keyword>Response:</keyword> If a Dwarf wins a skirmish, heal that Dwarf.';
        expect(parseAbilities(text, 'Still Draws Breath', '1C25')).toBeUndefined();
    });

    it('n’émet rien pour Personne ne Lance un Nain (moulin)', () => {
        const text =
            '<keyword>Response:</keyword> If a Dwarf wins a skirmish, make an opponent discard 3 cards from the top of his or her draw deck.';
        expect(
            parseAbilities(text, 'Nobody Tosses a Dwarf', '1R23')
        ).toBeUndefined();
    });

    it('n’émet pas la réponse Sam si Frodo meurt (exception étape 6)', () => {
        const abilities = parseAbilities(SAM_TEXT, 'Sam', '2C114');
        expect(abilities).toHaveLength(1);
        expect(abilities?.[0]?.phases).toEqual(['MANEUVER']);
    });
});


