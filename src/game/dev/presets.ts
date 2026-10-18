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
 * Vague passifs reste 12–18.
 * Départ Fords (borne) ; téléporte Great Gates / Streets / Redhorn / Wold ;
 * Nurn contrôlé Ombre hors site courant.
 */
const SITES_PASSIVES_REST_PATH = [
    '13S191', // 1 Fords of Isen
    '13S192', // 2 The Great Gates
    '18U140', // 3 Streets of Bree
    '13U194', // 4 Redhorn Pass
    '12U194', // 5 Wold Battlefield
    '17U148', // 6 Nurn (contrôlé Ombre)
    '11S265', // 7 Window
    '11S263', // 8 West Gate
    '11S250', // 9 North Undeep
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
        case 'SITES_PASSIVES_REST': {
            resetBoardForPreset(G);
            setupDevPath(G, 0, SITES_PASSIVES_REST_PATH);
            G.twilightPool = 4;
            fpPlayer.burdens = 0;

            const axe = clonePresetCard('1C9', 'dev-pass-axe');
            fpPlayer.fellowshipArea = [
                {
                    ...clonePresetCard('2C102', 'dev-pass-frodo'),
                    attachments: [clonePresetCard('1R1', 'dev-pass-ring')],
                    wounds: 0,
                },
                {
                    // Homme → Wold ; axe → Fords (+1).
                    ...clonePresetCard('1R89', 'dev-pass-aragorn'),
                    attachments: [axe],
                    wounds: 0,
                },
                {
                    ...clonePresetCard('1R13', 'dev-pass-gimli'),
                    wounds: 0,
                },
                {
                    // Homme Gandalf → Last Stand (place jetons) pour Redhorn.
                    ...clonePresetCard('11R30', 'dev-pass-erland'),
                    wounds: 0,
                },
            ];
            fpPlayer.supportArea = [
                // Suivant → Streets of Bree (interdit transfert).
                clonePresetCard('13R46', 'dev-pass-follower'),
                // Redhorn (site 4) : place / retire jetons bloqués.
                {
                    ...clonePresetCard('18U21', 'dev-pass-last-stand'),
                    cultureTokens: { GANDALF: 3 },
                },
            ];
            fpPlayer.hand = [];
            fpPlayer.sitesDeck = [clonePresetSite('11S250', fpId)];

            if (shadowPlayer) {
                shadowPlayer.hand = [];
                shadowPlayer.sitesDeck = [clonePresetSite('11S263', shadowId)];
                G.battlefield = [
                    {
                        // Nurn (site 6) : force 8 → 9 si contrôlé ; orc reste 7.
                        ...clonePresetCard('15C83', 'dev-pass-hunter-minion'),
                        wounds: 0,
                    },
                    {
                        ...clonePresetCard('1C266', 'dev-pass-orc'),
                        wounds: 0,
                    },
                ];
                // Nurn contrôlé Ombre → hunter +1 même hors site courant.
                const nurn = G.path[5];
                if (nurn) nurn.controlledBy = shadowId;
            }

            G.statusMessage =
                '[DEV] Passives rest · site 4 Redhorn (Last Stand jetons) ; site 6 Nurn (hunter 8→9). Téléporte via panneau DEV.';
            break;
        }
    }
};
