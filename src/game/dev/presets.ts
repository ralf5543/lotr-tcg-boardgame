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

/** Porteur + quelques compagnons (6 = mode B de The Angle). */
const fellowshipOfSix = (prefix: string): CardState[] => [
    {
        ...clonePresetCard('2C102', `${prefix}-frodo`),
        attachments: [clonePresetCard('1R1', `${prefix}-ring`)],
    },
    clonePresetCard('1R72', `${prefix}-gandalf`),
    clonePresetCard('1R89', `${prefix}-aragorn`),
    clonePresetCard('1R13', `${prefix}-gimli`),
    clonePresetCard('1C311', `${prefix}-sam`),
    clonePresetCard('1C11', `${prefix}-farin`),
];

/** Chemin de base ; le site testé est toujours le site 5 (courant). */
const pathWithSite5 = (siteId: string): readonly string[] =>
    [
        '11S265', // 1 Window on the West
        '11S228', // 2 Anduin Confluence
        '11S263', // 3 West Gate of Moria
        '11S254', // 4 Pelennor Flat
        siteId, // 5 site testé
        '18U138', // 6 Sirannon Ruins
        '11S241', // 7 Fortress of Orthanc
        '11S250', // 8 North Undeep
        '11S232', // 9 Cavern Entrance
    ] as const;

/**
 * Applique un preset DEV de playtest (zones vidées / chemin Standard).
 * Famille « Shadow: play… » : après le chargement, aller en phase « shadow »
 * (via le panneau, saut de phase) pour voir le toaster du site.
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
        case 'SITES_ANGLE': {
            resetBoardForPreset(G);
            setupDevPath(G, 4, pathWithSite5('12U185'));
            G.twilightPool = 8;
            fpPlayer.burdens = 0;
            fpPlayer.fellowshipArea = fellowshipOfSix('dev-angle');
            fpPlayer.sitesDeck = [clonePresetSite('11S250', fpId)];

            if (shadowPlayer) {
                // Un Nazgûl (mode A), une carte neutre, une pioche fournie.
                shadowPlayer.hand = [
                    clonePresetCard('11S221', 'dev-angle-nazgul'),
                    clonePresetCard('1C266', 'dev-angle-orc'),
                ];
                shadowPlayer.deck = [
                    clonePresetCard('1C266', 'dev-angle-draw-1'),
                    clonePresetCard('1C268', 'dev-angle-draw-2'),
                    clonePresetCard('1C268', 'dev-angle-draw-3'),
                ];
                shadowPlayer.sitesDeck = [clonePresetSite('11S263', shadowId)];
            }

            G.statusMessage =
                '[DEV] The Angle (site 5, courant) · crépuscule 8, 6 compagnons : phase Shadow → toaster avec 2 modes (« jouer un Nazgûl » coûte 4, ou « désignez 6 compagnons + défaussez 2 » → piocher). Après une activation réussie, le toaster se ré-offre ; Passer le ferme.';
            break;
        }

        case 'SITES_BUCKLAND': {
            resetBoardForPreset(G);
            setupDevPath(G, 4, pathWithSite5('11S230'));
            G.twilightPool = 8;
            fpPlayer.burdens = 0;
            fpPlayer.fellowshipArea = fellowshipOfSix('dev-buckland');
            // Deux situations à désigner (n’importe quel camp).
            fpPlayer.supportArea = [
                clonePresetCard('4R52', 'dev-buckland-axe'),
                clonePresetCard('4R69', 'dev-buckland-final'),
            ];
            fpPlayer.sitesDeck = [clonePresetSite('11S250', fpId)];

            if (shadowPlayer) {
                shadowPlayer.hand = [
                    clonePresetCard('11S221', 'dev-buckland-nazgul'),
                    clonePresetCard('1C266', 'dev-buckland-orc'),
                ];
                shadowPlayer.supportArea = [
                    clonePresetCard('1C281', 'dev-buckland-shadow-cond'),
                ];
                shadowPlayer.sitesDeck = [clonePresetSite('11S263', shadowId)];
            }

            G.statusMessage =
                '[DEV] Buckland Homestead (site 5, courant) · phase Shadow → toaster : jouez le Nazgûl (coût 4), puis désignez une situation en jeu à défausser (halo sur toutes les situations).';
            break;
        }

        case 'SITES_MARSHLAND': {
            resetBoardForPreset(G);
            setupDevPath(G, 4, pathWithSite5('11S238'));
            // 0 séide en jeu + 3 crépuscule = total 3 (condition remplie à la limite).
            G.twilightPool = 3;
            fpPlayer.burdens = 0;
            fpPlayer.fellowshipArea = fellowshipOfSix('dev-marsh');
            fpPlayer.sitesDeck = [clonePresetSite('11S250', fpId)];

            if (shadowPlayer) {
                shadowPlayer.hand = [
                    clonePresetCard('7C194', 'dev-marsh-minion'), // coût 3 → 0
                    clonePresetCard('11S221', 'dev-marsh-nazgul'), // coût 4 → 1
                ];
                shadowPlayer.sitesDeck = [clonePresetSite('11S263', shadowId)];
            }

            G.statusMessage =
                '[DEV] Expanding Marshland (site 5, courant) · phase Shadow → toaster : jouez un séide à −3 (Morgul Mongrel à 0, Nazgûl à 1). Augmentez le crépuscule (+1 via le panneau) → l’offre doit disparaître (total > 3).';
            break;
        }

        case 'SITES_WOODY_END': {
            resetBoardForPreset(G);
            setupDevPath(G, 4, pathWithSite5('11S266'));
            G.twilightPool = 8;
            fpPlayer.burdens = 3;
            fpPlayer.fellowshipArea = fellowshipOfSix('dev-woody');
            fpPlayer.sitesDeck = [clonePresetSite('11S250', fpId)];

            if (shadowPlayer) {
                shadowPlayer.hand = [
                    clonePresetCard('1C266', 'dev-woody-orc-hand'),
                ];
                // Le Nazgûl est déjà dans la défausse.
                shadowPlayer.discard = [
                    clonePresetCard('11S221', 'dev-woody-nazgul'),
                    clonePresetCard('1C268', 'dev-woody-discard'),
                ];
                shadowPlayer.sitesDeck = [clonePresetSite('11S263', shadowId)];
            }

            G.statusMessage =
                '[DEV] Woody-End (site 5, courant) · 3 fardeaux · phase Shadow → toaster : retirez 1 fardeau (→ 2) et choisissez le Nazgûl dans votre défausse (grille) ; il entre en jeu pour 4.';
            break;
        }
    }
};
