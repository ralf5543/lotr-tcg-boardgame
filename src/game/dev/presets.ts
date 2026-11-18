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
    G.pendingYouPlayQueue = undefined;
    G.pendingSiteDepartureContinuation = undefined;
    G.sitePhaseAbilityOfferedThisPhase = false;
    G.hunterMinionPlayedThisShadowPhase = false;
    G.preventMoveAgain = false;
    G.musterState = undefined;
    G.startOfPhaseState = undefined;
    G.regroupStep = undefined;
    G.assignmentStep = undefined;
    G.movesThisTurn = 0;

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

/** Chemin du deck Rôdeurs divers / Mumaks. */
const RANGERS_PATH = [
    '15U187',
    '13U193',
    '15S189',
    '11S237',
    '18U135',
    '11S240',
    '12U194',
    '11S256',
    '13U187',
] as const;

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

    switch (presetType) {
        case 'RANGERS_ARMY_HARADRIM': {
            // Escarmouche : Armée −3 → Mûmak en défausse → choisir le Suderon porteur.
            resetBoardForPreset(G);
            setupDevPath(G, 3, RANGERS_PATH);
            // 3 (coût capacité) + 2 (Mûmak) = 5.
            G.twilightPool = 5;
            fpPlayer.burdens = 0;
            const frodo = {
                ...clonePresetCard('11S164', 'dev-ah-frodo'),
                attachments: [clonePresetCard('4R1', 'dev-ah-ring')],
            };
            const ranger = clonePresetCard('7C116', 'dev-ah-ranger');
            fpPlayer.fellowshipArea = [frodo, ranger];
            const army = {
                ...clonePresetCard('5R70', 'dev-ah-army'),
                minionSiteNumber: 4,
            };
            const commander = {
                ...clonePresetCard('4U249', 'dev-ah-commander'),
                minionSiteNumber: 4,
            };
            const mount = clonePresetCard('5C73', 'dev-ah-mumak');
            const shadowId = fpId === '0' ? '1' : '0';
            const shadow = G.players[shadowId];
            if (shadow) {
                shadow.discard = [mount];
            }
            G.battlefield = [army, commander];
            G.skirmishes = [
                {
                    id: 'dev-ah-sk',
                    companionId: 'dev-ah-ranger',
                    minionIds: ['dev-ah-army'],
                },
            ];
            G.activeSkirmishId = 'dev-ah-sk';
            G.statusMessage =
                '[DEV] Armée des Haradrim · Escarmouche : activer l’Armée (−3) → choisir le Mûmak en défausse (−2) → cliquer le Suderon porteur (Armée ou Commandant). Relancer le preset.';
            return { startPhase: 'skirmish' };
        }

        case 'HALO_UX': {
            // Pot-pourri UX : or / rouge / flèches / zoom (acteur seul).
            resetBoardForPreset(G);
            setupDevPath(G, 3, RANGERS_PATH);
            G.twilightPool = 10;
            fpPlayer.burdens = 1;

            const frodo = {
                ...clonePresetCard('11S164', 'dev-halo-frodo'),
                attachments: [clonePresetCard('4R1', 'dev-halo-ring')],
            };
            const gandalf = clonePresetCard('1R72', 'dev-halo-gandalf');
            const legolas = clonePresetCard('0P13', 'dev-halo-legolas');
            const gimli = {
                ...clonePresetCard('1R13', 'dev-halo-gimli'),
                wounds: 1,
            };
            const aragorn = clonePresetCard('1R89', 'dev-halo-aragorn');
            fpPlayer.fellowshipArea = [
                frodo,
                gandalf,
                legolas,
                gimli,
                aragorn,
            ];
            fpPlayer.supportArea = [
                clonePresetCard('17U21', 'dev-halo-pipe'),
            ];
            // Main FP : attache or, jouable or, spot KO rien.
            fpPlayer.hand = [
                clonePresetCard('0P44', 'dev-halo-glamdring'),
                clonePresetCard('1C9', 'dev-halo-axe'),
                clonePresetCard('0P122', 'dev-halo-haldir'),
                clonePresetCard('4R75', 'dev-halo-lembas'),
            ];

            const hunters = {
                ...clonePresetCard('1U267', 'dev-halo-hunters'),
                minionSiteNumber: 4,
            };
            const goblin = {
                ...clonePresetCard('1C174', 'dev-halo-goblin'),
                minionSiteNumber: 4,
            };
            G.battlefield = [hunters, goblin];

            const shadowId = fpId === '0' ? '1' : '0';
            const shadow = G.players[shadowId];
            if (shadow) {
                // Flèche rouge d’attaque (blessure) en escarmouche.
                shadow.hand = [
                    clonePresetCard('4C260', 'dev-halo-whirling'),
                ];
            }

            // Deux groupes → halo or de choix + zoom (pas d’escarmouche active).
            G.skirmishes = [
                {
                    id: 'dev-halo-sk-aragorn',
                    companionId: 'dev-halo-aragorn',
                    minionIds: ['dev-halo-hunters'],
                },
                {
                    id: 'dev-halo-sk-gimli',
                    companionId: 'dev-halo-gimli',
                    minionIds: ['dev-halo-goblin'],
                },
            ];
            G.activeSkirmishId = undefined;

            // Prêt pour DevPanel → phase Archerie (halo rouge acteur seul).
            G.archeryState = {
                step: 'FP_ASSIGN',
                fpTotal: 2,
                shadowTotal: 1,
                fpRemainingWounds: 2,
                shadowRemainingWounds: 1,
            };

            G.statusMessage =
                '[DEV] Halos UX · (1) Or + zoom sur les 2 groupes → choisir. (2) Chasseurs Orques : affaiblir → flèche rouge. (3) Ombre : Coup Tourbillonnant → flèche. (4) Main FP : Glamdring/Hache = or au drag ; Haldir = or si jouable ; Lembas = rien (spot KO). (5) DevPanel → phase Archerie puis +1/+1 archerie : rouge FP seul. Relancer le preset.';
            return { startPhase: 'skirmish' };
        }

        default:
            G.statusMessage = `[DEV] Aucun preset actif (« ${presetType} »).`;
            return { startPhase: 'startOfFellowship' };
    }
};
