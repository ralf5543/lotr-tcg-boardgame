import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { SitesPicker } from './components/SitePicker';
import { GameControls } from './components/GameControls';
import { canAttachToCharacter, attachesToSite } from '../../game/engine/canPlayCard';
import { PhaseBanner } from './components/PhaseBanner';
import { canonicalPhaseName } from './canonicalPhaseName';
import { DevPanel, type DevMoves } from '../../utils/DevPanel';
import { useFaction } from '../../contexts/FactionContext';
import { FactionProvider } from '../../contexts/FactionProvider';
import { useTargeting } from '../../contexts/TargetingContext';
import { audioService } from '../../services/audioService';
import { findTargetCard } from '../../utils/cardUtils';
import { getSanctuaryHealCandidates, SANCTUARY_HEAL_LIMIT } from '../../game/logic/sanctuary';
import { canPlayCard } from '../../game/engine/canPlayCard';
import {
    abilityNeedsCostDesignation,
    abilityNeedsEffectDesignation,
    cardTargetIds,
    formatDesignationPrompt,
    getCostDesignationCandidates,
    getDesignationCandidates,
    getEffectDesignationCandidates,
    getEffectDesignationCount,
    getSiteAttachmentHostIds,
    isDesignationTargetId,
} from '../../game/engine/abilities/designation';
import {
    abilityDiscardFromHandCount,
    abilityDiscardFromHandEffect,
    abilityNeedsHandDiscard,
    abilityOwnerPlayerId,
} from '../../game/engine/abilities/payAbilityCost';
import {
    abilityNeedsSiteReplace,
    abilityNeedsSiteExchange,
    abilityNeedsPathThenDeckSite,
    abilityNeedsStackSiteChoice,
    abilityStacksOtherMinion,
    abilityPlaysOtherFromStack,
    abilityReplaceSiteEffect,
    getStackSiteCandidates,
} from '../../game/engine/abilities/applyAbilityEffect';
import { getReplaceSiteCandidates, getReplaceablePathSitesInCurrentRegion, getOwnedPathSites } from '../../game/logic/sites';
import { isSiteReplaceForbidden } from '../../game/logic/siteReplaceRestrictions';
import { findEventAbilityForPhase } from '../../game/engine/abilities/playEventAbility';
import { abilityMatchesPhase } from '../../game/engine/abilities/collectAbilities';
import { useCardPlayAudio } from '../../hooks/audio/useCardPlayAudio';
import { useDiscardAudio } from '../../hooks/audio/useDiscardAudio';
import { useArcheryAudio } from '../../hooks/audio/useArcheryAudio';
import { useWoundAudio } from '../../hooks/audio/useWoundAudio';
import { useExertAudio } from '../../hooks/audio/useExertAudio';
import { useHealAudio } from '../../hooks/audio/useHealAudio';
import { useAssignmentAudio } from '../../hooks/audio/useAssignmentAudio';
import { useSkirmishAudio } from '../../hooks/audio/useSkirmishAudio';
import { useSiteControlAudio } from '../../hooks/audio/useSiteControlAudio';
import {
    BoardTargetingArrow,
    RemoteTargetingArrow,
} from './components/TargetingArrow';
import { TargetingArrowSyncProvider, useTargetingArrowSync } from './components/TargetingArrow/TargetingArrowSync';
import { PENDING_PLAY_ORIGIN_ID } from './components/TargetingArrow/sync';
import { getThreatLimit } from '../../game/logic/threats';

export interface GameBoardProps extends BoardProps<GameState> {
    moves: BoardProps<GameState>['moves'] &
        DevMoves & {
            confirmEndPhase?: () => void;
            playCard: (
                index: number,
                chosenTargetId?: string | string[]
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

const PendingPlayOnDrag: React.FC<{
    G: GameState;
    myId: string;
    phase?: string;
    moves: GameBoardProps['moves'];
}> = ({ G, myId, phase, moves }) => {
    const { dragged, isOverHandCancel } = useDrag();

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
            const ability = findEventAbilityForPhase(card, phase || '');
            moves.beginPendingPlay?.(
                dragged.index,
                ability
                    ? abilityNeedsSiteExchange(ability)
                        ? 'Choisissez un de vos sites du chemin à échanger.'
                        : abilityReplaceSiteEffect(ability)?.scope === 'REGION'
                          ? 'Choisissez un site de la région actuelle à remplacer.'
                          : formatDesignationPrompt(ability)
                    : 'Choisissez une cible.'
            );
            return;
        }
        if (attachesToSite(card)) {
            moves.beginPendingPlay?.(
                dragged.index,
                'Affaiblissez un séide, puis choisissez un site.'
            );
        }
    }, [
        dragged,
        isOverHandCancel,
        G.pendingPlay,
        myId,
        moves,
        phase,
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
    useArcheryAudio(G);
    useWoundAudio(G);
    useExertAudio(G);
    useHealAudio(G);
    useAssignmentAudio(G);
    useSkirmishAudio(G, ctx.phase);
    useSiteControlAudio(G);
    const myId = playerID || ctx.currentPlayer;
    const oppId = myId === '0' ? '1' : '0';
    const {
        startTargeting,
        stopTargeting,
        targetingKind,
        pendingCard,
        abilityId: targetingAbilityId,
        discardedHandIds: targetingDiscardedHandIds,
        isCardTargetable,
    } = useTargeting();

    const requestDesignation = useCallback(
        (
            source: CardState,
            ability: NonNullable<CardState['abilities']>[number],
            onChosen: (cardId: string) => void,
            handIndex?: number,
            which: 'cost' | 'effect' | 'auto' = 'auto'
        ): boolean => {
            const candidates =
                which === 'cost'
                    ? getCostDesignationCandidates(G, source, ability)
                    : which === 'effect'
                      ? getEffectDesignationCandidates(G, source, ability)
                      : getDesignationCandidates(G, source, ability);
            if (candidates.length === 0) return false;
            const prompt = formatDesignationPrompt(ability, which);
            if (source.type === 'EVENT' && typeof handIndex === 'number') {
                moves.beginPendingPlay?.(handIndex, prompt);
            }
            startTargeting({
                kind: 'DESIGNATION',
                targetableCardIds: candidates.flatMap(cardTargetIds),
                message: prompt,
                pendingCard: source.type === 'EVENT' ? source : undefined,
                arrowFromCardId:
                    source.type === 'EVENT'
                        ? undefined
                        : source.instanceId || source.id,
                onSelectTarget: (cardId) => {
                    // Ne pas stop ici : onChosen peut enchaîner une autre visée
                    // (herbe → compagnon). stop écraserait la nouvelle.
                    onChosen(cardId);
                },
            });
            return true;
        },
        [G, moves, startTargeting]
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
            const ownerId = abilityOwnerPlayerId(G, source);
            if (!ownerId) return false;
            const candidates = getReplaceSiteCandidates(
                G,
                ownerId,
                effect?.siteKeyword,
                excludePathSiteId
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
                    ? `Choisissez un site ${terrain} dans votre deck d’aventure.`
                    : abilityNeedsSiteExchange(ability)
                      ? 'Choisissez un site de votre deck d’aventure à échanger.'
                      : 'Choisissez un site dans votre deck d’aventure.',
                onSelectTarget: (siteId) => {
                    onChosen(siteId);
                    stopTargeting();
                },
            });
            return true;
        },
        [G, startTargeting, stopTargeting]
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
                    ? 'Choisissez un de vos sites du chemin à échanger.'
                    : 'Choisissez un site de la région actuelle à remplacer.',
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
                    ? 'Choisissez un site que vous contrôlez pour y empiler le séide choisi.'
                    : 'Choisissez un site que vous contrôlez pour y empiler ce séide.',
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
                moves.activateAbility?.(
                    sourceInstanceId,
                    abilityId,
                    costId || targetIds,
                    undefined,
                    costId ? targetIds : undefined
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
            const ownerId =
                source.kind === 'SHADOW' ? (fpId === '0' ? '1' : '0') : fpId;

            const collect = (picked: string[]) => {
                const remaining = need - picked.length;
                const hand = G.players[ownerId]?.hand || [];
                const targetableCardIds = hand
                    .filter((card) => {
                        const id = card.instanceId || card.id;
                        return Boolean(id && !picked.includes(id));
                    })
                    .flatMap((card) => cardTargetIds(card));
                const commit = () => {
                    onChosen(picked);
                    stopTargeting();
                };
                startTargeting({
                    kind: 'HAND_DISCARD',
                    targetableCardIds,
                    selectedCardIds: picked,
                    upTo,
                    onConfirm: upTo ? commit : undefined,
                    confirmLabel: upTo ? 'Valider la défausse' : undefined,
                    message: upTo
                        ? picked.length === 0
                            ? `Défaussez jusqu’à ${need} carte${need > 1 ? 's' : ''} de votre main.`
                            : picked.length >= need
                              ? `${picked.length}/${need} — validez pour défausser.`
                              : `${picked.length}/${need} choisie${picked.length > 1 ? 's' : ''}. Validez ou cliquez encore.`
                        : remaining === need
                          ? `Défaussez ${need} carte${need > 1 ? 's' : ''} de votre main.`
                          : `Encore ${remaining} carte${remaining > 1 ? 's' : ''}.`,
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
                            onChosen(next);
                            stopTargeting();
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
                            ? `Choisissez ${need} compagnon${need > 1 ? 's' : ''} à soigner.`
                            : `Encore ${remaining} compagnon${remaining > 1 ? 's' : ''} (${picked.length}/${need}).`,
                    arrowFromCardId: source.instanceId || source.id,
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
        if (
            chosenTargetId ||
            (Array.isArray(chosenEffectTargetId)
                ? chosenEffectTargetId.length
                : chosenEffectTargetId)
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
        // discardedHandIds seul : on continue le flux (ex. défausse puis STACK_PLAY).
        if (
            discardedHandIds?.length &&
            !abilityPlaysOtherFromStack(ability) &&
            !abilityNeedsEffectDesignation(G, source, ability) &&
            !abilityNeedsStackSiteChoice(G, source, ability)
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
        const needsCost = abilityNeedsCostDesignation(G, source, ability);
        const needsEffect = abilityNeedsEffectDesignation(G, source, ability);
        const effectNeed = getEffectDesignationCount(G, source, ability);
        const needsStackSite = abilityNeedsStackSiteChoice(G, source, ability);
        const stacksOther = abilityStacksOtherMinion(ability);
        const playsOtherFromStack = abilityPlaysOtherFromStack(ability);

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

        const requestEffect = (costId?: string) => {
            if (effectNeed > 1) {
                return requestMultiEffectDesignation(
                    source,
                    ability,
                    effectNeed,
                    (effectIds) => {
                        stopTargeting();
                        moves.activateAbility?.(
                            sourceInstanceId,
                            abilityId,
                            costId,
                            costId ? [] : undefined,
                            effectIds
                        );
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
                    stopTargeting();
                    moves.activateAbility?.(
                        sourceInstanceId,
                        abilityId,
                        costId || effectId,
                        costId ? [] : undefined,
                        costId ? effectId : undefined
                    );
                },
                undefined,
                needsCost ? 'effect' : 'auto'
            );
        };

        if (needsCost && needsEffect) {
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
        if (playsOtherFromStack) {
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
                message:
                    'Faites glisser un séide empilé vers le champ de bataille.',
                onSelectTarget: () => {
                    /* complété par drag → battlefield */
                },
            });
            return;
        }
        if (needsEffect && requestEffect()) {
            return;
        }
        if (
            !needsEffect &&
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
        if (
            abilityNeedsSiteReplace(ability) ||
            abilityNeedsSiteExchange(ability)
        ) {
            if (needsCost) {
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
                abilityId
            );
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
            moves.resolveWhenPlayedChoice?.(true);
        },
        [
            G,
            moves,
            requestHandDiscard,
            requestSiteReplace,
            requestPathThenDeckSite,
        ]
    );

    // 🟢 1. Détection stricte de la phase de setup
    const isSetupPhase = Boolean(
        G?.setupState &&
        G.setupState.step !== 'COMPLETED' &&
        ctx.phase === 'setup'
    );

    // 🟢 2. Identification des rôles (TOUJOURS définie)
    const fpPlayerId = G.fpPlayerId || '0';
    const isLocalFP = myId === fpPlayerId;
    const isLocalShadow = !isLocalFP; // 👈 Rétabli pour G.awaitingSiteSelection et les rôles

    // 🟢 3. Thème visuel du plateau uniquement
    const currentFaction: 'FREE_PEOPLE' | 'SHADOW' | 'NEUTRAL' = isSetupPhase
        ? 'NEUTRAL'
        : isLocalFP
          ? 'FREE_PEOPLE'
          : 'SHADOW';

    const me = G.players[myId] || {
        deck: [],
        hand: [],
        discard: [],
        deadPile: [],
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
        fellowshipArea: [],
        supportArea: [],
        sitesDeck: [],
        currentSiteIndex: 0,
    };

    const [openOutOfPlayZone, setOpenOutOfPlayZone] =
        useState<OutOfPlayZoneKey | null>(null);

    const outOfPlayOverlay = useMemo(() => {
        if (!openOutOfPlayZone) return null;

        switch (openOutOfPlayZone) {
            case 'my-discard':
                return {
                    title: 'Ma défausse',
                    cards: me.discard || [],
                };
            case 'my-cemetery':
                return {
                    title: 'Mon cimetière',
                    cards: me.deadPile || [],
                };
            case 'opponent-discard':
                return {
                    title: 'Défausse adverse',
                    cards: opponent.discard || [],
                };
            case 'opponent-cemetery':
                return {
                    title: 'Cimetière adverse',
                    cards: opponent.deadPile || [],
                };
            default:
                return null;
        }
    }, [openOutOfPlayZone, me.deadPile, me.discard, opponent.deadPile, opponent.discard]);

    const { hoveredData } = useHoverCard();
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

            // Condition « Plays on a site » avec coût exert : flèche séide → puis site
            if (
                origin === 'HAND' &&
                card &&
                attachesToSite(card) &&
                draggedCard.designationTargetIds?.length
            ) {
                if (cancelled) {
                    moves.cancelPendingPlay?.();
                    return;
                }
                const designationIds = draggedCard.designationTargetIds;
                if (!isDesignationTargetId(designationIds, targetId)) {
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
                const costTargetId = targetId as string;
                startTargeting({
                    kind: 'SITE_ATTACH',
                    targetableCardIds: siteIds,
                    pendingCard: card,
                    arrowFromCardId: PENDING_PLAY_ORIGIN_ID,
                    message: 'Choisissez un site pour y jouer cette carte.',
                    onSelectTarget: (siteId) => {
                        stopTargeting();
                        moves.attachCard?.(index, siteId, costTargetId);
                        moves.cancelPendingPlay?.();
                    },
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
                        ctx.phase || ''
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

                    if (typeof moves.playCard === 'function') {
                        moves.playCard(index, targetId);
                        audioService.play('CARD_PLAY');
                    }
                    return;
                }

                const eventAbility = findEventAbilityForPhase(
                    card,
                    ctx.phase || ''
                );
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
                    requestDesignation(
                        card,
                        eventAbility,
                        (chosenId) => {
                            stopTargeting();
                            moves.playCard(index, chosenId);
                            audioService.play('CARD_PLAY');
                        },
                        index
                    )
                ) {
                    return;
                }

                if (typeof moves.playCard === 'function') {
                    moves.playCard(index);
                    audioService.play('CARD_PLAY');
                }
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
                const isGlobalZone =
                    targetId === 'fellowshipArea' ||
                    targetId === 'supportArea' ||
                    targetId === 'battlefield';

                const targetCard = !isGlobalZone
                    ? findTargetCard(G, targetId)
                    : null;

                // L'engine vérifie absolument tout (phase, coût, unicité, validité zone/cible)
                const validation = canPlayCard(
                    card,
                    { G, ctx, playerID: myId },
                    targetId,
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
                        moves.attachCard(index, targetId);
                    }
                } else if (
                    targetId === 'battlefield' &&
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

            if (origin === 'SITE_STACK') {
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
                    ? 'Ne rien soigner'
                    : 'Valider les soins',
            message:
                remaining === SANCTUARY_HEAL_LIMIT
                    ? 'Sanctuaire : cliquez un compagnon pour soigner 1 blessure (jusqu’à 5).'
                    : `Sanctuaire : encore ${remaining} soin(s). Cliquez un compagnon ou validez.`,
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

        if (step === 'FP_ASSIGN') {
            const fpPlayer = G.players[G.fpPlayerId || '0'];
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
                message:
                    "Tir d'archerie : Cliquez sur un compagnon pour lui assigner une blessure.",
                onSelectTarget: (cardId) => {
                    if (moves.assignArcheryWound) {
                        moves.assignArcheryWound(cardId);
                    }
                },
            });
        } else if (step === 'SHADOW_ASSIGN') {
            const validTargets = (G.battlefield || [])
                .filter((c) => c && c.kind === 'SHADOW' && c.type === 'MINION')
                .map((c) => c.id);

            startTargeting({
                kind: 'ARCHERY',
                targetableCardIds: validTargets,
                message:
                    "Tir d'archerie : Cliquez sur un séide pour lui assigner une blessure.",
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
                    ? 'Menaces : cliquez sur un compagnon pour lui assigner 1 blessure.'
                    : `Menaces : cliquez sur un compagnon pour lui assigner une blessure (${remaining} restantes).`,
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
        moves,
        startTargeting,
        stopTargeting,
        targetingKind,
    ]);

    // 🟢 5. SYNCHRONISATION DU CIBLAGE EN PHASE DE SKIRMISH
    useEffect(() => {
        if (targetingKind === 'DESIGNATION') return;
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
            message:
                'Escarmouche : Cliquez sur un groupe pour résoudre son combat.',
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
            const isMine = G.pendingPlay?.playerId === myId;
            if (
                targetingKind !== 'DESIGNATION' &&
                targetingKind !== 'HAND_DISCARD' &&
                targetingKind !== 'SITE_REPLACE' &&
                targetingKind !== 'SITE_STACK' &&
                targetingKind !== 'STACK_PLAY' &&
                !isMine
            )
                return;
            stopTargeting();
            if (isMine) moves.cancelPendingPlay?.();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [targetingKind, stopTargeting, G.pendingPlay, myId, moves]);

    // Détermination de l'onglet prioritaire selon le state du jeu
    const getRequestedTab = (): 'hand' | 'sites' | null => {
        if (targetingKind === 'SITE_REPLACE') return 'sites';
        if (targetingKind === 'HAND_DISCARD') return 'hand';

        const isSetupPhase = ctx.phase === 'setup';
        const auctionWinnerId = G.setupState?.auctionWinnerId || fpPlayerId;

        if (isSetupPhase && G.setupState?.step === 'AWAITING_SITE') {
            if (myId === auctionWinnerId) {
                return 'sites';
            }
            return null;
        }

        if (isSetupPhase && G.setupState?.step === 'MULLIGAN') {
            return 'hand';
        }

        if (G.awaitingSiteSelection) {
            if (isLocalShadow) {
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
            isSetupPhase={isSetupPhase}
        >
            <TargetingArrowSyncProvider
                myId={myId}
                matchID={matchID}
                sendChatMessage={sendChatMessage}
                chatMessages={chatMessages}
            >
                <DragProvider>
                    <S.BoardContainer $faction={currentFaction}>
                    <PendingPlayOnDrag
                        G={G}
                        myId={myId}
                        phase={ctx.phase}
                        moves={moves}
                    />
                    <DesignationOverlay G={G} myId={myId} />
                    <BoardTargetingArrow />
                    <RemoteTargetingArrow />
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
                    <PhaseBanner
                        key={canonicalPhaseName(ctx.phase)}
                        phaseName={ctx.phase || ''}
                    />
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
                        moves={{
                            ...moves,
                            resolveWhenPlayedChoice:
                                handleResolveWhenPlayedChoice,
                        }}
                    />

                    <OpponentHand
                        hand={opponent.hand || []}
                        hiddenCardId={
                            G.pendingPlay?.playerId === oppId
                                ? G.pendingPlay.card.id
                                : undefined
                        }
                    />

                    <S.BoardColumns>
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
                    <OutOfPlayRail
                        twilight={G.twilightPool}
                        fpIsOpponent={fpPlayerId === oppId}
                        threats={G.players[fpPlayerId]?.threats ?? 0}
                        threatLimit={getThreatLimit(G)}
                        myDiscard={me.discard || []}
                        myDeadPile={me.deadPile || []}
                        opponentDiscard={opponent.discard || []}
                        opponentDeadPile={opponent.deadPile || []}
                        onOpenZone={setOpenOutOfPlayZone}
                    />
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
                    {outOfPlayOverlay && (
                        <CardZoneOverlay
                            title={outOfPlayOverlay.title}
                            cards={outOfPlayOverlay.cards}
                            currentSiteIndex={currentSiteIndex}
                            onClose={() => setOpenOutOfPlayZone(null)}
                        />
                    )}
                    <Dock
                        handCount={me.hand?.length || 0}
                        sitesCount={me.sitesDeck?.length || 0}
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
                        sitesView={<SitesPicker sites={me.sitesDeck || []} />}
                    />
                    </S.BoardContainer>
                </DragProvider>
            </TargetingArrowSyncProvider>
        </FactionProvider>
    );
};
