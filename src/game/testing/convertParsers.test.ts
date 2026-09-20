import { describe, expect, it } from 'vitest';
import {
    parseAbilities,
    parseSiteAbilities,
    parseGrantsKeywords,
    parseKeywords,
    coerceOrphanGameTextAsLore,
    buildLangBlock,
    formatGameText,
} from '../../../scripts/convert/parsers';

describe('formatGameText', () => {
    it('convertit <keyword> et l’ancien <b> en Markdown gras', () => {
        expect(
            formatGameText(
                'While bearing a possession, it is <keyword>fierce.</keyword>'
            )
        ).toBe('While bearing a possession, it is **fierce.**');
        expect(
            formatGameText(
                'While bearing a possession, it is <b>fierce.</b>'
            )
        ).toBe('While bearing a possession, it is **fierce.**');
    });

    it('ramène le point collé après le gras à l’intérieur', () => {
        expect(formatGameText('<keyword>fierce</keyword>.')).toBe(
            '**fierce.**'
        );
    });
});

describe('FormattedText — italique <i>', () => {
    it('conserve <i> dans formatGameText (rendu côté FormattedText)', () => {
        const text =
            'he gains **muster.** <i>(At the start of the regroup phase, you may discard a card from hand to draw a card.)</i>';
        expect(formatGameText(text)).toContain('<i>(');
        expect(formatGameText(text)).toContain(')</i>');
    });
});

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

    it('extrait Sanctuary sur un site', () => {
        const text =
            '<keyword>Sanctuary.</keyword> When the fellowship moves from Council Courtyard, remove <symbol>twilight2</symbol>.';
        expect(parseKeywords(text, 'Council Courtyard', 'SITE')).toEqual([
            'SANCTUARY',
        ]);
    });

    it('n’imprime pas Fierce / Damage accordés par un While at site', () => {
        expect(
            parseKeywords(
                'While this minion is at a battleground site, it is <keyword>Fierce.</keyword>',
                'Corps of Harad',
                'MINION'
            )
        ).toBeUndefined();
        expect(
            parseKeywords(
                'While this minion is at a plains site, it is <keyword>Damage +1.</keyword>',
                'Elder of Dunland',
                'MINION'
            )
        ).toBeUndefined();
        expect(
            parseKeywords(
                '<keyword>Damage +1.</keyword> While this minion is at a battleground site, it is <keyword>fierce.</keyword>',
                'Uruk',
                'MINION'
            )
        ).toEqual(['DAMAGE +1']);
    });
});

describe('parseSiteAbilities — moves to/from twilight', () => {
    it('émet remove twilight au départ (11S263)', () => {
        const text =
            '<keyword>Underground.</keyword> When the fellowship moves from this site, remove <symbol>twilight2</symbol>.';
        expect(parseSiteAbilities(text, '11S263')).toEqual([
            expect.objectContaining({
                trigger: { type: 'MOVES_FROM' },
                cost: [],
                effects: [{ type: 'REMOVE_TWILIGHT', count: 2 }],
            }),
        ]);
    });

    it('émet add twilight à l’arrivée', () => {
        const text =
            'When the fellowship moves to this site, add <symbol>twilight3</symbol>.';
        expect(parseSiteAbilities(text, 'test')).toEqual([
            expect.objectContaining({
                trigger: { type: 'MOVES_TO' },
                effects: [{ type: 'ADD_TWILIGHT', count: 3 }],
            }),
        ]);
    });

    it('refuse may / spot / for each', () => {
        expect(
            parseSiteAbilities(
                'When the fellowship moves from this site, the Free Peoples player may spot 3 burdens to remove a burden.',
                '11S252'
            )
        ).toBeUndefined();
        expect(
            parseSiteAbilities(
                'When the fellowship moves to this site, add <symbol>twilight1</symbol> for each Free Peoples weapon.',
                '11S239'
            )
        ).toBeUndefined();
    });

    it('émet discard each ally à l’arrivée (11S228)', () => {
        const text =
            '<keyword>River.</keyword> When the fellowship moves to this site, discard each ally from play.';
        expect(parseSiteAbilities(text, '11S228')).toEqual([
            expect.objectContaining({
                trigger: { type: 'MOVES_TO' },
                effects: [{ type: 'DISCARD_ALL', target: [['ALLY']] }],
            }),
        ]);
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

    it('parse 4R1 : Combat — fardeau pour mettre l’Anneau (+2 force While)', () => {
        const text =
            'While wearing The One Ring, the Ring-bearer is strength +2, and each time he is about to take a wound in a skirmish, add a burden instead.\n<keyword>Skirmish:</keyword> Add a burden to wear The One Ring until the regroup phase.';
        expect(parseAbilities(text, 'The One Ring', '4R1')).toEqual([
            {
                id: '4R1:0',
                phases: ['SKIRMISH'],
                cost: [{ addBurdens: 1 }],
                effects: [
                    {
                        type: 'WEAR_RING',
                        expiresAtPhase: 'REGROUP',
                        replaceWoundWithBurdens: 1,
                        onlyInSkirmish: true,
                        strengthBonus: 2,
                    },
                ],
                source: 'ATTACHMENT',
                text: expect.stringMatching(
                    /SKIRMISH: Add a burden to wear The One Ring/i
                ),
            },
        ]);
    });

    it('parse Merry 1R302 : force vers un autre compagnon si non affecté', () => {
        const text =
            '<keyword>Skirmish:</keyword> If Merry is not assigned to a skirmish, exert him twice to add his strength to another companion.';
        expect(parseAbilities(text, 'Merry', '1R302')).toEqual([
            {
                id: '1R302:0',
                phases: ['SKIRMISH'],
                requiresUnassigned: true,
                cost: [{ exert: [{ count: 2, target: 'SELF' }] }],
                effects: [
                    {
                        type: 'ADD_TEMP_STAT',
                        stat: 'STRENGTH',
                        value: 0,
                        valueFromSourceStat: 'STRENGTH',
                        target: [['COMPANION']],
                        excludeSource: true,
                        expiresAtPhase: 'SKIRMISH',
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(
                    /not assigned to a skirmish.*another companion/i
                ),
            },
        ]);
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
            {
                id: '1R173:1',
                phases: [],
                trigger: {
                    type: 'YOU_PLAY',
                    played: [['MORIA', 'WEAPON']],
                },
                cost: [],
                effects: [{ type: 'ADD_TWILIGHT', count: 1 }],
                source: 'SELF',
                text: expect.stringMatching(
                    /Each time you play a moria weapon, add twilight1/i
                ),
            },
        ]);
    });

    it('parse Hides : draw optionnel + retirer crépuscule OU défausser', () => {
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
            {
                id: '4R19:2',
                phases: [],
                trigger: { type: 'WHEN_PLAYED' },
                optional: true,
                cost: [],
                effects: [{ type: 'DRAW', count: 1 }],
                source: 'SELF',
                text: expect.stringMatching(
                    /When you play this possession, you may draw a card/i
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

    it('parse Arwen : Porteur, défausser 3 cartes de la main', () => {
        const text =
            '<keyword>Ranger.</keyword> <br><keyword>Response:</keyword> If the Ring-bearer is about to take a wound, discard 3 cards from hand to prevent that wound.';
        expect(parseAbilities(text, 'Arwen', '3U7')).toEqual([
            {
                id: '3U7:0',
                phases: ['RESPONSE'],
                trigger: {
                    type: 'ABOUT_TO_WOUND',
                    target: [['RING-BEARER']],
                },
                cost: [{ discardFromHand: 3 }],
                effects: [{ type: 'PREVENT_WOUND' }],
                source: 'SELF',
                text: expect.stringMatching(
                    /discard 3 cards from hand to prevent that wound/i
                ),
            },
        ]);
    });

    it('parse King of the Dead : Aragorn blessé en combat, affaiblir SELF', () => {
        const text =
            '<keyword>Response:</keyword> If Aragorn is about to take a wound in a skirmish, exert King of the Dead to prevent that wound.';
        expect(parseAbilities(text, 'King of the Dead', '8R38')).toEqual([
            {
                id: '8R38:0',
                phases: ['RESPONSE'],
                trigger: {
                    type: 'ABOUT_TO_WOUND',
                    target: [['Aragorn']],
                    inSkirmish: true,
                },
                cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
                effects: [{ type: 'PREVENT_WOUND' }],
                source: 'SELF',
                text: expect.stringMatching(/in a skirmish/i),
            },
        ]);
    });

    it('n’émet rien pour Éowyn épuisée (condition extra)', () => {
        const text =
            '<keyword>Valiant.</keyword><br><keyword>Response:</keyword> If Éowyn is exhausted and about to take a wound in a skirmish, discard 2 cards from hand to prevent that wound.';
        expect(parseAbilities(text, 'Éowyn', '0P39')).toBeUndefined();
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

    it('n’émet rien pour Coureur Gobelin (you may crépuscule — pas encore)', () => {
        const text =
            'When you play this minion, you may add <symbol>twilight2</symbol>.';
        expect(parseAbilities(text, 'Goblin Runner', '1U178')).toBeUndefined();
    });

    it('parse Vieux Tobie : you may draw a card (optionnel)', () => {
        const text =
            '**Pipeweed.**  \nWhen you play this possession, you may draw a card.';
        expect(parseAbilities(text, 'Old Toby', '1C305')).toEqual([
            {
                id: '1C305:0',
                phases: [],
                trigger: { type: 'WHEN_PLAYED' },
                optional: true,
                cost: [],
                effects: [{ type: 'DRAW', count: 1 }],
                source: 'SELF',
                text: expect.stringMatching(
                    /When you play this possession, you may draw a card/i
                ),
            },
        ]);
    });

    it('parse Feuille de Longoulet : you may discard up to 2 from hand', () => {
        const text =
            '**Pipeweed.**  \nWhen you play this possession, you may discard up to 2 cards from hand.';
        expect(parseAbilities(text, 'Longbottom Leaf', '1C300')).toEqual([
            {
                id: '1C300:0',
                phases: [],
                trigger: { type: 'WHEN_PLAYED' },
                optional: true,
                cost: [],
                effects: [{ type: 'DISCARD_FROM_HAND', count: 2, upTo: true }],
                source: 'SELF',
                text: expect.stringMatching(
                    /you may discard up to 2 cards from hand/i
                ),
            },
        ]);
    });

    it('parse Watchful Orc : you may spot another orc to replace current site', () => {
        const text =
            "When you play this minion, you may spot another <symbol>orc</symbol> minion to replace the fellowship's current site with an underground site from your adventure deck.";
        expect(parseAbilities(text, 'Watchful Orc', '11R143')).toEqual([
            {
                id: '11R143:0',
                phases: [],
                trigger: { type: 'WHEN_PLAYED' },
                optional: true,
                cost: [
                    {
                        spot: [
                            {
                                count: 1,
                                target: [['ORC', 'MINION']],
                                excludeSource: true,
                            },
                        ],
                    },
                ],
                effects: [
                    {
                        type: 'REPLACE_SITE',
                        scope: 'CURRENT',
                        from: 'SITES_DECK',
                        siteKeyword: 'UNDERGROUND',
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(
                    /spot another .* minion to replace the fellowship/i
                ),
            },
        ]);
    });
});

describe('parseAbilities — Each time you play', () => {
    it('parse Armurerie gobeline : jouer une arme Moria → +1 crépuscule', () => {
        const text =
            'Each time you play a <symbol>moria</symbol> weapon, add <symbol>twilight1</symbol>.';
        expect(parseAbilities(text, 'Goblin Armory', '1R173')).toEqual([
            {
                id: '1R173:0',
                phases: [],
                trigger: {
                    type: 'YOU_PLAY',
                    played: [['MORIA', 'WEAPON']],
                },
                cost: [],
                effects: [{ type: 'ADD_TWILIGHT', count: 1 }],
                source: 'SELF',
                text: expect.stringMatching(
                    /Each time you play a moria weapon, add twilight1/i
                ),
            },
        ]);
    });

    it('n’émet rien si you may, during, ou effet inconnu', () => {
        expect(
            parseAbilities(
                'Each time you play a <symbol>moria</symbol> weapon, you may add <symbol>twilight1</symbol>.',
                'Fake',
                'x1'
            )
        ).toBeUndefined();
        expect(
            parseAbilities(
                'Each time you play a spell during a skirmish, add <symbol>twilight1</symbol>.',
                'Glamdring',
                '0P44'
            )
        ).toBeUndefined();
        expect(
            parseAbilities(
                'Each time you play an Elf, choose an opponent to discard a card from hand.',
                'Far-seeing Eyes',
                '1C43'
            )
        ).toBeUndefined();
    });
});

describe('parseAbilities — While you can spot → strength', () => {
    it('parse Gandalf : spot 3 crépuscule → force +3', () => {
        const text =
            'While you can spot 3 twilight tokens, Gandalf is strength +3.';
        expect(parseAbilities(text, 'Gandalf', '4C90')).toEqual([
            {
                id: '4C90:0',
                phases: [],
                trigger: { type: 'WHILE', spotTwilight: 3 },
                cost: [],
                effects: [
                    {
                        type: 'MODIFY_STAT',
                        stat: 'STRENGTH',
                        value: 3,
                        target: 'SELF',
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(
                    /While you can spot 3 twilight tokens, Gandalf is strength \+3/i
                ),
            },
        ]);
    });

    it('parse Morgul Cur : spot un Nazgûl → force +2', () => {
        const text =
            'While you can spot a Nazgûl, this minion is strength +2.';
        expect(parseAbilities(text, 'Morgul Cur', '7C189')).toEqual([
            {
                id: '7C189:0',
                phases: [],
                trigger: {
                    type: 'WHILE',
                    spot: [{ count: 1, target: [['NAZGÛL']] }],
                },
                cost: [],
                effects: [
                    {
                        type: 'MODIFY_STAT',
                        stat: 'STRENGTH',
                        value: 2,
                        target: 'SELF',
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(
                    /While you can spot a Nazgûl, this minion is strength \+2/i
                ),
            },
        ]);
    });

    it('parse Uglúk : spot 2 trackers → force +3 ; spot 3 → damage +1', () => {
        const text =
            'While you can spot 2 <symbol>isengard</symbol> trackers, Uglúk is strength +3.\nWhile you can spot 3 <symbol>isengard</symbol> trackers, Uglúk is <keyword>damage +1.</keyword>';
        expect(parseAbilities(text, 'Uglúk', '4R176')).toEqual([
            {
                id: '4R176:0',
                phases: [],
                trigger: {
                    type: 'WHILE',
                    spot: [{ count: 2, target: [['ISENGARD', 'TRACKER']] }],
                },
                cost: [],
                effects: [
                    {
                        type: 'MODIFY_STAT',
                        stat: 'STRENGTH',
                        value: 3,
                        target: 'SELF',
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(
                    /While you can spot 2 isengard trackers, Uglúk is strength \+3/i
                ),
            },
            {
                id: '4R176:1',
                phases: [],
                trigger: {
                    type: 'WHILE',
                    spot: [{ count: 3, target: [['ISENGARD', 'TRACKER']] }],
                },
                cost: [],
                effects: [
                    {
                        type: 'MODIFY_KEYWORD',
                        keyword: 'DAMAGE +1',
                        target: 'SELF',
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(
                    /While you can spot 3 isengard trackers, Uglúk is damage \+1/i
                ),
            },
        ]);
    });

    it('parse Cirith Ungol Patroller : spot 3 possessions → fierce', () => {
        const text =
            'While you can spot 3 possessions, this minion is <keyword>fierce.</keyword>';
        expect(
            parseAbilities(text, 'Cirith Ungol Patroller', '10U82')
        ).toEqual([
            {
                id: '10U82:0',
                phases: [],
                trigger: {
                    type: 'WHILE',
                    spot: [{ count: 3, target: [['POSSESSION']] }],
                },
                cost: [],
                effects: [
                    {
                        type: 'MODIFY_KEYWORD',
                        keyword: 'FIERCE',
                        target: 'SELF',
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(
                    /While you can spot 3 possessions, this minion is fierce/i
                ),
            },
        ]);
    });

    it('parse Úlairë Nertëa : spot 6 companions → each Nazgûl +2', () => {
        const text =
            'While you can spot 6 companions, each Nazgûl is strength +2.';
        expect(parseAbilities(text, 'Úlairë Nertëa', '0P116')).toEqual([
            {
                id: '0P116:0',
                phases: [],
                trigger: {
                    type: 'WHILE',
                    spot: [{ count: 6, target: [['COMPANION']] }],
                },
                cost: [],
                effects: [
                    {
                        type: 'MODIFY_STAT',
                        stat: 'STRENGTH',
                        value: 2,
                        target: [['NAZGÛL']],
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(
                    /While you can spot 6 companions, each Nazgûl is strength \+2/i
                ),
            },
        ]);
    });

    it('parse Chaotic Clash : spot orc minion → each companion -1', () => {
        const text =
            'While you can spot an <symbol>orc</symbol> minion, each companion is strength -1.';
        expect(parseAbilities(text, 'Chaotic Clash', '17C68')).toEqual([
            {
                id: '17C68:0',
                phases: [],
                trigger: {
                    type: 'WHILE',
                    spot: [{ count: 1, target: [['ORC', 'MINION']] }],
                },
                cost: [],
                effects: [
                    {
                        type: 'MODIFY_STAT',
                        stat: 'STRENGTH',
                        value: -1,
                        target: [['COMPANION']],
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(
                    /While you can spot an orc minion, each companion is strength -1/i
                ),
            },
        ]);
    });

    it('parse Raging Dunlending : spot 6 companions → each Men minion fierce', () => {
        const text =
            'While you can spot 6 companions, each <symbol>men</symbol> minion is <keyword>Fierce.</keyword>';
        expect(parseAbilities(text, 'Raging Dunlending', '11S97')).toEqual([
            {
                id: '11S97:0',
                phases: [],
                trigger: {
                    type: 'WHILE',
                    spot: [{ count: 6, target: [['COMPANION']] }],
                },
                cost: [],
                effects: [
                    {
                        type: 'MODIFY_KEYWORD',
                        keyword: 'FIERCE',
                        target: [['MEN', 'MINION']],
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(
                    /While you can spot 6 companions, each men minion is Fierce/i
                ),
            },
        ]);
    });

    it('parse Shingle in a Storm : spot 6 companions → each Uruk damage +1', () => {
        const text =
            'While you can spot 6 companions, each <symbol>urukhai</symbol> minion is <keyword>damage +1.</keyword>';
        expect(parseAbilities(text, 'Shingle in a Storm', '12C145')).toEqual([
            {
                id: '12C145:0',
                phases: [],
                trigger: {
                    type: 'WHILE',
                    spot: [{ count: 6, target: [['COMPANION']] }],
                },
                cost: [],
                effects: [
                    {
                        type: 'MODIFY_KEYWORD',
                        keyword: 'DAMAGE +1',
                        target: [['URUK-HAI', 'MINION']],
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(
                    /While you can spot 6 companions, each urukhai minion is damage \+1/i
                ),
            },
        ]);
    });

    it('refuse and fierce / for each / each skirmishing / of your / other / archer', () => {
        expect(
            parseAbilities(
                'While you can spot 2 burdens, this minion is strength +3 and fierce.',
                'Easterling Axeman',
                '4C224'
            )
        ).toBeUndefined();
        expect(
            parseAbilities(
                'While you can spot 2 companions, this minion is <keyword>fierce</keyword> and <keyword>damage +1.</keyword>',
                'Dummy',
                'X1'
            )
        ).toBeUndefined();
        expect(
            parseAbilities(
                'While you can spot 3 <symbol>elven</symbol> allies whose home is site 3, each minion skirmishing Arwen is strength -3.',
                'Arwen',
                '3R8'
            )
        ).toBeUndefined();
        expect(
            parseAbilities(
                'While you can spot 2 <symbol>gandalf</symbol> tokens, each of your <symbol>gandalf</symbol> Men is strength +2.',
                'Librarian',
                '18C22'
            )
        ).toBeUndefined();
        expect(
            parseAbilities(
                'While you can spot 3 threats, each <symbol>sauron</symbol> Orc that is not roaming is strength +1.',
                'Fires Raged Unchecked',
                '7R269'
            )
        ).toBeUndefined();
        expect(
            parseAbilities(
                'While you can spot Sauron, each other minion is <keyword>Damage +1.</keyword>.',
                'Throne of the Dark Lord',
                '17R105'
            )
        ).toBeUndefined();
        expect(
            parseAbilities(
                'While you can spot 6 companions, each <symbol>men</symbol> minion is an <keyword>Archer.</keyword>',
                'Fletcher of Harad',
                '11R81'
            )
        ).toBeUndefined();
    });
});

describe('parseAbilities — While skirmishing → strength', () => {
    it('parse Arwen : skirmishing a Nazgûl → force +3', () => {
        const text = 'While skirmishing a Nazgûl, Arwen is strength +3.';
        expect(parseAbilities(text, 'Arwen', '1R30')).toEqual([
            {
                id: '1R30:0',
                phases: [],
                trigger: {
                    type: 'WHILE',
                    skirmishing: { target: [['NAZGÛL']] },
                },
                cost: [],
                effects: [
                    {
                        type: 'MODIFY_STAT',
                        stat: 'STRENGTH',
                        value: 3,
                        target: 'SELF',
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(
                    /While skirmishing a Nazgûl, Arwen is strength \+3/i
                ),
            },
        ]);
    });

    it('parse fierce minion + classe culture', () => {
        expect(
            parseAbilities(
                'While skirmishing a fierce minion, Arwen is strength +3.',
                'Arwen',
                '7R16'
            )
        ).toEqual([
            {
                id: '7R16:0',
                phases: [],
                trigger: {
                    type: 'WHILE',
                    skirmishing: { target: [['FIERCE', 'MINION']] },
                },
                cost: [],
                effects: [
                    {
                        type: 'MODIFY_STAT',
                        stat: 'STRENGTH',
                        value: 3,
                        target: 'SELF',
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(
                    /While skirmishing a fierce minion, Arwen is strength \+3/i
                ),
            },
        ]);

        expect(
            parseAbilities(
                'While skirmishing a <symbol>rohan</symbol> Man, this minion is strength +2.',
                'Dunlending Ravager',
                '4C15'
            )
        ).toEqual([
            {
                id: '4C15:0',
                phases: [],
                trigger: {
                    type: 'WHILE',
                    skirmishing: { target: [['ROHAN', 'MAN']] },
                },
                cost: [],
                effects: [
                    {
                        type: 'MODIFY_STAT',
                        stat: 'STRENGTH',
                        value: 2,
                        target: 'SELF',
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(
                    /While skirmishing a rohan Man, this minion is strength \+2/i
                ),
            },
        ]);
    });

    it('refuse roaming / wounded / non-hunter', () => {
        expect(
            parseAbilities(
                'While skirmishing a roaming minion, this companion is strength +2.',
                'Dummy',
                'X2'
            )
        ).toBeUndefined();
        expect(
            parseAbilities(
                'While skirmishing a wounded minion, Farin is strength +2.',
                'Farin',
                'X3'
            )
        ).toBeUndefined();
        expect(
            parseAbilities(
                'While skirmishing a non-hunter minion, this companion is strength +1.',
                'Dummy',
                'X4'
            )
        ).toBeUndefined();
    });
});

describe('parseAbilities — While bearing → strength / keyword', () => {
    it('parse Merry : bears a weapon → force +2', () => {
        expect(
            parseAbilities(
                'While Merry bears a weapon, he is strength +2.',
                'Merry',
                '1C303'
            )
        ).toEqual([
            {
                id: '1C303:0',
                phases: [],
                trigger: {
                    type: 'WHILE',
                    bearing: { target: [['WEAPON']] },
                },
                cost: [],
                effects: [
                    {
                        type: 'MODIFY_STAT',
                        stat: 'STRENGTH',
                        value: 2,
                        target: 'SELF',
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(
                    /While Merry bears a weapon, he is strength \+2/i
                ),
            },
        ]);
    });

    it('parse possession → fierce / Damage', () => {
        expect(
            parseAbilities(
                'While this minion is bearing a possession, it is <keyword>fierce.</keyword>',
                'Frenzied Dunlending',
                '12S65'
            )
        ).toEqual([
            {
                id: '12S65:0',
                phases: [],
                trigger: {
                    type: 'WHILE',
                    bearing: { target: [['POSSESSION']] },
                },
                cost: [],
                effects: [
                    {
                        type: 'MODIFY_KEYWORD',
                        keyword: 'FIERCE',
                        target: 'SELF',
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(
                    /While this minion is bearing a possession, it is fierce/i
                ),
            },
        ]);

        expect(
            parseAbilities(
                'While Éomer bears a mount, he is <keyword>damage +1.</keyword>',
                'Éomer',
                '13R123'
            )
        ).toEqual([
            {
                id: '13R123:0',
                phases: [],
                trigger: {
                    type: 'WHILE',
                    bearing: { target: [['MOUNT']] },
                },
                cost: [],
                effects: [
                    {
                        type: 'MODIFY_KEYWORD',
                        keyword: 'DAMAGE +1',
                        target: 'SELF',
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(
                    /While Éomer bears a mount, he is damage \+1/i
                ),
            },
        ]);
    });

    it('refuse nom propre d’attachement', () => {
        expect(
            parseAbilities(
                'While bearing a Goblin Spear, this minion is <keyword>damage +2.</keyword>',
                'Goblin Spearman',
                '2C65'
            )
        ).toBeUndefined();
    });
});

describe('parseAbilities — While at a … site → strength', () => {
    it('parse Denizen : while at underground → force +2', () => {
        expect(
            parseAbilities(
                'While this minion is at an underground site, it is strength +2.',
                'Denizen of Khazad-dûm',
                '11S115'
            )
        ).toEqual([
            expect.objectContaining({
                trigger: { type: 'WHILE', atSiteKeyword: 'UNDERGROUND' },
                effects: [
                    {
                        type: 'MODIFY_STAT',
                        stat: 'STRENGTH',
                        value: 2,
                        target: 'SELF',
                    },
                ],
            }),
        ]);
    });

    it('parse Goblin Wallcrawler (wording While at…)', () => {
        const abs = parseAbilities(
            'While at an underground site, this minion is strength +2.  <br>While you can spot another <symbol>moria</symbol> Orc, the fellowship archery total is -1.',
            'Goblin Wallcrawler',
            '1C184'
        );
        expect(abs).toEqual([
            expect.objectContaining({
                trigger: { type: 'WHILE', atSiteKeyword: 'UNDERGROUND' },
                effects: [
                    expect.objectContaining({
                        type: 'MODIFY_STAT',
                        value: 2,
                    }),
                ],
            }),
        ]);
    });

    it('parse Woodland Sentinel / Uruk Decimator terrains', () => {
        expect(
            parseAbilities(
                'While this companion is at a forest site, he is strength +2.',
                'Woodland Sentinel',
                '11C27'
            )
        ).toEqual([
            expect.objectContaining({
                trigger: { type: 'WHILE', atSiteKeyword: 'FOREST' },
            }),
        ]);
        const uruk = parseAbilities(
            'While this minion is at a battleground site, it is strength +2. <br>While this minion is bearing a possession, it is <keyword>damage +1.</keyword>',
            'Uruk Decimator',
            '12R150'
        );
        expect(uruk).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    trigger: { type: 'WHILE', atSiteKeyword: 'BATTLEGROUND' },
                }),
                expect.objectContaining({
                    trigger: {
                        type: 'WHILE',
                        bearing: { target: [['POSSESSION']] },
                    },
                }),
            ])
        );
    });

    it('refuse strength +N and Damage / Fierce', () => {
        expect(
            parseAbilities(
                'While this minion is at a battleground site, it is strength +1 and <keyword>Damage +1.</keyword>',
                'Feral Uruk',
                '11S183'
            )
        ).toBeUndefined();
    });
    it('parse fellowship at site : Haldir force + each Nain', () => {
        expect(
            parseAbilities(
                'While the fellowship is at a battleground site, Haldir is strength +2.',
                'Haldir',
                '15U17'
            )
        ).toEqual([
            expect.objectContaining({
                trigger: { type: 'WHILE', atSiteKeyword: 'BATTLEGROUND' },
                effects: [
                    expect.objectContaining({
                        type: 'MODIFY_STAT',
                        value: 2,
                        target: 'SELF',
                    }),
                ],
            }),
        ]);
        expect(
            parseAbilities(
                'While the fellowship is at a mountain site, each Dwarf is strength +2.',
                'Well-equipped',
                '11U12'
            )
        ).toEqual([
            expect.objectContaining({
                trigger: { type: 'WHILE', atSiteKeyword: 'MOUNTAIN' },
                effects: [
                    {
                        type: 'MODIFY_STAT',
                        stat: 'STRENGTH',
                        value: 2,
                        target: [['DWARF']],
                    },
                ],
            }),
        ]);
    });

    it('parse Haldir forest → Archer', () => {
        const abs = parseAbilities(
            'While the fellowship is at a battleground site, Haldir is strength +2. While the fellowship is at a forest site, Haldir is an <keyword>archer.</keyword>',
            'Haldir',
            '15U17'
        );
        expect(abs).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    trigger: { type: 'WHILE', atSiteKeyword: 'BATTLEGROUND' },
                }),
                expect.objectContaining({
                    trigger: { type: 'WHILE', atSiteKeyword: 'FOREST' },
                    effects: [
                        expect.objectContaining({
                            type: 'MODIFY_KEYWORD',
                            keyword: 'ARCHER',
                        }),
                    ],
                }),
            ])
        );
    });
});

describe('parseAbilities — While at a … site → keyword', () => {
    it('parse Corps of Harad : battleground → Fierce', () => {
        expect(
            parseAbilities(
                'While this minion is at a battleground site, it is <keyword>Fierce.</keyword>',
                'Corps of Harad',
                '11C73'
            )
        ).toEqual([
            expect.objectContaining({
                trigger: { type: 'WHILE', atSiteKeyword: 'BATTLEGROUND' },
                effects: [
                    {
                        type: 'MODIFY_KEYWORD',
                        keyword: 'FIERCE',
                        target: 'SELF',
                    },
                ],
            }),
        ]);
    });

    it('parse Elder of Dunland : plains → Damage +1', () => {
        expect(
            parseAbilities(
                'While this minion is at a plains site, it is <keyword>Damage +1.</keyword>',
                'Elder of Dunland',
                '11S77'
            )
        ).toEqual([
            expect.objectContaining({
                trigger: { type: 'WHILE', atSiteKeyword: 'PLAINS' },
                effects: [
                    expect.objectContaining({
                        type: 'MODIFY_KEYWORD',
                        keyword: 'DAMAGE +1',
                    }),
                ],
            }),
        ]);
    });

    it('parse Fletcher : plains → Archer (ignore each suite)', () => {
        const abs = parseAbilities(
            'While this minion is at a plains site, it is an <keyword>Archer.</keyword> While you can spot 6 companions, each <symbol>men</symbol> minion is an <keyword>Archer.</keyword>',
            'Fletcher of Harad',
            '11R81'
        );
        expect(abs).toEqual([
            expect.objectContaining({
                trigger: { type: 'WHILE', atSiteKeyword: 'PLAINS' },
                effects: [
                    expect.objectContaining({
                        keyword: 'ARCHER',
                    }),
                ],
            }),
        ]);
    });

    it('parse Axe of Khazad-dûm : bearer at mountain → Damage +1', () => {
        expect(
            parseAbilities(
                'Bearer must be a Dwarf. <br>While bearer is at a mountain site, he is <keyword>Damage +1.</keyword>',
                'Axe of Khazad-dûm',
                '11U3'
            )
        ).toEqual([
            expect.objectContaining({
                trigger: { type: 'WHILE', atSiteKeyword: 'MOUNTAIN' },
                effects: [
                    {
                        type: 'MODIFY_KEYWORD',
                        keyword: 'DAMAGE +1',
                        target: 'BEARER',
                    },
                ],
                source: 'ATTACHMENT',
            }),
        ]);
    });
});

describe('parseAbilities — For each … strength', () => {
    it('parse Gandalf 1R72 : +1 par race distincte en fellowship', () => {
        expect(
            parseAbilities(
                'Gandalf is strength +1 for each of these races you can spot in the fellowship: Hobbit, Dwarf, Elf, and Man.',
                'Gandalf',
                '1R72'
            )
        ).toEqual([
            expect.objectContaining({
                trigger: { type: 'WHILE' },
                effects: [
                    {
                        type: 'MODIFY_STAT',
                        stat: 'STRENGTH',
                        value: 1,
                        target: 'SELF',
                        perDistinctRace: {
                            races: ['HOBBIT', 'DWARF', 'ELF', 'MAN'],
                            inFellowship: true,
                        },
                    },
                ],
            }),
        ]);
    });

    it('parse passif for each companion you can spot', () => {
        expect(
            parseAbilities(
                'This minion is strength +1 for each companion you can spot.',
                'Some Minion',
                '0P20'
            )
        ).toEqual([
            expect.objectContaining({
                effects: [
                    expect.objectContaining({
                        type: 'MODIFY_STAT',
                        value: 1,
                        target: 'SELF',
                        perSpot: { target: [['COMPANION']] },
                    }),
                ],
            }),
        ]);
    });

    it('parse malgré mot-clé en gras avant la phrase', () => {
        expect(
            parseAbilities(
                '**Fierce.**\n This minion is strength +1 for each companion you can spot.',
                'Watcher',
                '0P20'
            )
        ).toEqual([
            expect.objectContaining({
                effects: [
                    expect.objectContaining({
                        type: 'MODIFY_STAT',
                        perSpot: { target: [['COMPANION']] },
                    }),
                ],
            }),
        ]);
    });

    it('parse depuis markup CSV <keyword> + <br>', () => {
        expect(
            parseAbilities(
                '<keyword>Fierce.</keyword><br> This minion is strength +1 for each companion you can spot.',
                'Black Rider',
                '0P20'
            )
        ).toEqual([
            expect.objectContaining({
                effects: [
                    expect.objectContaining({
                        perSpot: { target: [['COMPANION']] },
                    }),
                ],
            }),
        ]);
    });

    it('parse you spot (sans can) et ignore rappel <i> avec skirmish', () => {
        expect(
            parseAbilities(
                '**Hunter 1.** <i>(While skirmishing a non-hunter character, this character is strength +1.)</i>\nThis minion is strength +3 for each follower you can spot.',
                'Uruk',
                '15C83'
            )
        ).toEqual([
            expect.objectContaining({
                effects: [
                    expect.objectContaining({
                        value: 3,
                        perSpot: { target: [['FOLLOWER']] },
                    }),
                ],
            }),
        ]);
    });

    it('parse for every + you spot', () => {
        expect(
            parseAbilities(
                'This companion is strength +1 for every Ent you spot.',
                'Treebeard',
                '9R25'
            )
        ).toEqual([
            expect.objectContaining({
                effects: [
                    expect.objectContaining({
                        perSpot: { target: [['ENT']] },
                    }),
                ],
            }),
        ]);
    });

    it('parse Bearer for each Elf with limit', () => {
        expect(
            parseAbilities(
                'Bearer is strength +1 for each Elf you can spot (limit +3).',
                'Some Tale',
                '1R49'
            )
        ).toEqual([
            expect.objectContaining({
                effects: [
                    {
                        type: 'MODIFY_STAT',
                        stat: 'STRENGTH',
                        value: 1,
                        target: 'BEARER',
                        perSpot: { target: [['ELF']], limit: 3 },
                    },
                ],
            }),
        ]);
    });
});

describe('parseAbilities — While spot N terrain sites', () => {
    it('parse Unforgiving Depths : 3 underground → each Orc Muster + Shadow replace', () => {
        expect(
            parseAbilities(
                'While you can spot 3 underground sites, each <symbol>orc</symbol> Orc gains **muster.** <keyword>Shadow:</keyword> Discard this condition from play and spot an <symbol>orc</symbol> minion to replace the fellowship’s current site with an underground site from your adventure deck.',
                'Unforgiving Depths',
                '13C120'
            )
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    trigger: {
                        type: 'WHILE',
                        spotSiteKeyword: {
                            keyword: 'UNDERGROUND',
                            count: 3,
                        },
                    },
                    effects: [
                        {
                            type: 'MODIFY_KEYWORD',
                            keyword: 'MUSTER',
                            target: [['ORC', 'ORC']],
                        },
                    ],
                }),
                expect.objectContaining({
                    phases: ['SHADOW'],
                    cost: [
                        expect.objectContaining({
                            discardFromPlay: [
                                { count: 1, target: 'SELF' },
                            ],
                            spot: [
                                {
                                    count: 1,
                                    target: [['ORC', 'MINION']],
                                },
                            ],
                        }),
                    ],
                    effects: [
                        {
                            type: 'REPLACE_SITE',
                            scope: 'CURRENT',
                            from: 'SITES_DECK',
                            siteKeyword: 'UNDERGROUND',
                        },
                    ],
                }),
            ])
        );
        expect(
            parseAbilities(
                'While you can spot 3 underground sites, each <symbol>orc</symbol> Orc gains **muster.** <keyword>Shadow:</keyword> Discard this condition from play and spot an <symbol>orc</symbol> minion to replace the fellowship’s current site with an underground site from your adventure deck.',
                'Unforgiving Depths',
                '13C120'
            )
        ).toHaveLength(2);
    });

    it('parse Nelya : Exert self → replace site courant (sans filtre)', () => {
        expect(
            parseAbilities(
                '<keyword>Fierce.</keyword> <keyword>Shadow:</keyword> Exert Úlairë Nelya to replace  the fellowship\'s current site with a site from your adventure deck.',
                'Úlairë Nelya',
                '11S222'
            )
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    phases: ['SHADOW'],
                    cost: [
                        {
                            exert: [
                                { count: 1, target: 'SELF' },
                            ],
                        },
                    ],
                    effects: [
                        {
                            type: 'REPLACE_SITE',
                            scope: 'CURRENT',
                            from: 'SITES_DECK',
                        },
                    ],
                }),
            ])
        );
    });

    it('parse There’s Another Way : Discard SELF → replace site courant', () => {
        expect(
            parseAbilities(
                '<keyword>Regroup:</keyword> Discard this condition to replace the fellowship’s current site with a site from your adventure deck.',
                "There's Another Way",
                '12C40'
            )
        ).toEqual([
            expect.objectContaining({
                phases: ['REGROUP'],
                cost: [
                    {
                        discardFromPlay: [
                            { count: 1, target: 'SELF' },
                        ],
                    },
                ],
                effects: [
                    {
                        type: 'REPLACE_SITE',
                        scope: 'CURRENT',
                        from: 'SITES_DECK',
                    },
                ],
            }),
        ]);
    });

    it('parse Siege Troop : Exert ×2 → take control of a site', () => {
        expect(
            parseAbilities(
                '<keyword>Besieger.</keyword> <keyword>Regroup:</keyword> Exert this minion twice to take control of a site.',
                'Siege Troop',
                '8C106'
            )
        ).toEqual([
            expect.objectContaining({
                phases: ['REGROUP'],
                cost: [
                    {
                        exert: [{ count: 2, target: 'SELF' }],
                    },
                ],
                effects: [{ type: 'TAKE_CONTROL_SITE' }],
                source: 'SELF',
            }),
        ]);
    });

    it('parse Uruk Besieger : stack Regroup + play from stack Shadow', () => {
        expect(
            parseAbilities(
                '<keyword>Damage +1.</keyword> <keyword>Regroup:</keyword> Stack this minion on a site you control. <keyword>Shadow:</keyword> If stacked on a site you control, play this minion. Its twilight cost is -1.',
                'Uruk Besieger',
                '4C180'
            )
        ).toEqual([
            expect.objectContaining({
                phases: ['REGROUP'],
                cost: [],
                effects: [{ type: 'STACK_ON_CONTROLLED_SITE' }],
                source: 'SELF',
            }),
            expect.objectContaining({
                phases: ['SHADOW'],
                cost: [],
                effects: [{ type: 'PLAY_FROM_STACK', twilightReduce: 1 }],
                source: 'SELF',
                requiresStackedOnControlledSite: true,
            }),
        ]);
    });

    it('parse Troll of Gorgoroth : exert to stack a besieger', () => {
        expect(
            parseAbilities(
                '<keyword>Besieger.</keyword> <keyword>Fierce.</keyword> To play, spot a <symbol>sauron</symbol> Orc. The twilight cost of this minion is –2 for each <symbol>sauron</symbol> engine you spot. <keyword>Regroup:</keyword> Exert Troll of Gorgoroth to stack a besieger on a site you control.',
                'Troll of Gorgoroth',
                '8R108'
            )
        ).toEqual([
            expect.objectContaining({
                phases: ['REGROUP'],
                cost: [
                    {
                        exert: [{ count: 1, target: 'SELF' }],
                    },
                ],
                effects: [
                    {
                        type: 'STACK_ON_CONTROLLED_SITE',
                        target: [['BESIEGER']],
                    },
                ],
                source: 'SELF',
            }),
        ]);
    });

    it('parse Their Marching Companies : remove threat to stack / play Sauron minion', () => {
        expect(
            parseAbilities(
                '<keyword>Engine.</keyword> To play, spot a <symbol>sauron</symbol> minion. <keyword>Regroup:</keyword> Remove a threat to stack your <symbol>sauron</symbol> minion on a site you control. <keyword>Shadow:</keyword> Remove a threat to play a <symbol>sauron</symbol> minion stacked on a site you control.',
                'Their Marching Companies',
                '8U107'
            )
        ).toEqual([
            expect.objectContaining({
                phases: ['REGROUP'],
                cost: [{ removeThreats: 1 }],
                effects: [
                    {
                        type: 'STACK_ON_CONTROLLED_SITE',
                        target: [['SAURON', 'MINION']],
                    },
                ],
                source: 'SELF',
            }),
            expect.objectContaining({
                phases: ['SHADOW'],
                cost: [{ removeThreats: 1 }],
                effects: [
                    {
                        type: 'PLAY_FROM_STACK',
                        target: [['SAURON', 'MINION']],
                    },
                ],
                source: 'SELF',
            }),
        ]);
    });

    it('parse No Retreat : Spot 2 Dunland Men + discard → force move again', () => {
        expect(
            parseAbilities(
                'Plays on a site you control. <keyword>Regroup:</keyword> Spot 2 <symbol>dunland</symbol> Men and discard this condition to make the Free Peoples player choose to move again this turn (if the move limit allows).',
                'No Retreat',
                '4R30'
            )
        ).toEqual([
            expect.objectContaining({
                phases: ['REGROUP'],
                cost: [
                    {
                        spot: [
                            {
                                count: 2,
                                target: [['DUNLAND', 'MAN']],
                            },
                        ],
                        discardFromPlay: [{ count: 1, target: 'SELF' }],
                    },
                ],
                effects: [{ type: 'FORCE_CHOOSE_MOVE_AGAIN' }],
                source: 'SELF',
            }),
        ]);
    });

    it('parse Sturdy Shield : Discard this → liberate a site + While no opponent', () => {
        expect(
            parseAbilities(
                'Bearer must be a <symbol>rohan</symbol> Man. While no opponent controls a site, bearer is strength +1. <keyword>Regroup:</keyword> Discard this to liberate a site (or two sites if bearer is mounted).',
                'Sturdy Shield',
                '15R141'
            )
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    phases: ['REGROUP'],
                    cost: [
                        {
                            discardFromPlay: [
                                { count: 1, target: 'SELF' },
                            ],
                        },
                    ],
                    effects: [{ type: 'LIBERATE_SITE' }],
                    source: 'SELF',
                }),
                expect.objectContaining({
                    trigger: {
                        type: 'WHILE',
                        noOpponentControlsSite: true,
                    },
                    effects: [
                        {
                            type: 'MODIFY_STAT',
                            stat: 'STRENGTH',
                            value: 1,
                            target: 'BEARER',
                        },
                    ],
                    source: 'ATTACHMENT',
                }),
            ])
        );
    });

    it('parse Dunland Ransacker : each time wins → spot another → take control', () => {
        expect(
            parseAbilities(
                'Each time this minion wins a skirmish, you may spot another <symbol>dunland</symbol> Man to take control of a site.',
                'Dunland Ransacker',
                '4C14'
            )
        ).toEqual([
            expect.objectContaining({
                phases: ['RESPONSE'],
                trigger: { type: 'WINS_SKIRMISH', winner: 'SELF' },
                optional: true,
                cost: [
                    {
                        spot: [
                            {
                                count: 1,
                                target: [['DUNLAND', 'MAN']],
                                excludeSource: true,
                            },
                        ],
                    },
                ],
                effects: [{ type: 'TAKE_CONTROL_SITE' }],
            }),
        ]);
    });

    it('parse Dunlending Looter : when wins → stack + Shadow play from stack', () => {
        expect(
            parseAbilities(
                'When this minion wins a skirmish, you may stack him on a site you control. <keyword>Shadow:</keyword> If stacked on a site you control, play this minion. His twilight cost is -2.',
                'Dunlending Looter',
                '4U11'
            )
        ).toEqual([
            expect.objectContaining({
                phases: ['SHADOW'],
                effects: [{ type: 'PLAY_FROM_STACK', twilightReduce: 2 }],
                requiresStackedOnControlledSite: true,
            }),
            expect.objectContaining({
                phases: ['RESPONSE'],
                trigger: { type: 'WINS_SKIRMISH', winner: 'SELF' },
                optional: true,
                cost: [],
                effects: [{ type: 'STACK_ON_CONTROLLED_SITE' }],
            }),
        ]);
    });

    it('parse Hillman Rabble : each time wins → stack', () => {
        expect(
            parseAbilities(
                'Each time this minion wins a skirmish, you may stack it on a site you control. <keyword>Shadow:</keyword> If stacked on a site you control, play this minion. Its twilight cost is -2.',
                'Hillman Rabble',
                '4U24'
            )
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    phases: ['RESPONSE'],
                    trigger: { type: 'WINS_SKIRMISH', winner: 'SELF' },
                    optional: true,
                    effects: [{ type: 'STACK_ON_CONTROLLED_SITE' }],
                }),
                expect.objectContaining({
                    phases: ['SHADOW'],
                    effects: [{ type: 'PLAY_FROM_STACK', twilightReduce: 2 }],
                }),
            ])
        );
    });

    it('parse Olog-hai of Mordor : wins → play besieger from stack + Fierce/Damage', () => {
        expect(
            parseAbilities(
                '<keyword>Besieger.</keyword> <keyword>Fierce.</keyword> The twilight cost of this minion is –2 for each <symbol>sauron</symbol> minion stacked on a site. Each time this minion wins a skirmish, you may play a besieger stacked on a site you control. That besieger is fierce and <keyword>Damage +1.</keyword> until the regroup phase.',
                'Olog-hai of Mordor',
                '8R105'
            )
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    phases: ['RESPONSE'],
                    trigger: { type: 'WINS_SKIRMISH', winner: 'SELF' },
                    optional: true,
                    effects: [
                        {
                            type: 'PLAY_FROM_STACK',
                            target: [['BESIEGER']],
                            grantsTempKeywords: [
                                {
                                    keyword: 'FIERCE',
                                    expiresAtPhase: 'REGROUP',
                                },
                                {
                                    keyword: 'DAMAGE +1',
                                    expiresAtPhase: 'REGROUP',
                                },
                            ],
                        },
                    ],
                }),
            ])
        );
    });

    it('parse Gorgoroth Officer : discard 2 → play stacked Sauron Orc + Fierce/force', () => {
        expect(
            parseAbilities(
                '<keyword>Besieger.</keyword> <keyword>Skirmish:</keyword> Discard 2 cards from hand to play a <symbol>sauron</symbol> Orc stacked on a site you control. That Orc is fierce and strength +6 until the regroup phase.',
                'Gorgoroth Officer',
                '7R274'
            )
        ).toEqual([
            expect.objectContaining({
                phases: ['SKIRMISH'],
                cost: [{ discardFromHand: 2 }],
                effects: [
                    {
                        type: 'PLAY_FROM_STACK',
                        target: [['SAURON', 'ORC']],
                        grantsTempKeywords: [
                            {
                                keyword: 'FIERCE',
                                expiresAtPhase: 'REGROUP',
                            },
                        ],
                        grantsTempStats: [
                            {
                                stat: 'STRENGTH',
                                value: 6,
                                expiresAtPhase: 'REGROUP',
                            },
                        ],
                    },
                ],
            }),
        ]);
    });

    it('parse Hillman Band : each time fellowship moves → take control', () => {
        expect(
            parseAbilities(
                'Each time the fellowship moves, you may spot another <symbol>dunland</symbol> Man to take control of a site.',
                'Hillman Band',
                '4C21'
            )
        ).toEqual([
            expect.objectContaining({
                phases: ['RESPONSE'],
                trigger: { type: 'FELLOWSHIP_MOVES' },
                optional: true,
                cost: [
                    {
                        spot: [
                            {
                                count: 1,
                                target: [['DUNLAND', 'MAN']],
                                excludeSource: true,
                            },
                        ],
                    },
                ],
                effects: [{ type: 'TAKE_CONTROL_SITE' }],
            }),
        ]);
    });

    it('parse Gollum 5C24 : Discard Gollum (SELF) → exert companion or ally', () => {
        expect(
            parseAbilities(
                '<keyword>Regroup:</keyword> Discard Gollum to exert a companion or ally.',
                'Gollum',
                '5C24'
            )
        ).toEqual([
            expect.objectContaining({
                phases: ['REGROUP'],
                cost: [
                    {
                        discardFromPlay: [
                            { count: 1, target: 'SELF' },
                        ],
                    },
                ],
                effects: [
                    {
                        type: 'EXERT',
                        count: 1,
                        target: [['COMPANION'], ['ALLY']],
                    },
                ],
            }),
        ]);
    });

    it('parse Discard Name (autre carte) : nom propre → désignation', () => {
        expect(
            parseAbilities(
                '<keyword>Regroup:</keyword> Discard Gollum to remove a threat.',
                'Not Watching',
                'X1'
            )
        ).toEqual([
            expect.objectContaining({
                cost: [
                    {
                        discardFromPlay: [
                            {
                                count: 1,
                                target: [['Gollum']],
                                mode: 'DESIGNATION',
                            },
                        ],
                    },
                ],
                effects: [{ type: 'REMOVE_THREATS', count: 1 }],
            }),
        ]);
    });

    it('parse Théoden : Spot Rohan ally + exert → liberate', () => {
        expect(
            parseAbilities(
                '<keyword>Regroup:</keyword> Spot a <symbol>rohan</symbol> ally and exert Théoden to liberate a site.',
                'Théoden',
                '4C292'
            )
        ).toEqual([
            expect.objectContaining({
                phases: ['REGROUP'],
                cost: [
                    expect.objectContaining({
                        spot: [
                            expect.objectContaining({
                                count: 1,
                                target: [['ROHAN', 'ALLY']],
                            }),
                        ],
                        exert: [{ count: 1, target: 'SELF' }],
                    }),
                ],
                effects: [{ type: 'LIBERATE_SITE' }],
            }),
        ]);
    });

    it('parse Forests of Ithilien : Discard + exert Ring-bound Man → liberate', () => {
        expect(
            parseAbilities(
                'Plays to your support area. While the fellowship is at site 5<symbol>tower</symbol>, the site number of each Man in a skirmish is +2. <keyword>Regroup:</keyword> Discard this condition and exert a Ring-bound Man to liberate a site.',
                'Forests of Ithilien',
                '4R121'
            )
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    phases: ['REGROUP'],
                    cost: [
                        {
                            discardFromPlay: [{ count: 1, target: 'SELF' }],
                            exert: [
                                expect.objectContaining({
                                    count: 1,
                                    target: [['RING-BOUND', 'MAN']],
                                }),
                            ],
                        },
                    ],
                    effects: [{ type: 'LIBERATE_SITE' }],
                }),
            ])
        );
    });

    it('parse Traveled Leader : Spot Wizard → replace site région courante', () => {
        expect(
            parseAbilities(
                'Spot a <symbol>gandalf</symbol> Wizard to replace a site in the fellowship’s current region with a site from your adventure deck.',
                'Traveled Leader',
                '12C34'
            )
        ).toEqual([
            {
                id: '12C34:0',
                phases: [],
                cost: [
                    {
                        spot: [
                            {
                                count: 1,
                                target: [['GANDALF', 'WIZARD']],
                            },
                        ],
                    },
                ],
                effects: [
                    {
                        type: 'REPLACE_SITE',
                        scope: 'REGION',
                        from: 'SITES_DECK',
                    },
                ],
                source: 'SELF',
                text: 'Spot a gandalf Wizard to replace a site in the fellowship’s current region with a site from your adventure deck.',
            },
        ]);
    });

    it('parse Led Astray : Spot Gollum → +twilight + exchange owned path site', () => {
        expect(
            parseAbilities(
                'Spot Gollum to add <symbol>twilight3</symbol> and exchange one of your sites on the adventure path with another site from your adventure deck.',
                'Led Astray',
                '11U45'
            )
        ).toEqual([
            expect.objectContaining({
                cost: [
                    {
                        spot: [{ count: 1, target: [['Gollum']] }],
                    },
                ],
                effects: [
                    { type: 'ADD_TWILIGHT', count: 3 },
                    { type: 'EXCHANGE_SITE', from: 'SITES_DECK' },
                ],
            }),
        ]);
    });

    it('parse cannot replace : CURRENT / REGION / ANY (FP)', () => {
        expect(
            parseAbilities(
                'While you can spot a <symbol>orc</symbol> Orc, the Free Peoples player cannot replace the fellowship’s current site.',
                'Orkish Camp',
                '15U113'
            )
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    trigger: {
                        type: 'WHILE',
                        spot: [{ count: 1, target: [['ORC', 'ORC']] }],
                    },
                    effects: [
                        {
                            type: 'CANNOT_REPLACE_SITE',
                            player: 'FREE_PEOPLE',
                            scope: 'CURRENT',
                        },
                    ],
                }),
            ])
        );

        expect(
            parseAbilities(
                'While you can spot a <symbol>men</symbol> Man, the Free Peoples player cannot replace a site in the current region.',
                'Rapid Reload',
                '15U89'
            )
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    effects: [
                        {
                            type: 'CANNOT_REPLACE_SITE',
                            player: 'FREE_PEOPLE',
                            scope: 'REGION',
                        },
                    ],
                }),
            ])
        );

        expect(
            parseAbilities(
                'While you can spot an <symbol>urukhai</symbol> minion, the Free Peoples player cannot replace a site.',
                'Defensive Rush',
                '15U159'
            )
        ).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    effects: [
                        {
                            type: 'CANNOT_REPLACE_SITE',
                            player: 'FREE_PEOPLE',
                            scope: 'ANY',
                        },
                    ],
                }),
            ])
        );
    });

    it('parse With Doom We Come : Gandalf / each gandalf at site → Muster', () => {
        const abs = parseAbilities(
            'While Gandalf is at an underground site, he gains **muster.** While the fellowship is at a battleground site, each <symbol>gandalf</symbol> character gains **muster.**',
            'With Doom We Come',
            '12U36'
        );
        expect(abs).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    trigger: { type: 'WHILE', atSiteKeyword: 'UNDERGROUND' },
                    effects: [
                        expect.objectContaining({
                            type: 'MODIFY_KEYWORD',
                            keyword: 'MUSTER',
                            target: [['Gandalf']],
                        }),
                    ],
                }),
                expect.objectContaining({
                    trigger: { type: 'WHILE', atSiteKeyword: 'BATTLEGROUND' },
                    effects: [
                        expect.objectContaining({
                            type: 'MODIFY_KEYWORD',
                            keyword: 'MUSTER',
                            target: [['GANDALF', 'CHARACTER']],
                        }),
                    ],
                }),
            ])
        );
    });

    it('parse Nertëa : named at forest → force +2', () => {
        const abs = parseAbilities(
            '<keyword>Lurker.</keyword> While Úlairë Nertëa is at a forest site, he is strength +2. While you can spot 6 companions, each Nazgûl is strength +2.',
            'Úlairë Nertëa',
            '11S223'
        );
        expect(abs).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    trigger: { type: 'WHILE', atSiteKeyword: 'FOREST' },
                    effects: [
                        expect.objectContaining({
                            type: 'MODIFY_STAT',
                            value: 2,
                            target: 'SELF',
                        }),
                    ],
                }),
                expect.objectContaining({
                    trigger: {
                        type: 'WHILE',
                        spot: [{ count: 6, target: [['COMPANION']] }],
                    },
                }),
            ])
        );
    });
});

describe('parseAbilities — While / skip archery phase', () => {
    it('parse Fill With Fear : spot The Balrog → skip archery', () => {
        const text =
            'While you can spot The Balrog, skip the archery phase.';
        expect(parseAbilities(text, 'Fill With Fear', '2U56')).toEqual([
            {
                id: '2U56:0',
                phases: [],
                trigger: {
                    type: 'WHILE',
                    spot: [{ count: 1, target: [['The Balrog']] }],
                },
                cost: [],
                effects: [{ type: 'SKIP_PHASE', phase: 'ARCHERY' }],
                source: 'SELF',
                text: expect.stringMatching(
                    /While you can spot The Balrog, skip the archery phase/i
                ),
            },
        ]);
    });

    it('parse Blood of Númenor / Balrog : Skip the archery phase.', () => {
        expect(
            parseAbilities(
                'To play, exert a companion.\nSkip the archery phase.\nDiscard this condition during the regroup phase.',
                'Blood of Númenor',
                '2U31'
            )
        ).toEqual([
            {
                id: '2U31:0',
                phases: [],
                trigger: { type: 'WHILE' },
                cost: [],
                effects: [{ type: 'SKIP_PHASE', phase: 'ARCHERY' }],
                source: 'SELF',
                text: expect.stringMatching(/Skip the archery phase/i),
            },
        ]);

        expect(
            parseAbilities(
                'Each Orc comes into play exhausted.  <br>Skip the archery phase.  <br>Discard this condition.',
                'Blood of Númenor',
                '2U31b'
            )
        ).toEqual([
            {
                id: '2U31b:0',
                phases: [],
                trigger: { type: 'WHILE' },
                cost: [],
                effects: [{ type: 'SKIP_PHASE', phase: 'ARCHERY' }],
                source: 'SELF',
                text: expect.stringMatching(/Skip the archery phase/i),
            },
        ]);

        const balrogText =
            'While you can spot The Balrog, discard all other minions. Skip the archery phase. Discard The Balrog if not underground.';
        const abilities = parseAbilities(balrogText, 'The Balrog', '2C51');
        expect(abilities).toEqual([
            {
                id: '2C51:0',
                phases: [],
                trigger: { type: 'WHILE' },
                cost: [],
                effects: [{ type: 'SKIP_PHASE', phase: 'ARCHERY' }],
                source: 'SELF',
                text: expect.stringMatching(/Skip the archery phase/i),
            },
        ]);
    });

    it('refuse control sites / site / multi-phase / bearing unique', () => {
        expect(
            parseAbilities(
                'While you control 2 sites, skip the archery phase.',
                'Hillman Horde',
                '4R22'
            )
        ).toBeUndefined();
        expect(
            parseAbilities(
                'While the fellowship is at Anduin Wilderland, skip the archery phase.',
                'Anduin Wilderland',
                '1C354'
            )
        ).toBeUndefined();
        expect(
            parseAbilities(
                'While a unique companion bears this possession, skip the archery phase.',
                'Elven Armaments',
                '18U8'
            )
        ).toBeUndefined();
        expect(
            parseAbilities(
                'While at an underground site, skip the archery phase, the maneuver phase, and The Balrog cannot be assigned to skirmish companions of strength 6 or less.',
                'The Balrog',
                '19P18'
            )
        ).toBeUndefined();
    });
});

describe('parseAbilities — Remove twilight to make strength', () => {
    it('parse Attëa : Remove Ⓣ1 → force +1 (limit +5)', () => {
        const text =
            '<keyword>Fierce.</keyword> \n<keyword>Skirmish:</keyword> Remove <symbol>twilight1</symbol> to make Úlairë Attëa strength +1 (limit +5).';
        expect(parseAbilities(text, 'Úlairë Attëa', '1R229')).toEqual([
            {
                id: '1R229:0',
                phases: ['SKIRMISH'],
                cost: [{ removeTwilight: 1 }],
                effects: [
                    {
                        type: 'ADD_TEMP_STAT',
                        stat: 'STRENGTH',
                        value: 1,
                        target: 'SELF',
                        expiresAtPhase: 'SKIRMISH',
                        limit: 5,
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(
                    /SKIRMISH: Remove twilight1 to make Úlairë Attëa strength \+1 \(limit \+5\)/i
                ),
            },
        ]);
    });

    it('parse bearer + classe (sans fierceness / for each)', () => {
        expect(
            parseAbilities(
                '<keyword>Skirmish:</keyword> Remove <symbol>twilight1</symbol> to make bearer strength +1 (limit +3).',
                'Orc Scimitar',
                '1C269'
            )
        ).toEqual([
            {
                id: '1C269:0',
                phases: ['SKIRMISH'],
                cost: [{ removeTwilight: 1 }],
                effects: [
                    {
                        type: 'ADD_TEMP_STAT',
                        stat: 'STRENGTH',
                        value: 1,
                        target: 'BEARER',
                        expiresAtPhase: 'SKIRMISH',
                        limit: 3,
                    },
                ],
                source: 'ATTACHMENT',
                text: expect.stringMatching(
                    /SKIRMISH: Remove twilight1 to make bearer strength \+1 \(limit \+3\)/i
                ),
            },
        ]);

        expect(
            parseAbilities(
                '<keyword>Skirmish:</keyword> Remove <symbol>twilight3</symbol> to make a <symbol>moria</symbol> Orc strength +2.',
                'Cave Troll',
                '1R165'
            )
        ).toEqual([
            {
                id: '1R165:0',
                phases: ['SKIRMISH'],
                cost: [{ removeTwilight: 3 }],
                effects: [
                    {
                        type: 'ADD_TEMP_STAT',
                        stat: 'STRENGTH',
                        value: 2,
                        target: [['MORIA', 'ORC']],
                        expiresAtPhase: 'SKIRMISH',
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(
                    /SKIRMISH: Remove twilight3 to make a moria Orc strength \+2/i
                ),
            },
        ]);
    });

    it('refuse for each / and fierce / Damage', () => {
        expect(
            parseAbilities(
                '<keyword>Skirmish:</keyword> Remove <symbol>twilight2</symbol> to make this minion strength +1 for each other Uruk-hai you spot.',
                'Uruk Regular',
                '1C151'
            )
        ).toBeUndefined();
        expect(
            parseAbilities(
                '<keyword>Skirmish:</keyword> Remove <symbol>twilight2</symbol> to make a lurker fierce until the regroup phase.',
                'Host of Isengard',
                '4C209'
            )
        ).toBeUndefined();
        expect(
            parseAbilities(
                '<keyword>Skirmish:</keyword> Remove <symbol>twilight2</symbol> to make a lurker <keyword>Damage +1.</keyword>',
                'Host of Isengard',
                '4C209'
            )
        ).toBeUndefined();
    });
});

describe('parseAbilities — Discard a [classe] and spot X [classe]', () => {
    const pipeweedAndPipesCost = {
        discardFromPlay: [
            {
                count: 1,
                target: [['PIPEWEED', 'POSSESSION']],
                mode: 'DESIGNATION',
            },
        ],
        spot: [{ count: 1, target: [['PIPE']] }],
    };

    it('parse Discard a pipeweed possession and spot X pipes → crépuscule X', () => {
        const text =
            'Bearer must be a Hobbit. <br><keyword>Fellowship:</keyword> Discard a pipeweed possession and spot X pipes to remove <symbol>twilightX</symbol>.';
        expect(parseAbilities(text, "The Gaffer's Pipe", '1U292')).toEqual([
            {
                id: '1U292:0',
                phases: ['FELLOWSHIP'],
                cost: [pipeweedAndPipesCost],
                effects: [{ type: 'REMOVE_TWILIGHT', countFromSpot: true }],
                source: 'SELF',
                text: expect.stringMatching(/spot X pipes to remove/i),
            },
        ]);
    });

    it('parse la même famille → fardeaux X (pas un titre de carte)', () => {
        const text =
            'Bearer must be Gandalf. <br><keyword>Fellowship:</keyword> Discard a pipeweed possession and spot X pipes to remove X burdens.';
        expect(parseAbilities(text, "Gandalf’s Pipe", '1U74')).toEqual([
            {
                id: '1U74:0',
                phases: ['FELLOWSHIP'],
                cost: [pipeweedAndPipesCost],
                effects: [{ type: 'REMOVE_BURDENS', countFromSpot: true }],
                source: 'SELF',
                text: expect.stringMatching(/remove X burdens/i),
            },
        ]);
    });

    it('même famille, autre classe défaussée (condition, pas pipeweed)', () => {
        const text =
            '<keyword>Fellowship:</keyword> Discard a condition and spot X pipes to remove X burdens.';
        expect(parseAbilities(text, 'Synthetic', 'X1')).toEqual([
            {
                id: 'X1:0',
                phases: ['FELLOWSHIP'],
                cost: [
                    {
                        discardFromPlay: [
                            {
                                count: 1,
                                target: [['CONDITION']],
                                mode: 'DESIGNATION',
                            },
                        ],
                        spot: [{ count: 1, target: [['PIPE']] }],
                    },
                ],
                effects: [{ type: 'REMOVE_BURDENS', countFromSpot: true }],
                source: 'SELF',
                text: expect.stringMatching(/Discard a condition and spot X pipes/i),
            },
        ]);
    });

    it('parse heal companion with Frodo signet X times', () => {
        const text =
            'Bearer must be Frodo. <br><keyword>Fellowship:</keyword> Discard a pipeweed possession and spot X pipes to heal a companion with the Frodo signet X times.';
        expect(parseAbilities(text, "Frodo's Pipe", '3U107')).toEqual([
            {
                id: '3U107:0',
                phases: ['FELLOWSHIP'],
                cost: [pipeweedAndPipesCost],
                effects: [
                    {
                        type: 'HEAL',
                        countFromSpot: true,
                        target: [['COMPANION', 'SIGNET_FRODO']],
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(/Frodo signet X times/i),
            },
        ]);
    });

    it('parse heal X companions', () => {
        const text =
            'Bearer must be a gondor companion. <br><keyword>Fellowship:</keyword> Discard a pipeweed possession and spot X pipes to heal X companions.';
        expect(parseAbilities(text, "Aragorn’s Pipe", '1U91')).toEqual([
            {
                id: '1U91:0',
                phases: ['FELLOWSHIP'],
                cost: [pipeweedAndPipesCost],
                effects: [
                    {
                        type: 'HEAL',
                        multiFromSpot: true,
                        target: [['COMPANION']],
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(/heal X companions/i),
            },
        ]);
    });
});

describe('parseAbilities — Discard a [classe] from play to …', () => {
    const hornblowerText =
        '<keyword>Pipeweed.</keyword> To play, spot an unbound Hobbit.<br><keyword>Regroup:</keyword> Discard a pipeweed from play to remove a threat.<br><keyword>Regroup:</keyword> Discard a pipeweed from play to discard a minion.';

    it('Hornblower Leaf : menaces + défausse séide', () => {
        expect(parseAbilities(hornblowerText, 'Hornblower Leaf', '17U108')).toEqual([
            {
                id: '17U108:0',
                phases: ['REGROUP'],
                cost: [
                    {
                        discardFromPlay: [
                            {
                                count: 1,
                                target: [['PIPEWEED']],
                                mode: 'DESIGNATION',
                            },
                        ],
                    },
                ],
                effects: [{ type: 'REMOVE_THREATS', count: 1 }],
                source: 'SELF',
                text: expect.stringMatching(/remove a threat/i),
            },
            {
                id: '17U108:1',
                phases: ['REGROUP'],
                cost: [
                    {
                        discardFromPlay: [
                            {
                                count: 1,
                                target: [['PIPEWEED']],
                                mode: 'DESIGNATION',
                            },
                        ],
                    },
                ],
                effects: [
                    { type: 'DISCARD', count: 1, target: [['MINION']] },
                ],
                source: 'SELF',
                text: expect.stringMatching(/discard a minion/i),
            },
        ]);
    });

    it('n’émet rien pour un make (Southfarthing Leaf)', () => {
        const text =
            '<keyword>Pipeweed.</keyword> <keyword>Maneuver:</keyword> Discard a pipeweed from play to make an unbound Hobbit strength +2 until the regroup phase.';
        expect(parseAbilities(text, 'Southfarthing Leaf', '17U109')).toBeUndefined();
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

    it('parse Coup de Hache : +2, ou +3 si arme de mêlée naine', () => {
        const text =
            '<keyword>Skirmish:</keyword> Make a Dwarf strength +2 (or +3 if bearing a <symbol>dwarven</symbol> hand weapon).';
        expect(parseAbilities(text, 'Axe Strike', '1C3')).toEqual([
            {
                id: '1C3:0',
                phases: ['SKIRMISH'],
                cost: [],
                effects: [
                    {
                        type: 'ADD_TEMP_STAT',
                        stat: 'STRENGTH',
                        value: 2,
                        target: [['DWARF']],
                        expiresAtPhase: 'SKIRMISH',
                        bearingBonus: {
                            value: 3,
                            attachment: [['DWARVEN', 'HAND-WEAPON']],
                        },
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(
                    /SKIRMISH: Make a Dwarf strength \+2 \(or \+3 if bearing a dwarven hand weapon\)/i
                ),
            },
        ]);
    });

    it('parse Fureur de la Bataille : that Dwarf force +3 et damage +1', () => {
        const text =
            '<keyword>Skirmish:</keyword> Exert a Dwarf to make that Dwarf strength +3 and <keyword>damage +1.</keyword>';
        expect(parseAbilities(text, 'Battle Fury', '1C4')).toEqual([
            {
                id: '1C4:0',
                phases: ['SKIRMISH'],
                cost: [
                    {
                        exert: [
                            {
                                count: 1,
                                target: [['DWARF']],
                                mode: 'DESIGNATION',
                            },
                        ],
                    },
                ],
                effects: [
                    {
                        type: 'ADD_TEMP_STAT',
                        stat: 'STRENGTH',
                        value: 3,
                        target: [['DWARF']],
                        expiresAtPhase: 'SKIRMISH',
                    },
                    {
                        type: 'ADD_TEMP_KEYWORD',
                        keyword: 'DAMAGE +1',
                        target: [['DWARF']],
                        expiresAtPhase: 'SKIRMISH',
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(
                    /SKIRMISH: Exert a Dwarf to make that Dwarf strength \+3 and damage \+1/i
                ),
            },
        ]);
    });

    it('parse Coup Tranchant : Make a Dwarf force +2 et Damage +1', () => {
        const text =
            '<keyword>Skirmish:</keyword> Make a Dwarf strength +2 and <keyword>Damage +1.</keyword>.';
        expect(parseAbilities(text, 'Cleaving Blow', '1C5')).toEqual([
            {
                id: '1C5:0',
                phases: ['SKIRMISH'],
                cost: [],
                effects: [
                    {
                        type: 'ADD_TEMP_STAT',
                        stat: 'STRENGTH',
                        value: 2,
                        target: [['DWARF']],
                        expiresAtPhase: 'SKIRMISH',
                    },
                    {
                        type: 'ADD_TEMP_KEYWORD',
                        keyword: 'DAMAGE +1',
                        target: [['DWARF']],
                        expiresAtPhase: 'SKIRMISH',
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(
                    /SKIRMISH: Make a Dwarf strength \+2 and Damage \+1/i
                ),
            },
        ]);
    });

    it('parse Fouilles : affaiblir un compagnon Nain pour piocher 3', () => {
        const text =
            '<keyword>Fellowship:</keyword> Exert a Dwarf companion to draw 3 cards.';
        expect(parseAbilities(text, 'Delving', '1C6')).toEqual([
            {
                id: '1C6:0',
                phases: ['FELLOWSHIP'],
                cost: [
                    {
                        exert: [
                            {
                                count: 1,
                                target: [['DWARF', 'COMPANION']],
                                mode: 'DESIGNATION',
                            },
                        ],
                    },
                ],
                effects: [{ type: 'DRAW', count: 3 }],
                source: 'SELF',
                text: expect.stringMatching(
                    /FELLOWSHIP: Exert a Dwarf companion to draw 3 cards/i
                ),
            },
        ]);
    });

    it('parse Elrond : affaiblir SELF pour piocher une carte (pas le soin de début de tour)', () => {
        const text =
            'To play, spot Gandalf or an Elf. <br>At the start of each of your turns, heal every ally whose home is site 3. <br><keyword>Fellowship:</keyword> Exert Elrond to draw a card.';
        expect(parseAbilities(text, 'Elrond', '1R40')).toEqual([
            {
                id: '1R40:0',
                phases: ['FELLOWSHIP'],
                cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
                effects: [{ type: 'DRAW', count: 1 }],
                source: 'SELF',
                text: expect.stringMatching(
                    /FELLOWSHIP: Exert Elrond to draw a card/i
                ),
            },
        ]);
    });

    it('parse Celeborn : affaiblir SELF pour guérir un allié elfe', () => {
        const text =
            '<keyword>Fellowship:</keyword> Exert Celeborn to heal an <symbol>elven</symbol> ally.';
        expect(parseAbilities(text, 'Celeborn', '1R34')).toEqual([
            {
                id: '1R34:0',
                phases: ['FELLOWSHIP'],
                cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
                effects: [
                    {
                        type: 'HEAL',
                        count: 1,
                        target: [['ELVEN', 'ALLY']],
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(
                    /FELLOWSHIP: Exert Celeborn to heal an elven ally/i
                ),
            },
        ]);
    });

    it('parse Solide et Robuste : Manœuvre ou Combat, guérir un Hobbit', () => {
        const text =
            '<keyword>Maneuver</keyword> or <keyword>Skirmish:</keyword> Heal a Hobbit.';
        expect(parseAbilities(text, 'Stout and Sturdy', '1C315')).toEqual([
            {
                id: '1C315:0',
                phases: ['MANEUVER', 'SKIRMISH'],
                cost: [],
                effects: [{ type: 'HEAL', count: 1, target: [['HOBBIT']] }],
                source: 'SELF',
                text: expect.stringMatching(/SKIRMISH: Heal a Hobbit/i),
            },
        ]);
    });

    it('parse Cape de Boromir : affaiblir le détenteur pour défausser une situation climat', () => {
        const text =
            'Bearer must be Boromir.  <br><keyword>Maneuver:</keyword> Exert Boromir to discard a weather condition.';
        expect(parseAbilities(text, "Boromir's Cloak", '1U98')).toEqual([
            {
                id: '1U98:0',
                phases: ['MANEUVER'],
                cost: [{ exert: [{ count: 1, target: 'BEARER' }] }],
                effects: [
                    {
                        type: 'DISCARD',
                        count: 1,
                        target: [['WEATHER', 'CONDITION']],
                    },
                ],
                source: 'ATTACHMENT',
                text: expect.stringMatching(
                    /MANEUVER: Exert Boromir to discard a weather condition/i
                ),
            },
        ]);
    });

    it('n’émet rien pour La Vengeance de Gondor (deux désignations)', () => {
        const text =
            '<keyword>Regroup:</keyword> Exert a ranger companion to discard a minion.';
        expect(
            parseAbilities(text, "Gondor's Vengeance", '1C106')
        ).toBeUndefined();
    });

    it('n’émet rien pour Le Visible et l’Invisible (Exert 2 Elves)', () => {
        const text =
            '<keyword>Fellowship:</keyword> Exert 2 Elves to discard a condition.';
        expect(
            parseAbilities(text, 'The Seen and the Unseen', '1C58')
        ).toBeUndefined();
    });

    it('parse Sleep Caradhras : défausser toutes les situations', () => {
        const text =
            '<keyword>Spell.</keyword> <br><keyword>Fellowship:</keyword> Exert Gandalf to discard every condition.';
        expect(parseAbilities(text, 'Sleep, Caradhras', '1C84')).toEqual([
            {
                id: '1C84:0',
                phases: ['FELLOWSHIP'],
                cost: [{ exert: [{ count: 1, target: [['Gandalf']] }] }],
                effects: [{ type: 'DISCARD_ALL', target: [['CONDITION']] }],
                source: 'SELF',
                text: expect.stringMatching(
                    /Exert Gandalf to discard every condition/i
                ),
            },
        ]);
    });

    it('parse Albert Dreary : défausser situation Isengard ou Moria', () => {
        const text =
            'To play, spot Gandalf. <br><keyword>Maneuver:</keyword> Exert Albert Dreary to discard a <symbol>isengard</symbol> or <symbol>moria</symbol> condition.';
        expect(parseAbilities(text, 'Albert Dreary', '1R69')).toEqual([
            {
                id: '1R69:0',
                phases: ['MANEUVER'],
                cost: [{ exert: [{ count: 1, target: 'SELF' }] }],
                effects: [
                    {
                        type: 'DISCARD',
                        count: 1,
                        target: [
                            ['ISENGARD', 'CONDITION'],
                            ['MORIA', 'CONDITION'],
                        ],
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(
                    /discard a .* condition/i
                ),
            },
        ]);
    });

    it('parse Roll of Thunder : spot Gandalf, défausser possession/artefact Ombre', () => {
        const text =
            '<keyword>Fellowship or Maneuver:</keyword> Spot Gandalf to discard a Shadow possession or Shadow artifact.';
        expect(parseAbilities(text, 'Roll of Thunder', '4U99')).toEqual([
            {
                id: '4U99:0',
                phases: ['FELLOWSHIP', 'MANEUVER'],
                cost: [{ spot: [{ count: 1, target: [['Gandalf']] }] }],
                effects: [
                    {
                        type: 'DISCARD',
                        count: 1,
                        target: [
                            ['SHADOW', 'POSSESSION'],
                            ['SHADOW', 'ARTIFACT'],
                        ],
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(
                    /Spot Gandalf to discard a Shadow possession/i
                ),
            },
        ]);
    });

    it('parse Gollum 7C59 : exert ×2 ou retirer menace → force +2', () => {
        const text =
            '<keyword>Skirmish:</keyword> Exert Gollum twice or remove a threat to make him strength +2.';
        expect(parseAbilities(text, 'Gollum', '7C59')).toEqual([
            {
                id: '7C59:0',
                phases: ['SKIRMISH'],
                cost: [
                    { exert: [{ count: 2, target: 'SELF' }] },
                    { removeThreats: 1 },
                ],
                effects: [
                    {
                        type: 'ADD_TEMP_STAT',
                        stat: 'STRENGTH',
                        value: 2,
                        target: 'SELF',
                        expiresAtPhase: 'SKIRMISH',
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(
                    /Exert Gollum twice or remove a threat/i
                ),
            },
        ]);
    });

    it('parse You’re a Liar : Gollum gagne → blesser un compagnon (sauf Porteur)', () => {
        const text =
            '<keyword>Response:</keyword> If Gollum wins a skirmish, wound a companion (except the Ring-bearer).';
        expect(
            parseAbilities(text, "You're a Liar and a Thief", '6C47')
        ).toEqual([
            {
                id: '6C47:0',
                phases: ['RESPONSE'],
                trigger: {
                    type: 'WINS_SKIRMISH',
                    winner: [['GOLLUM']],
                },
                cost: [],
                effects: [
                    {
                        type: 'WOUND',
                        count: 1,
                        target: [['COMPANION']],
                        excludeRingBearer: true,
                    },
                ],
                source: 'SELF',
                text: expect.stringMatching(
                    /wound a companion \(except the Ring-bearer\)/i
                ),
            },
        ]);
    });
});


