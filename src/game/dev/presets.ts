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
        case 'HOBBITS_ISENGARD_W5': {
            // Bilbo (début combat → événement Shire), Light (perdre initiative → fardeau).
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
            fpPlayer.burdens = 2;
            const frodo = {
                ...clonePresetCard('11S164', 'dev-hi5-frodo'),
                attachments: [clonePresetCard('1C2', 'dev-hi5-ring')],
            };
            const bilbo = clonePresetCard('12R119', 'dev-hi5-bilbo');
            const merry = clonePresetCard('11C168', 'dev-hi5-merry');
            const light = clonePresetCard('10U108', 'dev-hi5-light');
            const crouched = clonePresetCard('11C162', 'dev-hi5-crouched');
            const chance = clonePresetCard('10C106', 'dev-hi5-chance');
            const sworn = clonePresetCard('11S174', 'dev-hi5-sworn-disc');
            const uruk = clonePresetCard('4C187', 'dev-hi5-uruk');
            fpPlayer.fellowshipArea = [frodo, bilbo, merry];
            fpPlayer.supportArea = [light];
            // 3 en main : Bilbo reprend un événement → 4 (gagne init.) → jouer → 3 (perd) → Light.
            fpPlayer.hand = [
                clonePresetCard('11S174', 'dev-hi5-hand-a'),
                clonePresetCard('11S174', 'dev-hi5-hand-b'),
                clonePresetCard('10C106', 'dev-hi5-hand-c'),
            ];
            // Plusieurs événements Shire combat → choix visible dans la défausse.
            fpPlayer.discard = [crouched, chance, sworn];
            if (shadowPlayer) {
                G.battlefield = [uruk];
            }
            G.skirmishes = [
                {
                    id: 'dev-hi5-sk',
                    companionId: bilbo.instanceId || bilbo.id,
                    minionIds: [uruk.instanceId || uruk.id],
                },
            ];
            // Pas d’activeSkirmishId : cliquer le combat déclenche le toaster Bilbo.
            G.statusMessage =
                '[DEV] Hobbits/Isengard vague 5 · Cliquer Bilbo vs Uruk → toaster (affaiblir → choisir un événement Shire dans la défausse) ; puis jouer une carte → perte d’initiative → toaster Light (retirer un fardeau). Relancer le preset.';
            return { startPhase: 'skirmish' };
        }
        default:
            G.statusMessage = `[DEV] Aucun preset actif (« ${presetType} »).`;
            return { startPhase: 'startOfFellowship' };
    }
};
