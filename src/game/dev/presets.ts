import type { CardState, DevPresetType, GameState, SiteCardState } from '../types';
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

/**
 * Vague Doorway / Crossroads / Morannon.
 * 1 filler → 2 Doorway (blessures) → 3 Crossroads (regroup heal) → 4 Morannon (reinforce) → …
 */
const SITES_DOORWAY_CROSSROADS_PATH = [
    '11S265', // 1 Window (départ)
    '18U134', // 2 Doorway to Doom
    '13S189', // 3 Crossroads of the Fallen Kings
    '18U137', // 4 Morannon Plains
    '11S263', // 5 West Gate
    '11S228', // 6 Anduin Confluence (sanctuaire)
    '11S241', // 7 Orthanc
    '18U138', // 8 Sirannon
    '11S254', // 9 Pelennor Flat
] as const;

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
 * Applique un preset DEV sur l’état courant (zones vidées / chemin Standard).
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
        case 'SITES_DOORWAY_CROSSROADS': {
            resetBoardForPreset(G);
            setupDevPath(G, 0, SITES_DOORWAY_CROSSROADS_PATH);
            G.twilightPool = 4;
            fpPlayer.burdens = 0;

            // 2 cultures blessées (Crossroads) + assez de persos (Doorway ×2).
            // Morannon : 1 situation FP + 1 Ombre avec jetons (restent après le tour).
            fpPlayer.fellowshipArea = [
                {
                    ...clonePresetCard('2C102', 'dev-dc-frodo'),
                    attachments: [clonePresetCard('1R1', 'dev-dc-ring')],
                    wounds: 1,
                },
                {
                    ...clonePresetCard('1C306', 'dev-dc-pippin'),
                    wounds: 1,
                },
                {
                    ...clonePresetCard('1R13', 'dev-dc-gimli'),
                    wounds: 1,
                },
                {
                    ...clonePresetCard('1R72', 'dev-dc-aragorn'),
                    wounds: 1,
                },
            ];
            // 2 situations à jetons → choix de reinforce Morannon.
            fpPlayer.supportArea = [
                {
                    ...clonePresetCard('4R52', 'dev-dc-axe'),
                    cultureTokens: { DWARVEN: 1 },
                },
                {
                    ...clonePresetCard('4R69', 'dev-dc-final'),
                    cultureTokens: { ELVEN: 1 },
                },
            ];
            fpPlayer.hand = [];
            fpPlayer.deck = [clonePresetCard('1C11', 'dev-dc-draw')];
            fpPlayer.sitesDeck = [clonePresetSite('11S250', fpId)];

            if (shadowPlayer) {
                shadowPlayer.hand = [];
                shadowPlayer.sitesDeck = [clonePresetSite('11S263', shadowId)];
                // 2 situations Ombre → même choix de reinforce que le FP.
                shadowPlayer.supportArea = [
                    {
                        ...clonePresetCard('11R123', 'dev-dc-hordes'),
                        cultureTokens: { ORC: 1 },
                    },
                    {
                        ...clonePresetCard('1C133', 'dev-dc-ambition'),
                        cultureTokens: { ISENGARD: 1 },
                    },
                ];
                // ≥2 séides (Doorway) — pas de jetons ici (partent en fin de tour).
                G.battlefield = [
                    clonePresetCard('1C266', 'dev-dc-orc-a'),
                    clonePresetCard('1C268', 'dev-dc-orc-b'),
                    clonePresetCard('1C271', 'dev-dc-orc-c'),
                ];
            }

            G.statusMessage =
                '[DEV] Doorway / Crossroads / Morannon · site 2 Doorway (blessures) ; regroup site 3 Crossroads (heal / culture) ; site 4 Morannon (reinforce : choisir My Axe / Final Count, puis Goblin Hordes).';
            break;
        }
    }
};
