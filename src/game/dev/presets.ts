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
        case 'RANGERS_SEASONED_LEADER': {
            // Escarmouche : Meneur sur Suderon → −1 menace → situation Pillard en défausse.
            resetBoardForPreset(G);
            setupDevPath(G, 3, RANGERS_PATH);
            // Champ des Vaincus = 1 crépuscule.
            G.twilightPool = 1;
            fpPlayer.burdens = 0;
            fpPlayer.threats = 2;
            const frodo = {
                ...clonePresetCard('11S164', 'dev-sl-frodo'),
                attachments: [clonePresetCard('4R1', 'dev-sl-ring')],
            };
            const ranger = clonePresetCard('7C116', 'dev-sl-ranger');
            fpPlayer.fellowshipArea = [frodo, ranger];
            const leader = clonePresetCard('10R48', 'dev-sl-leader');
            const southron = {
                ...clonePresetCard('4U249', 'dev-sl-southron'),
                minionSiteNumber: 4,
                attachments: [leader],
            };
            const condition = clonePresetCard('10U43', 'dev-sl-field');
            const shadowId = fpId === '0' ? '1' : '0';
            const shadow = G.players[shadowId];
            if (shadow) {
                shadow.discard = [condition];
            }
            G.battlefield = [southron];
            G.skirmishes = [
                {
                    id: 'dev-sl-sk',
                    companionId: 'dev-sl-ranger',
                    minionIds: ['dev-sl-southron'],
                },
            ];
            G.activeSkirmishId = 'dev-sl-sk';
            G.statusMessage =
                '[DEV] Meneur Chevronné · Escarmouche (onglet joueur 1) : bulle sur le Suderon (Meneur…) → −1 menace (2→1) → Champ des Vaincus en défausse (−1 crépuscule). Relancer le preset.';
            return { startPhase: 'skirmish' };
        }

        default:
            G.statusMessage = `[DEV] Aucun preset actif (« ${presetType} »).`;
            return { startPhase: 'startOfFellowship' };
    }
};
