import type { CardState, DevPresetType, GameState, SiteCardState } from '../types';
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
        instanceId: `dev-site-${id}-${siteNumber ?? 'deck'}`,
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

/**
 * Chemin smoke des 9 sites déjà parsés (sets 11+).
 * 1 West Gate (moves from) → 2 Confluence (moves to) → 3 Pelennor Flat (sanctuaire / début manœuvre)
 * → 4 Cavern Entrance → 5 Stairway → 6 Anduin Banks (sanctuaire / archerie)
 * → 7 North Undeep → 8 Mere (Regroup play next — pas en 9 : plus de « prochain site »)
 * → 9 Window on the West (cible du play next / Defender +1).
 */
const SITES_MODERN_SMOKE_PATH = [
    '11S263', // 1 West Gate of Moria — MOVES_FROM
    '11S228', // 2 Anduin Confluence — MOVES_TO discard allies
    '11S254', // 3 Pelennor Flat — START_OF_MANEUVER (+ sanctuaire)
    '11S232', // 4 Cavern Entrance — forbid skirmish abilities
    '11S248', // 5 Moria Stairway — Damage +1 bearing HW
    '11U227', // 6 Anduin Banks — archery +2 / companion over 4 (+ sanctuaire)
    '11S250', // 7 North Undeep — archery −3
    '11U246', // 8 Mere of Dead Faces — Regroup play next
    '11S265', // 9 Window on the West — Defender +1 (+ site jouable via Mere)
] as const;

/** Sites restants pour Mere / play next depuis le deck d’aventure. */
const SITES_MODERN_SMOKE_DECK = [
    '11S231', // Caras Galadhon
    '11S241', // Fortress of Orthanc
    '11S240', // Flats of Rohan
    '11S229', // Barazinbar
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

const setupDevPath = (
    G: GameState,
    startIndex = 3,
    pathIds: readonly string[] = DEV_PATH_IDS
): void => {
    const fpId = G.fpPlayerId || '0';
    const shadowId = fpId === '0' ? '1' : '0';

    G.path = pathIds.map((siteId, index) =>
        clonePresetSite(siteId, index === 0 ? fpId : shadowId, index + 1)
    );
    Object.values(G.players).forEach((player) => {
        if (player) player.currentSiteIndex = startIndex;
    });
    G.currentSiteIndex = startIndex;
};

/**
 * Applique un preset DEV sur l’état courant (zones vidées / chemin Standard).
 */
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
        case 'STAT_PULSE_TEST': {
            resetBoardForPreset(G);
            setupDevPath(G, 3);
            G.twilightPool = 2;

            // Frodo : résistance + fardeaux ; Gimli : Damage ; Aragorn : Defender +1 (manœuvre) + blessures.
            fpPlayer.fellowshipArea = [
                {
                    ...clonePresetCard('2C102', 'dev-frodo-pulse'),
                    attachments: [clonePresetCard('1R1', 'dev-ring-pulse')],
                    wounds: 0,
                },
                {
                    ...clonePresetCard('1R89', 'dev-aragorn-pulse'),
                    wounds: 0,
                },
                {
                    ...clonePresetCard('7C6', 'dev-gimli-pulse'),
                    wounds: 0,
                },
            ];
            fpPlayer.burdens = 1;
            // Condition soutien : jetons culture via DEV ±
            fpPlayer.supportArea = [
                {
                    ...clonePresetCard('4R52', 'dev-axe-notched'),
                    cultureTokens: { DWARVEN: 1 },
                },
            ];
            fpPlayer.hand = [
                clonePresetCard('7C154', 'dev-new-strength-pulse'),
                clonePresetCard('1C3', 'dev-axe-strike-pulse'),
                clonePresetCard('1C9', 'dev-dwarven-axe-pulse'),
            ];

            if (shadowPlayer) {
                // Man of Bree : force scale main FP ; séide Damage pour keyword.
                G.battlefield = [
                    clonePresetCard('11S90', 'dev-man-of-bree-pulse'),
                    {
                        ...clonePresetCard('13U165', 'dev-infiltrator-pulse'),
                        minionSiteNumber: 2,
                    },
                ];
                shadowPlayer.hand = [
                    clonePresetCard('7C154', 'dev-new-strength-sh-pulse'),
                ];
            }

            G.statusMessage =
                '[DEV] Pulse · Aragorn (manœuvre → Defender +1) ; blessures DEV ; burdens / jetons / crépuscule ; New Strength en main.';
            break;
        }
        case 'SITES_MODERN_SMOKE': {
            resetBoardForPreset(G);
            // Départ site 1 (West Gate) : move → Confluence (défausse alliés) + remove twilight from.
            setupDevPath(G, 0, SITES_MODERN_SMOKE_PATH);
            G.twilightPool = 4;

            fpPlayer.sitesDeck = SITES_MODERN_SMOKE_DECK.map((id, i) => ({
                ...clonePresetSite(id, fpId),
                instanceId: `dev-smoke-site-deck-${i}`,
            }));

            // 5 compagnons → Anduin Banks (+2 archerie) ; Gondor Man pour Window ; Sméagol pour Mere.
            fpPlayer.fellowshipArea = [
                {
                    ...clonePresetCard('2C102', 'dev-smoke-frodo'),
                    attachments: [clonePresetCard('1R1', 'dev-smoke-ring')],
                    wounds: 0,
                },
                {
                    ...clonePresetCard('0P14', 'dev-smoke-aragorn'),
                    wounds: 0,
                },
                {
                    // Skirmish: exert → force +2 (test Cavern Entrance site 4).
                    ...clonePresetCard('1R13', 'dev-smoke-gimli'),
                    attachments: [
                        clonePresetCard('1R14', 'dev-smoke-gimli-axe'),
                    ],
                    wounds: 0,
                },
                {
                    ...clonePresetCard('0P16', 'dev-smoke-faramir'),
                    wounds: 0,
                },
                {
                    ...clonePresetCard('5C28', 'dev-smoke-smeagol'),
                    wounds: 0,
                },
            ];
            // Alliés à défausser au move vers Confluence (site 2).
            fpPlayer.supportArea = [
                clonePresetCard('1U17', 'dev-smoke-grimir'),
                clonePresetCard('1U27', 'dev-smoke-thrarin'),
            ];
            // Main ≥3 pour option défausse Pelennor Flat.
            fpPlayer.hand = [
                clonePresetCard('7C154', 'dev-smoke-hand-1'),
                clonePresetCard('1C3', 'dev-smoke-hand-2'),
                clonePresetCard('1C9', 'dev-smoke-hand-3'),
            ];
            fpPlayer.burdens = 1;

            if (shadowPlayer) {
                shadowPlayer.sitesDeck = [
                    clonePresetSite('11S236', shadowId),
                    clonePresetSite('11S245', shadowId),
                ].map((site, i) => ({
                    ...site,
                    instanceId: `dev-smoke-sh-site-${i}`,
                }));
                G.battlefield = [
                    clonePresetCard('1R127', 'dev-smoke-lurtz'),
                    // Skirmish: exert → wound (test Cavern Entrance site 4).
                    clonePresetCard('1C271', 'dev-smoke-orc-soldier'),
                    // Mere (site 8) : Ombre peut affaiblir « votre » Gollum.
                    clonePresetCard('5R25', 'dev-smoke-gollum'),
                ];
            }

            G.statusMessage =
                '[DEV] Sites 11+ smoke · Mere en site 8 (pas 9) : téléporte 7→avance ou site 8, Regroup, Gollum ombre / Sméagol FP.';
            break;
        }
    }
};
