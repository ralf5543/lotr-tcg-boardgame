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
 * Vague passifs durs (reste inertes).
 * 1 Breeding pit → 2 Hill of Sight → …
 */
const SITES_PASSIVES_HARD_PATH = [
    '15S188', // 1 Breeding pit of Isengard
    '12S188', // 2 Hill of Sight
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
        case 'SITES_PASSIVES_HARD': {
            resetBoardForPreset(G);
            // Site 1 Breeding (premier hunter −2) ; téléporte site 2 Hill (résistance).
            setupDevPath(G, 0, SITES_PASSIVES_HARD_PATH);
            G.twilightPool = 8;
            fpPlayer.burdens = 0;

            // Hill : branche « 6 compagnons » (pas 3 séides) — Frodo ring-bound
            // ne prend pas le −2 ; les 5 unbound oui.
            fpPlayer.fellowshipArea = [
                {
                    ...clonePresetCard('2C102', 'dev-ph-frodo'),
                    attachments: [clonePresetCard('1R1', 'dev-ph-ring')],
                },
                clonePresetCard('1R13', 'dev-ph-gimli'),
                clonePresetCard('1C11', 'dev-ph-farin'),
                clonePresetCard('1R30', 'dev-ph-arwen'),
                clonePresetCard('1R50', 'dev-ph-legolas'),
                clonePresetCard('1R89', 'dev-ph-aragorn'),
            ];
            fpPlayer.hand = [];
            fpPlayer.deck = [];
            fpPlayer.sitesDeck = [clonePresetSite('11S250', fpId)];

            if (shadowPlayer) {
                // Breeding : 2 hunters (premier −2, second plein tarif).
                shadowPlayer.hand = [
                    clonePresetCard('15C83', 'dev-ph-hunter-a'),
                    clonePresetCard('15C157', 'dev-ph-hunter-b'),
                    clonePresetCard('1C266', 'dev-ph-orc'),
                ];
                shadowPlayer.sitesDeck = [clonePresetSite('11S263', shadowId)];
                // Seulement 2 séides → Hill ne passe PAS par la branche minions.
                G.battlefield = [
                    clonePresetCard('1C266', 'dev-ph-spot-a'),
                    clonePresetCard('1C268', 'dev-ph-spot-b'),
                ];
            }

            G.statusMessage =
                '[DEV] Passifs durs · site 1 Breeding (Ombre : 1er hunter −2) ; téléporte site 2 Hill (6 compagnons / 2 séides → unbound résistance −2).';
            break;
        }
    }
};
