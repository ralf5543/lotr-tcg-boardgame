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
 * Vague cas durs / suite each-time.
 * 1 filler → 2 Starkhorn (Dwarf wins → draw)
 * → 3 Westfold (hunter +1) → … → 7 Mount Doom (région verrouillée)
 * Steward's Tomb / Foot volontairement absents (inertes).
 */
const SITES_HARD_WAVE_PATH = [
    '12S189', // 1 Hobbiton Market (moves from → wound non-lurker)
    '12U193', // 2 Starkhorn
    '15S194', // 3 Westfold Village (sanctuaire)
    '12U186', // 4 Bridge (Balrog –3)
    '11S265', // 5 Window
    '11S228', // 6 Anduin Confluence (sanctuaire)
    '15R193', // 7 Mount Doom
    '11S263', // 8 West Gate
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
        case 'SITES_HARD_WAVE': {
            resetBoardForPreset(G);
            // Départ site 2 (Starkhorn) ; téléporte 3 / 7 pour Westfold / Mount Doom.
            setupDevPath(G, 1, SITES_HARD_WAVE_PATH);
            G.twilightPool = 0;
            fpPlayer.burdens = 0;

            fpPlayer.fellowshipArea = [
                {
                    ...clonePresetCard('2C102', 'dev-hard-frodo'),
                    attachments: [clonePresetCard('1R1', 'dev-hard-ring')],
                    wounds: 0,
                },
                {
                    // Nain → Starkhorn.
                    ...clonePresetCard('1R13', 'dev-hard-gimli'),
                    wounds: 0,
                },
                {
                    // Hunter → Westfold.
                    ...clonePresetCard('15S18', 'dev-hard-hunter'),
                    wounds: 0,
                },
            ];
            fpPlayer.deck = [
                clonePresetCard('1C11', 'dev-hard-draw-a'),
                clonePresetCard('1R30', 'dev-hard-draw-b'),
            ];

            if (shadowPlayer) {
                // Sites de deck pour tenter un replace (bloqué par Mount Doom région 3).
                shadowPlayer.sitesDeck = [
                    clonePresetSite('11S241', shadowId),
                    clonePresetSite('11S239', shadowId),
                ];
                G.battlefield = [
                    clonePresetCard('1C266', 'dev-hard-orc'),
                ];
            }

            G.statusMessage =
                '[DEV] Hard · 1 Hobbiton (quitter → blessure) ; 2 Starkhorn ; 3 Westfold ; 4 Bridge (Balrog –3) ; 7 Mount Doom.';
            break;
        }
    }
};
