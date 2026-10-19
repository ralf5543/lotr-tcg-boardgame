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
 * Vague Doors / Northern Pelennor (reste inertes).
 * 1 Doors of Durin → 2 Northern Pelennor → …
 */
const SITES_DOORS_PELENNOR_PATH = [
    '13U190', // 1 Doors of Durin
    '12S190', // 2 Northern Pelennor
    '11S265', // 3 Window
    '11S250', // 4 North Undeep
    '11S263', // 5 West Gate
    '11S228', // 6 Anduin Confluence (sanctuaire)
    '11S241', // 7 Orthanc
    '18U138', // 8 Sirannon
    '11S254', // 9 Pelennor Flat
] as const;

const resetBoardForPreset = (G: GameState): void => {
    const fpId = G.fpPlayerId || '0';
    const fpPlayer = G.players[fpId];
    if (!fpPlayer) return;

    G.twilightPool = 0;
    fpPlayer.burdens = 2;
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
    G.hunterMinionPlayedThisShadowPhase = false;

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
        case 'SITES_DOORS_PELENNOR': {
            resetBoardForPreset(G);
            setupDevPath(G, 0, SITES_DOORS_PELENNOR_PATH);
            G.twilightPool = 4;
            fpPlayer.burdens = 0;

            // Doors : 3 Hommes (majorité) + 1 Nain → Hommes −1 force.
            fpPlayer.fellowshipArea = [
                {
                    ...clonePresetCard('2C102', 'dev-dp-frodo'),
                    attachments: [clonePresetCard('1R1', 'dev-dp-ring')],
                },
                clonePresetCard('1R89', 'dev-dp-aragorn'),
                clonePresetCard('1R96', 'dev-dp-boromir'),
                clonePresetCard('1R13', 'dev-dp-gimli'),
            ];
            fpPlayer.hand = [];
            fpPlayer.deck = [];
            fpPlayer.sitesDeck = [clonePresetSite('11S250', fpId)];

            if (shadowPlayer) {
                shadowPlayer.hand = [];
                shadowPlayer.sitesDeck = [clonePresetSite('11S263', shadowId)];
                // Northern Pelennor : lurker + non-lurker (bulle sur le lurker).
                G.battlefield = [
                    clonePresetCard('11C136', 'dev-dp-lurker'),
                    clonePresetCard('1C266', 'dev-dp-orc'),
                ];
            }

            G.statusMessage =
                '[DEV] Doors / Pelennor · site 1 Doors (Hommes majorité → force −1) ; téléporte site 2 Northern Pelennor (Ombre : lurker perd lurker).';
            break;
        }
    }
};
