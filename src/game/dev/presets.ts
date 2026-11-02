import type {
    CardState,
    DevPresetType,
    GameState,
    SiteCardState,
} from '../types';
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
    if (!card || card.type !== 'SITE') {
        throw new Error(`[DEV] Site introuvable pour le preset : ${id}`);
    }
    return {
        ...card,
        instanceId: `dev-site-${siteNumber || id}`,
        ownerId,
        siteNumber: siteNumber || card.siteNumber,
        twilightCost: card.twilightCost ?? 0,
    };
};

const resetBoardForPreset = (G: GameState): void => {
    G.battlefield = [];
    G.skirmishes = [];
    G.activeSkirmishId = undefined;
    G.twilightPool = 0;
    G.tempModifiers = undefined;
    G.tempMoveLimitMods = undefined;
    G.pendingForcedChoice = undefined;
    G.pendingPlay = undefined;
    G.pendingEvent = undefined;
    G.responseWindow = undefined;
    G.actionWindow = undefined;
    G.wearingTheOneRing = undefined;
    if (G.setupState) {
        G.setupState.step = 'COMPLETE';
    }
    Object.values(G.players).forEach((player) => {
        if (player) {
            player.hand = [];
            player.discard = [];
            player.deadPile = [];
            player.removedFromGame = [];
            player.fellowshipArea = [];
            player.supportArea = [];
            player.sitesDeck = [];
            player.deck = [];
            player.burdens = 0;
            player.threats = 0;
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

const neutralPath: readonly string[] = [
    '18U138', // 1
    '11S228', // 2
    '11S263', // 3
    '11S265', // 4
    '11S250', // 5
    '11S248', // 6
    '11S241', // 7
    '15U187', // 8
    '11S232', // 9
] as const;

/**
 * Applique le preset DEV de playtest (zones vidées / chemin Standard).
 * Vague Light the Beacons (choix de culture + exert variable).
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
        case 'DECK_GAPS_LIGHT_THE_BEACONS': {
            resetBoardForPreset(G);
            setupDevPath(G, 3, neutralPath);
            G.twilightPool = 10;
            fpPlayer.burdens = 0;
            // Porteur (Frodon) + Gandalf (vitalité 4) + Faramir (Gondor) + Merry (Comté).
            // Sans RING-BOUND → dissociés (sauf le Porteur).
            fpPlayer.fellowshipArea = [
                {
                    ...clonePresetCard('1C290', 'dev-beacon-frodo'),
                    keywords: ['RING-BEARER', 'RING-BOUND'],
                    attachments: [clonePresetCard('4R1', 'dev-beacon-ring')],
                },
                clonePresetCard('8R15', 'dev-beacon-gandalf'),
                clonePresetCard('7R91', 'dev-beacon-faramir'),
                clonePresetCard('1R302', 'dev-beacon-merry'),
            ];
            // Après jeu de l’événement, 4 cartes restent → initiative (exert ×2).
            // Pads = possessions (pas Sleep Caradhras : événement Communauté).
            // Retirer 1 pad avant de jouer pour tester ×3.
            fpPlayer.hand = [
                clonePresetCard('7R43', 'dev-beacons'),
                clonePresetCard('1C305', 'dev-beacon-pad1'),
                clonePresetCard('1C305', 'dev-beacon-pad2'),
                clonePresetCard('1C305', 'dev-beacon-pad3'),
                clonePresetCard('1C305', 'dev-beacon-pad4'),
            ];
            fpPlayer.deck = [];
            fpPlayer.sitesDeck = [];
            fpPlayer.supportArea = [];
            if (shadowPlayer) {
                shadowPlayer.hand = [];
                shadowPlayer.supportArea = [];
                shadowPlayer.discard = [];
                shadowPlayer.deck = [];
                shadowPlayer.sitesDeck = [];
            }
            G.statusMessage =
                '[DEV] Light the Beacons (7R43) · Manœuvre : jouer l’événement (5 cartes → 4 = initiative, exert ×2) ; défausse un pad d’abord pour ×3. Puis choisir Gondor ou Comté → force +3 aux dissociés.';
            break;
        }
    }
};
