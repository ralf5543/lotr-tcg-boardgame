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
    G.pendingForceAssignPreventDiscard = undefined;
    G.pendingDeadPileRemoval = undefined;
    G.pendingSiteCharacterWounds = undefined;
    G.pendingWhenPlayed = undefined;
    G.pendingYouPlayQueue = undefined;
    G.pendingSiteDepartureContinuation = undefined;
    G.sitePhaseAbilityOfferedThisPhase = false;
    G.hunterMinionPlayedThisShadowPhase = false;
    G.preventMoveAgain = false;
    G.musterState = undefined;
    G.startOfPhaseState = undefined;
    G.regroupStep = undefined;
    G.assignmentStep = undefined;
    G.movesThisTurn = 0;

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

const RANGERS_PATH = [
    '15U187',
    '13U193',
    '15S189',
    '11S237',
    '18U135',
    '11S240',
    '12U194',
    '11S256',
    '13U187',
] as const;

/** Phase boardgame.io où atterrir après le load (défaut : Compagnie). */
export type DevPresetLoad = {
    startPhase: string;
};

/**
 * Presets DEV playtest. Renvoie la phase d’atterrissage pour `devLoadPreset`.
 */
export const applyDevPreset = (
    G: GameState,
    presetType: DevPresetType
): DevPresetLoad => {
    const fpId = G.fpPlayerId || '0';
    const shadowId = fpId === '0' ? '1' : '0';
    const fpPlayer = G.players[fpId];
    const shadowPlayer = G.players[shadowId];
    if (!fpPlayer || !shadowPlayer) {
        return { startPhase: 'startOfFellowship' };
    }

    switch (presetType) {
        case 'RANGERS_MUMAKS_INERTS': {
            // Vague inertes : 7R95 / 18U58 / 10U47 / 7R152.
            resetBoardForPreset(G);
            setupDevPath(G, 3, RANGERS_PATH);
            G.twilightPool = 4;
            fpPlayer.threats = 6;
            const frodo = {
                ...clonePresetCard('11S164', 'dev-rmi-frodo'),
                attachments: [clonePresetCard('4R1', 'dev-rmi-ring')],
                keywords: [
                    ...(getCardById('11S164')?.keywords || []),
                    'RING-BEARER',
                    'RING-BOUND',
                ],
            };
            // Aragorn F9 : face au Mûmak F16, pas de submersion (moteur : ≥ 2×).
            // + 3 rôdeurs pour le spot de la Cache (10R25 n’a pas RANGER).
            const aragorn = clonePresetCard('10R25', 'dev-rmi-aragorn');
            const rangers = [1, 2, 3].map((n) =>
                clonePresetCard('7C116', `dev-rmi-ranger-${n}`)
            );
            const stands = clonePresetCard('7R95', 'dev-rmi-stands');
            const cache = clonePresetCard('18U58', 'dev-rmi-cache');
            const fortDiscard = clonePresetCard('7C118', 'dev-rmi-fort');
            fpPlayer.fellowshipArea = [frodo, aragorn, ...rangers];
            fpPlayer.supportArea = [stands, cache];
            fpPlayer.discard = [fortDiscard];
            fpPlayer.hand = [];

            const call = clonePresetCard('10U47', 'dev-rmi-call');
            const mumak = {
                ...clonePresetCard('7R152', 'dev-rmi-mumak'),
                minionSiteNumber: 4,
            };
            const southron = clonePresetCard('4C222', 'dev-rmi-southron');
            shadowPlayer.supportArea = [call];
            shadowPlayer.hand = [southron];
            G.battlefield = [mumak];
            G.statusMessage =
                '[DEV] Inertes Rôdeurs/Mûmaks · Début regroupement : Still Stands (blesser le Mûmak ; puis Ralliement : défausse → fortif. sur pioche). Manœuvre (sauter phase) : Cache. Ombre : Cri de Ralliement. Combat : Cmd Mûmak (6 menaces).';
            // Still Stands = START_OF_REGROUP — atterrir là pour le sceau or visible.
            return { startPhase: 'startOfRegroup' };
        }

        default:
            G.statusMessage = `[DEV] Aucun preset actif (« ${presetType} »).`;
            return { startPhase: 'startOfFellowship' };
    }
};
