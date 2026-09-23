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
                {
                    // Remove 1 dwarven (Stout / Axe) → force +2
                    ...clonePresetCard('15R6', 'dev-gloin-ct'),
                    attachments: [
                        // Remove 1 dwarven → porteur +1
                        clonePresetCard('15U7', 'dev-heavy-axe'),
                    ],
                },
                // Homme culture Gandalf — cible Last Stand (+3) / spot exert si branché
                clonePresetCard('11R30', 'dev-erland-ct'),
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
                {
                    // Remove 1 shire from here → compagnon shire +1 (Frodon)
                    ...clonePresetCard('12U132', 'dev-sudden-fury'),
                    cultureTokens: { SHIRE: 2 },
                },
                {
                    // Remove 3 gandalf from here → compagnon +3 (Erland / etc.)
                    ...clonePresetCard('18U21', 'dev-last-stand'),
                    cultureTokens: { GANDALF: 3 },
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
                '[DEV] Jetons · remove→force : Glóin/Axe · Sudden Fury · Last Stand→Erland · + Stout/Arod.';
            break;
        }
    }
};
