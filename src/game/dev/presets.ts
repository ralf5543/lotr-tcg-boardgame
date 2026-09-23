import type {
    CardCulture,
    CardState,
    DevPresetType,
    GameState,
    SiteCardState,
} from '../types';
import { getCardById } from '../cardsData';

const clonePresetCard = (id: string, instanceId?: string): CardState => {
    const card = getCardById(id);
    if (!card) {
        throw new Error(`[DEV] Carte introuvable pour le preset : ${id}`);
    }
    return { ...card, instanceId: instanceId || `dev-${id}` };
};

/** Site issu du JSON, prêt pour `G.path` (même forme que le setup). */
const clonePresetSite = (
    id: string,
    ownerId: string,
    siteNumber?: number
): SiteCardState => {
    const card = getCardById(id);
    if (!card) {
        throw new Error(`[DEV] Site introuvable pour le preset : ${id}`);
    }
    const title = card.i18n?.en?.title || card.title || id;
    return {
        ...card,
        id: card.id,
        name: title,
        twilightCost: card.twilightCost ?? 0,
        gameText: card.i18n?.en?.gameText || '',
        ownerId,
        siteNumber,
        imageUrl: card.imageUrl,
        keywords: card.keywords,
        abilities: card.abilities,
        attachments: [],
    } as SiteCardState;
};

/** Neuf sites Standard — terrains variés (sanctuaire = emplacements 3 & 6). */
const DEV_PATH_IDS = [
    '11S263', // 1 West Gate — UNDERGROUND
    '11S247', // 2 Moria Guardroom — UNDERGROUND
    '11S237', // 3 Ettenmoors — PLAINS (+ sanctuaire)
    '11S233', // 4 Chamber of Mazarbul — UNDERGROUND
    '11S231', // 5 Caras Galadhon — FOREST
    '11U227', // 6 Anduin Banks — RIVER (+ sanctuaire)
    '11S241', // 7 Fortress of Orthanc — BATTLEGROUND
    '11S229', // 8 Barazinbar — MOUNTAIN
    '11S240', // 9 Flats of Rohan — PLAINS
] as const;

const resetBoardForPreset = (G: GameState): void => {
    const fpId = G.fpPlayerId || '0';
    const fpPlayer = G.players[fpId];
    if (!fpPlayer) return;

    G.twilightPool = 0;
    fpPlayer.burdens = 0;
    fpPlayer.threats = 0;
    G.tempModifiers = [];
    G.battlefield = [];
    G.skirmishes = [];
    G.activeSkirmishId = undefined;
    G.actionWindow = undefined;
    G.awaitingSiteSelection = false;
    G.archeryState = undefined;
    G.archeryWoundsToAssign = 0;

    Object.keys(G.players).forEach((pId) => {
        const player = G.players[pId];
        if (player) {
            player.hand = [];
            player.supportArea = [];
            player.discard = [];
            player.fellowshipArea = [];
            player.sitesDeck = [];
        }
    });
};

const setupDevPath = (G: GameState, startIndex = 3): void => {
    const fpId = G.fpPlayerId || '0';
    const shadowId = fpId === '0' ? '1' : '0';

    G.path = DEV_PATH_IDS.map((siteId, index) =>
        clonePresetSite(siteId, index === 0 ? fpId : shadowId, index + 1)
    );
    Object.values(G.players).forEach((player) => {
        if (player) player.currentSiteIndex = startIndex;
    });
    G.currentSiteIndex = startIndex;
};

/** Une carte support par culture + 1 jeton de cette culture (CSS pastilles). */
const CULTURE_TOKEN_CSS_CARDS: ReadonlyArray<{
    id: string;
    culture: CardCulture;
    side: 'fp' | 'shadow';
}> = [
    { id: '0P60', culture: 'SHIRE', side: 'fp' },
    { id: '4R52', culture: 'DWARVEN', side: 'fp' },
    { id: '4R69', culture: 'ELVEN', side: 'fp' },
    { id: '4U88', culture: 'GANDALF', side: 'fp' },
    { id: '4U126', culture: 'GONDOR', side: 'fp' },
    { id: '4U276', culture: 'ROHAN', side: 'fp' },
    { id: '8U23', culture: 'GOLLUM', side: 'fp' },
    { id: '1R173', culture: 'MORIA', side: 'shadow' },
    { id: '4C137', culture: 'ISENGARD', side: 'shadow' },
    { id: '4U28', culture: 'DUNLAND', side: 'shadow' },
    { id: '4U216', culture: 'RAIDER', side: 'shadow' },
    { id: '6R89', culture: 'WRAITH', side: 'shadow' },
    { id: '8R103', culture: 'SAURON', side: 'shadow' },
    { id: '11U185', culture: 'URUK-HAI', side: 'shadow' },
    { id: '13U94', culture: 'MEN', side: 'shadow' },
    { id: '13U103', culture: 'ORC', side: 'shadow' },
];

export const applyDevPreset = (
    G: GameState,
    presetType: DevPresetType
): void => {
    const fpId = G.fpPlayerId || '0';
    const fpPlayer = G.players[fpId];
    if (!fpPlayer) return;
    const shadowId = fpId === '0' ? '1' : '0';
    const shadowPlayer = G.players[shadowId];

    switch (presetType) {
        case 'CULTURE_TOKENS_TEST': {
            resetBoardForPreset(G);
            setupDevPath(G, 3);
            G.twilightPool = 4;

            fpPlayer.fellowshipArea = [
                {
                    ...clonePresetCard('2C102', 'dev-frodo-ct'),
                    attachments: [clonePresetCard('1R1', 'dev-ring-ct')],
                    wounds: 3, // vit 4 → 1 restante = exhaust (Bloodthirsty)
                },
                {
                    ...clonePresetCard('0P12', 'dev-gimli-ct'),
                    // Arod monté : 2× prévenir (Damage +1) = 4 jetons nains
                    attachments: [clonePresetCard('13R1', 'dev-arod')],
                },
            ];
            fpPlayer.supportArea = [
                {
                    ...clonePresetCard('4U57', 'dev-stout-strong'),
                    cultureTokens: { DWARVEN: 2 },
                },
                {
                    ...clonePresetCard('4R52', 'dev-my-axe'),
                    cultureTokens: { DWARVEN: 2 },
                },
            ];
            fpPlayer.hand = [];

            if (shadowPlayer) {
                shadowPlayer.supportArea = [
                    {
                        ...clonePresetCard('11R91', 'dev-oath-sworn'),
                        cultureTokens: { MEN: 1 },
                    },
                    {
                        ...clonePresetCard('11U185', 'dev-fortitude'),
                        cultureTokens: { 'URUK-HAI': 1 },
                    },
                ];
                // 2 MEN (Oath) · Man of Bree str4 < Gimli · Uruk Damage+1
                G.battlefield = [
                    clonePresetCard('12S73', 'dev-mouth-sauron'),
                    clonePresetCard('11S90', 'dev-man-of-bree'),
                    clonePresetCard('11S178', 'dev-bloodthirsty-uruk'),
                ];
                shadowPlayer.hand = [
                    clonePresetCard('13C83', 'dev-caravan-hand'),
                    clonePresetCard('13C164', 'dev-fearless-hand'),
                ];
                G.twilightPool = 8;
            }

            G.statusMessage =
                '[DEV] Jetons · Frodon exhaust · Gimli+Arod (2× prevent) · Bree str4 · Uruk D+1 · Oath.';
            break;
        }

        case 'CULTURE_TOKENS_CSS': {
            resetBoardForPreset(G);
            setupDevPath(G, 3);
            G.twilightPool = 0;

            fpPlayer.fellowshipArea = [
                {
                    ...clonePresetCard('2C102', 'dev-frodo-css'),
                    attachments: [clonePresetCard('1R1', 'dev-ring-css')],
                },
            ];

            const withToken = (
                id: string,
                culture: CardCulture,
                instanceId: string
            ): CardState => ({
                ...clonePresetCard(id, instanceId),
                cultureTokens: { [culture]: 1 },
            });

            fpPlayer.supportArea = CULTURE_TOKEN_CSS_CARDS.filter(
                (c) => c.side === 'fp'
            ).map((c) => withToken(c.id, c.culture, `dev-css-${c.culture}`));

            if (shadowPlayer) {
                shadowPlayer.supportArea = CULTURE_TOKEN_CSS_CARDS.filter(
                    (c) => c.side === 'shadow'
                ).map((c) =>
                    withToken(c.id, c.culture, `dev-css-${c.culture}`)
                );
            }

            G.statusMessage =
                '[DEV] Jetons CSS : 1 carte / culture (16 pastilles) pour peaufiner les couleurs.';
            break;
        }

        case 'EXHAUST_TEST': {
            resetBoardForPreset(G);
            // Site forêt (Caras Galadhon) — condition de A Ranger's Versatility
            setupDevPath(G, 4);
            G.twilightPool = 4;

            // Frodo : 2 blessures (condition While de Nelya) · Aragorn ranger · Gimli déjà exhaust
            fpPlayer.fellowshipArea = [
                {
                    ...clonePresetCard('2C102', 'dev-frodo-ex'),
                    attachments: [clonePresetCard('1R1', 'dev-ring-ex')],
                    wounds: 2,
                },
                {
                    ...clonePresetCard('1R89', 'dev-aragorn-ex'),
                    wounds: 0,
                },
                {
                    ...clonePresetCard('0P12', 'dev-gimli-ex'),
                    wounds: 2, // vit 3 → 1 restante = exhaust
                },
            ];

            // Event réel : Maneuver — exert a ranger → exhaust a minion
            // (parser Exhaust pas encore branché → capacité injectée fidèle au texte)
            fpPlayer.hand = [
                {
                    ...clonePresetCard('1U113', 'dev-rangers-versatility'),
                    abilities: [
                        {
                            id: '1U113:dev',
                            phases: ['MANEUVER'],
                            cost: [
                                {
                                    exert: [
                                        {
                                            count: 1,
                                            target: [['RANGER']],
                                            mode: 'DESIGNATION' as const,
                                        },
                                    ],
                                },
                            ],
                            effects: [
                                {
                                    type: 'EXHAUST' as const,
                                    target: [['MINION']],
                                },
                            ],
                            source: 'SELF' as const,
                            text: 'Maneuver: Exert a ranger to exhaust a minion. [DEV]',
                        },
                    ],
                },
            ];

            if (shadowPlayer) {
                // Overseer (Regroup) · Rider plein (cible Versatility) · Nelya (While 2 wounds RB)
                G.battlefield = [
                    {
                        ...clonePresetCard('3R65', 'dev-orc-overseer'),
                        wounds: 0,
                        abilities: [
                            {
                                id: '3R65:dev',
                                phases: ['REGROUP'],
                                cost: [
                                    {
                                        exert: [
                                            {
                                                count: 2,
                                                target: 'SELF' as const,
                                            },
                                        ],
                                    },
                                ],
                                effects: [
                                    {
                                        type: 'EXHAUST' as const,
                                        target: [['COMPANION']],
                                        excludeRingBearer: true,
                                    },
                                ],
                                source: 'SELF' as const,
                                text: 'Regroup: Exert Orc Overseer twice to exhaust a companion (except the Ring-bearer). [DEV]',
                            },
                        ],
                    },
                    {
                        ...clonePresetCard('0P20', 'dev-black-rider-ex'),
                        wounds: 0,
                    },
                    {
                        ...clonePresetCard('2R84', 'dev-nelya-ex'),
                        wounds: 0,
                    },
                ];
            }

            G.statusMessage =
                '[DEV] Exhaust : Frodon 2 blessures (Nelya) · Versatility = rôdeur (halo) puis flèche rôdeur→séide · Overseer = flèche depuis lui.';
            break;
        }
    }
};
