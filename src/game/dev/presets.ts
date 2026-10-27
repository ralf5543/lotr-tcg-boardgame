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
 * Vague en cours : trous de mécanismes decks — jouer depuis la défausse
 * si initiative (7R61 / 7R63).
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
        case 'DECK_GAPS_HOBBITSES': {
            resetBoardForPreset(G);
            setupDevPath(G, 0, neutralPath);
            // Assez pour Gollum (2) + un Nazgûl (6) + les deux cartes (1 + 1).
            G.twilightPool = 14;
            fpPlayer.burdens = 2;
            fpPlayer.fellowshipArea = [
                {
                    ...clonePresetCard('2C102', 'dev-hobbitses-frodo'),
                    attachments: [
                        clonePresetCard('1R1', 'dev-hobbitses-ring'),
                    ],
                },
                clonePresetCard('1R89', 'dev-hobbitses-aragorn'),
            ];
            // Main des Peuples Libres vide (moins de 4 cartes) :
            // l’initiative est donc côté Ombre.
            fpPlayer.deck = [
                clonePresetCard('1C306', 'dev-hobbitses-draw-1'),
                clonePresetCard('1C306', 'dev-hobbitses-draw-2'),
            ];
            fpPlayer.sitesDeck = [clonePresetSite('11S250', fpId)];
            if (shadowPlayer) {
                shadowPlayer.hand = [
                    clonePresetCard('7R58', 'dev-hobbitses-gollum'),
                    clonePresetCard('7R210', 'dev-hobbitses-nazgul'),
                ];
                // Les deux cartes testées, déjà dans la défausse.
                shadowPlayer.discard = [
                    clonePresetCard('7R61', 'dev-hobbitses-event'),
                    clonePresetCard('7R63', 'dev-hobbitses-condition'),
                ];
                // Cartes neutres : après le jeu de 7R61, celui-ci doit
                // être la dernière carte (sous la pioche), pas en défausse.
                shadowPlayer.deck = [
                    clonePresetCard('1C266', 'dev-hobbitses-shadow-draw-1'),
                    clonePresetCard('1C266', 'dev-hobbitses-shadow-draw-2'),
                    clonePresetCard('1C266', 'dev-hobbitses-shadow-draw-3'),
                ];
                shadowPlayer.sitesDeck = [
                    clonePresetSite('11S263', shadowId),
                ];
            }
            G.statusMessage =
                '[DEV] Les Hobbits sont morts (7R61) + Qu’elle s’en occupe (7R63) · crépuscule 14 · La main des Peuples Libres a moins de 4 cartes : l’initiative est côté Ombre. Les deux cartes testées sont déjà dans la défausse de l’Ombre (cliquez sur « Défausse » en bas à droite). 1) Phase d’Ombre : jouez Gollum et le Nazgûl depuis la main, puis ouvrez votre défausse — « Qu’elle s’en occupe » est sélectionnable : jouez-la sur le Nazgûl (il gagne Dégâts +1). 2) Affectation puis escarmouche Nazgûl contre Aragorn : rouvrez la défausse — « Les Hobbits sont morts » est sélectionnable : repérez Gollum, puis désignez le Nazgûl (force +2 pendant cette escarmouche). Après résolution, l’événement n’est plus dans la défausse : il est sous la pioche de l’Ombre (dernière carte de la pioche). Sans initiative (main des Peuples Libres de 4 cartes ou plus), aucune des deux cartes n’est sélectionnable dans la défausse.';
            break;
        }
    }
};
