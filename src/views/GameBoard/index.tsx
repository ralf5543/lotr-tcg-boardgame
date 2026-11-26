import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { BoardProps } from 'boardgame.io/react';
import type { CardState, SiteCardState, GameState } from '../../game/types';
import { Battlefield } from './components/Battlefield';
import { SitePath } from './components/SitePath';
import { PlayerArea } from './components/PlayerArea';
import { Hand } from './components/Hand';
import { OpponentHand } from './components/Hand/OpponentHand';
import * as S from './styles';
import { useHoverCard } from '../../contexts/HoverCardContext';
import { Card } from './components/Card';
import { SiteCard } from './components/SiteCard';
import { DragProvider } from '../../contexts/DragProvider';
import { useDrag } from '../../contexts/DragContext';
import {
    OutOfPlayRail,
    type OutOfPlayZoneKey,
} from './components/OutOfPlayRail';
import { CardZoneOverlay } from './components/CardZoneOverlay';
import { Dock } from './components/Dock';
import { OptionsModal } from './components/OptionsModal';
import { SitesPicker } from './components/SitePicker';
import { GameControls } from './components/GameControls';
import { useUiMessages } from '../../i18n/ui/useUiMessages';
import { usePreferencesOptional } from '../../contexts/PreferencesContext';
import {
    canAttachToCharacter,
    attachesToSite,
    requiresAttachmentTarget,
} from '../../game/engine/canPlayCard';
import { PhaseBanner } from './components/PhaseBanner';
import { canonicalPhaseName } from './canonicalPhaseName';
import { GameEndOverlay } from './components/GameEndOverlay';
import { DevPanel, type DevMoves } from '../../utils/DevPanel';
import { useFaction } from '../../contexts/FactionContext';
import { FactionProvider } from '../../contexts/FactionProvider';
import { useTargeting } from '../../contexts/TargetingContext';
import { audioService } from '../../services/audioService';
import {
    findTargetCard,
    isCardInSupportArea,
} from '../../utils/cardUtils';
import { getSanctuaryHealCandidates, SANCTUARY_HEAL_LIMIT } from '../../game/logic/sanctuary';
import { canPlayCard } from '../../game/engine/canPlayCard';
import {
    abilityNeedsCostDesignation,
    abilityNeedsEffectDesignation,
    abilityEffectWantsTargetingArrow,
    costAndEffectShareHandDesignation,
    cardTargetIds,
    formatDesignationPrompt,
    abilityHasLegalEffectTarget,
    getCostDesignationCandidates,
    getCostDesignationCount,
    getDesignationCandidates,
    getEffectDesignationCandidates,
    getEffectDesignationCount,
    getFpDiscardCandidates,
    getPathThenDeckSiteTargetIds,
    getSiteAttachmentHostIds,
    getToPlayExertTargetIds,
    isDesignationTargetId,
} from '../../game/engine/abilities/designation';
import {
    abilityDiscardFromHandCount,
    abilityDiscardFromHandEffect,
    abilityDiscardFromHandFilters,
    abilityDiscardFromHandKind,
    abilityHandDiscardDependsOnEffect,
    abilityNeedsHandDiscard,
    abilityOwnerPlayerId,
} from '../../game/engine/abilities/payAbilityCost';
import {
    abilityNeedsSiteReplace,
    abilityNeedsSiteExchange,
    abilityNeedsPathThenDeckSite,
    abilityNeedsStackSiteChoice,
    abilityNeedsDeckOrDiscardPick,
    abilityPlayFromDeckOrDiscardEffect,
    abilitySearchDeckToDiscardEffect,
    abilityTakeFromDiscardEffect,
    abilityPlaceFromDiscardOnDeckEffect,
    abilityStacksOtherMinion,
    abilityPlaysOtherFromStack,
    isCostlessPlayFromCardStack,
    abilityPlayFromCardStackEffect,
    abilityReplaceSiteEffect,
    getStackSiteCandidates,
} from '../../game/engine/abilities/applyAbilityEffect';
import { getCardsStackedOnHost } from '../../game/logic/cardStack';
import {
    findLegalAttachmentHosts,
    getDeckOrDiscardBrowsePool,
    getDeckOrDiscardPlayCandidates,
    getDeckSearchToDiscardCandidates,
    getHandPlayCandidates,
    getPlayableFromDiscardCards,
} from '../../game/logic/playFromOutOfPlay';
import { getSitePhaseDesignationCandidates } from '../../game/logic/sitePhaseAbility';
import {
    getReplaceSiteCandidates,
    getReplaceablePathSitesInCurrentRegion,
    getOwnedPathSites,
    getNextSitePathIndex,
    canCardTakeWound,
} from '../../game/logic/sites';
import { isSiteReplaceForbidden } from '../../game/logic/siteReplaceRestrictions';
import { findEventAbilityForPhase } from '../../game/engine/abilities/playEventAbility';
import { abilityMatchesPhase } from '../../game/engine/abilities/collectAbilities';
import {
    findOptionalToasterResponseAbility,
    getForceAssignPreventDiscardCandidates,
} from '../../game/engine/responseWindow';
import { cardMatchesTarget } from '../../game/engine/validations/matchers';
import {
    getToilAmount,
    getToilCandidates,
    getTwilightCostWithToil,
} from '../../game/logic/toil';
import { useCardPlayAudio } from '../../hooks/audio/useCardPlayAudio';
import { useDiscardAudio } from '../../hooks/audio/useDiscardAudio';
import { useBoardDiscardGhosts } from './hooks/useBoardDiscardGhosts';
import { BoardDiscardGhostLayer } from './components/BoardDiscardGhostLayer';
import { useStackAudio } from '../../hooks/audio/useStackAudio';
import { useArcheryAudio } from '../../hooks/audio/useArcheryAudio';
import { useWoundAudio } from '../../hooks/audio/useWoundAudio';
import { useExertAudio } from '../../hooks/audio/useExertAudio';
import { useHealAudio } from '../../hooks/audio/useHealAudio';
import { useAssignmentAudio } from '../../hooks/audio/useAssignmentAudio';
import { useSkirmishAudio } from '../../hooks/audio/useSkirmishAudio';
import { useSiteControlAudio } from '../../hooks/audio/useSiteControlAudio';
import { playTargetingArrowHitSound } from '../../hooks/audio/targetingArrowHitSound';
import {
    BoardTargetingArrow,
    RemoteTargetingArrow,
} from './components/TargetingArrow';
import { TargetingArrowSyncProvider, useTargetingArrowSync } from './components/TargetingArrow/TargetingArrowSync';
import { PENDING_PLAY_ORIGIN_ID } from './components/TargetingArrow/sync';
import { getThreatLimit } from '../../game/logic/threats';
import { livingSiteWoundTargets } from '../../game/logic/siteMoveCharacterWounds';
import {
    freePeoplesHasInitiative,
    playerHasInitiative,
} from '../../game/logic/initiative';
import { loadSessionProfile } from '../../session/playerProfile';

export interface GameBoardProps extends BoardProps<GameState> {
    moves: BoardProps<GameState>['moves'] &
        DevMoves & {
            confirmEndPhase?: () => void;
            playCard: (
                index: number,
                chosenTargetId?: string | string[],
                toilExertIds?: string[]
            ) => void;
            beginPendingPlay?: (index: number, prompt: string) => void;
            cancelPendingPlay?: () => void;
            playShadowCard: (index: number) => void;
            attachCard: (
                index: number,
                targetId: string,
                costTargetId?: string
            ) => void;
            transferAttachment?: (data: {
                attachmentId: string;
                fromCharacterId: string;
                toCharacterId: string;
            }) => void;
            assignMinion: (minionId: string, targetId: string) => void;
            playSite: (siteId: string, targetIndex: number) => void;
            drawCard: () => void;
            selectStartingSite?: (siteCard: CardState) => void;
            confirmAid?: () => void;
            transferAid?: (
                followerInstanceId: string,
                targetInstanceId: string
            ) => void;
            activateAbility?: (
                sourceInstanceId: string,
                abilityId: string,
                chosenTargetId?: string,
                discardedHandIds?: string[],
                chosenEffectTargetId?: string | string[]
            ) => void;
            assignArcheryWound?: (cardId: string) => void;
            assignThreatWound?: (cardId: string) => void;
            assignSiteCharacterWound?: (cardId: string) => void;
            cancelForcedChoiceMove?: () => void;
        };
}

const DesignationOverlay: React.FC<{ G: GameState; myId: string }> = ({
    G,
    myId,
}) => {
    const { registerArrowAnchor } = useDrag();
    const sync = useTargetingArrowSync();
    const pending = G.pendingPlay;
    const isOpponentPending = Boolean(pending && pending.playerId !== myId);
    const needsOrigin =
        isOpponentPending ||
        sync?.remote?.fromCardId === PENDING_PLAY_ORIGIN_ID;
    if (!needsOrigin) return null;

    return (
        <S.DesignationOverlay
            ref={(el) => registerArrowAnchor(PENDING_PLAY_ORIGIN_ID, el)}
        >
            {isOpponentPending && pending && (
                <S.DesignationPendingCard>
                    <Card
                        card={{ ...pending.card, isFaceDown: true }}
                        size="md"
                        isDraggable={false}
                        isOpponent
                        isFaceDown
                        G={G}
                    />
                </S.DesignationPendingCard>
            )}
        </S.DesignationOverlay>
    );
};

/** Échap ouvre les options seulement si rien d’autre ne consomme la touche. */
const OpenOptionsOnEscape: React.FC<{
    blocked: boolean;
    onOpen: () => void;
}> = ({ blocked, onOpen }) => {
    const { dragged } = useDrag();

    useEffect(() => {
        if (blocked || dragged) return;
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            onOpen();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [blocked, dragged, onOpen]);

    return null;
};

const PendingPlayOnDrag: React.FC<{
    G: GameState;
    myId: string;
    phase?: string;
    moves: GameBoardProps['moves'];
}> = ({ G, myId, phase, moves }) => {
    const { dragged, isOverHandCancel } = useDrag();
    const tg = useUiMessages().targeting;
    const uiLanguage = usePreferencesOptional()?.uiLanguage ?? 'fr';

    useEffect(() => {
        if (
            dragged?.origin !== 'HAND' ||
            !dragged.designationTargetIds?.length
        ) {
            return;
        }
        if (isOverHandCancel) {
            if (G.pendingPlay?.playerId === myId) {
                moves.cancelPendingPlay?.();
            }
            return;
        }
        if (G.pendingPlay?.playerId === myId) return;
        const card = dragged.card as CardState;
        if (card.type === 'EVENT') {
            const ability = findEventAbilityForPhase(card, phase || '', G);
            moves.beginPendingPlay?.(
                dragged.index,
                ability
                    ? abilityNeedsSiteExchange(ability)
                        ? tg.exchangePathSite
                        : abilityReplaceSiteEffect(ability)?.scope === 'REGION'
                          ? tg.replaceRegionSite
                          : formatDesignationPrompt(
                                ability,
                                'auto',
                                uiLanguage
                            )
                    : tg.chooseTarget
            );
            return;
        }
        // Site-attach (Tempête…): pas de flèche pendant le drag — pending
        // ouvert au drop (halo coût / site).
    }, [
        dragged,
        isOverHandCancel,
        G.pendingPlay,
        myId,
        moves,
        phase,
        tg,
        uiLanguage,
    ]);

    return null;
};

export const GameBoard: React.FC<GameBoardProps> = ({
    playerID,
    G,
    ctx,
    moves,
    sendChatMessage,
    chatMessages,
    matchID,
}) => {
    useCardPlayAudio(G);
    useDiscardAudio(G);
    const boardDiscardGhosts = useBoardDiscardGhosts(G);
    useStackAudio(G);
    useArcheryAudio(G);
    useWoundAudio(G);
    useExertAudio(G);
    useHealAudio(G);
    useAssignmentAudio(G);
    useSkirmishAudio(G, ctx.phase);
    useSiteControlAudio(G);
    const ui = useUiMessages();
    const tg = ui.targeting;
    const uiLanguage = usePreferencesOptional()?.uiLanguage ?? 'fr';
    const myId = playerID || ctx.currentPlayer;

    /** Profil Options (local) → siège courant, une fois connecté. */
    const sessionProfileSyncedRef = useRef(false);
    useEffect(() => {
        if (sessionProfileSyncedRef.current) return;
        if (!playerID || !moves?.applySessionProfile) return;
        if (!G.players?.[playerID]) return;

        const session = loadSessionProfile();
        moves.applySessionProfile(session.name, session.avatarId);
        sessionProfileSyncedRef.current = true;
    }, [G.players, moves, playerID]);

    const oppId = myId === '0' ? '1' : '0';
    const {
        startTargeting,
        stopTargeting,
        isTargetingActive,
        targetingKind,
        targetableCardIds,
        pendingCard,
        abilityId: targetingAbilityId,
        discardedHandIds: targetingDiscardedHandIds,
        isCardTargetable,
    } = useTargeting();
    const { hoveredData, setHoveredCard } = useHoverCard();

    /**
     * Après « Activer l’effet » du toaster site début de phase : masquer
     * Activer / Passer pendant désignation + pioche (sinon le toaster revient
     * entre stopTargeting et l’ouverture de la grille).
     */
    const [siteStartFlowActive, setSiteStartFlowActive] = useState(false);
    const siteStartBridgeRef = useRef(false);

    const requestDesignation = useCallback(
        (
            source: CardState,
            ability: NonNullable<CardState['abilities']>[number],
            onChosen: (cardId: string) => void,
            handIndex?: number,
            which: 'cost' | 'effect' | 'auto' = 'auto',
            /** Origine de flèche forcée (ex. rôdeur après coût → séide). */
            arrowFromOverride?: string,
            /** Défausse main déjà choisie (Halbarad…) — rester hors main pendant le halo. */
            discardedHandIdsPrefill?: string[]
        ): boolean => {
            const candidates =
                which === 'cost'
                    ? getCostDesignationCandidates(
                          G,
                          source,
                          ability,
                          myId
                      )
                    : which === 'effect'
                      ? getEffectDesignationCandidates(
                            G,
                            source,
                            ability,
                            myId
                        )
                      : getDesignationCandidates(G, source, ability);
            if (candidates.length === 0) return false;
            const prompt = formatDesignationPrompt(
                ability,
                which,
                uiLanguage
            );
            if (source.type === 'EVENT' && typeof handIndex === 'number') {
                moves.beginPendingPlay?.(handIndex, prompt);
            }

            const resolvingEffect =
                which === 'effect' ||
                (which === 'auto' &&
                    getCostDesignationCandidates(
                        G,
                        source,
                        ability,
                        myId
                    ).length === 0);
            const resolvingCost = which === 'cost';

            /**
             * Trajectoire négative : flèche depuis l’agent.
             * - Coût seul (désigner qui affaiblir) : halo, pas de flèche.
             * - Effet : override (rôdeur choisi) > source en jeu > pending (event).
             * - Event à désignation unique (coût=effet) : flèche depuis pending.
             */
            let arrowFromCardId: string | undefined;
            if (arrowFromOverride) {
                arrowFromCardId = arrowFromOverride;
            } else if (resolvingCost) {
                arrowFromCardId = undefined;
            } else if (
                resolvingEffect &&
                abilityEffectWantsTargetingArrow(ability)
            ) {
                arrowFromCardId =
                    source.type === 'EVENT'
                        ? PENDING_PLAY_ORIGIN_ID
                        : source.instanceId || source.id;
            } else if (
                source.type === 'EVENT' &&
                which === 'auto' &&
                abilityEffectWantsTargetingArrow(ability)
            ) {
                arrowFromCardId = PENDING_PLAY_ORIGIN_ID;
            }

            // Empiler depuis la main : même geste que la défausse (clic),
            // pas DESIGNATION + drag « jouer ».
            const isHandStackPick = (ability.effects || []).some(
                (effect) =>
                    effect.type === 'STACK_ON_SELF' && effect.from === 'HAND'
            );

            startTargeting({
                kind: isHandStackPick ? 'HAND_PICK' : 'DESIGNATION',
                targetableCardIds: candidates.flatMap(cardTargetIds),
                message: prompt,
                pendingCard: source.type === 'EVENT' ? source : undefined,
                discardedHandIds: discardedHandIdsPrefill,
                arrowFromCardId: isHandStackPick
                    ? undefined
                    : arrowFromCardId,
                onSelectTarget: (cardId) => {
                    if (arrowFromCardId) {
                        playTargetingArrowHitSound({
                            sourceId: source.id,
                            abilityPhases: ability.phases,
                            gamePhase: ctx.phase,
                        });
                    }
                    // Ne pas stop ici : onChosen peut enchaîner une autre visée
                    // (herbe → compagnon). stop écraserait la nouvelle.
                    onChosen(cardId);
                },
            });
            return true;
        },
        [G, moves, myId, startTargeting, ctx.phase]
    );

    /**
     * Jouer une carte depuis sa défausse (clause « initiative ») :
     * mêmes désignations que depuis la main, puis move dédié.
     */
    const handlePlayFromDiscard = useCallback(
        (card: CardState) => {
            const cardId = card.instanceId || card.id;
            const commit = (chosen?: string | string[]) => {
                stopTargeting();
                moves.playCardFromDiscard?.(cardId, chosen);
                audioService.play('CARD_PLAY');
            };

            if (card.type === 'EVENT') {
                const ability = findEventAbilityForPhase(
                    card,
                    ctx.phase || '',
                    G
                );
                if (
                    ability &&
                    abilityNeedsCostDesignation(G, card, ability) &&
                    abilityNeedsEffectDesignation(G, card, ability) &&
                    !costAndEffectShareHandDesignation(ability) &&
                    requestDesignation(
                        card,
                        ability,
                        (costId) => {
                            requestDesignation(
                                card,
                                ability,
                                (effectId) => commit([costId, effectId]),
                                undefined,
                                'effect',
                                costId
                            );
                        },
                        undefined,
                        'cost'
                    )
                ) {
                    return;
                }
                if (
                    ability &&
                    requestDesignation(card, ability, (chosenId) =>
                        commit(chosenId)
                    )
                ) {
                    return;
                }
                commit();
                return;
            }

            if (requiresAttachmentTarget(card)) {
                const hosts = findLegalAttachmentHosts(
                    G,
                    myId,
                    card,
                    ctx.phase || ''
                );
                if (hosts.length === 0) return;
                startTargeting({
                    kind: 'DESIGNATION',
                    targetableCardIds: hosts.flatMap(cardTargetIds),
                    message: tg.chooseBearer,
                    onSelectTarget: (hostId) => commit(hostId),
                });
                return;
            }

            commit();
        },
        [G, ctx.phase, moves, myId, requestDesignation, startTargeting, stopTargeting]
    );

    const requestSiteReplace = useCallback(
        (
            source: CardState,
            ability: NonNullable<CardState['abilities']>[number],
            onChosen: (siteId: string) => void,
            excludePathSiteId?: string
        ): boolean => {
            if (!abilityNeedsSiteReplace(ability) && !abilityNeedsSiteExchange(ability)) {
                return false;
            }
            const effect = abilityReplaceSiteEffect(ability);
            const isPlayNext = (ability.effects || []).some(
                (item) => item.type === 'PLAY_NEXT_SITE'
            );
            // PLAY_NEXT_SITE : deck du joueur qui active (Ombre sur Mere…).
            const ownerId = isPlayNext
                ? myId
                : abilityOwnerPlayerId(G, source);
            if (!ownerId) return false;
            const nextPathIndex = isPlayNext ? getNextSitePathIndex(G) : -1;
            const occupyingNext =
                isPlayNext && nextPathIndex >= 0 && !excludePathSiteId
                    ? G.path?.[nextPathIndex]?.id
                    : undefined;
            const candidates = getReplaceSiteCandidates(
                G,
                ownerId,
                effect?.siteKeyword,
                excludePathSiteId || occupyingNext
            );
            if (candidates.length === 0) return false;
            const terrain = effect?.siteKeyword
                ? effect.siteKeyword.toLowerCase()
                : '';
            startTargeting({
                kind: 'SITE_REPLACE',
                targetableCardIds: candidates.flatMap((site) =>
                    [site.instanceId, site.id].filter(Boolean)
                ),
                message: terrain
                    ? tg.chooseAdventureSiteTerrain(terrain)
                    : abilityNeedsSiteExchange(ability)
                      ? tg.chooseAdventureSiteExchange
                      : isPlayNext
                        ? tg.chooseNextAdventureSite
                        : tg.chooseAdventureSite,
                onSelectTarget: (siteId) => {
                    onChosen(siteId);
                    stopTargeting();
                },
            });
            return true;
        },
        [G, myId, startTargeting, stopTargeting]
    );

    const requestPathThenDeckSite = useCallback(
        (
            source: CardState,
            ability: NonNullable<CardState['abilities']>[number],
            onChosen: (pathSiteId: string, deckSiteId: string) => void
        ): boolean => {
            if (!abilityNeedsPathThenDeckSite(ability)) return false;
            const replaceEffect = abilityReplaceSiteEffect(ability);
            const isExchange = abilityNeedsSiteExchange(ability);
            const ownerId = abilityOwnerPlayerId(G, source);
            if (!ownerId) return false;

            const pathSites = isExchange
                ? getOwnedPathSites(G, ownerId).filter(
                      ({ site }) =>
                          getReplaceSiteCandidates(
                              G,
                              ownerId,
                              undefined,
                              site.id
                          ).length > 0
                  )
                : getReplaceablePathSitesInCurrentRegion(G).filter(
                      ({ site, pathIndex }) =>
                          !isSiteReplaceForbidden(G, ownerId, pathIndex) &&
                          getReplaceSiteCandidates(
                              G,
                              ownerId,
                              replaceEffect?.siteKeyword,
                              site.id
                          ).length > 0
                  );
            if (pathSites.length === 0) return false;

            startTargeting({
                kind: 'SITE_REPLACE_PATH',
                targetableCardIds: pathSites.flatMap(({ site }) =>
                    [site.instanceId, site.id].filter(Boolean)
                ),
                message: isExchange
                    ? tg.exchangePathSite
                    : tg.replaceRegionSite,
                onSelectTarget: (pathSiteId) => {
                    const pathSite = pathSites.find(
                        ({ site }) =>
                            site.instanceId === pathSiteId ||
                            site.id === pathSiteId
                    )?.site;
                    if (!pathSite) return;
                    requestSiteReplace(
                        source,
                        ability,
                        (deckSiteId) => {
                            onChosen(pathSiteId, deckSiteId);
                            stopTargeting();
                        },
                        pathSite.id
                    );
                },
            });
            return true;
        },
        [G, requestSiteReplace, startTargeting, stopTargeting]
    );

    const requestStackSite = useCallback(
        (
            source: CardState,
            onChosen: (siteId: string) => void,
            ability?: NonNullable<CardState['abilities']>[number]
        ): boolean => {
            const candidates = getStackSiteCandidates(G, source);
            if (candidates.length === 0) return false;
            const stacksOther = ability
                ? abilityStacksOtherMinion(ability)
                : false;
            startTargeting({
                kind: 'SITE_STACK',
                targetableCardIds: candidates.flatMap((site) =>
                    [site.instanceId, site.id].filter(Boolean)
                ),
                message: stacksOther
                    ? tg.stackChosenMinionOnControlled
                    : tg.stackMinionOnControlled,
                arrowFromCardId: source.instanceId || source.id,
                onSelectTarget: (siteId) => {
                    onChosen(siteId);
                    stopTargeting();
                },
            });
            return true;
        },
        [G, startTargeting, stopTargeting]
    );

    const runSiteReplaceFlow = useCallback(
        (
            source: CardState,
            ability: NonNullable<CardState['abilities']>[number],
            sourceInstanceId: string,
            abilityId: string,
            costId?: string
        ) => {
            const effect = abilityReplaceSiteEffect(ability);
            const commit = (targetIds: string | string[]) => {
                stopTargeting();
                // Site toujours en 5ᵉ arg : si le coût est auto (Gandalf /
                // Gollum unique), arg3 vide → pas de confusion site/coût.
                moves.activateAbility?.(
                    sourceInstanceId,
                    abilityId,
                    costId,
                    undefined,
                    targetIds
                );
            };

            if (abilityNeedsPathThenDeckSite(ability)) {
                requestPathThenDeckSite(source, ability, (pathId, deckId) => {
                    commit([pathId, deckId]);
                });
                return;
            }
            requestSiteReplace(source, ability, (deckId) => {
                commit(deckId);
            });
        },
        [moves, requestPathThenDeckSite, requestSiteReplace, stopTargeting]
    );

    const requestHandDiscard = useCallback(
        (
            source: CardState,
            ability: NonNullable<CardState['abilities']>[number],
            onChosen: (cardIds: string[]) => void,
            countOverride?: number
        ): boolean => {
            const effect = abilityDiscardFromHandEffect(ability);
            const need =
                countOverride ??
                effect?.count ??
                abilityDiscardFromHandCount(ability);
            const upTo = Boolean(effect?.upTo);
            if (need <= 0) return false;

            const fpId = G.fpPlayerId || '0';
            // Site : main du joueur qui active (Ombre sur Courtyard Parapet).
            const isSiteSource =
                source.kind === 'SITE' || source.type === 'SITE';
            const ownerId =
                isSiteSource && playerID
                    ? String(playerID)
                    : source.kind === 'SHADOW'
                      ? fpId === '0'
                          ? '1'
                          : '0'
                      : fpId;

            const kindFilter = abilityDiscardFromHandKind(ability);
            const cultureFilters = abilityDiscardFromHandFilters(ability);
            const collect = (picked: string[]) => {
                const remaining = need - picked.length;
                const hand = G.players[ownerId]?.hand || [];
                const targetableCardIds = hand
                    .filter((card) => {
                        if (kindFilter && card.kind !== kindFilter) return false;
                        if (
                            cultureFilters &&
                            !cardMatchesTarget(card, cultureFilters)
                        ) {
                            return false;
                        }
                        const id = card.instanceId || card.id;
                        return Boolean(id && !picked.includes(id));
                    })
                    .flatMap((card) => cardTargetIds(card));
                const commit = () => {
                    // Stop avant onChosen : sinon un enchaînement (halo soin…)
                    // est immédiatement annulé.
                    stopTargeting();
                    onChosen(picked);
                };
                startTargeting({
                    kind: 'HAND_DISCARD',
                    targetableCardIds,
                    selectedCardIds: picked,
                    upTo,
                    onConfirm: upTo ? commit : undefined,
                    confirmLabel: upTo ? tg.validateDiscard : undefined,
                    message: upTo
                        ? picked.length === 0
                            ? tg.discardHandUpTo(need)
                            : tg.discardHandProgress(picked.length, need)
                        : remaining === need
                          ? tg.discardHandExact(need)
                          : tg.discardHandRemaining(remaining),
                    onSelectTarget: (cardId) => {
                        const card = hand.find(
                            (item) =>
                                item.instanceId === cardId || item.id === cardId
                        );
                        const canonical = card?.instanceId || card?.id || cardId;
                        if (picked.includes(canonical)) return;
                        const next = [...picked, canonical];
                        // « up to » : on sélectionne jusqu’au max, validation (anim) à part.
                        // Coût exact : la dernière carte commit (l’anim a déjà joué dans Hand).
                        if (!upTo && next.length >= need) {
                            stopTargeting();
                            onChosen(next);
                            return;
                        }
                        collect(next);
                    },
                });
            };

            collect([]);
            return true;
        },
        [G, playerID, startTargeting, stopTargeting]
    );

    const requestMultiEffectDesignation = useCallback(
        (
            source: CardState,
            ability: NonNullable<CardState['abilities']>[number],
            need: number,
            onChosen: (cardIds: string[]) => void
        ): boolean => {
            if (need <= 0) return false;
            const allCandidates = getEffectDesignationCandidates(
                G,
                source,
                ability
            );
            if (allCandidates.length < need) return false;

            const onePerCulture = (ability.effects || []).some(
                (effect) => effect.type === 'HEAL' && effect.onePerCulture
            );
            const isExertMulti = (ability.effects || []).some(
                (effect) =>
                    effect.type === 'EXERT' &&
                    typeof effect.multiCount === 'number' &&
                    effect.multiCount > 1
            );
            const isDiscardMulti = (ability.effects || []).some(
                (effect) =>
                    effect.type === 'DISCARD' &&
                    !effect.chooser &&
                    (effect.count || 1) > 1
            );
            const multiNoun = isDiscardMulti
                ? `situation${need > 1 ? 's' : ''} à défausser`
                : isExertMulti
                  ? `compagnon${need > 1 ? 's' : ''} à affaiblir`
                  : `compagnon${need > 1 ? 's' : ''} à soigner`;

            const collect = (picked: string[]) => {
                const pickedCultures = new Set(
                    picked
                        .map((id) => {
                            const card = allCandidates.find(
                                (item) =>
                                    item.instanceId === id || item.id === id
                            );
                            return card?.culture;
                        })
                        .filter((c): c is NonNullable<typeof c> => Boolean(c))
                );
                const targetableCardIds = allCandidates
                    .filter((card) => {
                        const id = card.instanceId || card.id;
                        if (!id || picked.includes(id)) return false;
                        if (
                            onePerCulture &&
                            card.culture &&
                            pickedCultures.has(card.culture)
                        ) {
                            return false;
                        }
                        return true;
                    })
                    .flatMap((card) => cardTargetIds(card));
                const remaining = need - picked.length;
                startTargeting({
                    kind: 'DESIGNATION',
                    targetableCardIds,
                    selectedCardIds: picked,
                    message: onePerCulture
                        ? picked.length === 0
                            ? tg.chooseWoundedPerCulture(need)
                            : tg.cultureProgress(remaining, picked.length, need)
                        : picked.length === 0
                          ? tg.chooseMulti(need, multiNoun)
                          : tg.multiProgress(remaining, picked.length, need),
                    onSelectTarget: (cardId) => {
                        const card = allCandidates.find(
                            (item) =>
                                item.instanceId === cardId || item.id === cardId
                        );
                        const canonical =
                            card?.instanceId || card?.id || cardId;
                        if (picked.includes(canonical)) return;
                        if (
                            onePerCulture &&
                            card?.culture &&
                            pickedCultures.has(card.culture)
                        ) {
                            return;
                        }
                        const next = [...picked, canonical];
                        if (next.length >= need) {
                            stopTargeting();
                            queueMicrotask(() => onChosen(next));
                            return;
                        }
                        collect(next);
                    },
                });
            };

            collect([]);
            return true;
        },
        [G, startTargeting, stopTargeting]
    );

    /**
     * Éreintement (Toil) : halo optionnel sur compagnons/séides de la culture,
     * Valider pour enchaîner (0 à N affaiblissements).
     */
    const requestToilExert = useCallback(
        (
            card: CardState,
            onChosen: (toilExertIds: string[]) => void
        ): boolean => {
            const amount = getToilAmount(card);
            if (amount <= 0) return false;
            const candidates = getToilCandidates(G, myId, card);
            if (candidates.length === 0) return false;

            const baseCost = getTwilightCostWithToil(G, card, 0);
            const collect = (picked: string[]) => {
                const reduced = getTwilightCostWithToil(G, card, picked.length);
                const targetableCardIds = candidates
                    .filter((c) => {
                        const id = c.instanceId || c.id;
                        return Boolean(id && !picked.includes(id));
                    })
                    .flatMap((c) => cardTargetIds(c));
                const commit = () => {
                    // stop d’abord, puis enchaîner (sinon stopTargeting
                    // annule le halo « 2 situations » lancé par onChosen).
                    stopTargeting();
                    queueMicrotask(() => onChosen(picked));
                };
                startTargeting({
                    kind: 'DESIGNATION',
                    targetableCardIds,
                    selectedCardIds: picked,
                    upTo: true,
                    onConfirm: commit,
                    confirmLabel: tg.validateToil,
                    message:
                        picked.length === 0
                            ? tg.toilPrompt(amount, baseCost)
                            : tg.toilProgress(picked.length, reduced, baseCost),
                    onSelectTarget: (cardId) => {
                        const match = candidates.find(
                            (item) =>
                                item.instanceId === cardId || item.id === cardId
                        );
                        const canonical =
                            match?.instanceId || match?.id || cardId;
                        if (picked.includes(canonical)) return;
                        collect([...picked, canonical]);
                    },
                });
            };
            collect([]);
            return true;
        },
        [G, myId, startTargeting, stopTargeting]
    );

    /** Coût « affaiblir N personnages distincts » (Legolas hunter…). */
    const requestMultiCostDesignation = useCallback(
        (
            source: CardState,
            ability: NonNullable<CardState['abilities']>[number],
            need: number,
            onChosen: (cardIds: string[]) => void
        ): boolean => {
            if (need <= 1) return false;
            const allCandidates = getCostDesignationCandidates(
                G,
                source,
                ability,
                myId
            );
            if (allCandidates.length < need) return false;

            const collect = (picked: string[]) => {
                const targetableCardIds = allCandidates
                    .filter((card) => {
                        const id = card.instanceId || card.id;
                        return Boolean(id && !picked.includes(id));
                    })
                    .flatMap((card) => cardTargetIds(card));
                const remaining = need - picked.length;
                startTargeting({
                    kind: 'DESIGNATION',
                    targetableCardIds,
                    selectedCardIds: picked,
                    message:
                        picked.length === 0
                            ? formatDesignationPrompt(
                                  ability,
                                  'cost',
                                  uiLanguage
                              )
                            : tg.multiProgress(remaining, picked.length, need),
                    onSelectTarget: (cardId) => {
                        const card = allCandidates.find(
                            (item) =>
                                item.instanceId === cardId || item.id === cardId
                        );
                        const canonical =
                            card?.instanceId || card?.id || cardId;
                        if (picked.includes(canonical)) return;
                        const next = [...picked, canonical];
                        if (next.length >= need) {
                            // Évite le flash Activer/Passer avant openDeckPick.
                            siteStartBridgeRef.current = true;
                            stopTargeting();
                            queueMicrotask(() => onChosen(next));
                            return;
                        }
                        collect(next);
                    },
                });
            };

            collect([]);
            return true;
        },
        [G, myId, startTargeting, stopTargeting]
    );

    const handleActivateAbility = (
        sourceInstanceId: string,
        abilityId: string,
        chosenTargetId?: string,
        discardedHandIds?: string[],
        chosenEffectTargetId?: string | string[]
    ) => {
        const source = findTargetCard(G, sourceInstanceId) as CardState | null;
        const ability = source?.abilities?.find((ab) => ab.id === abilityId);
        if (!source || !ability) {
            moves.activateAbility?.(
                sourceInstanceId,
                abilityId,
                chosenTargetId,
                discardedHandIds,
                chosenEffectTargetId
            );
            return;
        }
        const needsCost = abilityNeedsCostDesignation(
            G,
            source,
            ability,
            myId
        );
        const needsEffect = abilityNeedsEffectDesignation(G, source, ability);
        const effectNeed = getEffectDesignationCount(G, source, ability);
        const needsStackSite = abilityNeedsStackSiteChoice(G, source, ability);
        const stacksOther = abilityStacksOtherMinion(ability);
        const playsOtherFromStack = abilityPlaysOtherFromStack(ability);
        const needsSite =
            abilityNeedsSiteReplace(ability) ||
            abilityNeedsSiteExchange(ability);
        const hasPrefillCost = Boolean(chosenTargetId);
        const hasPrefillEffect = Boolean(
            Array.isArray(chosenEffectTargetId)
                ? chosenEffectTargetId.length
                : chosenEffectTargetId
        );
        // Coût prérempli (projection Mere → Gollum) : ne pas court-circuiter
        // le choix de site / d’effet encore requis.
        if (hasPrefillCost || hasPrefillEffect) {
            const stillNeedsSite = needsSite && !hasPrefillEffect;
            const stillNeedsEffect = needsEffect && !hasPrefillEffect;
            const stillNeedsStack =
                needsStackSite && !stacksOther && !hasPrefillEffect;
            if (
                !stillNeedsSite &&
                !stillNeedsEffect &&
                !stillNeedsStack &&
                !playsOtherFromStack &&
                !abilityNeedsDeckOrDiscardPick(ability)
            ) {
                moves.activateAbility?.(
                    sourceInstanceId,
                    abilityId,
                    chosenTargetId,
                    discardedHandIds,
                    chosenEffectTargetId
                );
                return;
            }
        }
        // discardedHandIds seul : on continue le flux (ex. défausse puis STACK_PLAY).
        if (
            discardedHandIds?.length &&
            !playsOtherFromStack &&
            !needsEffect &&
            !needsStackSite &&
            !needsSite
        ) {
            moves.activateAbility?.(
                sourceInstanceId,
                abilityId,
                chosenTargetId,
                discardedHandIds,
                chosenEffectTargetId
            );
            return;
        }

        const commitAbility = (
            costId?: string,
            effectIds?: string | string[],
            handIds?: string[]
        ) => {
            stopTargeting();
            if (costId) {
                moves.activateAbility?.(
                    sourceInstanceId,
                    abilityId,
                    costId,
                    handIds || [],
                    effectIds
                );
                return;
            }
            moves.activateAbility?.(
                sourceInstanceId,
                abilityId,
                effectIds,
                handIds
            );
        };

        const afterMinionOrDirect = (
            costId?: string,
            minionId?: string
        ) => {
            const finish = (handIds?: string[]) => {
                if (needsStackSite) {
                    return requestStackSite(source, (siteId) => {
                        if (minionId) {
                            commitAbility(costId, [minionId, siteId], handIds);
                        } else {
                            commitAbility(costId, siteId, handIds);
                        }
                    }, ability);
                }
                if (minionId) {
                    commitAbility(costId, minionId, handIds);
                    return true;
                }
                commitAbility(costId, undefined, handIds);
                return true;
            };

            if (abilityNeedsHandDiscard(ability) && minionId) {
                const minion = findTargetCard(G, minionId) as CardState | null;
                const need = abilityDiscardFromHandCount(ability, minion);
                return requestHandDiscard(
                    source,
                    ability,
                    (cardIds) => {
                        finish(cardIds);
                    },
                    need
                );
            }
            return finish();
        };

        const requestEffect = (costId?: string, handIdsPrefill?: string[]) => {
            if (effectNeed > 1) {
                return requestMultiEffectDesignation(
                    source,
                    ability,
                    effectNeed,
                    (effectIds) => {
                        // Sans coût : les cibles doivent être en 3ᵉ arg
                        // (chosenTargetId), pas en 5ᵉ — sinon INVALID_MOVE
                        // et le toaster site recommence.
                        commitAbility(costId, effectIds, handIdsPrefill);
                    }
                );
            }
            const effectCandidates = getEffectDesignationCandidates(
                G,
                source,
                ability
            );
            if (effectCandidates.length === 0) return false;
            return requestDesignation(
                source,
                ability,
                (effectId) => {
                    if (stacksOther) {
                        afterMinionOrDirect(costId, effectId);
                        return;
                    }
                    const finishEffect = (handIds?: string[]) => {
                        stopTargeting();
                        moves.activateAbility?.(
                            sourceInstanceId,
                            abilityId,
                            costId || effectId,
                            handIds ?? (costId ? [] : undefined),
                            costId ? effectId : undefined
                        );
                    };
                    // Coût variable selon la cible (Officer / Sapper) : défausse après.
                    // Coût fixe (Halbarad, They Stole It…) : déjà réglé avant.
                    if (
                        abilityNeedsHandDiscard(ability) &&
                        abilityHandDiscardDependsOnEffect(ability) &&
                        !handIdsPrefill?.length
                    ) {
                        const effectCard = findTargetCard(
                            G,
                            effectId
                        ) as CardState | null;
                        const need = abilityDiscardFromHandCount(
                            ability,
                            effectCard
                        );
                        return requestHandDiscard(
                            source,
                            ability,
                            (cardIds) => finishEffect(cardIds),
                            need
                        );
                    }
                    finishEffect(handIdsPrefill);
                },
                undefined,
                needsCost ? 'effect' : 'auto',
                // Trajectoire depuis l’agent désigné au coût (sinon source via défaut)
                costId && abilityEffectWantsTargetingArrow(ability)
                    ? costId
                    : undefined,
                handIdsPrefill
            );
        };

        if (needsCost && needsEffect) {
            // Coût multi-distinct + effet désigné : pas encore (Legolas = DRAW seul).
            if (
                requestDesignation(
                    source,
                    ability,
                    (costId) => {
                        requestEffect(costId);
                    },
                    undefined,
                    'cost'
                )
            ) {
                return;
            }
        }
        // Play depuis pile d’un *autre* séide : pas de flèche — drag comme Uruk/Dun.
        // Défausse main (Officer / Sapper) : après le drag, quand on connaît la cible
        // (coût 1 si assiégeant, sinon 2).
        // Web / Goblin Swarms (PLAY_FROM_CARD_STACK sans coût) : drag direct, pas de bulle.
        if (playsOtherFromStack && !isCostlessPlayFromCardStack(ability)) {
            const candidates = getEffectDesignationCandidates(
                G,
                source,
                ability
            );
            if (candidates.length === 0) return;
            startTargeting({
                kind: 'STACK_PLAY',
                targetableCardIds: candidates.flatMap(cardTargetIds),
                pendingCard: source,
                abilityId,
                discardedHandIds,
                message: tg.stackPlayHint,
                onSelectTarget: (stackedId) => {
                    const stackedCard = findTargetCard(
                        G,
                        stackedId
                    ) as CardState | null;
                    const finishPlay = (handIds?: string[]) => {
                        stopTargeting();
                        moves.activateAbility?.(
                            source.instanceId || source.id,
                            abilityId,
                            stackedId,
                            handIds
                        );
                        audioService.play('CARD_PLAY');
                    };
                    if (abilityNeedsHandDiscard(ability) && stackedCard) {
                        const need = abilityDiscardFromHandCount(
                            ability,
                            stackedCard
                        );
                        requestHandDiscard(
                            source,
                            ability,
                            (cardIds) => finishPlay(cardIds),
                            need
                        );
                        return;
                    }
                    finishPlay(discardedHandIds);
                },
            });
            return;
        }
        // Coût défausse main fixe + effet à désigner (Halbarad…) : défausse d’abord.
        if (
            needsEffect &&
            abilityNeedsHandDiscard(ability) &&
            !abilityHandDiscardDependsOnEffect(ability) &&
            !discardedHandIds?.length
        ) {
            if (
                requestHandDiscard(source, ability, (cardIds) => {
                    requestEffect(undefined, cardIds);
                })
            ) {
                return;
            }
        }
        if (needsEffect && requestEffect(undefined, discardedHandIds)) {
            return;
        }
        // Site (Mere…) avant la désignation générique : sinon on active avec
        // le seul coût et PLAY_NEXT_SITE échoue (rollback → pas d’affaiblissement).
        if (needsSite) {
            if (needsCost && !chosenTargetId) {
                requestDesignation(
                    source,
                    ability,
                    (costId) => {
                        runSiteReplaceFlow(
                            source,
                            ability,
                            sourceInstanceId,
                            abilityId,
                            costId
                        );
                    },
                    undefined,
                    'cost'
                );
                return;
            }
            runSiteReplaceFlow(
                source,
                ability,
                sourceInstanceId,
                abilityId,
                chosenTargetId
            );
            return;
        }
        // Pioche / défausse avant le coût générique (Barazinbar / Incited : exert puis grille).
        if (abilityNeedsDeckOrDiscardPick(ability)) {
            const take = abilityTakeFromDiscardEffect(ability);
            const placeOnDeck = abilityPlaceFromDiscardOnDeckEffect(ability);
            if (take || placeOnDeck) {
                const discardFilter = take?.target || placeOnDeck!.target;
                const openTakePick = (costIds?: string | string[]) => {
                    const discard = G.players[myId]?.discard || [];
                    const selectable = discard.filter(
                        (c) => c && cardMatchesTarget(c, discardFilter)
                    );
                    if (selectable.length === 0) return;
                    // Toujours ouvrir la grille (même 1 carte) — le joueur
                    // confirme ce qu’il reprend (Bilbo…).
                    setDeckDiscardPick({
                        activate: {
                            sourceInstanceId,
                            abilityId,
                            costId: costIds,
                        },
                        selectableCardIds: selectable.flatMap(cardTargetIds),
                        deck: [],
                        discard: [...discard],
                        title: tg.discardPileTitle,
                        subtitle: take
                            ? tg.chooseTakeToHand
                            : tg.choosePutOnDeck,
                    });
                };
                if (needsCost && !chosenTargetId) {
                    const takeCostNeed = getCostDesignationCount(ability);
                    if (takeCostNeed > 1) {
                        if (
                            requestMultiCostDesignation(
                                source,
                                ability,
                                takeCostNeed,
                                (costIds) => {
                                    openTakePick(costIds);
                                }
                            )
                        ) {
                            return;
                        }
                    } else if (
                        requestDesignation(
                            source,
                            ability,
                            (costId) => {
                                stopTargeting();
                                openTakePick(costId);
                            },
                            undefined,
                            'cost'
                        )
                    ) {
                        return;
                    }
                }
                openTakePick(chosenTargetId);
                return;
            }
            const playEffect = abilityPlayFromDeckOrDiscardEffect(ability);
            if (playEffect) {
                const from = playEffect.from || 'DECK_OR_DISCARD';
                // startOfFellowship / site : jouer comme en fellowship (ignorePhase côté candidats).
                const playPhase =
                    myId === (G.fpPlayerId || '0') ? 'fellowship' : 'shadow';
                const attachHost =
                    playEffect.attachTo === 'SELF' ? source : null;
                const openDeckPick = (costIds?: string | string[]) => {
                    const selectable = getDeckOrDiscardPlayCandidates(
                        G,
                        myId,
                        playEffect.target,
                        playPhase,
                        attachHost,
                        from
                    );
                    if (selectable.length === 0) {
                        siteStartBridgeRef.current = false;
                        return;
                    }
                    const pool =
                        from === 'DEAD_PILE'
                            ? {
                                  deck: [] as CardState[],
                                  discard: [] as CardState[],
                              }
                            : getDeckOrDiscardBrowsePool(G, myId);
                    // Pont anti-flash : stopTargeting → setDeckDiscardPick.
                    siteStartBridgeRef.current = true;
                    setDeckDiscardPick({
                        activate: {
                            sourceInstanceId,
                            abilityId,
                            costId: costIds,
                        },
                        selectableCardIds:
                            selectable.flatMap(cardTargetIds),
                        deck: from === 'DISCARD' ? [] : pool.deck,
                        discard: from === 'DECK' ? [] : pool.discard,
                        deadPile:
                            from === 'DEAD_PILE'
                                ? [...(G.players[myId]?.deadPile || [])]
                                : undefined,
                        title:
                            from === 'DEAD_PILE'
                                ? tg.deadPileTitle
                                : from === 'DECK'
                                  ? tg.drawDeckTitle
                                  : from === 'DISCARD'
                                    ? tg.discardPileTitle
                                    : tg.deckOrDiscardTitle,
                        subtitle:
                            from === 'DEAD_PILE'
                                ? tg.chooseDeadPileCharacter
                                : from === 'DISCARD'
                                  ? tg.choosePlayableDiscard
                                  : from === 'DECK'
                                    ? tg.choosePlayableDeck
                                    : tg.choosePlayableDeckOrDiscardFull,
                    });
                    queueMicrotask(() => {
                        siteStartBridgeRef.current = false;
                    });
                };
                if (needsCost && !chosenTargetId) {
                    const deckCostNeed = getCostDesignationCount(ability);
                    if (deckCostNeed > 1) {
                        if (
                            requestMultiCostDesignation(
                                source,
                                ability,
                                deckCostNeed,
                                (costIds) => {
                                    openDeckPick(costIds);
                                }
                            )
                        ) {
                            return;
                        }
                    } else if (
                        requestDesignation(
                            source,
                            ability,
                            (costId) => {
                                siteStartBridgeRef.current = true;
                                stopTargeting();
                                openDeckPick(costId);
                            },
                            undefined,
                            'cost'
                        )
                    ) {
                        return;
                    }
                }
                openDeckPick(
                    typeof chosenTargetId === 'string'
                        ? chosenTargetId
                        : undefined
                );
                return;
            }
        }
        // Coût déjà choisi (projection site → orc / Gimli…) : ne pas redemander.
        const costNeed = getCostDesignationCount(ability);
        if (!needsEffect && !hasPrefillCost && costNeed > 1) {
            if (
                requestMultiCostDesignation(
                    source,
                    ability,
                    costNeed,
                    (costIds) => {
                        moves.activateAbility?.(
                            sourceInstanceId,
                            abilityId,
                            costIds
                        );
                    }
                )
            ) {
                return;
            }
        }
        // needsCost : sinon un nom propre unique (Gandalf…) a encore des
        // candidats et on rouvrait le halo à tort.
        if (
            needsCost &&
            !needsEffect &&
            !hasPrefillCost &&
            costNeed <= 1 &&
            requestDesignation(source, ability, (cardId) => {
                stopTargeting();
                moves.activateAbility?.(sourceInstanceId, abilityId, cardId);
            })
        ) {
            return;
        }
        if (
            abilityNeedsHandDiscard(ability) &&
            requestHandDiscard(source, ability, (cardIds) => {
                moves.activateAbility?.(
                    sourceInstanceId,
                    abilityId,
                    undefined,
                    cardIds
                );
            })
        ) {
            return;
        }
        if (needsStackSite && !stacksOther) {
            if (needsCost) {
                requestDesignation(
                    source,
                    ability,
                    (costId) => {
                        requestStackSite(source, (siteId) => {
                            moves.activateAbility?.(
                                sourceInstanceId,
                                abilityId,
                                costId,
                                undefined,
                                siteId
                            );
                        }, ability);
                    },
                    undefined,
                    'cost'
                );
                return;
            }
            if (
                requestStackSite(source, (siteId) => {
                    moves.activateAbility?.(
                        sourceInstanceId,
                        abilityId,
                        siteId
                    );
                }, ability)
            ) {
                return;
            }
        }
        moves.activateAbility?.(sourceInstanceId, abilityId);
    };

    const handleResolveSiteStartAbilityChoice = useCallback(
        (accept: boolean) => {
            if (!accept) {
                setSiteStartFlowActive(false);
                siteStartBridgeRef.current = false;
                moves.resolveSiteStartAbilityChoice?.(false);
                return;
            }
            const pending = G.pendingSiteStartAbility;
            if (!pending) return;
            // Pending reste jusqu’à activateAbility réussi (annulation → toaster).
            setSiteStartFlowActive(true);
            handleActivateAbility(
                pending.siteInstanceId,
                pending.abilityId
            );
        },
        // handleActivateAbility lit G/moves courants ; pas de useCallback sur lui.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [G.pendingSiteStartAbility, moves]
    );

    const handleResolveSiteResponseAbilityChoice = useCallback(
        (accept: boolean) => {
            if (!accept) {
                moves.passResponseWindow?.();
                return;
            }
            const activeId = G.responseWindow?.activePlayerId;
            if (activeId == null) return;
            const found = findOptionalToasterResponseAbility(
                G,
                String(activeId)
            );
            if (!found) return;
            handleActivateAbility(
                found.source.instanceId || found.source.id,
                found.ability.id
            );
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [G.responseWindow?.activePlayerId, G.pendingEvent, moves]
    );

    /** Site phase Ombre (Shores / Slopes / famille « play… ») : Activer → choix si besoin. */
    const handleResolveSitePhaseAbilityChoice = useCallback(
        (
            accept: boolean,
            discardedHandIds?: string[],
            chosenTargetId?: string,
            chosenAbilityId?: string
        ) => {
            if (!accept) {
                stopTargeting();
                setHoveredCard(null);
                moves.resolveSitePhaseAbilityChoice?.(false);
                return;
            }
            if (
                discardedHandIds !== undefined ||
                chosenTargetId !== undefined
            ) {
                moves.resolveSitePhaseAbilityChoice?.(
                    true,
                    discardedHandIds,
                    chosenTargetId,
                    chosenAbilityId
                );
                return;
            }
            const pending = G.pendingSitePhaseAbility;
            if (!pending) return;
            const source = findTargetCard(
                G,
                pending.siteInstanceId
            ) as CardState | null;
            const abilityId = chosenAbilityId || pending.abilityId;
            const ability = source?.abilities?.find(
                (ab) => ab.id === abilityId
            );
            if (!source || !ability) return;

            // Famille « play… » : choisir la carte à jouer (main ou défausse).
            const myZones = G.players?.[myId];
            const playFromHand = (ability.effects || []).find(
                (e) => e.type === 'PLAY_FROM_HAND'
            );
            if (playFromHand && playFromHand.type === 'PLAY_FROM_HAND') {
                const candidates = getHandPlayCandidates(
                    G,
                    myId,
                    playFromHand.target,
                    'shadow',
                    playFromHand.twilightReduce || 0
                );
                if (candidates.length === 0) return;
                // La main est sous les yeux : halo + clic sur la carte à jouer
                // (DESIGNATION = halo visible ; HAND_PICK n’en affiche pas).
                startTargeting({
                    kind: 'DESIGNATION',
                    targetableCardIds: candidates.flatMap(cardTargetIds),
                    message: tg.chooseCardToPlayHand,
                    onSelectTarget: (cardId) => {
                        stopTargeting();
                        setHoveredCard(null);
                        moves.resolveSitePhaseAbilityChoice?.(
                            true,
                            undefined,
                            cardId,
                            abilityId
                        );
                        audioService.play('CARD_PLAY');
                    },
                });
                return;
            }
            const playFromZone = abilityPlayFromDeckOrDiscardEffect(ability);
            if (playFromZone) {
                const candidates = getDeckOrDiscardPlayCandidates(
                    G,
                    myId,
                    playFromZone.target,
                    'shadow',
                    null,
                    playFromZone.from || 'DECK_OR_DISCARD'
                );
                if (candidates.length === 0) return;
                const from = playFromZone.from || 'DECK_OR_DISCARD';
                setDeckDiscardPick({
                    sitePhasePick: { abilityId },
                    selectableCardIds: candidates.flatMap(cardTargetIds),
                    deck: from === 'DISCARD' ? [] : myZones?.deck || [],
                    discard:
                        from === 'DECK' ? [] : myZones?.discard || [],
                    title:
                        from === 'DISCARD'
                            ? tg.yourDiscard
                            : tg.deckOrDiscardTitle,
                    subtitle: tg.chooseCardToPlay,
                });
                return;
            }

            if (
                abilityNeedsHandDiscard(ability) &&
                requestHandDiscard(source, ability, (cardIds) => {
                    moves.resolveSitePhaseAbilityChoice?.(
                        true,
                        cardIds,
                        undefined,
                        chosenAbilityId
                    );
                })
            ) {
                return;
            }
            moves.resolveSitePhaseAbilityChoice?.(
                true,
                undefined,
                undefined,
                chosenAbilityId
            );
        },
        [G, moves, requestHandDiscard, myId, startTargeting, stopTargeting, setHoveredCard]
    );

    /** Isengard Ruined : Activer → désigner un compagnon à affaiblir ×2. */
    const handleResolveSiteFollowerTransferAbilityChoice = useCallback(
        (accept: boolean, chosenTargetId?: string) => {
            if (!accept) {
                stopTargeting();
                setHoveredCard(null);
                moves.resolveSiteFollowerTransferAbilityChoice?.(false);
                return;
            }
            if (chosenTargetId !== undefined) {
                stopTargeting();
                setHoveredCard(null);
                moves.resolveSiteFollowerTransferAbilityChoice?.(
                    true,
                    chosenTargetId
                );
                return;
            }
            const pending = G.pendingSiteFollowerTransfer;
            if (!pending) return;
            const source = findTargetCard(
                G,
                pending.siteInstanceId
            ) as CardState | null;
            const ability = source?.abilities?.find(
                (ab) => ab.id === pending.abilityId
            );
            if (
                source &&
                ability &&
                requestDesignation(
                    source,
                    ability,
                    (cardId) => {
                        stopTargeting();
                        setHoveredCard(null);
                        moves.resolveSiteFollowerTransferAbilityChoice?.(
                            true,
                            cardId
                        );
                    },
                    undefined,
                    'effect'
                )
            ) {
                return;
            }
            moves.resolveSiteFollowerTransferAbilityChoice?.(true);
        },
        [
            G,
            moves,
            requestDesignation,
            stopTargeting,
            setHoveredCard,
        ]
    );

    /** Site « moves to » optionnel : défausse main (Courtyard) / soin par culture avant Activer. */
    const handleResolveSiteMoveAbilityChoice = useCallback(
        (
            accept: boolean,
            discardedHandIds?: string[],
            chosenEffectTargetIds?: string[]
        ) => {
            if (!accept) {
                moves.resolveSiteMoveAbilityChoice?.(false);
                return;
            }
            if (chosenEffectTargetIds !== undefined) {
                moves.resolveSiteMoveAbilityChoice?.(
                    true,
                    discardedHandIds,
                    chosenEffectTargetIds
                );
                return;
            }
            if (discardedHandIds !== undefined) {
                moves.resolveSiteMoveAbilityChoice?.(true, discardedHandIds);
                return;
            }
            const pending = G.pendingSiteMoveAbility;
            if (!pending) return;
            const source = findTargetCard(
                G,
                pending.siteInstanceId
            ) as CardState | null;
            const ability = source?.abilities?.find(
                (ab) => ab.id === pending.abilityId
            );
            if (
                source &&
                ability &&
                abilityNeedsHandDiscard(ability) &&
                requestHandDiscard(source, ability, (cardIds) => {
                    moves.resolveSiteMoveAbilityChoice?.(true, cardIds);
                })
            ) {
                return;
            }
            if (source && ability) {
                // Crossroads : Activer → désigner 1 compagnon blessé / culture.
                const onePerCulture = (ability.effects || []).some(
                    (effect) =>
                        effect.type === 'HEAL' && effect.onePerCulture
                );
                if (onePerCulture) {
                    const need = getEffectDesignationCount(G, source, ability);
                    if (
                        need >= 1 &&
                        requestMultiEffectDesignation(
                            source,
                            ability,
                            need,
                            (effectIds) => {
                                moves.resolveSiteMoveAbilityChoice?.(
                                    true,
                                    undefined,
                                    effectIds
                                );
                            }
                        )
                    ) {
                        return;
                    }
                }
                // Morannon : Activer → halo sur carte à renforcer (jeton).
                const reinforce = (ability.effects || []).some(
                    (effect) => effect.type === 'REINFORCE_CULTURE_TOKEN'
                );
                if (
                    reinforce &&
                    requestDesignation(
                        source,
                        ability,
                        (cardId) => {
                            // requestDesignation ne stoppe pas (chaînage possible) ;
                            // ici la désignation est terminale → couper le halo.
                            stopTargeting();
                            setHoveredCard(null);
                            moves.resolveSiteMoveAbilityChoice?.(
                                true,
                                undefined,
                                [cardId]
                            );
                        },
                        undefined,
                        'effect'
                    )
                ) {
                    return;
                }
            }
            moves.resolveSiteMoveAbilityChoice?.(true);
        },
        [
            G,
            moves,
            requestHandDiscard,
            requestMultiEffectDesignation,
            requestDesignation,
            stopTargeting,
            setHoveredCard,
        ]
    );

    /**
     * Halo site (Morannon / Crossroads / Ruined) : couper seulement si un
     * pending site existe pour l’adversaire. Ne pas toucher aux autres
     * DESIGNATION (sinon Activer Ruined → halo immédiatement tué).
     */
    useEffect(() => {
        if (targetingKind !== 'DESIGNATION') return;

        const movePending = G.pendingSiteMoveAbility;
        const followerPending = G.pendingSiteFollowerTransfer;
        const fpDiscardPending = G.pendingFpDiscard;
        const forceAssignPreventPending = G.pendingForceAssignPreventDiscard;
        const phaseDesignationPending = G.pendingSitePhaseDesignation;
        const moveMine =
            Boolean(movePending) &&
            String(movePending!.playerId) === String(myId);
        const followerMine =
            Boolean(followerPending) &&
            String(followerPending!.playerId) === String(myId);
        const fpDiscardMine =
            Boolean(fpDiscardPending) &&
            String(fpDiscardPending!.playerId) === String(myId);
        const forceAssignPreventMine =
            Boolean(forceAssignPreventPending) &&
            String(forceAssignPreventPending!.playerId) === String(myId);
        const phaseDesignationMine =
            Boolean(phaseDesignationPending) &&
            String(phaseDesignationPending!.playerId) === String(myId);

        if (
            moveMine ||
            followerMine ||
            fpDiscardMine ||
            forceAssignPreventMine ||
            phaseDesignationMine
        )
            return;

        if (
            movePending ||
            followerPending ||
            fpDiscardPending ||
            forceAssignPreventPending ||
            phaseDesignationPending
        ) {
            stopTargeting();
            setHoveredCard(null);
        }
    }, [
        G.pendingSiteMoveAbility,
        G.pendingSiteFollowerTransfer,
        G.pendingFpDiscard,
        G.pendingForceAssignPreventDiscard,
        G.pendingSitePhaseDesignation,
        myId,
        targetingKind,
        stopTargeting,
        setHoveredCard,
    ]);

    /** Dol Guldur : dès que le pending FP s’ouvre, halo sur les situations. */
    useEffect(() => {
        const pending = G.pendingFpDiscard;
        if (!pending || String(pending.playerId) !== String(myId)) return;
        if (isTargetingActive) return;

        const source = findTargetCard(
            G,
            pending.sourceInstanceId
        ) as CardState | null;
        const ability = source?.abilities?.find(
            (ab) => ab.id === pending.abilityId
        );
        if (!source || !ability) return;

        const candidates = getFpDiscardCandidates(G, source, ability);
        if (candidates.length === 0) return;

        startTargeting({
            kind: 'DESIGNATION',
            targetableCardIds: candidates.flatMap(cardTargetIds),
            message: tg.discardPossessionOrCondition,
            onSelectTarget: (cardId) => {
                stopTargeting();
                setHoveredCard(null);
                moves.resolveFpDiscardChoice?.(cardId);
            },
        });
    }, [
        G.pendingFpDiscard,
        G,
        myId,
        isTargetingActive,
        startTargeting,
        stopTargeting,
        setHoveredCard,
        moves,
    ]);

    /** Southron Commander : halo sur les compagnons dissociés à défausser. */
    useEffect(() => {
        const pending = G.pendingForceAssignPreventDiscard;
        if (!pending || String(pending.playerId) !== String(myId)) return;
        if (isTargetingActive) return;

        const candidates = getForceAssignPreventDiscardCandidates(G);
        if (candidates.length === 0) return;

        startTargeting({
            kind: 'DESIGNATION',
            targetableCardIds: candidates.flatMap(cardTargetIds),
            message: tg.discardUnboundPrevent,
            onSelectTarget: (cardId) => {
                stopTargeting();
                setHoveredCard(null);
                moves.resolveForceAssignPreventDiscardChoice?.(cardId);
            },
        });
    }, [
        G.pendingForceAssignPreventDiscard,
        G,
        myId,
        isTargetingActive,
        startTargeting,
        stopTargeting,
        setHoveredCard,
        moves,
    ]);

    /** Buckland : Nazgûl joué → halo sur les situations à défausser. */
    useEffect(() => {
        const pending = G.pendingSitePhaseDesignation;
        if (!pending || String(pending.playerId) !== String(myId)) return;
        if (isTargetingActive) return;

        const candidates = getSitePhaseDesignationCandidates(G);
        if (candidates.length === 0) return;

        startTargeting({
            kind: 'DESIGNATION',
            targetableCardIds: candidates.flatMap(cardTargetIds),
            message: tg.discardConditionInPlay,
            onSelectTarget: (cardId) => {
                stopTargeting();
                setHoveredCard(null);
                moves.resolveSitePhaseDesignationChoice?.(cardId);
            },
        });
    }, [
        G.pendingSitePhaseDesignation,
        G,
        myId,
        isTargetingActive,
        startTargeting,
        stopTargeting,
        setHoveredCard,
        moves,
    ]);

    const handleResolveWhenPlayedChoice = useCallback(
        (accept: boolean, discardedHandIds?: string[]) => {
            if (!accept) {
                moves.resolveWhenPlayedChoice?.(false);
                return;
            }
            if (discardedHandIds !== undefined) {
                moves.resolveWhenPlayedChoice?.(true, discardedHandIds);
                return;
            }
            const pending = G.pendingWhenPlayed;
            if (!pending) {
                moves.resolveWhenPlayedChoice?.(true);
                return;
            }
            const source = findTargetCard(
                G,
                pending.sourceInstanceId
            ) as CardState | null;
            const ability = source?.abilities?.find(
                (ab) => ab.id === pending.abilityId
            );
            if (!source || !ability) {
                moves.resolveWhenPlayedChoice?.(true);
                return;
            }
            const discard = abilityDiscardFromHandEffect(ability);
            if (discard) {
                const fpId = G.fpPlayerId || '0';
                const ownerId =
                    source.kind === 'SHADOW'
                        ? fpId === '0'
                            ? '1'
                            : '0'
                        : fpId;
                const hand = G.players[ownerId]?.hand || [];
                if (hand.length === 0) {
                    moves.resolveWhenPlayedChoice?.(true, []);
                    return;
                }
                requestHandDiscard(source, ability, (cardIds) => {
                    moves.resolveWhenPlayedChoice?.(true, cardIds);
                });
                return;
            }
            if (
                abilityNeedsSiteReplace(ability) ||
                abilityNeedsSiteExchange(ability)
            ) {
                if (abilityNeedsPathThenDeckSite(ability)) {
                    requestPathThenDeckSite(source, ability, (pathId, deckId) => {
                        moves.resolveWhenPlayedChoice?.(
                            true,
                            undefined,
                            [pathId, deckId]
                        );
                    });
                    return;
                }
                if (
                    requestSiteReplace(source, ability, (siteId) => {
                        moves.resolveWhenPlayedChoice?.(
                            true,
                            undefined,
                            siteId
                        );
                    })
                ) {
                    return;
                }
            }
            // Reinforce (ou autre effet) : désigner la carte cible avant d’accepter.
            if (abilityNeedsEffectDesignation(G, source, ability)) {
                if (
                    requestDesignation(
                        source,
                        ability,
                        (cardId) => {
                            stopTargeting();
                            moves.resolveWhenPlayedChoice?.(
                                true,
                                undefined,
                                cardId
                            );
                        },
                        undefined,
                        'effect'
                    )
                ) {
                    return;
                }
            }
            if (abilityNeedsDeckOrDiscardPick(ability)) {
                const searchEffect =
                    abilitySearchDeckToDiscardEffect(ability);
                if (searchEffect) {
                    const selectable = getDeckSearchToDiscardCandidates(
                        G,
                        myId,
                        searchEffect.target
                    );
                    if (selectable.length === 0) {
                        moves.resolveWhenPlayedChoice?.(false);
                        return;
                    }
                    const pool = getDeckOrDiscardBrowsePool(G, myId);
                    setDeckDiscardPick({
                        whenPlayed: true,
                        selectableCardIds:
                            selectable.flatMap(cardTargetIds),
                        deck: pool.deck,
                        discard: [],
                    });
                    return;
                }
                const takeEffect = abilityTakeFromDiscardEffect(ability);
                if (takeEffect) {
                    const discard = G.players[myId]?.discard || [];
                    const selectable = discard.filter(
                        (c) =>
                            c && cardMatchesTarget(c, takeEffect.target)
                    );
                    if (selectable.length === 0) {
                        moves.resolveWhenPlayedChoice?.(false);
                        return;
                    }
                    // Toujours ouvrir la grille (même 1 carte) — Bilbo, etc.
                    setDeckDiscardPick({
                        whenPlayed: true,
                        selectableCardIds: selectable.flatMap(cardTargetIds),
                        deck: [],
                        discard: [...discard],
                        title: tg.discardPileTitle,
                        subtitle: tg.chooseTakeToHand,
                    });
                    return;
                }
                const effect =
                    abilityPlayFromDeckOrDiscardEffect(ability);
                if (!effect) {
                    moves.resolveWhenPlayedChoice?.(true);
                    return;
                }
                const attachHost =
                    effect.attachTo === 'SELF' ? source : null;
                const from = effect.from || 'DECK_OR_DISCARD';
                const selectable = getDeckOrDiscardPlayCandidates(
                    G,
                    myId,
                    effect.target,
                    'shadow',
                    attachHost,
                    from
                );
                if (selectable.length === 0) {
                    moves.resolveWhenPlayedChoice?.(false);
                    return;
                }
                const pool = getDeckOrDiscardBrowsePool(G, myId);
                setDeckDiscardPick({
                    whenPlayed: true,
                    selectableCardIds: selectable.flatMap(cardTargetIds),
                    deck: from === 'DISCARD' ? [] : pool.deck,
                    discard: from === 'DECK' ? [] : pool.discard,
                    title:
                        from === 'DECK'
                            ? tg.drawDeckTitle
                            : from === 'DISCARD'
                              ? tg.discardPileTitle
                              : undefined,
                    subtitle:
                        from === 'DECK'
                            ? tg.choosePlayablePossessionDeck
                            : undefined,
                });
                return;
            }
            moves.resolveWhenPlayedChoice?.(true);
        },
        [
            G,
            myId,
            moves,
            requestHandDiscard,
            requestSiteReplace,
            requestPathThenDeckSite,
            requestDesignation,
            stopTargeting,
        ]
    );

    // 🟢 1. Détection stricte de la phase de setup
    const isSetupPhase = Boolean(
        G?.setupState &&
        G.setupState.step !== 'COMPLETED' &&
        ctx.phase === 'setup'
    );

    // Camps connus dès le choix du gagnant d’enchère (pas besoin d’attendre le mulligan).
    const setupStep = G.setupState?.step;
    const sidesAssigned =
        !isSetupPhase ||
        (setupStep !== 'BIDDING' && setupStep !== 'CHOOSING_FIRST');

    // 🟢 2. Identification des rôles (TOUJOURS définie)
    const fpPlayerId = G.fpPlayerId || '0';
    const isLocalFP = myId === fpPlayerId;
    const isLocalShadow = !isLocalFP; // 👈 Rétabli pour G.awaitingSiteSelection et les rôles

    // 🟢 3. Thème visuel du plateau (neutre jusqu’à l’assignation des camps)
    const currentFaction: 'FREE_PEOPLE' | 'SHADOW' | 'NEUTRAL' = !sidesAssigned
        ? 'NEUTRAL'
        : isLocalFP
          ? 'FREE_PEOPLE'
          : 'SHADOW';

    const me = G.players[myId] || {
        deck: [],
        hand: [],
        discard: [],
        deadPile: [],
        removedFromGame: [],
        fellowshipArea: [],
        supportArea: [],
        sitesDeck: [],
        currentSiteIndex: 0,
    };
    const opponent = G.players[oppId] || {
        deck: [],
        hand: [],
        discard: [],
        deadPile: [],
        removedFromGame: [],
        fellowshipArea: [],
        supportArea: [],
        sitesDeck: [],
        currentSiteIndex: 0,
    };

    const [openOutOfPlayZone, setOpenOutOfPlayZone] =
        useState<OutOfPlayZoneKey | null>(null);
    const [optionsOpen, setOptionsOpen] = useState(false);

    /** Recherche pioche + défausse (Captured / Gandalf Returned…) — grille pleine, sélection restreinte. */
    const [deckDiscardPick, setDeckDiscardPick] = useState<{
        handIndex?: number;
        whenPlayed?: boolean;
        /** Famille sites « Shadow: play… » : carte à jouer depuis la défausse/pioche (toaster du site). */
        sitePhasePick?: { abilityId?: string };
        activate?: {
            sourceInstanceId: string;
            abilityId: string;
            /** Un ou plusieurs ids (exert N distincts → Green Dragon / East Wall). */
            costId?: string | string[];
        };
        selectableCardIds: string[];
        deck: CardState[];
        discard: CardState[];
        /** Pinnacle : grille sur la pile de mort (activation depuis un site). */
        deadPile?: CardState[];
        title?: string;
        subtitle?: string;
    } | null>(null);

    // Fin de flux site start : succès (pending cleared), Échap, ou fermeture grille.
    useEffect(() => {
        if (!siteStartFlowActive) return;
        if (!G.pendingSiteStartAbility) {
            setSiteStartFlowActive(false);
            siteStartBridgeRef.current = false;
            return;
        }
        if (
            !isTargetingActive &&
            !deckDiscardPick &&
            !siteStartBridgeRef.current
        ) {
            setSiteStartFlowActive(false);
        }
    }, [
        siteStartFlowActive,
        G.pendingSiteStartAbility,
        isTargetingActive,
        deckDiscardPick,
    ]);

    /** Pile empilée (Web / Goblin Swarms…) — même overlay que la défausse. */
    const [stackOverlay, setStackOverlay] = useState<{
        title: string;
        subtitle?: string;
        cards: CardState[];
        selectableCardIds?: string[];
        onSelectCard?: (cardId: string) => void;
    } | null>(null);

    /** Falls of Rauros : grille de choix dans la pile de mort (choix obligatoire). */
    const openDeadPileRemovalPick = useCallback(() => {
        const pending = G.pendingDeadPileRemoval;
        if (!pending || String(pending.playerId) !== String(myId)) return;
        const candidates = me.deadPile || [];
        if (candidates.length === 0) return;
        setOpenOutOfPlayZone(null);
        setStackOverlay({
            title: 'Falls of Rauros',
            subtitle: tg.deadPileRemoveSubtitle,
            cards: candidates,
            selectableCardIds: candidates.map(
                (c) => c.instanceId || c.id
            ),
            onSelectCard: (cardId) => {
                moves.resolveDeadPileRemovalChoice?.(cardId);
            },
        });
    }, [G.pendingDeadPileRemoval, me.deadPile, myId, moves, tg]);

    const deadPileRemovalKeyRef = useRef<string | null>(null);
    useEffect(() => {
        const pending = G.pendingDeadPileRemoval;
        if (!pending) {
            deadPileRemovalKeyRef.current = null;
            return;
        }
        if (String(pending.playerId) !== String(myId)) return;
        const key = `${pending.siteInstanceId}:${pending.abilityId}`;
        if (deadPileRemovalKeyRef.current === key) return;
        deadPileRemovalKeyRef.current = key;
        openDeadPileRemovalPick();
    }, [G.pendingDeadPileRemoval, myId, openDeadPileRemovalPick]);

    useEffect(() => {
        const onOpen = (event: Event) => {
            const detail = (event as CustomEvent).detail as {
                title: string;
                subtitle?: string;
                cards: CardState[];
                selectableCardIds?: string[];
                onSelectCard?: (cardId: string) => void;
            };
            if (!detail?.cards) return;
            setOpenOutOfPlayZone(null);
            setStackOverlay(detail);
        };
        window.addEventListener('open-stack-overlay', onOpen);
        return () => window.removeEventListener('open-stack-overlay', onOpen);
    }, []);

    const closeDeckDiscardPick = useCallback(() => {
        setDeckDiscardPick(null);
        moves.cancelPendingPlay?.();
    }, [moves]);

    /** Révélation (Hidden Knowledge / main…) : grille, validation via toaster. */
    const revealOverlay = useMemo(() => {
        const pending = G.pendingReveal;
        if (!pending) return null;
        const zone = pending.zone || 'DECK_TOP';
        const subjectId = pending.subjectPlayerId || pending.opponentId;
        const subject = G.players[subjectId];
        const pile =
            zone === 'HAND' ? subject?.hand || [] : subject?.deck || [];
        const cards = pending.cardIds
            .map((id) =>
                pile.find((c) => c.instanceId === id || c.id === id)
            )
            .filter((c): c is CardState => Boolean(c));
        const iAmViewer =
            (pending.viewerId || pending.playerId) === myId;
        const iAmSubject = subjectId === myId;
        const mayDiscardOne =
            zone === 'HAND' &&
            Boolean(pending.aftermath?.mayDiscardOne) &&
            iAmViewer &&
            cards.length > 0;
        if (zone === 'HAND') {
            return {
                title: iAmSubject
                    ? tg.yourHandRevealed
                    : tg.revealedOpponentHand,
                subtitle: iAmViewer
                    ? mayDiscardOne
                        ? tg.revealHandMayDiscard
                        : tg.revealHandConsult
                    : tg.revealHandOpponentWaiting,
                cards,
                mayDiscardOne,
                selectableCardIds: mayDiscardOne
                    ? cards
                          .map((c) => c.instanceId || c.id)
                          .filter(Boolean)
                    : undefined,
            };
        }
        return {
            title: tg.revealedCards,
            subtitle: tg.revealTopDeck,
            cards,
            mayDiscardOne: false,
            selectableCardIds: undefined,
        };
    }, [G.pendingReveal, G.players, myId, tg]);

    /** Défausse main pour un choix forcé (Pelennor Flat…). */
    const forcedHandDiscardKeyRef = useRef<string | null>(null);
    useEffect(() => {
        const pending = G.pendingForcedChoice;
        if (
            !pending?.needsHandDiscard ||
            pending.pendingOptionIndex === undefined ||
            pending.playerId !== myId
        ) {
            forcedHandDiscardKeyRef.current = null;
            return;
        }
        const key = `${pending.sourceInstanceId}:${pending.pendingOptionIndex}:${pending.needsHandDiscard}`;
        if (forcedHandDiscardKeyRef.current === key) return;
        if (targetingKind === 'HAND_DISCARD') return;
        forcedHandDiscardKeyRef.current = key;

        const need = pending.needsHandDiscard;
        const optionIndex = pending.pendingOptionIndex;
        const source =
            (findTargetCard(G, pending.sourceInstanceId) as CardState | null) ||
            ({
                id: pending.sourceInstanceId,
                kind: 'SITE',
                type: 'SITE',
            } as CardState);
        const ability = {
            id: pending.abilityId,
            phases: [],
            cost: [],
            effects: [
                { type: 'DISCARD_FROM_HAND' as const, count: need },
            ],
            source: 'SELF' as const,
            text: '',
        };
        requestHandDiscard(
            source,
            ability,
            (cardIds) => {
                forcedHandDiscardKeyRef.current = null;
                moves.resolveForcedChoiceMove?.(optionIndex, cardIds);
            },
            need
        );
    }, [
        G.pendingForcedChoice,
        G,
        myId,
        targetingKind,
        requestHandDiscard,
        moves,
    ]);

    /** Désignation plateau (affaiblir N compagnons) pour un choix forcé (Isildur RB…). */
    const forcedExertKeyRef = useRef<string | null>(null);
    useEffect(() => {
        const pending = G.pendingForcedChoice;
        if (
            !pending?.needsExertTargets ||
            pending.pendingOptionIndex === undefined ||
            pending.playerId !== myId
        ) {
            forcedExertKeyRef.current = null;
            return;
        }
        const key = `${pending.sourceInstanceId}:${pending.pendingOptionIndex}:${pending.needsExertTargets}`;
        if (forcedExertKeyRef.current === key) return;
        if (targetingKind === 'DESIGNATION') return;
        forcedExertKeyRef.current = key;

        const need = pending.needsExertTargets;
        const optionIndex = pending.pendingOptionIndex;
        const source = findTargetCard(
            G,
            pending.sourceInstanceId
        ) as CardState | null;
        if (!source) return;
        const ability = {
            id: pending.abilityId,
            phases: [],
            cost: [],
            effects: [
                {
                    type: 'EXERT' as const,
                    count: 1,
                    multiCount: need,
                    target: [['COMPANION']] as string[][],
                },
            ],
            source: 'SELF' as const,
            text: '',
        };
        requestMultiEffectDesignation(source, ability, need, (cardIds) => {
            forcedExertKeyRef.current = null;
            moves.resolveForcedChoiceMove?.(optionIndex, undefined, cardIds);
        });
    }, [
        G.pendingForcedChoice,
        G,
        myId,
        targetingKind,
        requestMultiEffectDesignation,
        moves,
    ]);

    const outOfPlayOverlay = useMemo(() => {
        if (
            !openOutOfPlayZone ||
            deckDiscardPick ||
            stackOverlay ||
            revealOverlay
        )
            return null;

        switch (openOutOfPlayZone) {
            case 'my-discard':
                return {
                    title: ui.chrome.overlay.myDiscard,
                    cards: me.discard || [],
                };
            case 'my-cemetery':
                return {
                    title: ui.chrome.overlay.myCemetery,
                    cards: me.deadPile || [],
                };
            case 'opponent-discard':
                return {
                    title: ui.chrome.overlay.opponentDiscard,
                    cards: opponent.discard || [],
                };
            case 'opponent-cemetery':
                return {
                    title: ui.chrome.overlay.opponentCemetery,
                    cards: opponent.deadPile || [],
                };
            case 'my-removed':
                return {
                    title: ui.chrome.overlay.myRemoved,
                    cards: me.removedFromGame || [],
                };
            case 'opponent-removed':
                return {
                    title: ui.chrome.overlay.opponentRemoved,
                    cards: opponent.removedFromGame || [],
                };
            default:
                return null;
        }
    }, [
        ui,
        openOutOfPlayZone,
        deckDiscardPick,
        stackOverlay,
        revealOverlay,
        me.deadPile,
        me.discard,
        me.removedFromGame,
        opponent.deadPile,
        opponent.discard,
        opponent.removedFromGame,
    ]);

    const currentSiteIndex = G.players['0']?.currentSiteIndex ?? 0;

    // 🟢 1. GESTION GLOBALE DE LA TEMPORISATION DE FIN DE PHASE
    useEffect(() => {
        if (
            G.pendingPhaseEnd &&
            !G.responseWindow?.isOpen &&
            !G.pendingEvent
        ) {
            const GLOBAL_PHASE_DELAY = 1500;

            const timer = setTimeout(() => {
                if (moves.confirmEndPhase) {
                    moves.confirmEndPhase();
                }
            }, GLOBAL_PHASE_DELAY);

            return () => clearTimeout(timer);
        }
    }, [G.pendingPhaseEnd, G.responseWindow, G.pendingEvent, moves]);

    // 🟢 NETTOYAGE VISUEL UNIVERSEL (Toutes phases / Tous événements)
    useEffect(() => {
        if (G.responseWindow?.isOpen || G.pendingEvent) {
            return;
        }

        const hasWounded =
            G.lastWoundedCardIds && G.lastWoundedCardIds.length > 0;
        const hasExerted =
            G.lastExertedCardIds && G.lastExertedCardIds.length > 0;
        const hasHealed =
            G.lastHealedCardIds && G.lastHealedCardIds.length > 0;
        const hasPendingDead =
            G.pendingDeadCardIds && G.pendingDeadCardIds.length > 0;
        const activeSkirmish = G.skirmishes?.find(
            (skirmish) => skirmish.id === G.activeSkirmishId
        );
        const skirmishOutcomeSettled = Boolean(activeSkirmish?.resolved);

        if (
            hasWounded ||
            hasExerted ||
            hasHealed ||
            hasPendingDead ||
            skirmishOutcomeSettled
        ) {
            const delay =
                hasWounded || hasPendingDead || hasExerted || hasHealed
                    ? 2000
                    : 1000;
            const timer = setTimeout(() => {
                moves.cleanupPendingDeaths?.();
            }, delay);

            return () => clearTimeout(timer);
        }
    }, [
        G.lastWoundedCardIds,
        G.lastExertedCardIds,
        G.lastHealedCardIds,
        G.pendingDeadCardIds,
        G.activeSkirmishId,
        G.skirmishes,
        G.responseWindow,
        G.pendingEvent,
        moves,
    ]);

    // 🟢 3. ROUTER DE DRAG & DROP GLOBAL
    useEffect(() => {
        const handleGlobalCardDrop = (e: Event) => {
            const customEvent = e as CustomEvent;

            const { draggedCard, targetId, cancelled } =
                customEvent.detail || {};

            if (!draggedCard) {
                console.warn('⚠️ DROP IGNORÉ : draggedCard manquant');
                return;
            }

            const { index, origin, card, parentId } = draggedCard;

            // Condition « Plays on a site » (Tempête conjurée, Neiges…) :
            // coût exert = halo + clic ; site = halo + clic. Jamais de flèche.
            if (origin === 'HAND' && card && attachesToSite(card)) {
                if (cancelled) {
                    moves.cancelPendingPlay?.();
                    return;
                }
                const validation = canPlayCard(card, {
                    G,
                    ctx,
                    playerID: myId,
                });
                if (!validation.valid) {
                    console.warn(
                        `❌ [canPlayCard] Rejet : ${validation.reason}`
                    );
                    moves.cancelPendingPlay?.();
                    return;
                }
                const siteIds = getSiteAttachmentHostIds(G, card, myId);
                if (siteIds.length === 0) {
                    moves.cancelPendingPlay?.();
                    return;
                }
                const costIds = getToPlayExertTargetIds(G, card);

                const finishAttach = (
                    siteId: string,
                    costTargetId?: string
                ) => {
                    stopTargeting();
                    moves.attachCard?.(index, siteId, costTargetId);
                    moves.cancelPendingPlay?.();
                    audioService.play('CARD_PLAY');
                };

                const startSitePick = (costTargetId?: string) => {
                    if (siteIds.length === 1) {
                        finishAttach(siteIds[0]!, costTargetId);
                        return;
                    }
                    startTargeting({
                        kind: 'SITE_ATTACH',
                        targetableCardIds: siteIds,
                        pendingCard: card,
                        message: tg.playOnSite,
                        onSelectTarget: (siteId) =>
                            finishAttach(siteId, costTargetId),
                    });
                };

                if (costIds.length === 0) {
                    if (
                        targetId &&
                        isDesignationTargetId(siteIds, targetId)
                    ) {
                        finishAttach(targetId as string);
                        return;
                    }
                    startSitePick();
                    return;
                }

                // Drop sur un site → d’abord affaiblir, puis poser là.
                if (targetId && isDesignationTargetId(siteIds, targetId)) {
                    const preselectedSite = targetId as string;
                    moves.beginPendingPlay?.(
                        index,
                        tg.exertMinionToPlay
                    );
                    startTargeting({
                        kind: 'DESIGNATION',
                        targetableCardIds: costIds,
                        message:
                            tg.exertMinionToPlay,
                        onSelectTarget: (costId) =>
                            finishAttach(preselectedSite, costId),
                    });
                    return;
                }

                // Drop sur le coût → puis choisir le site.
                if (targetId && isDesignationTargetId(costIds, targetId)) {
                    startSitePick(targetId as string);
                    return;
                }

                // Drop ailleurs → halo coût, puis site.
                moves.beginPendingPlay?.(
                    index,
                    tg.exertMinionThenSite
                );
                startTargeting({
                    kind: 'DESIGNATION',
                    targetableCardIds: costIds,
                    message: tg.exertMinionToPlay,
                    onSelectTarget: (costId) => startSitePick(costId),
                });
                return;
            }

            if (origin === 'HAND' && card?.type === 'EVENT') {
                if (cancelled) {
                    moves.cancelPendingPlay?.();
                    return;
                }

                const validation = canPlayCard(card, {
                    G,
                    ctx,
                    playerID: myId,
                });

                if (!validation.valid) {
                    console.warn(
                        `❌ [canPlayCard] Rejet : ${validation.reason}`
                    );
                    return;
                }

                const designationIds = draggedCard.designationTargetIds;
                if (designationIds?.length) {
                    if (!isDesignationTargetId(designationIds, targetId)) {
                        return;
                    }

                    const eventAbility = findEventAbilityForPhase(
                        card,
                        ctx.phase || '',
                        G
                    );

                    // Event REGION replace / exchange : flèche → site path, puis picker deck
                    if (
                        eventAbility &&
                        abilityNeedsPathThenDeckSite(eventAbility) &&
                        targetId
                    ) {
                        const pathSite = (G.path || []).find(
                            (site) =>
                                site &&
                                (site.instanceId === targetId ||
                                    site.id === targetId)
                        );
                        if (
                            requestSiteReplace(
                                card,
                                eventAbility,
                                (deckSiteId) => {
                                    stopTargeting();
                                    moves.playCard?.(index, [
                                        targetId,
                                        deckSiteId,
                                    ]);
                                    audioService.play('CARD_PLAY');
                                },
                                pathSite?.id || targetId
                            )
                        ) {
                            return;
                        }
                    }

                    // Coût + effet distincts : halo coût, puis flèche depuis l’agent (coût)
                    if (
                        eventAbility &&
                        abilityNeedsCostDesignation(G, card, eventAbility) &&
                        abilityNeedsEffectDesignation(G, card, eventAbility) &&
                        !costAndEffectShareHandDesignation(eventAbility)
                    ) {
                        const costId = targetId as string;
                        if (
                            requestDesignation(
                                card,
                                eventAbility,
                                (effectId) => {
                                    stopTargeting();
                                    moves.playCard?.(index, [costId, effectId]);
                                    audioService.play('CARD_PLAY');
                                },
                                index,
                                'effect',
                                costId
                            )
                        ) {
                            return;
                        }
                    }

                    if (typeof moves.playCard === 'function') {
                        moves.playCard(index, targetId);
                        audioService.play('CARD_PLAY');
                        if (
                            eventAbility &&
                            abilityEffectWantsTargetingArrow(eventAbility)
                        ) {
                            playTargetingArrowHitSound({
                                sourceId: card.id,
                                abilityPhases: eventAbility.phases,
                                gamePhase: ctx.phase,
                            });
                        }
                    }
                    return;
                }

                const eventAbility = findEventAbilityForPhase(
                    card,
                    ctx.phase || '',
                    G
                );
                // Replace / exchange path : halo site (pas de flèche pendant le drag).
                if (
                    eventAbility &&
                    abilityNeedsPathThenDeckSite(eventAbility)
                ) {
                    const pathIds = getPathThenDeckSiteTargetIds(
                        G,
                        card,
                        eventAbility
                    );
                    if (pathIds.length === 0) return;
                    const openDeckPicker = (pathSiteId: string) => {
                        const pathSite = (G.path || []).find(
                            (site) =>
                                site &&
                                (site.instanceId === pathSiteId ||
                                    site.id === pathSiteId)
                        );
                        if (
                            requestSiteReplace(
                                card,
                                eventAbility,
                                (deckSiteId) => {
                                    stopTargeting();
                                    moves.playCard?.(index, [
                                        pathSiteId,
                                        deckSiteId,
                                    ]);
                                    audioService.play('CARD_PLAY');
                                },
                                pathSite?.id || pathSiteId
                            )
                        ) {
                            return;
                        }
                    };
                    if (
                        targetId &&
                        isDesignationTargetId(pathIds, targetId)
                    ) {
                        openDeckPicker(targetId as string);
                        return;
                    }
                    moves.beginPendingPlay?.(
                        index,
                        abilityNeedsSiteExchange(eventAbility)
                            ? tg.exchangePathSite
                            : tg.replaceRegionSite
                    );
                    startTargeting({
                        kind: 'SITE_ATTACH',
                        targetableCardIds: pathIds,
                        pendingCard: card,
                        message: abilityNeedsSiteExchange(eventAbility)
                            ? tg.exchangePathSite
                            : tg.replaceRegionSite,
                        onSelectTarget: (pathSiteId) => {
                            openDeckPicker(pathSiteId);
                        },
                    });
                    return;
                }
                if (
                    eventAbility &&
                    abilityNeedsSiteReplace(eventAbility) &&
                    abilityReplaceSiteEffect(eventAbility)?.scope === 'CURRENT'
                ) {
                    if (
                        requestSiteReplace(card, eventAbility, (deckSiteId) => {
                            stopTargeting();
                            moves.playCard?.(index, deckSiteId);
                            audioService.play('CARD_PLAY');
                        })
                    ) {
                        return;
                    }
                }
                if (
                    eventAbility &&
                    abilityNeedsDeckOrDiscardPick(eventAbility)
                ) {
                    const effect =
                        abilityPlayFromDeckOrDiscardEffect(eventAbility);
                    if (!effect) return;
                    const selectable = getDeckOrDiscardPlayCandidates(
                        G,
                        myId,
                        effect.target,
                        ctx.phase || 'shadow'
                    );
                    if (selectable.length === 0) {
                        console.warn(
                            '❌ Aucune carte jouable dans la pioche / défausse.'
                        );
                        return;
                    }
                    const pool = getDeckOrDiscardBrowsePool(G, myId);
                    moves.beginPendingPlay?.(
                        index,
                        tg.browseDeckDiscardPlayable
                    );
                    setDeckDiscardPick({
                        handIndex: index,
                        selectableCardIds: selectable.flatMap(cardTargetIds),
                        deck: pool.deck,
                        discard: pool.discard,
                    });
                    return;
                }
                const finishEventPlay = (
                    chosen?: string | string[],
                    toilIds?: string[]
                ) => {
                    stopTargeting();
                    moves.playCard?.(index, chosen, toilIds);
                    audioService.play('CARD_PLAY');
                };

                const requestEventEffectThenPlay = (toilIds: string[]) => {
                    if (!eventAbility) {
                        finishEventPlay(undefined, toilIds);
                        return;
                    }
                    const needsCost = abilityNeedsCostDesignation(
                        G,
                        card,
                        eventAbility
                    );
                    const needsEffect = abilityNeedsEffectDesignation(
                        G,
                        card,
                        eventAbility
                    );
                    const effectNeed = getEffectDesignationCount(
                        G,
                        card,
                        eventAbility
                    );
                    // Coût à désigner + effet (Vengeance de Gondor…) : halo coût
                    // puis effet — avant le raccourci « 1 cible d’effet seule ».
                    if (
                        needsCost &&
                        needsEffect &&
                        !costAndEffectShareHandDesignation(eventAbility)
                    ) {
                        if (
                            requestDesignation(
                                card,
                                eventAbility,
                                (costId) => {
                                    if (effectNeed > 1) {
                                        if (
                                            !requestMultiEffectDesignation(
                                                card,
                                                eventAbility,
                                                effectNeed,
                                                (effectIds) => {
                                                    finishEventPlay(
                                                        [costId, ...effectIds],
                                                        toilIds
                                                    );
                                                }
                                            )
                                        ) {
                                            console.warn(
                                                `❌ Impossible de désigner ${effectNeed} cibles.`
                                            );
                                        }
                                        return;
                                    }
                                    requestDesignation(
                                        card,
                                        eventAbility,
                                        (effectId) => {
                                            finishEventPlay(
                                                [costId, effectId],
                                                toilIds
                                            );
                                        },
                                        index,
                                        'effect',
                                        // Défausse / soin : pas de flèche
                                        abilityEffectWantsTargetingArrow(
                                            eventAbility
                                        )
                                            ? costId
                                            : undefined
                                    );
                                },
                                index,
                                'cost'
                            )
                        ) {
                            return;
                        }
                    }
                    // Coût seul (À leurs Trousses / Courroux Sanguinaire…) :
                    // halo coût — pas le raccourci « 1 cible d’effet ».
                    if (needsCost && !needsEffect) {
                        const costCandidateIds = getCostDesignationCandidates(
                            G,
                            card,
                            eventAbility,
                            myId
                        ).flatMap(cardTargetIds);
                        // Drop déjà sur le coût → jouer tout de suite.
                        if (
                            targetId &&
                            isDesignationTargetId(costCandidateIds, targetId)
                        ) {
                            finishEventPlay(targetId, toilIds);
                            return;
                        }
                        if (
                            requestDesignation(
                                card,
                                eventAbility,
                                (costId) =>
                                    finishEventPlay(costId, toilIds),
                                index,
                                'cost'
                            )
                        ) {
                            return;
                        }
                        // Jamais jouer sans avoir payé le coût désigné.
                        console.warn(
                            '❌ Impossible de désigner le coût de cet événement.'
                        );
                        return;
                    }
                    // Défausse ×N : autant que possible (min(N, dispo)).
                    // 0 dispo → jouer sans cible ; 1 → désignation simple ;
                    // 2+ jusqu’au plafond → multi.
                    if (needsEffect && effectNeed > 1) {
                        if (
                            !requestMultiEffectDesignation(
                                card,
                                eventAbility,
                                effectNeed,
                                (effectIds) => {
                                    if (effectIds.length !== effectNeed) {
                                        return;
                                    }
                                    finishEventPlay(effectIds, toilIds);
                                }
                            )
                        ) {
                            console.warn(
                                `❌ Impossible de désigner ${effectNeed} cibles.`
                            );
                        }
                        return;
                    }
                    if (needsEffect && effectNeed === 1) {
                        if (
                            requestDesignation(
                                card,
                                eventAbility,
                                (chosenId) =>
                                    finishEventPlay(chosenId, toilIds),
                                index,
                                'effect'
                            )
                        ) {
                            return;
                        }
                        finishEventPlay(undefined, toilIds);
                        return;
                    }
                    // effectNeed === 0 : aucune situation → effet vide OK.
                    if (
                        (eventAbility.effects || []).some(
                            (item) =>
                                item.type === 'DISCARD' &&
                                !item.chooser &&
                                Array.isArray(item.target) &&
                                (item.count || 1) > 1
                        )
                    ) {
                        finishEventPlay(undefined, toilIds);
                        return;
                    }
                    if (
                        requestDesignation(
                            card,
                            eventAbility,
                            (chosenId) =>
                                finishEventPlay(chosenId, toilIds),
                            index
                        )
                    ) {
                        return;
                    }
                    finishEventPlay(undefined, toilIds);
                };

                if (
                    eventAbility &&
                    getToilAmount(card) > 0 &&
                    getToilCandidates(G, myId, card).length > 0 &&
                    requestToilExert(card, (toilIds) =>
                        requestEventEffectThenPlay(toilIds)
                    )
                ) {
                    return;
                }
                requestEventEffectThenPlay([]);
                return;
            }

            if (!targetId) {
                console.warn(
                    '⚠️ DROP IGNORÉ : targetId ou draggedCard manquant',
                    { targetId, draggedCard }
                );
                return;
            }

            const cardType = card?.type;
            const cardSubtype = card?.subtype;

            let soundPath;
            if (cardType === 'COMPANION' || cardType === 'ALLY') {
                soundPath = 'COMPANION';
            } else if (cardType === 'MINION') {
                soundPath = 'MINION';
            } else if (cardType === 'POSSESSION') {
                soundPath = cardSubtype
                    ? `POSSESSION_${cardSubtype}`
                    : 'POSSESSION';
            }

            if (origin === 'HAND') {
                // Hit-test : les cartes déjà en soutien « mangent » la zone.
                // Une carte SUPPORT-AREA droppée dessus = poser en soutien.
                let playTargetId = targetId as string | undefined;
                if (
                    card?.subtype === 'SUPPORT-AREA' &&
                    playTargetId &&
                    playTargetId !== 'supportArea' &&
                    playTargetId !== 'fellowshipArea' &&
                    playTargetId !== 'battlefield' &&
                    isCardInSupportArea(G, playTargetId)
                ) {
                    playTargetId = 'supportArea';
                }

                const isGlobalZone =
                    playTargetId === 'fellowshipArea' ||
                    playTargetId === 'supportArea' ||
                    playTargetId === 'battlefield';

                // Condition support « To play, exert … » (Alive / Worry…) :
                // — drop sur une cible d’affaiblissement → jouer tout de suite ;
                // — drop soutien / champ de bataille → halo (pas de flèche).
                if (card?.subtype === 'SUPPORT-AREA') {
                    const costIds = getToPlayExertTargetIds(G, card);
                    if (costIds.length > 0) {
                        const validation = canPlayCard(card, {
                            G,
                            ctx,
                            playerID: myId,
                        });
                        if (!validation.valid) {
                            console.warn(
                                `❌ [canPlayCard] Rejet : ${validation.reason}`
                            );
                            return;
                        }

                        const droppedOnCost =
                            Boolean(playTargetId) &&
                            costIds.includes(playTargetId!);
                        if (droppedOnCost) {
                            moves.playCard?.(index, playTargetId);
                            audioService.play('CARD_PLAY');
                            return;
                        }

                        const startCostDesignation =
                            playTargetId === 'supportArea' ||
                            playTargetId === 'battlefield';
                        if (startCostDesignation) {
                            startTargeting({
                                kind: 'DESIGNATION',
                                targetableCardIds: costIds,
                                message: tg.exertCharacterToPlay,
                                onSelectTarget: (costId) => {
                                    stopTargeting();
                                    moves.playCard?.(index, costId);
                                    audioService.play('CARD_PLAY');
                                },
                            });
                            return;
                        }
                    }
                }

                const targetCard = !isGlobalZone
                    ? findTargetCard(G, playTargetId || '')
                    : null;

                // L'engine vérifie absolument tout (phase, coût, unicité, validité zone/cible)
                const validation = canPlayCard(
                    card,
                    { G, ctx, playerID: myId },
                    playTargetId,
                    targetCard
                );

                if (!validation.valid) {
                    console.warn(
                        `❌ [canPlayCard] Rejet : ${validation.reason}`
                    );
                    return;
                }

                // Exécution du Move approprié
                if (targetCard) {
                    if (typeof moves.attachCard === 'function') {
                        moves.attachCard(index, playTargetId);
                    }
                } else if (
                    playTargetId === 'battlefield' &&
                    card?.kind === 'SHADOW'
                ) {
                    if (typeof moves.playShadowCard === 'function') {
                        moves.playShadowCard(index);
                    } else if (typeof moves.playCard === 'function') {
                        moves.playCard(index);
                    }
                } else {
                    if (typeof moves.playCard === 'function') {
                        moves.playCard(index);
                    }
                }
                return;
            }

            if (origin === 'SITE_STACK' || origin === 'CARD_STACK') {
                if (cancelled || targetId !== 'battlefield') return;
                if (!card || card.type !== 'MINION') return;
                const stackedId = card.instanceId || card.id;

                // Engine / play autre : capacité armée → drag vers le champ
                if (
                    targetingKind === 'STACK_PLAY' &&
                    pendingCard &&
                    targetingAbilityId &&
                    isCardTargetable(stackedId)
                ) {
                    const ability = (pendingCard.abilities || []).find(
                        (ab) => ab.id === targetingAbilityId
                    );
                    const finishPlay = (handIds?: string[]) => {
                        stopTargeting();
                        moves.activateAbility?.(
                            pendingCard.instanceId || pendingCard.id,
                            targetingAbilityId,
                            stackedId,
                            handIds
                        );
                        audioService.play('CARD_PLAY');
                        if (soundPath) {
                            audioService.play(soundPath, { delay: 0.3 });
                        }
                    };
                    if (ability && abilityNeedsHandDiscard(ability)) {
                        const need = abilityDiscardFromHandCount(
                            ability,
                            card
                        );
                        requestHandDiscard(
                            pendingCard,
                            ability,
                            (cardIds) => finishPlay(cardIds),
                            need
                        );
                        return;
                    }
                    finishPlay(targetingDiscardedHandIds);
                    return;
                }

                // Web / Goblin Swarms : drag direct depuis la pile de l’hôte
                if (origin === 'CARD_STACK' && parentId) {
                    const host = findTargetCard(
                        G,
                        parentId
                    ) as CardState | null;
                    const hostAbility = (host?.abilities || []).find(
                        (ab) =>
                            isCostlessPlayFromCardStack(ab) &&
                            abilityMatchesPhase(ab, ctx.phase || '') &&
                            abilityHasLegalEffectTarget(G, host!, ab)
                    );
                    const playEffect = hostAbility
                        ? abilityPlayFromCardStackEffect(hostAbility)
                        : null;
                    const legal =
                        host &&
                        hostAbility &&
                        playEffect &&
                        getCardsStackedOnHost(host, playEffect.target).some(
                            (c) =>
                                c.instanceId === stackedId ||
                                c.id === stackedId
                        );
                    if (legal) {
                        moves.activateAbility?.(
                            host!.instanceId || host!.id,
                            hostAbility!.id,
                            stackedId
                        );
                        audioService.play('CARD_PLAY');
                        if (soundPath) {
                            audioService.play(soundPath, { delay: 0.3 });
                        }
                        return;
                    }
                }

                const ability = (card.abilities || []).find(
                    (ab) =>
                        abilityMatchesPhase(ab, ctx.phase || '') &&
                        (ab.effects || []).some(
                            (effect) => effect.type === 'PLAY_FROM_STACK'
                        )
                );
                if (!ability) return;
                moves.activateAbility?.(
                    card.instanceId || card.id,
                    ability.id
                );
                audioService.play('CARD_PLAY');
                if (soundPath) {
                    audioService.play(soundPath, { delay: 0.3 });
                }
                return;
            }

            if (origin === 'ATTACHMENT') {
                if (targetId === parentId) return;

                if (
                    targetId !== 'fellowshipArea' &&
                    targetId !== 'supportArea' &&
                    targetId !== 'battlefield'
                ) {
                    const targetCard = findTargetCard(G, targetId);
                    if (canAttachToCharacter(card, targetCard)) {
                        if (moves.transferAttachment) {
                            moves.transferAttachment({
                                attachmentId:
                                    card.instanceId || card.id,
                                fromCharacterId: parentId,
                                toCharacterId: targetId,
                            });
                            audioService.play('CARD_PLAY');
                            audioService.play(soundPath, { delay: 0.3 });
                        }
                    }
                }
            }

            if (origin === 'BATTLEFIELD') {
                const isAssignmentPhase = ctx.phase === 'assignment';
                const isMinion = card?.type === 'MINION';

                if (
                    isAssignmentPhase &&
                    isMinion &&
                    targetId !== 'fellowshipArea' &&
                    targetId !== 'supportArea' &&
                    targetId !== 'battlefield' &&
                    targetId !== 'sitePath'
                ) {
                    if (moves.assignMinion) {
                        moves.assignMinion(
                            card.instanceId || card.id,
                            targetId
                        );
                    }
                    return;
                }
            }
            if (origin === 'SUPPORT_AREA') {
                if (cardType === 'FOLLOWER') {
                    const followerId = card.instanceId || card.id;

                    if (typeof moves.transferAid === 'function') {
                        moves.transferAid(followerId, targetId);
                        audioService.play('CARD_PLAY');
                    } else {
                        console.error(
                            '❌ [GameBoard] moves.transferAid est non défini dans le composant GameBoard'
                        );
                    }
                    return;
                }
            }
        };

        window.addEventListener('card-dropped', handleGlobalCardDrop);
        return () =>
            window.removeEventListener('card-dropped', handleGlobalCardDrop);
    }, [moves, ctx.phase, G, myId, requestDesignation, requestSiteReplace, requestHandDiscard, stopTargeting, targetingKind, pendingCard, targetingAbilityId, targetingDiscardedHandIds, isCardTargetable]);

    const { setFpPlayerId } = useFaction();
    useEffect(() => {
        if (setFpPlayerId && G.fpPlayerId !== undefined) {
            setFpPlayerId(G.fpPlayerId);
        }
    }, [G.fpPlayerId, setFpPlayerId]);

    // Sanctuaire : cliquer un compagnon soigne 1 blessure (jusqu’à 5). FP uniquement.
    useEffect(() => {
        if (targetingKind === 'DESIGNATION') return;

        const remaining = G.sanctuaryHeal?.remaining ?? 0;
        if (remaining <= 0 || !isLocalFP) {
            if (targetingKind === 'SANCTUARY_HEAL') stopTargeting();
            return;
        }

        const validTargets = getSanctuaryHealCandidates(G).flatMap((card) =>
            cardTargetIds(card)
        );
        if (validTargets.length === 0) {
            if (targetingKind === 'SANCTUARY_HEAL') stopTargeting();
            return;
        }

        startTargeting({
            kind: 'SANCTUARY_HEAL',
            targetableCardIds: validTargets,
            upTo: true,
            onConfirm: () => moves.confirmSanctuaryHeals?.(),
            confirmLabel:
                remaining === SANCTUARY_HEAL_LIMIT
                    ? tg.healNothing
                    : tg.validateHeals,
            message:
                remaining === SANCTUARY_HEAL_LIMIT
                    ? tg.sanctuaryStart
                    : tg.sanctuaryRemaining(remaining),
            onSelectTarget: (cardId) => {
                moves.assignSanctuaryHeal?.(cardId);
            },
        });
    }, [
        G.sanctuaryHeal,
        G.players,
        G.fpPlayerId,
        isLocalFP,
        moves,
        startTargeting,
        stopTargeting,
        targetingKind,
    ]);

    // 🟢 4. SYNCHRONISATION DU CIBLAGE D'ARCHERIE
    useEffect(() => {
        if (targetingKind === 'DESIGNATION') return;
        if (targetingKind === 'SANCTUARY_HEAL' || G.sanctuaryHeal) return;

        if ((G.threatWoundsToAssign ?? 0) > 0) {
            if (targetingKind === 'ARCHERY') stopTargeting();
            return;
        }

        if (
            ctx.phase !== 'archery' ||
            !G.archeryState ||
            G.responseWindow?.isOpen ||
            G.pendingEvent
        ) {
            if (targetingKind === 'ARCHERY') stopTargeting();
            return;
        }

        const { step } = G.archeryState;
        const fpId = G.fpPlayerId || '0';
        const shadowId = fpId === '0' ? '1' : '0';

        // Halo / zoom seulement pour le joueur qui assigne (pas l’adversaire).
        if (step === 'FP_ASSIGN') {
            if (String(myId) !== String(fpId)) {
                if (targetingKind === 'ARCHERY') stopTargeting();
                return;
            }
            const fpPlayer = G.players[fpId];
            const validTargets = (fpPlayer?.fellowshipArea || [])
                .filter((c) => c && !c.isDead)
                .flatMap((c) =>
                    [c.instanceId, c.id].filter(
                        (id, index, ids): id is string =>
                            Boolean(id) && ids.indexOf(id) === index
                    )
                );

            startTargeting({
                kind: 'ARCHERY',
                targetableCardIds: validTargets,
                message: tg.archeryFp,
                onSelectTarget: (cardId) => {
                    if (moves.assignArcheryWound) {
                        moves.assignArcheryWound(cardId);
                    }
                },
            });
        } else if (step === 'SHADOW_ASSIGN') {
            if (String(myId) !== String(shadowId)) {
                if (targetingKind === 'ARCHERY') stopTargeting();
                return;
            }
            // Uplands etc. : pas de halo sur les séides immunisés (toutes blessures d’archerie).
            const validTargets = (G.battlefield || [])
                .filter(
                    (c) =>
                        c &&
                        c.kind === 'SHADOW' &&
                        c.type === 'MINION' &&
                        !c.isDead &&
                        canCardTakeWound(G, c)
                )
                .flatMap((c) =>
                    [c.instanceId, c.id].filter(
                        (id, index, ids): id is string =>
                            Boolean(id) && ids.indexOf(id) === index
                    )
                );

            startTargeting({
                kind: 'ARCHERY',
                targetableCardIds: validTargets,
                message: tg.archeryShadow,
                onSelectTarget: (cardId) => {
                    if (moves.assignArcheryWound) {
                        moves.assignArcheryWound(cardId);
                    }
                },
            });
        } else if (targetingKind === 'ARCHERY') {
            stopTargeting();
        }
    }, [
        ctx.phase,
        G.archeryState,
        G.fpPlayerId,
        G.players,
        G.battlefield,
        G.responseWindow,
        G.pendingEvent,
        G.threatWoundsToAssign,
        myId,
        moves,
        startTargeting,
        stopTargeting,
        targetingKind,
    ]);

    // 🟢 4b. BLESSURES DE MENACES (même geste que l’archerie)
    useEffect(() => {
        if (
            targetingKind === 'DESIGNATION' ||
            targetingKind === 'HAND_DISCARD' ||
            targetingKind === 'HAND_PICK' ||
            targetingKind === 'SANCTUARY_HEAL' ||
            G.sanctuaryHeal
        ) {
            return;
        }

        const remaining = G.threatWoundsToAssign ?? 0;
        if (
            remaining <= 0 ||
            G.responseWindow?.isOpen ||
            G.pendingEvent
        ) {
            if (targetingKind === 'THREAT_WOUND') stopTargeting();
            return;
        }

        // Menaces = FP uniquement — pas de halo / zoom côté Ombre.
        if (!isLocalFP) {
            if (targetingKind === 'THREAT_WOUND') stopTargeting();
            return;
        }

        const fpPlayer = G.players[G.fpPlayerId || '0'];
        const validTargets = (fpPlayer?.fellowshipArea || [])
            .filter((c) => c.type === 'COMPANION' && !c.isDead)
            .flatMap((c) =>
                [c.instanceId, c.id].filter(
                    (id, index, ids): id is string =>
                        Boolean(id) && ids.indexOf(id) === index
                )
            );

        startTargeting({
            kind: 'THREAT_WOUND',
            targetableCardIds: validTargets,
            message:
                remaining === 1
                    ? tg.threatWoundOne
                    : tg.threatWoundMany(remaining),
            onSelectTarget: (cardId) => {
                moves.assignThreatWound?.(cardId);
            },
        });
    }, [
        G.threatWoundsToAssign,
        G.fpPlayerId,
        G.players,
        G.responseWindow,
        G.pendingEvent,
        isLocalFP,
        moves,
        startTargeting,
        stopTargeting,
        targetingKind,
    ]);

    // 🟢 4c. Doorway to Doom — blessures site (FP puis Ombre)
    useEffect(() => {
        if (
            targetingKind === 'DESIGNATION' ||
            targetingKind === 'HAND_DISCARD' ||
            targetingKind === 'HAND_PICK' ||
            targetingKind === 'SANCTUARY_HEAL' ||
            G.sanctuaryHeal ||
            (G.threatWoundsToAssign ?? 0) > 0
        ) {
            return;
        }

        const pending = G.pendingSiteCharacterWounds;
        if (
            !pending ||
            pending.remaining <= 0 ||
            G.responseWindow?.isOpen ||
            G.pendingEvent
        ) {
            if (targetingKind === 'SITE_CHARACTER_WOUND') stopTargeting();
            return;
        }

        // Seul le joueur assignant voit les halos (l’autre attend).
        if (String(playerID) !== String(pending.playerId)) {
            if (targetingKind === 'SITE_CHARACTER_WOUND') stopTargeting();
            return;
        }

        const validTargets = livingSiteWoundTargets(G, pending.playerId).flatMap(
            (c) =>
                [c.instanceId, c.id].filter(
                    (id, index, ids): id is string =>
                        Boolean(id) && ids.indexOf(id) === index
                )
        );

        startTargeting({
            kind: 'SITE_CHARACTER_WOUND',
            targetableCardIds: validTargets,
            message:
                pending.remaining === 1
                    ? tg.siteWoundOne
                    : tg.siteWoundMany(pending.remaining),
            onSelectTarget: (cardId) => {
                moves.assignSiteCharacterWound?.(cardId);
            },
        });
    }, [
        G.pendingSiteCharacterWounds,
        G.threatWoundsToAssign,
        G.sanctuaryHeal,
        G.responseWindow,
        G.pendingEvent,
        G.players,
        G.battlefield,
        G.fpPlayerId,
        playerID,
        moves,
        startTargeting,
        stopTargeting,
        targetingKind,
    ]);

    // 🟢 5. SYNCHRONISATION DU CIBLAGE EN PHASE DE SKIRMISH
    useEffect(() => {
        if (targetingKind === 'DESIGNATION') return;
        if (targetingKind === 'HAND_DISCARD') return;
        if (targetingKind === 'HAND_PICK') return;
        if (targetingKind === 'STACK_PLAY') return;
        if (targetingKind === 'SITE_STACK') return;
        if (targetingKind === 'SITE_ATTACH') return;
        if (targetingKind === 'SANCTUARY_HEAL' || G.sanctuaryHeal) return;

        if ((G.threatWoundsToAssign ?? 0) > 0) {
            if (targetingKind === 'SKIRMISH_SELECT') stopTargeting();
            return;
        }

        if (
            ctx.phase !== 'skirmish' ||
            !G.skirmishes ||
            G.skirmishes.length === 0
        ) {
            if (ctx.phase !== 'archery' && targetingKind === 'SKIRMISH_SELECT') {
                stopTargeting();
            }
            return;
        }

        if (G.activeSkirmishId) {
            if (targetingKind === 'SKIRMISH_SELECT') stopTargeting();
            return;
        }

        const targetableCompanionIds = G.skirmishes
            .map((s) => s.companionId)
            .filter(Boolean);

        startTargeting({
            kind: 'SKIRMISH_SELECT',
            targetableCardIds: targetableCompanionIds,
            message: tg.skirmishSelect,
            onSelectTarget: (companionCardId) => {
                const chosenSkirmish = G.skirmishes.find(
                    (s) =>
                        s.companionId === companionCardId ||
                        s.id === `skirmish_${companionCardId}`
                );

                if (chosenSkirmish && moves.selectSkirmish) {
                    moves.selectSkirmish(chosenSkirmish.id);
                }
            },
        });
    }, [
        ctx.phase,
        G.skirmishes,
        G.activeSkirmishId,
        G.threatWoundsToAssign,
        moves,
        startTargeting,
        stopTargeting,
        targetingKind,
    ]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            // OptionsModal gère sa propre fermeture (capture).
            if (optionsOpen) return;

            const isMine = G.pendingPlay?.playerId === myId;
            const canCancelChoice =
                G.pendingForcedChoice?.cancelable &&
                G.pendingForcedChoice.playerId === myId;
            if (canCancelChoice) {
                stopTargeting();
                moves.cancelForcedChoiceMove?.();
                return;
            }
            if (
                targetingKind !== 'DESIGNATION' &&
                targetingKind !== 'HAND_DISCARD' &&
                targetingKind !== 'HAND_PICK' &&
                targetingKind !== 'SITE_REPLACE' &&
                targetingKind !== 'SITE_REPLACE_PATH' &&
                targetingKind !== 'SITE_ATTACH' &&
                targetingKind !== 'SITE_STACK' &&
                targetingKind !== 'STACK_PLAY' &&
                !isMine
            ) {
                return;
            }
            stopTargeting();
            if (isMine) moves.cancelPendingPlay?.();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [
        optionsOpen,
        targetingKind,
        stopTargeting,
        G.pendingPlay,
        G.pendingForcedChoice,
        myId,
        moves,
    ]);

    const escapeBusyForOptions =
        optionsOpen ||
        Boolean(openOutOfPlayZone) ||
        Boolean(deckDiscardPick) ||
        Boolean(stackOverlay) ||
        Boolean(revealOverlay) ||
        Boolean(
            G.pendingForcedChoice?.cancelable &&
                G.pendingForcedChoice.playerId === myId
        ) ||
        Boolean(G.pendingPlay?.playerId === myId) ||
        targetingKind === 'DESIGNATION' ||
        targetingKind === 'HAND_DISCARD' ||
        targetingKind === 'HAND_PICK' ||
        targetingKind === 'SITE_REPLACE' ||
        targetingKind === 'SITE_REPLACE_PATH' ||
        targetingKind === 'SITE_ATTACH' ||
        targetingKind === 'SITE_STACK' ||
        targetingKind === 'STACK_PLAY';

    // Détermination de l'onglet prioritaire selon le state du jeu
    const getRequestedTab = (): 'hand' | 'sites' | null => {
        if (
            targetingKind === 'SITE_REPLACE' ||
            targetingKind === 'SITE_REPLACE_PATH' ||
            targetingKind === 'SITE_STACK' ||
            targetingKind === 'STACK_PLAY'
        ) {
            return 'sites';
        }
        // SITE_ATTACH (Spies…) : site déjà sur le chemin — pas l’onglet deck.
        if (
            targetingKind === 'HAND_DISCARD' ||
            targetingKind === 'HAND_PICK'
        ) {
            return 'hand';
        }
        // Autre désignation ciblant la main : forcer l’onglet main.
        if (targetingKind === 'DESIGNATION' && targetableCardIds.length > 0) {
            const handKeys = new Set(
                (me.hand || []).flatMap((c) =>
                    [c.instanceId, c.id].filter(Boolean)
                ) as string[]
            );
            if (targetableCardIds.some((id) => handKeys.has(id))) {
                return 'hand';
            }
        }

        const isSetupPhase = ctx.phase === 'setup';

        // Site 1 : le joueur Peuples Libres pose (pas forcément le gagnant d’enchère).
        if (isSetupPhase && G.setupState?.step === 'AWAITING_SITE') {
            if (isLocalFP) return 'sites';
            return null;
        }

        if (isSetupPhase && G.setupState?.step === 'MULLIGAN') {
            return 'hand';
        }

        // Sites suivants : l’Ombre pose.
        if (G.awaitingSiteSelection) {
            const nextEmpty = G.path.findIndex((slot) => slot === null);
            const placerIsFp = nextEmpty === 0;
            if (placerIsFp ? isLocalFP : isLocalShadow) {
                return 'sites';
            }
            return null;
        }

        const isActionWindowOpen = Boolean(G.actionWindow?.isOpen);
        const isMainGamePhase =
            ctx.phase === 'fellowship' || ctx.phase === 'shadow';

        if (isActionWindowOpen || isMainGamePhase) return 'hand';

        return null;
    };

    return (
        <FactionProvider
            myPlayerId={myId}
            fpPlayerId={fpPlayerId}
            isSetupPhase={!sidesAssigned}
        >
            <TargetingArrowSyncProvider
                myId={myId}
                matchID={matchID}
                sendChatMessage={sendChatMessage}
                chatMessages={chatMessages}
            >
                <DragProvider>
                    <S.BoardContainer $faction={currentFaction}>
                    <OpenOptionsOnEscape
                        blocked={escapeBusyForOptions}
                        onOpen={() => setOptionsOpen(true)}
                    />
                    <PendingPlayOnDrag
                        G={G}
                        myId={myId}
                        phase={ctx.phase}
                        moves={moves}
                    />
                    <DesignationOverlay G={G} myId={myId} />
                    <BoardTargetingArrow />
                    <RemoteTargetingArrow />
                    <BoardDiscardGhostLayer
                        ghosts={boardDiscardGhosts}
                        G={G}
                    />
                    <PhaseBanner
                        key={canonicalPhaseName(ctx.phase)}
                        phaseName={ctx.phase || ''}
                    />
                    {G.gameResult && (
                        <GameEndOverlay
                            result={G.gameResult}
                            viewerPlayerId={myId}
                            onDismiss={() =>
                                moves.dismissGameEndOverlay?.()
                            }
                        />
                    )}
                    <DevPanel
                        G={G}
                        ctx={ctx}
                        matchID={matchID}
                        deckCount={me.deck?.length || 0}
                        onDrawCard={() => {
                            if (moves.drawCard) moves.drawCard();
                        }}
                        moves={
                            moves as React.ComponentProps<
                                typeof DevPanel
                            >['moves']
                        }
                    />
                    <GameControls
                        G={G}
                        statusMessage={G.statusMessage}
                        ctx={ctx}
                        playerID={playerID}
                        isMyTurn={ctx.currentPlayer === playerID}
                        awaitingSite={G.awaitingSiteSelection ?? false}
                        siteStartChoiceLocked={
                            siteStartFlowActive || Boolean(deckDiscardPick)
                        }
                        moves={{
                            ...moves,
                            resolveWhenPlayedChoice:
                                handleResolveWhenPlayedChoice,
                            resolveSiteStartAbilityChoice:
                                handleResolveSiteStartAbilityChoice,
                            resolveSiteResponseAbilityChoice:
                                handleResolveSiteResponseAbilityChoice,
                            resolveSiteMoveAbilityChoice:
                                handleResolveSiteMoveAbilityChoice,
                            resolveSitePhaseAbilityChoice:
                                handleResolveSitePhaseAbilityChoice,
                            resolveSiteFollowerTransferAbilityChoice:
                                handleResolveSiteFollowerTransferAbilityChoice,
                        }}
                    />

                    <OpponentHand
                        hand={opponent.hand || []}
                        hiddenCardId={
                            G.pendingPlay?.playerId === oppId
                                ? G.pendingPlay.card.instanceId ||
                                  G.pendingPlay.card.id
                                : undefined
                        }
                    />

                    <S.BoardColumns>
                    <OutOfPlayRail
                        twilight={G.twilightPool}
                        fpIsOpponent={fpPlayerId === oppId}
                        threats={G.players[fpPlayerId]?.threats ?? 0}
                        threatLimit={getThreatLimit(G)}
                        initiativeHolder={
                            freePeoplesHasInitiative(G)
                                ? 'FREE_PEOPLE'
                                : 'SHADOW'
                        }
                        localHasInitiative={playerHasInitiative(G, myId)}
                        myDeckCount={(me.deck || []).length}
                        opponentDeckCount={(opponent.deck || []).length}
                        myDiscard={me.discard || []}
                        myDeadPile={me.deadPile || []}
                        myRemovedFromGame={me.removedFromGame || []}
                        opponentDiscard={opponent.discard || []}
                        opponentDeadPile={opponent.deadPile || []}
                        opponentRemovedFromGame={
                            opponent.removedFromGame || []
                        }
                        onOpenZone={(zone) => {
                            // Choix Falls en attente : le cimetière rouvre le choix.
                            if (
                                zone === 'my-cemetery' &&
                                G.pendingDeadPileRemoval &&
                                String(
                                    G.pendingDeadPileRemoval.playerId
                                ) === String(myId) &&
                                (me.deadPile || []).length > 0
                            ) {
                                openDeadPileRemovalPick();
                                return;
                            }
                            setOpenOutOfPlayZone(zone);
                        }}
                        journalLog={G.journalLog}
                        myPlayerId={myId}
                        playerNames={{
                            '0': G.players['0']?.profile?.name || 'Joueur 0',
                            '1': G.players['1']?.profile?.name || 'Joueur 1',
                        }}
                        chatMessages={chatMessages}
                        sendChatMessage={sendChatMessage}
                    />
                    <S.BoardPlayColumn>
                    {/* ==================== 1. ADVERSAIRE ==================== */}
                    <PlayerArea
                        playerId={oppId}
                        deckCount={opponent.deck?.length || 0}
                        fellowshipArea={opponent.fellowshipArea || []}
                        supportArea={opponent.supportArea || []}
                        isOpponent={true}
                        moves={moves}
                        skirmishes={G.skirmishes}
                        battlefield={G.battlefield}
                        isSkirmishPhase={ctx.phase === 'skirmish'}
                        activeSkirmishId={G.activeSkirmishId}
                        G={G}
                        phase={ctx.phase}
                        onActivateAbility={handleActivateAbility}
                    />

                    {/* ==================== 2. CENTRAL ==================== */}
                    <S.CentralBlock>
                        <S.MainZone>
                            <Battlefield
                                cards={G.battlefield}
                                playerRole={myId as '0' | '1'}
                                currentSiteIndex={currentSiteIndex}
                                phase={ctx.phase}
                                skirmishes={G.skirmishes}
                                lastWoundedCardIds={G.lastWoundedCardIds}
                                G={G}
                                playerId={myId}
                                onActivateAbility={handleActivateAbility}
                            />
                        </S.MainZone>
                    </S.CentralBlock>

                    {/* ==================== 3. MOI ==================== */}
                    <PlayerArea
                        playerId={myId}
                        deckCount={me.deck?.length || 0}
                        fellowshipArea={me.fellowshipArea || []}
                        supportArea={me.supportArea || []}
                        isOpponent={false}
                        moves={moves}
                        skirmishes={G.skirmishes}
                        battlefield={G.battlefield}
                        isSkirmishPhase={ctx.phase === 'skirmish'}
                        activeSkirmishId={G.activeSkirmishId}
                        G={G}
                        phase={ctx.phase}
                        onActivateAbility={handleActivateAbility}
                    />
                    </S.BoardPlayColumn>
                    </S.BoardColumns>

                    {/* ==================== SITE PATH ==================== */}
                    <SitePath
                        path={G.path}
                        players={G.players}
                        localPlayerId={myId}
                        G={G}
                        phase={ctx.phase}
                        onActivateAbility={handleActivateAbility}
                        onPlaySite={(siteId, targetIndex) => {
                            const isInitialSetupSite =
                                ctx.phase === 'setup' &&
                                G.setupState?.step === 'AWAITING_SITE' &&
                                targetIndex === 0;

                            if (isInitialSetupSite) {
                                const fpPlayer = G.players[G.fpPlayerId || '0'];
                                const siteCard = fpPlayer?.sitesDeck?.find(
                                    (s) => s.id === siteId
                                );

                                if (siteCard && moves.selectStartingSite) {
                                    moves.selectStartingSite(siteCard);
                                    return;
                                }
                            }

                            if (moves.playSite) {
                                moves.playSite(siteId, targetIndex);
                            }
                        }}
                    />
                    {revealOverlay && (
                        <CardZoneOverlay
                            title={revealOverlay.title}
                            subtitle={revealOverlay.subtitle}
                            cards={revealOverlay.cards}
                            currentSiteIndex={currentSiteIndex}
                            selectableCardIds={
                                revealOverlay.selectableCardIds
                            }
                            onSelectCard={
                                revealOverlay.mayDiscardOne
                                    ? (cardId) => {
                                          moves.confirmPendingRevealMove?.(
                                              cardId
                                          );
                                      }
                                    : undefined
                            }
                            onClose={() => {
                                /* Validation uniquement via toaster */
                            }}
                        />
                    )}
                    {deckDiscardPick && (
                        <CardZoneOverlay
                            title={
                                deckDiscardPick.title || tg.deckOrDiscardTitle
                            }
                            subtitle={
                                deckDiscardPick.subtitle ||
                                tg.choosePlayableDeckOrDiscard
                            }
                            sections={[
                                ...(deckDiscardPick.deck.length > 0
                                    ? [
                                          {
                                              title: tg.drawDeckTitle,
                                              cards: deckDiscardPick.deck,
                                          },
                                      ]
                                    : []),
                                ...(deckDiscardPick.discard.length > 0
                                    ? [
                                          {
                                              title: tg.discardPileTitle,
                                              cards: deckDiscardPick.discard,
                                          },
                                      ]
                                    : []),
                                ...(deckDiscardPick.deadPile &&
                                deckDiscardPick.deadPile.length > 0
                                    ? [
                                          {
                                              title: tg.deadPileTitle,
                                              cards: deckDiscardPick.deadPile,
                                          },
                                      ]
                                    : []),
                            ]}
                            currentSiteIndex={currentSiteIndex}
                            selectableCardIds={
                                deckDiscardPick.selectableCardIds
                            }
                            onSelectCard={(cardId) => {
                                const whenPlayed = deckDiscardPick.whenPlayed;
                                const handIndex = deckDiscardPick.handIndex;
                                const activate = deckDiscardPick.activate;
                                const sitePhasePick =
                                    deckDiscardPick.sitePhasePick;
                                const poolCards = [
                                    ...deckDiscardPick.deck,
                                    ...deckDiscardPick.discard,
                                    ...(deckDiscardPick.deadPile || []),
                                ];
                                setDeckDiscardPick(null);
                                if (sitePhasePick) {
                                    moves.resolveSitePhaseAbilityChoice?.(
                                        true,
                                        undefined,
                                        cardId,
                                        sitePhasePick.abilityId
                                    );
                                    audioService.play('CARD_PLAY');
                                    return;
                                }
                                if (whenPlayed) {
                                    moves.resolveWhenPlayedChoice?.(
                                        true,
                                        undefined,
                                        cardId
                                    );
                                    audioService.play('CARD_PLAY');
                                    return;
                                }
                                if (activate) {
                                    const picked = poolCards.find(
                                        (c) =>
                                            c &&
                                            (c.instanceId === cardId ||
                                                c.id === cardId)
                                    );
                                    const finishActivate = (
                                        effectIds: string | string[]
                                    ) => {
                                        // Pont jusqu’à clear du pending (évite flash Activer/Passer).
                                        siteStartBridgeRef.current = true;
                                        if (activate.costId) {
                                            moves.activateAbility?.(
                                                activate.sourceInstanceId,
                                                activate.abilityId,
                                                activate.costId,
                                                undefined,
                                                effectIds
                                            );
                                        } else {
                                            moves.activateAbility?.(
                                                activate.sourceInstanceId,
                                                activate.abilityId,
                                                effectIds
                                            );
                                        }
                                        audioService.play('CARD_PLAY');
                                        queueMicrotask(() => {
                                            siteStartBridgeRef.current = false;
                                        });
                                    };
                                    if (
                                        picked &&
                                        requiresAttachmentTarget(picked)
                                    ) {
                                        if (attachesToSite(picked)) {
                                            const siteIds =
                                                getSiteAttachmentHostIds(
                                                    G,
                                                    picked,
                                                    myId
                                                );
                                            if (siteIds.length === 0) return;
                                            if (siteIds.length === 1) {
                                                finishActivate([
                                                    cardId,
                                                    siteIds[0]!,
                                                ]);
                                                return;
                                            }
                                            startTargeting({
                                                kind: 'SITE_ATTACH',
                                                targetableCardIds: siteIds,
                                                pendingCard: picked,
                                                abilityId: activate.abilityId,
                                                message: tg.playOnSite,
                                                onSelectTarget: (siteId) => {
                                                    stopTargeting();
                                                    finishActivate([
                                                        cardId,
                                                        siteId,
                                                    ]);
                                                },
                                            });
                                            return;
                                        }
                                        const hosts = findLegalAttachmentHosts(
                                            G,
                                            myId,
                                            picked,
                                            ctx.phase || 'fellowship'
                                        );
                                        if (hosts.length === 0) return;
                                        // Monture / possession : toujours désigner
                                        // le porteur (même 1 Suderon) — le texte
                                        // ne force pas « sur lui ».
                                        startTargeting({
                                            kind: 'DESIGNATION',
                                            targetableCardIds:
                                                hosts.flatMap(cardTargetIds),
                                            pendingCard: picked,
                                            abilityId: activate.abilityId,
                                            message: tg.chooseBearer,
                                            onSelectTarget: (hostId) => {
                                                stopTargeting();
                                                finishActivate([
                                                    cardId,
                                                    hostId,
                                                ]);
                                            },
                                        });
                                        return;
                                    }
                                    finishActivate(cardId);
                                    return;
                                }
                                if (handIndex === undefined) return;
                                moves.playCard?.(handIndex, cardId);
                                audioService.play('CARD_PLAY');
                            }}
                            onClose={() => {
                                if (deckDiscardPick.whenPlayed) {
                                    setDeckDiscardPick(null);
                                    moves.resolveWhenPlayedChoice?.(false);
                                    return;
                                }
                                if (deckDiscardPick.activate) {
                                    setDeckDiscardPick(null);
                                    siteStartBridgeRef.current = false;
                                    setSiteStartFlowActive(false);
                                    return;
                                }
                                closeDeckDiscardPick();
                            }}
                        />
                    )}
                    {stackOverlay && (
                        <CardZoneOverlay
                            title={stackOverlay.title}
                            subtitle={stackOverlay.subtitle}
                            cards={stackOverlay.cards}
                            currentSiteIndex={currentSiteIndex}
                            selectableCardIds={stackOverlay.selectableCardIds}
                            onSelectCard={
                                stackOverlay.onSelectCard
                                    ? (cardId) => {
                                          const select =
                                              stackOverlay.onSelectCard;
                                          setStackOverlay(null);
                                          select?.(cardId);
                                      }
                                    : undefined
                            }
                            onClose={() => setStackOverlay(null)}
                        />
                    )}
                    {outOfPlayOverlay && (
                        <CardZoneOverlay
                            title={outOfPlayOverlay.title}
                            cards={outOfPlayOverlay.cards}
                            currentSiteIndex={currentSiteIndex}
                            selectableCardIds={
                                openOutOfPlayZone === 'my-discard'
                                    ? getPlayableFromDiscardCards(
                                          G,
                                          myId,
                                          ctx.phase || ''
                                      ).flatMap(cardTargetIds)
                                    : undefined
                            }
                            onSelectCard={
                                openOutOfPlayZone === 'my-discard'
                                    ? (cardId) => {
                                          const picked = (
                                              me.discard || []
                                          ).find(
                                              (c) =>
                                                  c &&
                                                  (c.instanceId === cardId ||
                                                      c.id === cardId)
                                          );
                                          if (!picked) return;
                                          setOpenOutOfPlayZone(null);
                                          handlePlayFromDiscard(picked);
                                      }
                                    : undefined
                            }
                            onClose={() => setOpenOutOfPlayZone(null)}
                        />
                    )}
                    {hoveredData && (
                        <S.HoveredCardsZone
                            $orientation={hoveredData.orientation}
                        >
                            {hoveredData.orientation === 'landscape' ? (
                                <SiteCard
                                    site={hoveredData.card as SiteCardState}
                                    size="lg"
                                />
                            ) : (
                                <Card
                                    card={hoveredData.card as CardState}
                                    size="lg"
                                    currentSiteIndex={currentSiteIndex}
                                    isFaceDown={
                                        hoveredData.card.isOpponent
                                            ? (hoveredData.card as CardState)
                                                  ?.isFaceDown
                                            : false
                                    }
                                />
                            )}
                        </S.HoveredCardsZone>
                    )}
                    {optionsOpen && (
                        <OptionsModal onClose={() => setOptionsOpen(false)} />
                    )}
                    <Dock
                        handCount={me.hand?.length || 0}
                        onOpenOptions={() => setOptionsOpen(true)}
                        sitesCount={(() => {
                            // Mere (Ombre) : cibles = deck d’aventure FP, pas le nôtre.
                            if (
                                targetingKind === 'SITE_REPLACE' &&
                                targetableCardIds.length > 0
                            ) {
                                for (const player of Object.values(
                                    G.players || {}
                                )) {
                                    const deck = player?.sitesDeck || [];
                                    if (
                                        deck.some(
                                            (s) =>
                                                s &&
                                                (targetableCardIds.includes(
                                                    s.instanceId || ''
                                                ) ||
                                                    targetableCardIds.includes(
                                                        s.id
                                                    ))
                                        )
                                    ) {
                                        return deck.length;
                                    }
                                }
                            }
                            return me.sitesDeck?.length || 0;
                        })()}
                        requestedTab={getRequestedTab()}
                        handView={
                            <Hand
                                G={G}
                                playerRole={myId as '0' | '1'}
                                hand={me.hand || []}
                                currentSiteIndex={currentSiteIndex}
                                phase={ctx.phase}
                                regroupStep={G.regroupStep}
                                onDiscardCard={(index) => {
                                    moves.discardCardFromHand(index);
                                }}
                                onDiscardForMuster={(index) => {
                                    moves.discardForMuster(index);
                                }}
                            />
                        }
                        sitesView={
                            <SitesPicker
                                sites={(() => {
                                    if (
                                        targetingKind === 'SITE_REPLACE' &&
                                        targetableCardIds.length > 0
                                    ) {
                                        for (const player of Object.values(
                                            G.players || {}
                                        )) {
                                            const deck =
                                                player?.sitesDeck || [];
                                            if (
                                                deck.some(
                                                    (s) =>
                                                        s &&
                                                        (targetableCardIds.includes(
                                                            s.instanceId || ''
                                                        ) ||
                                                            targetableCardIds.includes(
                                                                s.id
                                                            ))
                                                )
                                            ) {
                                                return deck;
                                            }
                                        }
                                    }
                                    return me.sitesDeck || [];
                                })()}
                            />
                        }
                    />
                    </S.BoardContainer>
                </DragProvider>
            </TargetingArrowSyncProvider>
        </FactionProvider>
    );
};
