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
            G.twilightPool = 6;

            // Focus : Discard this or remove N jetons → make / heal (Skirmish).
            fpPlayer.fellowshipArea = [
                {
                    ...clonePresetCard('2C102', 'dev-frodo-ct'),
                    attachments: [clonePresetCard('1R1', 'dev-ring-ct')],
                },
                clonePresetCard('0P12', 'dev-gimli-ct'), // nain → Run Until Found
                clonePresetCard('0P16', 'dev-faramir-ct'), // Homme Gondor → Garrison
            ];
            fpPlayer.supportArea = [
                {
                    ...clonePresetCard('6C52', 'dev-garrison'),
                    cultureTokens: { GONDOR: 2 },
                },
                {
                    ...clonePresetCard('18U2', 'dev-run-until-found'),
                    cultureTokens: { DWARVEN: 2 },
                },
            ];
            fpPlayer.hand = [];

            if (shadowPlayer) {
                shadowPlayer.supportArea = [
                    {
                        ...clonePresetCard('13U103', 'dev-always-threat'),
                        cultureTokens: { ORC: 3 },
                    },
                ];
                // Séides faibles + lurker pour Always Threatening
                G.battlefield = [
                    clonePresetCard('11S90', 'dev-man-of-bree'),
                    clonePresetCard('11C98', 'dev-rampaging-easterling'),
                ];
                shadowPlayer.hand = [];
            }

            // Site Cavern Entrance (Standard) en dernière case — pour tester
            // « no skirmish special abilities » (téléport site DEV → 9).
            if (G.path?.[8]) {
                G.path[8] = clonePresetSite('11S232', fpId, 9);
            }

            G.statusMessage =
                '[DEV] Jetons · Discard/remove → make. Faramir bloque Ombre sur son combat. Site 9 = Cavern Entrance (capacités Skirmish interdites aux deux).';
            break;
        }
    }
};
