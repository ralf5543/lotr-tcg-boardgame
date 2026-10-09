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

/** Neuf sites Standard — terrains variés (sanctuaire = emplacements 3 & 6). */
const DEV_PATH_IDS = [
    '11S263', // 1 West Gate — UNDERGROUND
    '11S247', // 2 Moria Guardroom — UNDERGROUND
    '11S237', // 3 Ettenmoors — PLAINS (+ sanctuaire)
    '11S233', // 4 Chamber of Mazarbul — UNDERGROUND
    '11S231', // 5 Caras Galadhon — FOREST
    '11U227', // 6 Anduin Banks — RIVER (+ sanctuaire)
    '11S241', // 7 Fortress of Orthanc — BATTLEGROUND
    '11S229', // 8 Barazinbar — MOUNTAIN
    '11S240', // 9 Flats of Rohan — PLAINS
] as const;

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

    Object.keys(G.players).forEach((pId) => {
        const player = G.players[pId];
        if (player) {
            player.hand = [];
            player.supportArea = [];
            player.discard = [];
            player.fellowshipArea = [];
            player.sitesDeck = [];
        }
    });
};

const setupDevPath = (G: GameState, startIndex = 3): void => {
    const fpId = G.fpPlayerId || '0';
    const shadowId = fpId === '0' ? '1' : '0';

    G.path = DEV_PATH_IDS.map((siteId, index) =>
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
        case 'STAT_PULSE_TEST': {
            resetBoardForPreset(G);
            setupDevPath(G, 3);
            G.twilightPool = 2;

            // Frodo : résistance + fardeaux ; Gimli : Damage ; Aragorn : Defender +1 (manœuvre) + blessures.
            fpPlayer.fellowshipArea = [
                {
                    ...clonePresetCard('2C102', 'dev-frodo-pulse'),
                    attachments: [clonePresetCard('1R1', 'dev-ring-pulse')],
                    wounds: 0,
                },
                {
                    ...clonePresetCard('1R89', 'dev-aragorn-pulse'),
                    wounds: 0,
                },
                {
                    ...clonePresetCard('7C6', 'dev-gimli-pulse'),
                    wounds: 0,
                },
            ];
            fpPlayer.burdens = 1;
            // Condition soutien : jetons culture via DEV ±
            fpPlayer.supportArea = [
                {
                    ...clonePresetCard('4R52', 'dev-axe-notched'),
                    cultureTokens: { DWARVEN: 1 },
                },
            ];
            fpPlayer.hand = [
                clonePresetCard('7C154', 'dev-new-strength-pulse'),
                clonePresetCard('1C3', 'dev-axe-strike-pulse'),
                clonePresetCard('1C9', 'dev-dwarven-axe-pulse'),
            ];

            if (shadowPlayer) {
                // Man of Bree : force scale main FP ; séide Damage pour keyword.
                G.battlefield = [
                    clonePresetCard('11S90', 'dev-man-of-bree-pulse'),
                    {
                        ...clonePresetCard('13U165', 'dev-infiltrator-pulse'),
                        minionSiteNumber: 2,
                    },
                ];
                shadowPlayer.hand = [
                    clonePresetCard('7C154', 'dev-new-strength-sh-pulse'),
                ];
            }

            G.statusMessage =
                '[DEV] Pulse · Aragorn (manœuvre → Defender +1) ; blessures DEV ; burdens / jetons / crépuscule ; New Strength en main.';
            break;
        }

        case 'WEB_STACK_TEST': {
            resetBoardForPreset(G);
            setupDevPath(G, 4);
            G.twilightPool = 12;

            fpPlayer.fellowshipArea = [
                {
                    ...clonePresetCard('2C102', 'dev-web-frodo'),
                    attachments: [clonePresetCard('1R1', 'dev-web-ring')],
                },
                clonePresetCard('1R89', 'dev-web-aragorn'),
            ];

            // Empilés « propres » (comme après stackCardOnHost : plus d’attache / jetons).
            const gollum = clonePresetCard('7C59', 'dev-web-gollum');
            const orc = clonePresetCard('7U190', 'dev-web-orc');
            const shelob = clonePresetCard('8R25', 'dev-web-shelob');

            // Fragments de Narsil : quelques cartes Gondor empilées.
            const narsilStack = [
                clonePresetCard('4U132', 'dev-narsil-blade'),
                clonePresetCard('1U91', 'dev-narsil-pipe'),
                clonePresetCard('0P5', 'dev-narsil-horn'),
                clonePresetCard('1R114', 'dev-narsil-saga'),
            ];

            // Goblin Swarms : pile longue (~10 orcs Moria) pour tester le dense stack.
            const swarmOrcs = [
                '1U178',
                '1U178',
                '1C185',
                '1C174',
                '1C176',
                '1C177',
                '1U181',
                '1C184',
                '1C179',
                '1R172',
            ].map((id, i) =>
                clonePresetCard(id, `dev-swarm-orc-${i}`)
            );

            fpPlayer.supportArea = [
                {
                    ...clonePresetCard('3R44', 'dev-narsil'),
                    stacked: narsilStack,
                },
            ];
            // Gondor en main pour tester « empiler ici » (Fragments de Narsil).
            fpPlayer.hand = [
                clonePresetCard('4U132', 'dev-hand-blade'),
                clonePresetCard('1U91', 'dev-hand-pipe'),
                clonePresetCard('3U46', 'dev-hand-still-sharp'),
                clonePresetCard('0P5', 'dev-hand-horn'),
            ];

            if (shadowPlayer) {
                shadowPlayer.supportArea = [
                    {
                        ...clonePresetCard('8C30', 'dev-web'),
                        stacked: [gollum, orc, shelob],
                    },
                    {
                        ...clonePresetCard('1R183', 'dev-goblin-swarms'),
                        stacked: swarmOrcs,
                    },
                ];
                // Doublons pour tester le regroupement ×N en défausse / pioche.
                shadowPlayer.discard = [
                    clonePresetCard('8C30', 'dev-disc-web-1'),
                    clonePresetCard('8C30', 'dev-disc-web-2'),
                    clonePresetCard('8C30', 'dev-disc-web-3'),
                    clonePresetCard('6R46', 'dev-disc-stole-1'),
                    clonePresetCard('6R46', 'dev-disc-stole-2'),
                    clonePresetCard('7R61', 'dev-disc-hobbitses'),
                    clonePresetCard('7C59', 'dev-disc-gollum-1'),
                    clonePresetCard('7C59', 'dev-disc-gollum-2'),
                    clonePresetCard('7C59', 'dev-disc-gollum-3'),
                    clonePresetCard('7C59', 'dev-disc-gollum-4'),
                ];
                shadowPlayer.deck = [
                    clonePresetCard('7U190', 'dev-deck-orc-1'),
                    clonePresetCard('7U190', 'dev-deck-orc-2'),
                    clonePresetCard('7U190', 'dev-deck-orc-3'),
                    clonePresetCard('8R25', 'dev-deck-shelob-1'),
                    clonePresetCard('8R25', 'dev-deck-shelob-2'),
                    clonePresetCard('10R23', 'dev-deck-shelob-lady'),
                    clonePresetCard('7C53', 'dev-deck-captured-1'),
                    clonePresetCard('7C53', 'dev-deck-captured-2'),
                    clonePresetCard('7C53', 'dev-deck-captured-3'),
                    clonePresetCard('7C53', 'dev-deck-captured-4'),
                    clonePresetCard('19P10', 'dev-deck-gollum-guide'),
                ];
                shadowPlayer.hand = [
                    clonePresetCard('1U162', 'dev-web-worry'),
                ];
            }

            fpPlayer.discard = [
                clonePresetCard('17U21', 'dev-fp-pipe-1'),
                clonePresetCard('17U21', 'dev-fp-pipe-2'),
                clonePresetCard('1U74', 'dev-fp-gandalf-pipe'),
                clonePresetCard('1C305', 'dev-fp-leaf-1'),
                clonePresetCard('1C305', 'dev-fp-leaf-2'),
                clonePresetCard('1C305', 'dev-fp-leaf-3'),
            ];
            fpPlayer.deck = [
                clonePresetCard('1C84', 'dev-fp-caradhras-1'),
                clonePresetCard('1C84', 'dev-fp-caradhras-2'),
                clonePresetCard('11S176', 'dev-fp-unharmed'),
                clonePresetCard('4U132', 'dev-fp-ranger-sword'),
                clonePresetCard('1U91', 'dev-fp-aragorn-pipe-1'),
                clonePresetCard('1U91', 'dev-fp-aragorn-pipe-2'),
                clonePresetCard('1U91', 'dev-fp-aragorn-pipe-3'),
                clonePresetCard('1U91', 'dev-fp-aragorn-pipe-4'),
            ];

            G.statusMessage =
                '[DEV] Web (3) · Goblin Swarms (×10) · Narsil (4) · stacks 90° à droite · défausse/pioche ×N.';
            break;
        }
    }
};
