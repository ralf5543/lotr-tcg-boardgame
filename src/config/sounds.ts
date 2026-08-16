export const SOUND_LIBRARY = {
    // ui
    CLICK: [
        '/audio/sfx/ui/click.opus',
    ],
    // Cards
    CARD_PLAY: [
        '/audio/sfx/cards/play_card.opus',
        '/audio/sfx/cards/play_card2.opus',
    ],
    CARD_DRAW: [
        '/audio/sfx/cards/draw_card.opus',
    ],
    COMPANION: [
        '/audio/sfx/cards/companion.opus',
    ],
    MINION: [
        '/audio/sfx/cards/minion.opus',
    ],
    POSSESSION: [
        '/audio/sfx/cards/possession.opus',
    ],
    'POSSESSION_ARMOR': [
        '/audio/sfx/cards/possession_armor.opus',
    ],
    'POSSESSION_BRACERS': [
        '/audio/sfx/cards/possession_armor.opus',
    ],
    'POSSESSION_GAUNTLETS': [
        '/audio/sfx/cards/possession_armor.opus',
    ],
    'POSSESSION_HAND-WEAPON': [
        '/audio/sfx/cards/possession_sword.opus',
    ],
    'POSSESSION_HELM': [
        '/audio/sfx/cards/possession_armor.opus',
    ],
    'POSSESSION_PHIAL': [
        '/audio/sfx/cards/possession_mount.opus',
    ],
    'POSSESSION_MOUNT': [
        '/audio/sfx/cards/possession_mount.opus',
    ],
    'POSSESSION_RING': [
        '/audio/sfx/cards/possession_ring.opus',
    ],
    'POSSESSION_RANGED-WEAPON': [
        '/audio/sfx/cards/possession_ring.opus',
    ],
    'POSSESSION_SHIELD': [
        '/audio/sfx/cards/possession_armor.opus',
    ],

    // Battle
    ARROW_IMPACT: [
        '/audio/sfx/battle/arrow_impact.opus',
        '/audio/sfx/battle/arrow_impact2.opus',
        '/audio/sfx/battle/arrow_impact3.opus',
        '/audio/sfx/battle/arrow_impact4.opus',
        '/audio/sfx/battle/arrow_impact5.opus',
    ],
    SMASH: [
        '/audio/sfx/battle/smash.opus',
        '/audio/sfx/battle/smash2.opus',
        '/audio/sfx/battle/smash3.opus',
    ],
    WOUND_BALROG: [
        '/audio/sfx/battle/wound_balrog.opus',
        '/audio/sfx/battle/wound_balrog2.opus',
    ],
    WOUND_GOLLUM: [
        '/audio/sfx/battle/wound_gollum.opus',
        '/audio/sfx/battle/wound_gollum2.opus',
        '/audio/sfx/battle/wound_gollum3.opus',
        '/audio/sfx/battle/wound_gollum4.opus',
        '/audio/sfx/battle/wound_gollum5.opus',
    ],
    WOUND_HOBBIT: [
        '/audio/sfx/battle/wound_hobbit.opus',
        '/audio/sfx/battle/wound_hobbit2.opus',
        '/audio/sfx/battle/wound_hobbit3.opus',
        '/audio/sfx/battle/wound_hobbit4.opus',
    ],
    WOUND_HUMAN_MALE: [
        '/audio/sfx/battle/wound_human_male.opus',
        '/audio/sfx/battle/wound_human_male2.opus',
        '/audio/sfx/battle/wound_human_male3.opus',
        '/audio/sfx/battle/wound_human_male4.opus',
        '/audio/sfx/battle/wound_human_male5.opus',
        '/audio/sfx/battle/wound_human_male6.opus',
        '/audio/sfx/battle/wound_human_male7.opus',
        '/audio/sfx/battle/wound_human_male8.opus',
    ],
    WOUND_HUMAN_FEMALE: [
        '/audio/sfx/battle/wound_human_female.opus',
        '/audio/sfx/battle/wound_human_female2.opus',
        '/audio/sfx/battle/wound_human_female3.opus',
        '/audio/sfx/battle/wound_human_female4.opus',
        '/audio/sfx/battle/wound_human_female5.opus',
        '/audio/sfx/battle/wound_human_female6.opus',
        '/audio/sfx/battle/wound_human_female7.opus',
    ],
    WOUND_ORC: [
        '/audio/sfx/battle/wound_orc.opus',
        '/audio/sfx/battle/wound_orc2.opus',
        '/audio/sfx/battle/wound_orc3.opus',
        '/audio/sfx/battle/wound_orc4.opus',
    ],
    WOUND_SPIDER: [
        '/audio/sfx/battle/wound_spider.opus',
        '/audio/sfx/battle/wound_spider2.opus',
        '/audio/sfx/battle/wound_spider3.opus',
    ],
    WOUND_TROLL: [
        '/audio/sfx/battle/wound_troll.opus',
        '/audio/sfx/battle/wound_troll2.opus',
    ],
    WOUND_WIZARD: [
        '/audio/sfx/battle/wound_wizard.opus',
        '/audio/sfx/battle/wound_wizard2.opus',
        '/audio/sfx/battle/wound_wizard3.opus',
    ],
    WOUND_WRAITH: [
        '/audio/sfx/battle/wound_wraith.opus',
        '/audio/sfx/battle/wound_wraith2.opus',
        '/audio/sfx/battle/wound_wraith3.opus',
        '/audio/sfx/battle/wound_wraith4.opus',
    ],
} as const;

export type SoundEffect = keyof typeof SOUND_LIBRARY;
