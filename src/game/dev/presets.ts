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

/** Site issu du JSON, prêt pour `G.path` (même forme que le setup). */
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

    // Sortir du setup (encheres…) pour que le preset soit jouable tout de suite.
    if (G.setupState) {
        G.setupState.step = 'COMPLETE';
    }

    G.twilightPool = 0;
    fpPlayer.burdens = 2;
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
    G.pendingReveal = undefined;
    G.pendingPutsOnTheOneRing = false;
    G.wearingTheOneRing = undefined;
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
    '18U138', // 1
    '11S228', // 2
    '11S263', // 3
    '11S265', // 4
    '11S250', // 5
    '11S248', // 6
    '11S241', // 7
    '15U187', // 8
    '11S232', // 9
] as const;

/**
 * Applique le preset DEV de playtest (zones vidées / chemin Standard).
 * Vague Uruk Spy (réponse à l’enfilage de l’Anneau).
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
        case 'DECK_GAPS_URUK_SPY': {
            resetBoardForPreset(G);
            setupDevPath(G, 3, neutralPath);
            G.twilightPool = 0;
            fpPlayer.burdens = 1;
            // Anneau 4R1 : Combat — +1 fardeau pour porter l’Anneau.
            fpPlayer.fellowshipArea = [
                {
                    ...clonePresetCard('5U111', 'dev-spy-frodo'),
                    attachments: [clonePresetCard('4R1', 'dev-spy-ring')],
                    wounds: 0,
                },
            ];
            fpPlayer.hand = [];
            fpPlayer.deck = [];
            fpPlayer.sitesDeck = [];
            if (shadowPlayer) {
                // 2 séides Isengard → défausse 2 du dessus ; fardeaux = cartes Ombre.
                // 2 séides culture Isengard (Brawling Uruk = culture URUK-HAI ≠ Isengard).
                const spy = clonePresetCard('1R155', 'dev-uruk-spy');
                const warrior = clonePresetCard('1C156', 'dev-spy-warrior');
                G.battlefield = [spy, warrior];
                G.skirmishes = [
                    {
                        id: 'dev-spy-skirmish',
                        companionId: 'dev-spy-frodo',
                        minionIds: ['dev-uruk-spy'],
                    },
                ];
                G.activeSkirmishId = 'dev-spy-skirmish';
                shadowPlayer.hand = [];
                shadowPlayer.supportArea = [];
                shadowPlayer.discard = [];
                shadowPlayer.deck = [
                    clonePresetCard('1C133', 'dev-spy-deck-1'), // Ombre
                    clonePresetCard('1C84', 'dev-spy-deck-2'), // FP Sleep Caradhras
                    clonePresetCard('2R43', 'dev-spy-deck-3'), // Ombre
                ];
                shadowPlayer.sitesDeck = [];
            }
            G.statusMessage =
                '[DEV] Uruk Spy (1R155) · Combat : Frodon (+1 fardeau) porte l’Anneau → Response Espion : affaiblir → défausse 2 du dessus (2 Isengard) → +1 fardeau par carte Ombre défaussée.';
            break;
        }
    }
};
