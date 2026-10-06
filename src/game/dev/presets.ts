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
    }
};
