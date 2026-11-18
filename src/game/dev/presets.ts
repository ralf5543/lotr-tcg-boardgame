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
    const fpPlayer = G.players[fpId];
    if (!fpPlayer) return { startPhase: 'startOfFellowship' };

    switch (presetType) {
        case 'RANGERS_I_WILL_GO': {
            // Affectation : J'Irai sur rôdeur + initiative → DEFENDER +1 (2 séides OK).
            resetBoardForPreset(G);
            setupDevPath(G, 3, RANGERS_PATH);
            G.twilightPool = 0;
            fpPlayer.burdens = 0;
            const frodo = {
                ...clonePresetCard('11S164', 'dev-iwg-frodo'),
                attachments: [clonePresetCard('4R1', 'dev-iwg-ring')],
            };
            const iWillGo = clonePresetCard('7C105', 'dev-iwg-cond');
            const ranger = {
                ...clonePresetCard('7C116', 'dev-iwg-ranger'),
                attachments: [iWillGo],
            };
            // Initiative FP = ≥ 4 cartes en main.
            fpPlayer.hand = [
                clonePresetCard('1C119', 'dev-iwg-h1'),
                clonePresetCard('1C119', 'dev-iwg-h2'),
                clonePresetCard('1C106', 'dev-iwg-h3'),
                clonePresetCard('1C117', 'dev-iwg-h4'),
            ];
            fpPlayer.fellowshipArea = [frodo, ranger];
            const m1 = {
                ...clonePresetCard('4U249', 'dev-iwg-m1'),
                minionSiteNumber: 4,
            };
            const m2 = {
                ...clonePresetCard('5C76', 'dev-iwg-m2'),
                minionSiteNumber: 4,
            };
            const shadowId = fpId === '0' ? '1' : '0';
            const shadow = G.players[shadowId];
            if (shadow) {
                shadow.hand = [];
            }
            G.battlefield = [m1, m2];
            G.statusMessage =
                '[DEV] J’Irai · Affectation : rôdeur avec J’Irai + initiative → DEFENDER +1 (les 2 séides peuvent l’attaquer). Relancer le preset.';
            return { startPhase: 'assignment' };
        }

        default:
            G.statusMessage = `[DEV] Aucun preset actif (« ${presetType} »).`;
            return { startPhase: 'startOfFellowship' };
    }
};
