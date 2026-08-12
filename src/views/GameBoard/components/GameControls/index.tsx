import React from 'react';
import * as S from './styles';
import type { Ctx } from 'boardgame.io';
import type { GameState } from '../../../../game/types';
import { TRANSLATIONS } from '../../../../game/translations';
import { BiddingWidget } from '../BiddingWidget';

interface GameControlsProps {
    G: GameState;
    ctx: Ctx;
    playerID: string | null;
    statusMessage?: string;
    awaitingSite: boolean;
    moves: {
        submitBid?: (amount: number) => void;
        chooseFirstPlayer?: (wantToBeFirst: boolean) => void;
        endFellowshipPhase?: () => void;
        endShadowPhase?: () => void;
        moveNextSite?: () => void;
        endTurnChoice?: () => void;
        confirmHandRefill?: () => void;
        passActionWindow?: () => void;
        [key: string]: ((...args: unknown[]) => void) | undefined;
    };
}

export const GameControls: React.FC<GameControlsProps> = ({
    statusMessage,
    ctx,
    playerID,
    awaitingSite,
    moves,
    G,
}) => {
    if (!G || !ctx) return null;

    const currentPlayerId = playerID ?? '0';

    // 🟢 RÔLES DYNAMIQUES
    const fpPlayerId = G.fpPlayerId || '0';
    const shadowPlayerId = fpPlayerId === '0' ? '1' : '0';

    // 🟢 PHASE D'ENCHÈRE / SETUP
    const isSetupPhase = ctx.phase === 'setup';
    const setupStep = G.setupState?.step;
    const isBiddingStep = isSetupPhase && setupStep === 'BIDDING';
    const isChoosingFirstStep = isSetupPhase && setupStep === 'CHOOSING_FIRST';

    const currentBid = G.setupState?.bids?.[currentPlayerId];
    const hasAlreadyBid = currentBid !== null && currentBid !== undefined;
    const isAuctionWinner = G.setupState?.auctionWinnerId === currentPlayerId;

    // 🟢 CALCUL DU NUMÉRO DE SITE À POSER (CIBLE)
    // En dehors de la phase setup, targetSiteIdx vaut au minimum 1 (Site 2+)
    const rawSiteIdx = G.currentSiteIndex ?? 0;
    const targetSiteIdx = isSetupPhase ? rawSiteIdx : Math.max(1, rawSiteIdx);

    // Site 1 (index 0 / setup) = FP | Sites 2+ (index > 0 / en jeu) = Ombre
    const siteSelectorPlayerId = targetSiteIdx === 0 ? fpPlayerId : shadowPlayerId;

    // 🟢 1. DÉTERMINATION DU JOUEUR QUI DOIT AGIR
    const isActionWindowActive = G.actionWindow?.isOpen ?? false;

    const actingPlayerId = isActionWindowActive
        ? G.actionWindow!.activePlayerId
        : awaitingSite
          ? siteSelectorPlayerId
          : ctx.phase === 'shadow' || G.regroupStep === 'SHADOW_REFILL'
            ? shadowPlayerId
            : fpPlayerId;

    const actingPlayer = G.players?.[actingPlayerId];
    const isMyTurnToAct = currentPlayerId === actingPlayerId;

    // 🟢 2. ÉTAPE DE REGROUPEMENT SPÉCIFIQUE (DYNAMIQUE)
    const isRegroupDecision =
        !isActionWindowActive &&
        ctx.phase === 'regroup' &&
        G.regroupStep === 'FP_DECISION' &&
        currentPlayerId === fpPlayerId;

    const isShadowRefill =
        !isActionWindowActive &&
        ctx.phase === 'regroup' &&
        G.regroupStep === 'SHADOW_REFILL' &&
        currentPlayerId === shadowPlayerId;

    const isFpRefill =
        !isActionWindowActive &&
        ctx.phase === 'regroup' &&
        G.regroupStep === 'FP_REFILL' &&
        currentPlayerId === fpPlayerId;

    // 🟢 3. AUTRES ACTIONS STANDARD DE PHASE (DYNAMIQUE)
    const isFellowshipAction =
        !isActionWindowActive &&
        !awaitingSite &&
        ctx.phase === 'fellowship' &&
        currentPlayerId === fpPlayerId;

    const isShadowAction =
        !isActionWindowActive &&
        ctx.phase === 'shadow' &&
        currentPlayerId === shadowPlayerId;

    // 🟢 4. CONFIGURATION DYNAMIQUE DU TOASTER
    let toastConfig: {
        show: boolean;
        title: string;
        body: string;
        showPassButton: boolean;
        type?: 'BIDDING' | 'CHOOSING_FIRST' | 'STANDARD';
    } = {
        show: false,
        title: 'ACTION REQUISE',
        body: '',
        showPassButton: false,
        type: 'STANDARD',
    };

    if (isBiddingStep) {
        toastConfig = {
            show: true,
            title: 'ENCHÈRE DE FARDEAUX',
            body: 'Misez des fardeaux pour déterminer qui choisira le premier joueur.',
            showPassButton: false,
            type: 'BIDDING',
        };
    } else if (isChoosingFirstStep) {
        toastConfig = {
            show: true,
            title: 'CHOIX DU PREMIER JOUEUR',
            body: isAuctionWinner
                ? "Vous avez gagné l'enchère ! Choisissez votre camp."
                : "L'adversaire choisit qui prend les Peuples Libres...",
            showPassButton: false,
            type: 'CHOOSING_FIRST',
        };
    } else if (isActionWindowActive && isMyTurnToAct) {
        toastConfig = {
            show: true,
            title: G.actionWindow?.title || 'À VOTRE TOUR DE RÉAGIR',
            body:
                G.actionWindow?.message ||
                'Voulez-vous jouer une carte / un effet ou passer ?',
            showPassButton: G.actionWindow?.canPass ?? true,
            type: 'STANDARD',
        };
    } else if (awaitingSite && currentPlayerId === siteSelectorPlayerId) {
        const siteNumber = targetSiteIdx + 1;
        toastConfig = {
            show: true,
            title: `CHOIX DU SITE ${siteNumber}`,
            body:
                targetSiteIdx === 0
                    ? 'Choisissez et posez votre premier site depuis votre deck de sites.'
                    : 'Choisissez et posez le prochain site sur la case inexplorée.',
            showPassButton: false,
            type: 'STANDARD',
        };
    } else if (isShadowRefill) {
        toastConfig = {
            show: true,
            title: 'RECONSTITUTION DE L’OMBRE',
            body: 'Cliquez sur les cartes de votre main pour les défausser si nécessaire, puis validez.',
            showPassButton: false,
            type: 'STANDARD',
        };
    } else if (isFpRefill) {
        toastConfig = {
            show: true,
            title: 'RECONSTITUTION DES PEUPLES LIBRES',
            body: 'Cliquez sur les cartes de votre main pour ajuster à 8 cartes maximum et terminer le tour.',
            showPassButton: false,
            type: 'STANDARD',
        };
    }

    // 🟢 5. BANDEAU DE STATUS TEXTUEL DYNAMIQUE
    const getDynamicStatusMessage = (): string => {
        if (isBiddingStep) {
            return hasAlreadyBid
                ? `Votre mise (${currentBid} fardeau${currentBid! > 1 ? 'x' : ''}) est enregistrée. En attente de l'adversaire...`
                : 'Choisissez le nombre de fardeaux que vous êtes prêt à miser.';
        }

        if (isChoosingFirstStep) {
            return isAuctionWinner
                ? "Vous avez remporté l'enchère ! Souhaitez-vous jouer les Peuples Libres ?"
                : "L'adversaire détermine l'ordre des joueurs...";
        }

        if (isActionWindowActive) {
            return isMyTurnToAct
                ? 'Une fenêtre d’action est ouverte : Jouez une carte/effet ou passez.'
                : `En attente de la réaction de ${actingPlayer?.profile?.name || `Joueur ${actingPlayerId}`}...`;
        }

        if (awaitingSite) {
            const isMyTurnToPlaceSite = currentPlayerId === siteSelectorPlayerId;
            const isFirstSite = targetSiteIdx === 0;

            if (isMyTurnToPlaceSite) {
                return isFirstSite
                    ? 'Posez votre site 1 pour démarrer l’aventure.'
                    : 'Choix du prochain site à poser.';
            }

            return isFirstSite
                ? 'En attente du joueur des Peuples Libres pour poser le site 1...'
                : 'En attente du joueur de l’Ombre pour poser le prochain site...';
        }

        if (ctx.phase === 'fellowship') {
            return currentPlayerId === fpPlayerId
                ? 'Jouez vos compagnons ou soutiens, puis terminez la phase.'
                : 'Le joueur des Peuples Libres prépare sa compagnie...';
        }

        if (ctx.phase === 'shadow') {
            return currentPlayerId === shadowPlayerId
                ? 'Jouez vos séides, traqueurs et soutiens.'
                : "Le joueur de l'Ombre prépare ses forces...";
        }

        if (ctx.phase === 'regroup') {
            if (G.regroupStep === 'SHADOW_REFILL') {
                return currentPlayerId === shadowPlayerId
                    ? 'Ombre : Ajustez votre main (max 8 cartes) et validez.'
                    : "L'Ombre réorganise sa main...";
            }
            if (G.regroupStep === 'FP_REFILL') {
                return currentPlayerId === fpPlayerId
                    ? 'Peuples Libres : Ajustez votre main à 8 cartes et terminez le tour.'
                    : 'Les Peuples Libres préparent leur main pour le tour suivant...';
            }
            return currentPlayerId === fpPlayerId
                ? 'Choisissez de voyager vers le site suivant ou de terminer le tour.'
                : 'Les Peuples Libres décident de la suite du voyage...';
        }

        return statusMessage || 'Partie en cours';
    };

    return (
        <>
            {/* 1. Bandeau supérieur */}
            <S.ControlsContainer>
                <S.PhaseBanner>
                    <S.InfoGroup>
                        <S.PhaseBadge>
                            Phase :{' '}
                            {ctx.phase
                                ? TRANSLATIONS.phase[
                                      ctx.phase.toUpperCase() as keyof typeof TRANSLATIONS.phase
                                  ] || ctx.phase.toUpperCase()
                                : ''}
                        </S.PhaseBadge>

                        {actingPlayer?.profile?.avatar && (
                            <img
                                src={actingPlayer.profile.avatar}
                                alt={
                                    actingPlayer.profile?.name ||
                                    'Avatar joueur'
                                }
                                style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: '50%',
                                }}
                            />
                        )}

                        <S.PlayerBadge $isCurrentPlayer={isMyTurnToAct}>
                            Joueur actif :{' '}
                            <strong>
                                {actingPlayer?.profile?.name ||
                                    `Joueur ${actingPlayerId}`}
                            </strong>
                        </S.PlayerBadge>
                    </S.InfoGroup>

                    <S.MessageText>{getDynamicStatusMessage()}</S.MessageText>

                    <S.ActionGroup>
                        {/* Phase Fellowship */}
                        {isFellowshipAction && (
                            <S.ActionButton
                                onClick={() => moves.endFellowshipPhase?.()}
                            >
                                Fin de Communauté ➔
                            </S.ActionButton>
                        )}

                        {/* Phase Shadow */}
                        {isShadowAction && (
                            <S.ActionButton
                                onClick={() => moves.endShadowPhase?.()}
                            >
                                Fin de l'Ombre ➔
                            </S.ActionButton>
                        )}

                        {/* Regroup Step 1: Ombre Reconstitution */}
                        {isShadowRefill && (
                            <S.ActionButton
                                onClick={() => moves.confirmHandRefill?.()}
                            >
                                Valider la main (Ombre) 🃏
                            </S.ActionButton>
                        )}

                        {/* Regroup Step 2: FP Choix Ré-avancer / Fin */}
                        {isRegroupDecision && (
                            <>
                                {(G.movesThisTurn || 0) < 2 && (
                                    <S.ActionButton
                                        onClick={() => moves.moveNextSite?.()}
                                    >
                                        Avancer au site 🏕️
                                    </S.ActionButton>
                                )}
                                <S.ActionButton
                                    $variant="secondary"
                                    onClick={() => moves.endTurnChoice?.()}
                                >
                                    Terminer le tour 🏁
                                </S.ActionButton>
                            </>
                        )}

                        {/* Regroup Step 3: FP Reconstitution & Fin de tour */}
                        {isFpRefill && (
                            <S.ActionButton
                                onClick={() => moves.confirmHandRefill?.()}
                            >
                                Valider la main & Fin de tour 🏁
                            </S.ActionButton>
                        )}
                    </S.ActionGroup>
                </S.PhaseBanner>
            </S.ControlsContainer>

            {/* 2. Toaster DYNAMIQUE multi-usages */}
            {toastConfig.show && (
                <S.ToastWidget>
                    <S.ToastHeader>
                        <span>{toastConfig.title}</span>
                    </S.ToastHeader>
                    <S.ToastBody>
                        <p>{toastConfig.body}</p>

                        {/* 🟢 RENDU DU WIDGET D'ENCHÈRE AU SEIN DU TOASTER */}
                        {toastConfig.type === 'BIDDING' && (
                            <BiddingWidget
                                currentBid={currentBid ?? null}
                                onSubmitBid={(amount) => moves.submitBid?.(amount)}
                                isWaitingForOpponent={hasAlreadyBid}
                            />
                        )}

                        {/* 🟢 CHOIX DU PREMIER JOUEUR DANS LE TOASTER */}
                        {toastConfig.type === 'CHOOSING_FIRST' && isAuctionWinner && (
                            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                <S.ActionButton
                                    onClick={() => moves.chooseFirstPlayer?.(true)}
                                >
                                    Jouer Premier (Peuples Libres)
                                </S.ActionButton>
                                <S.ActionButton
                                    $variant="secondary"
                                    onClick={() => moves.chooseFirstPlayer?.(false)}
                                >
                                    Jouer Second (Ombre)
                                </S.ActionButton>
                            </div>
                        )}

                        {/* ACTION PASSER STANDARD */}
                        {toastConfig.showPassButton && (
                            <S.ActionButton
                                $variant="secondary"
                                style={{ marginTop: '8px', width: '100%' }}
                                onClick={() => moves.passActionWindow?.()}
                            >
                                PASSER (Ne rien jouer)
                            </S.ActionButton>
                        )}
                    </S.ToastBody>
                </S.ToastWidget>
            )}
        </>
    );
};