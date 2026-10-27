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
    G.pendingSitePhaseDesignation = undefined;
    G.pendingSiteFollowerTransfer = undefined;
    G.pendingFpDiscard = undefined;
    G.pendingDeadPileRemoval = undefined;
    G.pendingSiteCharacterWounds = undefined;
    G.pendingWhenPlayed = undefined;
    G.pendingSiteDepartureContinuation = undefined;
    G.sitePhaseAbilityOfferedThisPhase = false;
    G.hunterMinionPlayedThisShadowPhase = false;
    G.preventMoveAgain = false;

    Object.keys(G.players).forEach((pId) => {
        const player = G.players[pId];
        if (player) {
            player.hand = [];
            player.supportArea = [];
            player.discard = [];
            player.deadPile = [];
            player.removedFromGame = [];
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
 * Chemin neutre : effets sans rapport avec le test (aucun allié,
 * aucune arme à main, 4 compagnons seulement).
 */
const neutralPath: readonly string[] = [
    '18U138', // 1 Sirannon Ruins (inerte)
    '11S228', // 2 Anduin Confluence (défenseur alliés : aucun)
    '11S263', // 3 West Gate of Moria (retire du crépuscule)
    '11S265', // 4 Window on the West (Defender +1)
    '11S250', // 5 North Undeep (archerie)
    '11S248', // 6 Moria Stairway (Damage si arme à main : aucune)
    '11S241', // 7 Fortress of Orthanc (+crépuscule si > 5 compagnons : non)
    '15U187', // 8 Anduin River (archerie)
    '11S232', // 9 Cavern Entrance
] as const;

/**
 * Applique le preset DEV de playtest (zones vidées / chemin Standard).
 * Vague en cours : trous de mécanismes decks — Armure de Pippin.
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
        case 'DECK_GAPS_PIPPIN': {
            resetBoardForPreset(G);
            setupDevPath(G, 0, neutralPath);
            G.twilightPool = 6;
            fpPlayer.burdens = 2;
            fpPlayer.fellowshipArea = [
                {
                    ...clonePresetCard('2C102', 'dev-pippin-frodo'),
                    attachments: [
                        clonePresetCard('1R1', 'dev-pippin-ring'),
                    ],
                },
                {
                    // Pippin porte son Armure (7R113, la carte testée).
                    ...clonePresetCard('7R324', 'dev-pippin'),
                    attachments: [
                        clonePresetCard('7R113', 'dev-pippin-armor'),
                    ],
                },
                // Trois Hommes du Gondor repérables : condition remplie.
                clonePresetCard('1R89', 'dev-pippin-aragorn'),
                clonePresetCard('11R57', 'dev-pippin-boromir'),
                clonePresetCard('5C35', 'dev-pippin-knight'),
            ];
            fpPlayer.deck = [
                clonePresetCard('1C306', 'dev-pippin-draw-1'),
                clonePresetCard('1C306', 'dev-pippin-draw-2'),
                clonePresetCard('1C306', 'dev-pippin-draw-3'),
            ];
            fpPlayer.sitesDeck = [clonePresetSite('11S250', fpId)];
            if (shadowPlayer) {
                // Uruk Sauvage : force 5, Dégâts +1 (coût 2). Contre
                // Pippin (force 3) : victoire de l’Ombre sans submersion,
                // donc 2 blessures attendues → 1 seule avec l’Armure.
                shadowPlayer.hand = [
                    clonePresetCard('1C151', 'dev-pippin-uruk-1'),
                    clonePresetCard('1C151', 'dev-pippin-uruk-2'),
                ];
                shadowPlayer.deck = [
                    clonePresetCard('1C266', 'dev-pippin-shadow-draw-1'),
                ];
                shadowPlayer.sitesDeck = [
                    clonePresetSite('11S263', shadowId),
                ];
            }
            G.statusMessage =
                '[DEV] Armure de Pippin (7R113) · crépuscule 6 · Trois Hommes du Gondor sont repérables (Aragorn, Boromir, Chevalier du Gondor), la condition est remplie. Avancez jusqu’à l’Ombre, jouez un Uruk Sauvage et assignez-le à Pippin : il perd (force 3 contre 5) et devrait prendre 2 blessures (Dégâts +1) — l’Armure limite à 1 seule. Assignez le 2ᵉ Uruk à Pippin dans la même phase : nouvelle escarmouche, le plafond repart — 1 blessure de plus (2 au total). Cas couverts par les tests automatiques : moins de 3 Hommes repérés, hors escarmouche, affaiblissement qui ne compte pas.';
            break;
        }
    }
};
