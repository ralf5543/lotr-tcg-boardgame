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
 * Vague Steward / Courtyard (reste inertes).
 * 1 filler → 2 Courtyard (moves to Ombre) → 3 Steward's Tomb → …
 */
const SITES_STEWARD_COURTYARD_PATH = [
    '11S265', // 1 Window (départ)
    '13U188', // 2 Courtyard Parapet
    '18U139', // 3 Steward's Tomb
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
        case 'SITES_STEWARD_COURTYARD': {
            resetBoardForPreset(G);
            // Départ Window ; avance → Courtyard (toaster Ombre) ; téléporte site 3 Steward.
            setupDevPath(G, 0, SITES_STEWARD_COURTYARD_PATH);
            G.twilightPool = 2;
            fpPlayer.burdens = 2;

            fpPlayer.fellowshipArea = [
                {
                    ...clonePresetCard('2C102', 'dev-sc-frodo'),
                    attachments: [clonePresetCard('1R1', 'dev-sc-ring')],
                    wounds: 1,
                },
                {
                    ...clonePresetCard('1R13', 'dev-sc-gimli'),
                    wounds: 1,
                },
            ];
            fpPlayer.hand = [];
            fpPlayer.deck = [clonePresetCard('1C11', 'dev-sc-draw')];
            fpPlayer.sitesDeck = [clonePresetSite('11S250', fpId)];

            if (shadowPlayer) {
                // Courtyard : défausser 2 cartes pour +1 fardeau.
                shadowPlayer.hand = [
                    clonePresetCard('1C266', 'dev-sc-hand-a'),
                    clonePresetCard('1C268', 'dev-sc-hand-b'),
                    clonePresetCard('1C269', 'dev-sc-hand-c'),
                ];
                shadowPlayer.sitesDeck = [clonePresetSite('11S263', shadowId)];
                G.battlefield = [
                    {
                        ...clonePresetCard('1C266', 'dev-sc-orc'),
                        wounds: 0,
                    },
                ];
            }

            G.statusMessage =
                '[DEV] Steward/Courtyard · avance site 2 Courtyard (Ombre défausse 2 → fardeau) ; téléporte site 3 Steward (pas de soin / prevent / −fardeaux).';
            break;
        }
    }
};
