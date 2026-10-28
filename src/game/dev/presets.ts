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
 * Vague en cours : trous de mécanismes decks — Sent Back (jouer un
 * Magicien malgré la pile de mort).
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
        case 'DECK_GAPS_SENT_BACK': {
            resetBoardForPreset(G);
            setupDevPath(G, 0, neutralPath);
            G.twilightPool = 0;
            fpPlayer.burdens = 2;
            fpPlayer.fellowshipArea = [
                {
                    ...clonePresetCard('2C102', 'dev-sentback-frodo'),
                    attachments: [
                        clonePresetCard('1R1', 'dev-sentback-ring'),
                    ],
                },
                clonePresetCard('1R89', 'dev-sentback-aragorn'),
            ];
            // Renvoyé déjà en jeu. Un Gandalf en main, un autre en pile
            // de mort : le glisser-déposer depuis la main est refusé ;
            // la capacité de Renvoyé, elle, passe.
            fpPlayer.supportArea = [
                clonePresetCard('9R27', 'dev-sentback-condition'),
            ];
            fpPlayer.hand = [
                clonePresetCard('1R72', 'dev-sentback-gandalf-hand'),
            ];
            fpPlayer.deadPile = [
                clonePresetCard('4C90', 'dev-sentback-gandalf-dead'),
            ];
            fpPlayer.deck = [
                clonePresetCard('1C306', 'dev-sentback-draw-1'),
                clonePresetCard('1C306', 'dev-sentback-draw-2'),
            ];
            fpPlayer.sitesDeck = [clonePresetSite('11S250', fpId)];
            if (shadowPlayer) {
                shadowPlayer.hand = [
                    clonePresetCard('1C151', 'dev-sentback-uruk'),
                ];
                shadowPlayer.deck = [
                    clonePresetCard('1C266', 'dev-sentback-shadow-draw-1'),
                ];
                shadowPlayer.sitesDeck = [
                    clonePresetSite('11S263', shadowId),
                ];
            }
            G.statusMessage =
                '[DEV] Renvoyé (9R27) · Un Gandalf est dans votre pile de mort, un autre en main. En Communauté (ou au Regroupement) : glisser Gandalf depuis la main vers la communauté est refusé (unicité). Cliquez la situation Renvoyé, puis Gandalf en main : il rejoint malgré la pile de mort (+4 crépuscule). La clause d’escarmouche (défausse des séides au combat contre un Magicien, puis le Magicien va à la pile de mort) est déjà validée.';
            break;
        }
    }
};
