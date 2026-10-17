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
 * Vague passifs set 11 (+ Anduin River 15).
 * 1 East Road (+2 crépuscule) → 2 Caras (assign ≤1) → 3 Helm's Gate (arme → +2)
 * → 4 Pelennor Fields (Men ambush) → 5 Flats (unbound ≥2 séides → +3)
 * → 6 Anduin River (archerie FP −3, sanctuaire) → 7–9 fillers.
 */
const SITES_PASSIVES_WAVE_PATH = [
    '11S236', // 1 East Road
    '11S231', // 2 Caras Galadhon
    '11S245', // 3 Helm's Gate
    '11S253', // 4 Pelennor Fields
    '11S240', // 5 Flats of Rohan
    '15U187', // 6 Anduin River (+ sanctuaire)
    '11S250', // 7 North Undeep
    '11S232', // 8 Cavern
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
        case 'SITES_PASSIVES_WAVE': {
            resetBoardForPreset(G);
            // Départ site 1 (East Road) ; téléporte 2–6 pour les autres.
            setupDevPath(G, 0, SITES_PASSIVES_WAVE_PATH);
            G.twilightPool = 0;
            fpPlayer.burdens = 0;

            fpPlayer.fellowshipArea = [
                {
                    ...clonePresetCard('2C102', 'dev-pass-frodo'),
                    attachments: [clonePresetCard('1R1', 'dev-pass-ring')],
                    wounds: 0,
                },
                {
                    // Unbound + arme (Helm's Gate / Flats).
                    ...clonePresetCard('0P14', 'dev-pass-aragorn'),
                    attachments: [
                        clonePresetCard('1U112', 'dev-pass-ranger-sword'),
                    ],
                    wounds: 0,
                },
                {
                    // Defender +1 pour tester le plafond Caras (reste 1).
                    ...clonePresetCard('1R96', 'dev-pass-boromir'),
                    keywords: [
                        ...(clonePresetCard('1R96').keywords || []),
                        'DEFENDER +1',
                    ],
                    wounds: 0,
                },
                {
                    ...clonePresetCard('0P13', 'dev-pass-legolas'),
                    wounds: 0,
                },
            ];
            // Compagnons en main : East Road (crépuscule imprimé +2).
            fpPlayer.hand = [
                clonePresetCard('1R13', 'dev-pass-hand-gimli'),
                clonePresetCard('0P17', 'dev-pass-hand-eowyn'),
                clonePresetCard('1C11', 'dev-pass-hand-farin'),
                clonePresetCard('1R30', 'dev-pass-hand-arwen'),
            ];

            if (shadowPlayer) {
                G.battlefield = [
                    // Men → Ambush 1 (Pelennor) ; arme pour Helm's Gate.
                    {
                        ...clonePresetCard('11C72', 'dev-pass-easterling'),
                        attachments: [
                            clonePresetCard('11S95', 'dev-pass-poleaxe'),
                        ],
                    },
                    clonePresetCard('11C73', 'dev-pass-harad'),
                    clonePresetCard('1C266', 'dev-pass-orc'),
                ];
            }

            G.statusMessage =
                '[DEV] Passifs · 1 East Road (+2 crép. : 4 compagnons en main) ; 2 Caras ; 3 Helm ; 4 Pelennor ; 5 Flats ; 6 Anduin River.';
            break;
        }
    }
};
