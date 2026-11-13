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

/**
 * Presets DEV playtest (deck Hobbits / Isengard, etc.).
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
        case 'HOBBITS_ISENGARD_W3': {
            // Vague 3 — Phial, Task Now, Filibert, Simple Living.
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
            G.twilightPool = 4;
            fpPlayer.burdens = 0;
            const merry = clonePresetCard('11C168', 'dev-hi3-merry');
            const phial = clonePresetCard('13R155', 'dev-hi3-phial');
            const frodo = {
                ...clonePresetCard('11S164', 'dev-hi3-frodo'),
                attachments: [
                    clonePresetCard('1C2', 'dev-hi3-ring'),
                    phial,
                ],
            };
            const fierceOrc = {
                ...clonePresetCard('1C174', 'dev-hi3-orc'),
                keywords: [
                    ...((clonePresetCard('1C174').keywords as string[]) || []),
                    'FIERCE',
                ],
            };
            fpPlayer.fellowshipArea = [
                frodo,
                clonePresetCard('11U172', 'dev-hi3-sam'),
                merry,
                clonePresetCard('2C101', 'dev-hi3-filibert'),
            ];
            fpPlayer.supportArea = [
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
                    minionIds: [fierceOrc.instanceId || fierceOrc.id],
                },
            ];
            G.activeSkirmishId = 'dev-hi3-sk';
            if (shadowPlayer) {
                G.battlefield = [fierceOrc];
            }
            G.statusMessage =
                '[DEV] Hobbits/Isengard vague 3 · Phial (région 1 → Muster Frodon) ; Task Now / Sworn en main ; Filibert vs Orque Féroce sur Merry ; Simple Living en soutien (jouer Sworn → soigner). Relancer le preset.';
            break;
        }
        default:
            G.statusMessage = `[DEV] Aucun preset actif (« ${presetType} »).`;
            break;
    }
};
