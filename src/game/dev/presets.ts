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

/**
 * Vague may / phase rest (12–18).
 * 1 Emyn Muil (Maneuver fierce) → 2 Caves (may −2 fardeaux) → 3 City of Kings (may draw)
 * → 4 East Wall (début fellowship hunters) → …
 */
const SITES_MAY_WAVE_PATH = [
    '12S187', // 1 Emyn Muil
    '13S186', // 2 Caves of Aglarond
    '13U187', // 3 City of Kings (sanctuaire)
    '15S190', // 4 East Wall of Rohan
    '11S265', // 5 Window
    '11S228', // 6 Anduin Confluence (sanctuaire)
    '11S263', // 7 West Gate
    '11S250', // 8 North Undeep
    '18U138', // 9 Sirannon
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
    G.pendingSiteMoveAbility = undefined;
    G.pendingSiteStartAbility = undefined;

    Object.keys(G.players).forEach((pId) => {
        const player = G.players[pId];
        if (player) {
            player.hand = [];
            player.supportArea = [];
            player.discard = [];
            player.fellowshipArea = [];
            player.sitesDeck = [];
            player.deck = [];
        }
    });
};

const setupDevPath = (
    G: GameState,
    startIndex: number,
    pathIds: readonly string[]
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
        case 'SITES_MAY_WAVE': {
            resetBoardForPreset(G);
            // Départ East Wall (site 4) → toaster début fellowship ; téléporte 1–3 pour le reste.
            setupDevPath(G, 3, SITES_MAY_WAVE_PATH);
            G.twilightPool = 4;
            fpPlayer.burdens = 3;

            fpPlayer.fellowshipArea = [
                {
                    ...clonePresetCard('2C102', 'dev-may-frodo'),
                    attachments: [clonePresetCard('1R1', 'dev-may-ring')],
                    wounds: 0,
                },
                {
                    // Hunter ×2 → East Wall (exert 2 chasseurs).
                    ...clonePresetCard('15S18', 'dev-may-legolas'),
                    wounds: 0,
                },
                {
                    ...clonePresetCard('17S7', 'dev-may-hunter-2'),
                    wounds: 0,
                },
            ];
            // City of Kings : piocher ; East Wall : chasseur jouable (pas Legolas, déjà unique en jeu).
            fpPlayer.deck = [
                clonePresetCard('15C59', 'dev-may-hunter-deck'),
                clonePresetCard('1C11', 'dev-may-draw-b'),
            ];
            fpPlayer.hand = [];
            fpPlayer.sitesDeck = [clonePresetSite('11S250', fpId)];

            if (shadowPlayer) {
                shadowPlayer.hand = [];
                shadowPlayer.sitesDeck = [clonePresetSite('11S263', shadowId)];
                G.battlefield = [
                    {
                        // Emyn Muil : séide non fierce → fierce.
                        ...clonePresetCard('1C266', 'dev-may-orc'),
                        wounds: 0,
                    },
                ];
            }

            G.statusMessage =
                '[DEV] May wave · départ East Wall (2 chasseurs → play hunter) ; site 1 Emyn Muil ; site 2 Caves ; site 3 City.';
            break;
        }
    }
};
