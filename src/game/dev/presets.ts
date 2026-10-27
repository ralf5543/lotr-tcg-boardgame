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
 * Parcours unique des 7 derniers sites du set 11 : on avance de site en
 * site et on teste tout dans la même partie.
 * 1 Pinnacle → 2 Trollshaw → 3 Chamber → 4 Westemnet →
 * 5 Guardroom → 6 Osgiliath → 7 Harrowdale (8–9 : bouche-trous).
 */
const journeyPath: readonly string[] = [
    '11S255', // 1 Pinnacle of Zirakzigil
    '11S260', // 2 Trollshaw Forest
    '11S233', // 3 Chamber of Mazarbul
    '11S264', // 4 Westemnet Village
    '11S247', // 5 Moria Guardroom
    '11S252', // 6 Osgiliath Reclaimed
    '11S243', // 7 Harrowdale
    '18U138', // 8 Sirannon Ruins
    '11S232', // 9 Cavern Entrance
] as const;

/**
 * Applique le preset DEV de playtest (zones vidées / chemin Standard).
 * Un seul preset pour la vague « derniers sites du set 11 ».
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
        case 'SITES_SET11_RESTANTS': {
            resetBoardForPreset(G);
            setupDevPath(G, 0, journeyPath);
            G.twilightPool = 6;
            // 3 fardeaux dès le départ : c’est la condition d’Osgiliath (site 6).
            fpPlayer.burdens = 3;
            fpPlayer.fellowshipArea = [
                {
                    ...clonePresetCard('2C102', 'dev-set11-frodo'),
                    attachments: [clonePresetCard('1R1', 'dev-set11-ring')],
                },
                {
                    // Épée sur Aragorn : à transférer gratuitement à Chamber (site 3).
                    ...clonePresetCard('1R89', 'dev-set11-aragorn'),
                    attachments: [
                        clonePresetCard('1U112', 'dev-set11-sword'),
                    ],
                },
                // Gimli = le Nain de Guardroom (site 5).
                clonePresetCard('1R13', 'dev-set11-gimli'),
                clonePresetCard('1C311', 'dev-set11-sam'),
                // Éowyn = la Rohan d’Harrowdale (site 7).
                clonePresetCard('11S146', 'dev-set11-eowyn'),
            ];
            // 2 alliés : Westemnet (site 4) blessera 2 compagnons à l’arrivée.
            fpPlayer.supportArea = [
                clonePresetCard('1C286', 'dev-set11-bounder'),
                clonePresetCard('1R40', 'dev-set11-elrond'),
            ];
            // Gandalf mort : Pinnacle (site 1) le rejoue en affaiblissant 3 compagnons.
            fpPlayer.deadPile = [
                clonePresetCard('1R72', 'dev-set11-gandalf'),
            ];
            // Glamdring pour Gandalf ressuscité (Trollshaw, site 2) ;
            // l’événement, lui, ne doit rien déclencher.
            fpPlayer.hand = [
                clonePresetCard('1R75', 'dev-set11-glamdring'),
                clonePresetCard('1R87', 'dev-set11-event'),
            ];
            fpPlayer.deck = [
                clonePresetCard('1C306', 'dev-set11-draw-1'),
                clonePresetCard('1C306', 'dev-set11-draw-2'),
                clonePresetCard('1C306', 'dev-set11-draw-3'),
            ];
            if (shadowPlayer) {
                // Pour Harrowdale (site 7) : l’Uruk est acharné.
                shadowPlayer.hand = [
                    clonePresetCard('4C187', 'dev-set11-uruk'),
                    clonePresetCard('1C266', 'dev-set11-orc'),
                ];
                shadowPlayer.deck = [
                    clonePresetCard('1C266', 'dev-set11-shadow-draw-1'),
                ];
            }
            G.statusMessage =
                '[DEV] Parcours set 11, sites 1→7 : 1 Pinnacle (toaster : affaiblir 3 compagnons → Gandalf depuis la pile de mort) ; 2 Trollshaw (Glamdring sur Gandalf → piocher ?) ; 3 Chamber (glisser l’épée d’Aragorn → 0 crépuscule) ; 4 Westemnet (arrivée : 2 blessures aux compagnons) ; 5 Guardroom (au départ : Gimli → piocher 2) ; 6 Osgiliath (au départ : −1 fardeau) ; 7 Harrowdale (Uruk acharné contre Éowyn : pas de 2e tour ; contre Aragorn : oui). Passez les phases Ombre sans jouer de séide avant le site 7.';
            break;
        }
    }
};
