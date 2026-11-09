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

const neutralPath: readonly string[] = [
    '18U138',
    '11S228',
    '11S263',
    '11S265',
    '11S250',
    '11S248',
    '11S241',
    '15U187',
    '11S232',
] as const;

/**
 * Preset DEV : empilement visuel de l’aire de soutien
 * (copies non uniques vides → ×N ; état stocké → carte seule).
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
        case 'SUPPORT_STACK': {
            resetBoardForPreset(G);
            setupDevPath(G, 0, neutralPath);
            G.twilightPool = 4;
            fpPlayer.burdens = 1;
            fpPlayer.fellowshipArea = [
                {
                    ...clonePresetCard('1R289', 'dev-stack-frodo'),
                    attachments: [
                        clonePresetCard('1R1', 'dev-stack-ring'),
                    ],
                },
                clonePresetCard('1R89', 'dev-stack-aragorn'),
            ];
            // Fan = copies vides. Dès qu’il y a jetons / cartes empilées → seule.
            fpPlayer.supportArea = [
                clonePresetCard('1C20', 'dev-ltc-1'),
                clonePresetCard('1C20', 'dev-ltc-2'),
                clonePresetCard('1C20', 'dev-ltc-3'),
                clonePresetCard('18U21', 'dev-ls-empty-1'),
                clonePresetCard('18U21', 'dev-ls-empty-2'),
                {
                    ...clonePresetCard('18U21', 'dev-ls-tokened'),
                    cultureTokens: { GANDALF: 2 },
                },
            ];
            if (shadowPlayer) {
                shadowPlayer.supportArea = [
                    clonePresetCard('8C30', 'dev-web-1'),
                    clonePresetCard('8C30', 'dev-web-2'),
                    {
                        ...clonePresetCard('8C30', 'dev-web-stacked'),
                        stacked: [
                            clonePresetCard('1C174', 'dev-web-orc'),
                        ],
                    },
                    clonePresetCard('1C133', 'dev-ambition-1'),
                    clonePresetCard('1C133', 'dev-ambition-2'),
                ];
            }
            G.statusMessage =
                '[DEV] Empilement soutien · copies vides = fan ; dès qu’il y a du stock = seule. FP : 3× Let Them Come! (fan), 2× Last Stand vides (fan) + 1 Last Stand avec 2 jetons (seule). Ombre : 2× Web vides (fan) + 1 Web avec orque empilé (seule), 2× Ambition (fan). Relancer le preset.';
            break;
        }
        default:
            G.statusMessage = `[DEV] Aucun preset actif (« ${presetType} »).`;
            break;
    }
};
