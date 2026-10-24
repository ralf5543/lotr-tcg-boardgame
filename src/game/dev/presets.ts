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
 * Vague Isenwash.
 * 1 filler → 2 Isenwash (début regroup : Ombre exert séide → exert compagnon) → …
 */
const SITES_ISENWASH_PATH = [
    '11S265', // 1 Window (départ)
    '13U193', // 2 Isenwash
    '11S263', // 3 West Gate
    '11S228', // 4 Anduin Confluence
    '11S241', // 5 Orthanc
    '18U138', // 6 Sirannon (sanctuaire)
    '11S254', // 7 Pelennor Flat
    '11S250', // 8 North Undeep
    '11S232', // 9 Cavern Entrance
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
    G.pendingSitePhaseAbility = undefined;
    G.pendingSiteFollowerTransfer = undefined;
    G.pendingSiteCharacterWounds = undefined;
    G.sitePhaseAbilityOfferedThisPhase = false;
    G.hunterMinionPlayedThisShadowPhase = false;
    G.preventMoveAgain = false;

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
        case 'SITES_ISENWASH': {
            resetBoardForPreset(G);
            // Déjà sur Isenwash pour enchaîner jusqu’au regroupement.
            setupDevPath(G, 1, SITES_ISENWASH_PATH);
            G.twilightPool = 2;
            fpPlayer.burdens = 0;

            fpPlayer.fellowshipArea = [
                {
                    ...clonePresetCard('2C102', 'dev-iw-frodo'),
                    attachments: [clonePresetCard('1R1', 'dev-iw-ring')],
                },
                clonePresetCard('1R72', 'dev-iw-aragorn'),
                clonePresetCard('1R13', 'dev-iw-gimli'),
            ];
            fpPlayer.hand = [];
            fpPlayer.deck = [clonePresetCard('1C11', 'dev-iw-fp-draw')];
            fpPlayer.sitesDeck = [clonePresetSite('11S250', fpId)];

            if (shadowPlayer) {
                shadowPlayer.hand = [];
                shadowPlayer.sitesDeck = [clonePresetSite('11S263', shadowId)];
                shadowPlayer.supportArea = [];
                // Séide exertable (vitalité ≥ 2) pour Isenwash.
                G.battlefield = [
                    clonePresetCard('1C266', 'dev-iw-orc'),
                    clonePresetCard('1C268', 'dev-iw-orc-b'),
                ];
            }

            G.statusMessage =
                '[DEV] Isenwash · site 2 : avancer jusqu’au regroupement → toaster Ombre (exert séide → exert compagnon).';
            break;
        }
    }
};
