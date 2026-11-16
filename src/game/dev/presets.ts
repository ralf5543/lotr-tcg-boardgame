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

const DEV_PATH = [
    '18U140',
    '11S249',
    '11S264',
    '12U194',
    '11S252',
    '17U147',
    '11S242',
    '11S261',
    '18U138',
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

    const shadowId = fpId === '0' ? '1' : '0';
    const shadowPlayer = G.players[shadowId];

    switch (presetType) {
        case 'FIX_FRODO_MUSTER': {
            // Frodon Protégé → affaiblir pour Muster, puis défausse/pioche.
            resetBoardForPreset(G);
            setupDevPath(G, 0, DEV_PATH);
            fpPlayer.burdens = 2;
            const frodo = {
                ...clonePresetCard('11S164', 'dev-fix-frodo'),
                attachments: [clonePresetCard('1C2', 'dev-fix-ring')],
            };
            const merry = clonePresetCard('11C168', 'dev-fix-merry');
            const pippin = clonePresetCard('11R170', 'dev-fix-pippin');
            fpPlayer.fellowshipArea = [frodo, merry, pippin];
            // Cartes en main pour tester le Muster (défausse → pioche).
            fpPlayer.hand = [
                clonePresetCard('11C162', 'dev-fix-hand-1'),
                clonePresetCard('11S174', 'dev-fix-hand-2'),
            ];
            fpPlayer.deck = [
                clonePresetCard('11S176', 'dev-fix-deck-1'),
                clonePresetCard('12S125', 'dev-fix-deck-2'),
                clonePresetCard('10C106', 'dev-fix-deck-3'),
            ];
            G.statusMessage =
                '[DEV] Frodon Muster · Début de ralliement : affaiblis Frodon → il gagne Rassembleur → défausse 1 / pioche 1. Fardeaux = 2 (check résist. Merry/Pippin sur le plateau). Relancer le preset.';
            return { startPhase: 'startOfRegroup' };
        }

        case 'FIX_WIZARD_STORM': {
            // Tempête déjà sur le site courant : avancer → tous les compagnons s’affaiblissent.
            // 2ᵉ scénario : Tempête en main Ombre (coût + site + Annuler).
            resetBoardForPreset(G);
            setupDevPath(G, 0, DEV_PATH);
            G.twilightPool = 4;
            fpPlayer.burdens = 2;
            const frodo = {
                ...clonePresetCard('11S164', 'dev-storm-frodo'),
                attachments: [clonePresetCard('1C2', 'dev-storm-ring')],
            };
            const merry = clonePresetCard('11C168', 'dev-storm-merry');
            const aragorn = clonePresetCard('4P364', 'dev-storm-aragorn');
            const stormOnSite = clonePresetCard('2U48', 'dev-storm-on-site');
            const site0 = G.path[0];
            if (site0) {
                site0.attachments = [stormOnSite];
            }
            fpPlayer.fellowshipArea = [frodo, merry, aragorn];
            if (shadowPlayer) {
                // Pour retester le jeu : Annuler pendant le ciblage site / coût.
                shadowPlayer.hand = [
                    clonePresetCard('2U48', 'dev-storm-hand'),
                ];
                G.battlefield = [
                    clonePresetCard('4C153', 'dev-storm-grima'),
                ];
            }
            G.movesThisTurn = 1;
            G.regroupStep = 'FP_DECISION';
            G.statusMessage =
                '[DEV] Tempête conjurée · Site 1 a déjà la Tempête : en FP_DECISION, avance → chaque compagnon s’affaiblit. Onglet Ombre : rejouer Tempête depuis la main (Annuler / Échap). Relancer le preset.';
            return { startPhase: 'regroup' };
        }

        case 'FIX_DESERTION': {
            // Désertion sur Aragorn (force 8−1) ; Gríma (4) plus faible → affectation forcée.
            resetBoardForPreset(G);
            setupDevPath(G, 0, DEV_PATH);
            G.twilightPool = 3;
            fpPlayer.burdens = 3;
            const frodo = {
                ...clonePresetCard('11S164', 'dev-des-frodo'),
                attachments: [clonePresetCard('1C2', 'dev-des-ring')],
            };
            const aragorn = {
                ...clonePresetCard('4P364', 'dev-des-aragorn'),
                attachments: [
                    clonePresetCard('6U61', 'dev-des-desertion'),
                ],
            };
            const merry = clonePresetCard('11C168', 'dev-des-merry');
            fpPlayer.fellowshipArea = [frodo, aragorn, merry];
            if (shadowPlayer) {
                G.battlefield = [
                    clonePresetCard('4C153', 'dev-des-grima'),
                    clonePresetCard('6C72', 'dev-des-traitor'),
                ];
            }
            G.statusMessage =
                '[DEV] Désertion · FP passe d’abord la fenêtre d’action, puis onglet Ombre : bulle sur Aragorn (Désertion) → Gríma (plus faible) → combat forcé + défausse. Fardeaux = 3. Relancer le preset.';
            return { startPhase: 'assignment' };
        }

        default:
            G.statusMessage = `[DEV] Aucun preset actif (« ${presetType} »).`;
            return { startPhase: 'startOfFellowship' };
    }
};
