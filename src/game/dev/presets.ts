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
 * Chemin neutre : effets sans rapport avec le test (aucun allié,
 * aucune arme à main, 4 compagnons seulement).
 */
const neutralPath: readonly string[] = [
    '18U138', // 1 Sirannon Ruins (inerte)
    '11S228', // 2 Anduin Confluence (défenseur alliés : aucun)
    '11S263', // 3 West Gate of Moria (retire du crépuscule)
    '11S265', // 4 Window on the West (Defender +1)
    '11S250', // 5 North Undeep (archerie)
    '11S248', // 6 Moria Stairway (Damage si arme à main : aucune)
    '11S241', // 7 Fortress of Orthanc (+crépuscule si > 5 compagnons : non)
    '15U187', // 8 Anduin River (archerie)
    '11S232', // 9 Cavern Entrance
] as const;

/**
 * Applique le preset DEV de playtest (zones vidées / chemin Standard).
 * Vague en cours : trous de mécanismes decks — Isildur Porteur.
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
        case 'DECK_GAPS_ISILDUR': {
            resetBoardForPreset(G);
            setupDevPath(G, 0, neutralPath);
            G.twilightPool = 6;
            // 4 fardeaux : l’option fardeaux doit se voir (4 → 6).
            fpPlayer.burdens = 4;
            fpPlayer.fellowshipArea = [
                {
                    // Isildur Porteur de l’Anneau (9R+33, la carte testée).
                    ...clonePresetCard('9R+33', 'dev-isildur'),
                    attachments: [clonePresetCard('1R1', 'dev-isildur-ring')],
                },
                clonePresetCard('1R89', 'dev-isildur-aragorn'),
                clonePresetCard('1R13', 'dev-isildur-gimli'),
                clonePresetCard('1C311', 'dev-isildur-sam'),
                // Boromir, chevalier du Gondor : force 7 → 8 tant
                // qu’Isildur porte l’Anneau Unique (2ᵉ clause).
                clonePresetCard('11R57', 'dev-isildur-boromir'),
            ];
            fpPlayer.deck = [
                clonePresetCard('1C306', 'dev-isildur-draw-1'),
                clonePresetCard('1C306', 'dev-isildur-draw-2'),
                clonePresetCard('1C306', 'dev-isildur-draw-3'),
            ];
            fpPlayer.sitesDeck = [clonePresetSite('11S250', fpId)];
            if (shadowPlayer) {
                // Deux séides : de quoi refaire un 2ᵉ combat contre Isildur
                // pour tester l’autre option.
                shadowPlayer.hand = [
                    clonePresetCard('1C266', 'dev-isildur-orc-1'),
                    clonePresetCard('1C268', 'dev-isildur-orc-2'),
                ];
                shadowPlayer.deck = [
                    clonePresetCard('1C266', 'dev-isildur-shadow-draw-1'),
                ];
                shadowPlayer.sitesDeck = [
                    clonePresetSite('11S263', shadowId),
                ];
            }
            G.statusMessage =
                '[DEV] Isildur Porteur (9R+33) · 4 fardeaux, crépuscule 6 · D’abord, la 2ᵉ clause : Boromir (chevalier du Gondor) doit être à force 8 (7 + 1) tant qu’Isildur porte l’Anneau Unique ; les autres compagnons ne changent pas. Ensuite, avancez jusqu’à l’Ombre, jouez un séide et assignez-le à Isildur : au début de son escarmouche, choix forcé — « Ajouter 2 fardeaux » (4 → 6) ou « Affaiblir 3 compagnons » (désignez 3 compagnons distincts, Isildur compris si vous voulez). Refaites un combat avec le 2ᵉ séide pour l’autre option. Cas limite (moins de 3 compagnons affaiblissables → option « Affaiblir » refusée) couvert par les tests automatiques.';
            break;
        }
    }
};
