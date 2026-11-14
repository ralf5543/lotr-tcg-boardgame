import type {
    CardState,
    DevPresetType,
    GameState,
    SiteCardState,
} from '../types';
import { getCardById } from '../cardsData';

export const clonePresetCard = (
    id: string,
    instanceId?: string
): CardState => {
    const card = getCardById(id);
    if (!card) {
        throw new Error(`[DEV] Carte introuvable pour le preset : ${id}`);
    }
    return { ...card, instanceId: instanceId || `dev-${id}` };
};

export const clonePresetSite = (
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

export const resetBoardForPreset = (G: GameState): void => {
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
    G.isFierceAssignment = false;
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

export const setupDevPath = (
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

/** Phase boardgame.io où atterrir après le load (défaut : Compagnie). */
export type DevPresetLoad = {
    /** Ex. `skirmish`, `startOfFellowship`, `assignment`… */
    startPhase: string;
};

/**
 * Presets DEV playtest (deck Hobbits / Isengard, etc.).
 * Renvoie la phase d’atterrissage pour `devLoadPreset` (ne pas forcer
 * Compagnie si le scénario est déjà en combat / salve acharnée).
 */
export const applyDevPreset = (
    G: GameState,
    presetType: DevPresetType
): DevPresetLoad => {
    const fpId = G.fpPlayerId || '0';
    const fpPlayer = G.players[fpId];
    if (!fpPlayer) return { startPhase: 'startOfFellowship' };

    const shadowId = fpId === '0' ? '1' : '0';
    const shadowPlayer = G.players[shadowId];

    switch (presetType) {
        case 'HOBBITS_ISENGARD_W3': {
            // Vague 3 — Phial, Task Now, Filibert (allié), Simple Living.
            // Atterrit en combat / salve acharnée pour Filibert.
            resetBoardForPreset(G);
            setupDevPath(G, 0, [
                '18U140',
                '11S249',
                '11S264',
                '12U194',
                '11S252',
                '17U147',
                '11S242',
                '11S261',
                '18U138',
            ]);
            G.twilightPool = 0;
            fpPlayer.burdens = 0;
            const merry = clonePresetCard('11C168', 'dev-hi3-merry');
            const sam = {
                ...clonePresetCard('11U172', 'dev-hi3-sam'),
                wounds: 1,
            };
            const phial = clonePresetCard('13R155', 'dev-hi3-phial');
            const frodo = {
                ...clonePresetCard('11S164', 'dev-hi3-frodo'),
                attachments: [
                    clonePresetCard('1C2', 'dev-hi3-ring'),
                    phial,
                ],
            };
            const fierceUruk = clonePresetCard('4C190', 'dev-hi3-uruk');
            fpPlayer.fellowshipArea = [frodo, sam, merry];
            fpPlayer.supportArea = [
                clonePresetCard('2C101', 'dev-hi3-filibert'),
                clonePresetCard('12U130', 'dev-hi3-simple'),
            ];
            fpPlayer.hand = [
                clonePresetCard('11U175', 'dev-hi3-task'),
                clonePresetCard('11S174', 'dev-hi3-sworn'),
            ];
            G.skirmishes = [
                {
                    id: 'dev-hi3-sk',
                    companionId: merry.instanceId || merry.id,
                    minionIds: [fierceUruk.instanceId || fierceUruk.id],
                },
            ];
            G.activeSkirmishId = 'dev-hi3-sk';
            G.isFierceAssignment = true;
            if (shadowPlayer) {
                G.battlefield = [fierceUruk];
            }
            G.statusMessage =
                '[DEV] Hobbits/Isengard vague 3 · déjà en combat (salve acharnée). Filibert : affaiblir Merry ×2 → annule. Phial (Muster) ; Task/Sworn + Simple Living (Sam blessé). Relancer le preset.';
            return { startPhase: 'skirmish' };
        }
        default:
            G.statusMessage = `[DEV] Aucun preset actif (« ${presetType} »).`;
            return { startPhase: 'startOfFellowship' };
    }
};
