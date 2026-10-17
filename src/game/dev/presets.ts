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
 * Vague each-time set 11.
 * 1 filler → 2 Heights (Gandalf wins → défausse situation)
 * → 3 Slag Mounds (compagnon tué → fardeau, sanctuaire)
 * → … fillers. Trollshaw volontairement inerte.
 */
const SITES_EACH_TIME_WAVE_PATH = [
    '11S250', // 1 North Undeep
    '11U244', // 2 Heights of Isengard
    '11S258', // 3 Slag Mounds
    '11S232', // 4 Cavern
    '11S265', // 5 Window
    '11S228', // 6 Anduin Confluence
    '11S263', // 7 West Gate
    '11S260', // 8 Trollshaw (inerte)
    '11S265', // 9 Window
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
        case 'SITES_EACH_TIME_WAVE': {
            resetBoardForPreset(G);
            // Départ site 2 (Heights) ; téléporte 3 pour Slag Mounds.
            setupDevPath(G, 1, SITES_EACH_TIME_WAVE_PATH);
            G.twilightPool = 0;
            fpPlayer.burdens = 0;

            fpPlayer.fellowshipArea = [
                {
                    ...clonePresetCard('2C102', 'dev-et-frodo'),
                    attachments: [clonePresetCard('1R1', 'dev-et-ring')],
                    wounds: 0,
                },
                {
                    // Gandalf companion → Heights.
                    ...clonePresetCard('1R72', 'dev-et-gandalf'),
                    wounds: 0,
                },
                {
                    // Compagnon fragile pour Slag Mounds (tuer → fardeau).
                    ...clonePresetCard('1C303', 'dev-et-merry'),
                    vitality: 2,
                    wounds: 1,
                },
            ];
            // Situation à défausser (Heights).
            fpPlayer.supportArea = [
                clonePresetCard('1R79', 'dev-et-condition'),
            ];

            if (shadowPlayer) {
                G.battlefield = [
                    clonePresetCard('1C266', 'dev-et-orc'),
                ];
            }

            G.statusMessage =
                '[DEV] Each-time · 2 Heights (victoire Gandalf → défausse situation) ; 3 Slag Mounds (mort compagnon → fardeau).';
            break;
        }
    }
};
