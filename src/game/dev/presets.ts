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
 * Vague Valley / Uplands / Shores.
 * 1 filler → 2 Valley (moves to heal Hobbits) → 3 Uplands → 4 Shores → …
 */
const SITES_VALLEY_SHORES_PATH = [
    '11S265', // 1 Window (départ)
    '11S261', // 2 Valley of the Silverlode
    '11S257', // 3 Rohan Uplands
    '12U191', // 4 Shores of Nen Hithoel
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
    G.pendingSitePhaseAbility = undefined;
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
        case 'SITES_VALLEY_SHORES': {
            resetBoardForPreset(G);
            setupDevPath(G, 0, SITES_VALLEY_SHORES_PATH);
            G.twilightPool = 6;
            fpPlayer.burdens = 0;

            fpPlayer.fellowshipArea = [
                {
                    ...clonePresetCard('2C102', 'dev-vs-frodo'),
                    attachments: [clonePresetCard('1R1', 'dev-vs-ring')],
                    wounds: 1,
                },
                {
                    ...clonePresetCard('1C306', 'dev-vs-pippin'),
                    wounds: 1,
                },
                clonePresetCard('1R13', 'dev-vs-gimli'),
                // Archerie FP → tester Uplands (Uruk immunisé, Orques non).
                clonePresetCard('1R50', 'dev-vs-legolas'),
            ];
            fpPlayer.hand = [];
            fpPlayer.deck = [clonePresetCard('1C11', 'dev-vs-draw')];
            fpPlayer.sitesDeck = [clonePresetSite('11S250', fpId)];

            if (shadowPlayer) {
                shadowPlayer.hand = [];
                shadowPlayer.sitesDeck = [clonePresetSite('11S263', shadowId)];
                // Shores : 5 Orques ; Uplands : 1 Uruk (ne prend pas d’archerie).
                G.battlefield = [
                    clonePresetCard('1C266', 'dev-vs-orc-a'),
                    clonePresetCard('1C268', 'dev-vs-orc-b'),
                    clonePresetCard('1C271', 'dev-vs-orc-c'),
                    clonePresetCard('11C136', 'dev-vs-orc-d'),
                    clonePresetCard('11C113', 'dev-vs-orc-e'),
                    clonePresetCard('1C146', 'dev-vs-uruk'),
                ];
            }

            G.statusMessage =
                '[DEV] Valley / Uplands / Shores · avance site 2 Valley (toaster heal Hobbits) ; téléporte 3 Uplands + Legolas (Uruk immunisé archerie) ; 4 Shores → phase Ombre (toaster Spot 5, une fois).';
            break;
        }
    }
};
