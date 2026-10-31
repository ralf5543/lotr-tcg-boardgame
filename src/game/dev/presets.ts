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
 * Vague Roll of Thunder (Spot Gandalf → défausser possession/artefact Ombre).
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
        case 'DECK_GAPS_ROLL_OF_THUNDER': {
            resetBoardForPreset(G);
            setupDevPath(G, 0, neutralPath);
            G.twilightPool = 4;
            fpPlayer.burdens = 0;
            fpPlayer.fellowshipArea = [
                {
                    ...clonePresetCard('5U111', 'dev-rot-frodo'),
                    attachments: [clonePresetCard('4R1', 'dev-rot-ring')],
                },
                clonePresetCard('8R15', 'dev-rot-gandalf'),
            ];
            fpPlayer.hand = [clonePresetCard('4U99', 'dev-rot-event')];
            fpPlayer.supportArea = [
                // Possession FP (ne doit PAS être ciblable).
                clonePresetCard('1U91', 'dev-rot-fp-pipe'),
            ];
            fpPlayer.deck = [];
            fpPlayer.sitesDeck = [clonePresetSite('11S250', fpId)];
            if (shadowPlayer) {
                shadowPlayer.supportArea = [
                    clonePresetCard('10C24', 'dev-rot-sh-cond'),
                ];
                // Possession Ombre attachée à un séide.
                const lurtz = clonePresetCard('11R194', 'dev-rot-lurtz');
                lurtz.attachments = [
                    clonePresetCard('2R43', 'dev-rot-lurtz-sword'),
                ];
                shadowPlayer.fellowshipArea = [];
                // Les séides vont sur le champ / support selon le type — minion en jeu via battlefield.
                G.battlefield = [lurtz];
                shadowPlayer.hand = [];
                shadowPlayer.deck = [];
                shadowPlayer.sitesDeck = [
                    clonePresetSite('11S263', shadowId),
                ];
            }
            G.statusMessage =
                '[DEV] Roll of Thunder (4U99) · Communauté ou Manœuvre : Spot Gandalf (condition) → flèche vers une possession ou un artefact de l’Ombre (pas une situation, pas une possession FP).';
            break;
        }
    }
};
