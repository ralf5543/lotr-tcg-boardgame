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
        case 'HOBBITS_ISENGARD_W1': {
            // Vague 1 — passifs : Sam, Comfort, Maggot, Merry, Gríma Son, Rohirrim Traitor.
            resetBoardForPreset(G);
            setupDevPath(G, 0, [
                '18U140', // dwelling — Maggot +4
                '11S249',
                '11S264',
                '12U194',
                '11S252',
                '17U147',
                '11S242',
                '11S261',
                '18U138',
            ]);
            G.twilightPool = 5;
            fpPlayer.burdens = 0;
            const merry = {
                ...clonePresetCard('11C168', 'dev-hi-merry'),
                attachments: [
                    clonePresetCard('6U61', 'dev-hi-desertion'),
                ],
            };
            const maggot = clonePresetCard('0P93', 'dev-hi-maggot');
            const orc = clonePresetCard('1C174', 'dev-hi-orc');
            fpPlayer.fellowshipArea = [
                {
                    ...clonePresetCard('11S164', 'dev-hi-frodo'),
                    attachments: [
                        clonePresetCard('1C2', 'dev-hi-ring'),
                    ],
                },
                clonePresetCard('11U172', 'dev-hi-sam'),
                maggot,
                merry,
            ];
            fpPlayer.supportArea = [
                clonePresetCard('12S125', 'dev-hi-comfort'),
            ];
            // Maggot (unbound) assigné → Merry +2 (pas Frodon : ring-bound).
            G.skirmishes = [
                {
                    id: 'dev-hi-sk',
                    companionId: maggot.instanceId || maggot.id,
                    minionIds: [orc.instanceId || orc.id],
                },
            ];
            if (shadowPlayer) {
                shadowPlayer.supportArea = [];
                G.battlefield = [
                    orc,
                    clonePresetCard('4C153', 'dev-hi-grima'),
                    clonePresetCard('6C72', 'dev-hi-traitor'),
                ];
            }
            G.statusMessage =
                '[DEV] Hobbits/Isengard vague 1 · Sam +1 rés. ; Comfort +1 rés. unbound ; Maggot +4 dwelling ; Merry +2 (Maggot assigné) ; Desertion sur Merry → Gríma −1 / Traître +2. Relancer le preset.';
            break;
        }
        default:
            G.statusMessage = `[DEV] Aucun preset actif (« ${presetType} »).`;
            break;
    }
};
