import type {
    CardCulture,
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

/** Phase boardgame.io où atterrir après le load (défaut : Compagnie). */
export type DevPresetLoad = {
    startPhase: string;
};

const ARTIFACT_PREVIEW_PATH = [
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

/** Artefact factice pour cultures sans exemplaire dans les données (calque seul). */
function sampleArtifactOverlay(
    culture: CardCulture,
    kind: 'FREE_PEOPLE' | 'SHADOW',
    instanceId: string,
    title: string
): CardState {
    return {
        ...clonePresetCard('7R79', instanceId),
        id: `dev-art-${culture}-${kind}`,
        culture,
        kind,
        type: 'ARTIFACT',
        subtype: 'SUPPORT-AREA',
        title,
        twilightCost: 1,
        strength: undefined,
        vitality: undefined,
        abilities: undefined,
        attachments: undefined,
        i18n: {
            en: {
                title,
                gameText: `[DEV] ${culture} artifact overlay sample.`,
            },
            fr: {
                title,
                gameText: `[DEV] Échantillon calque artefact ${culture}.`,
            },
        },
    };
}

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
        case 'ARTIFACT_OVERLAYS': {
            // Calques artefact md (main) + survol lg ; plateau = sm (sans calque).
            resetBoardForPreset(G);
            setupDevPath(G, 2, ARTIFACT_PREVIEW_PATH);
            G.twilightPool = 8;

            const frodo = {
                ...clonePresetCard('11S164', 'dev-art-frodo'),
                keywords: [
                    ...(getCardById('11S164')?.keywords || []),
                    'RING-BEARER',
                    'RING-BOUND',
                ],
                attachments: [
                    clonePresetCard('4R1', 'dev-art-ring'),
                    clonePresetCard('0P94', 'dev-art-mithril'),
                    clonePresetCard('0P9', 'dev-art-phial'),
                ],
            };
            const aragorn = {
                ...clonePresetCard('10R25', 'dev-art-aragorn'),
                attachments: [clonePresetCard('7R79', 'dev-art-anduril')],
            };

            fpPlayer.fellowshipArea = [frodo, aragorn];
            fpPlayer.supportArea = [
                clonePresetCard('9R46', 'dev-art-red-arrow'),
                clonePresetCard('9R6', 'dev-art-accretion'),
                sampleArtifactOverlay(
                    'DUNLAND',
                    'FREE_PEOPLE',
                    'dev-art-dunland',
                    'Calque Dunland'
                ),
                sampleArtifactOverlay(
                    'GOLLUM',
                    'FREE_PEOPLE',
                    'dev-art-gollum-fp',
                    'Calque Gollum PL'
                ),
            ];
            fpPlayer.hand = [
                clonePresetCard('0P38', 'dev-art-staff'),
                sampleArtifactOverlay(
                    'MEN',
                    'FREE_PEOPLE',
                    'dev-art-men-hand',
                    'Calque Hommes'
                ),
                sampleArtifactOverlay(
                    'ROHAN',
                    'FREE_PEOPLE',
                    'dev-art-rohan-hand',
                    'Calque Rohan (main)'
                ),
            ];

            const desert = {
                ...clonePresetCard('4C222', 'dev-art-desert'),
                attachments: [
                    clonePresetCard('0P36', 'dev-art-whip'),
                    clonePresetCard('9R42', 'dev-art-asperity'),
                ],
            };
            const balrogSwordBearer = {
                ...clonePresetCard('4C222', 'dev-art-balrog-host'),
                title: 'Porteur épée Balrog',
                attachments: [clonePresetCard('0P42', 'dev-art-balrog-sword')],
            };
            G.battlefield = [desert, balrogSwordBearer];
            shadowPlayer.supportArea = [
                clonePresetCard('3R67', 'dev-art-palantir'),
                clonePresetCard('9R+47', 'dev-art-ithil'),
                sampleArtifactOverlay(
                    'GOLLUM',
                    'SHADOW',
                    'dev-art-gollum-sh',
                    'Calque Gollum Ombre'
                ),
                sampleArtifactOverlay(
                    'ORC',
                    'SHADOW',
                    'dev-art-orc',
                    'Calque Orque'
                ),
            ];
            shadowPlayer.hand = [
                sampleArtifactOverlay(
                    'RAIDER',
                    'SHADOW',
                    'dev-art-raider',
                    'Calque Pillard'
                ),
                sampleArtifactOverlay(
                    'URUK-HAI',
                    'SHADOW',
                    'dev-art-uruk',
                    'Calque Uruk'
                ),
                sampleArtifactOverlay(
                    'SAURON',
                    'SHADOW',
                    'dev-art-sauron-hand',
                    'Calque Sauron (main)'
                ),
                sampleArtifactOverlay(
                    'ISENGARD',
                    'SHADOW',
                    'dev-art-isen-hand',
                    'Calque Isengard (main)'
                ),
            ];

            G.statusMessage =
                '[DEV] Calques artefact · Main = md (calque visible). Plateau / soutien = sm (survol → lg pour voir le calque). Cultures réelles + échantillons.';
            return { startPhase: 'fellowship' };
        }

        default:
            G.statusMessage = `[DEV] Aucun preset actif (« ${presetType} »).`;
            return { startPhase: 'startOfFellowship' };
    }
};
