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
        submitMulliganChoice?: (doMulligan: boolean) => void;
        endFellowshipPhase?: () => void;
        endShadowPhase?: () => void;
        moveNextSite?: () => void;
        endTurnChoice?: () => void;
        confirmHandRefill?: () => void;
        passActionWindow?: () => void;
        confirmMuster?: () => void;
        confirmAid?: () => void;
        [key: string]: ((...args: any[]) => void) | undefined;
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
    const setupStep = G.setupState?.step;
    const isSetupPhase =
        ctx.phase === 'setup' && Boolean(setupStep) && setupStep !== 'COMPLETE';

    const isBiddingStep = isSetupPhase && setupStep === 'BIDDING';
    const isChoosingFirstStep = isSetupPhase && setupStep === 'CHOOSING_FIRST';
    const isMulliganStep = isSetupPhase && setupStep === 'MULLIGAN';

    const currentBid = G.setupState?.bids?.[currentPlayerId];
    const hasAlreadyBid = currentBid !== null && currentBid !== undefined;

    const mulliganChoice = G.setupState?.mulligans?.[currentPlayerId];
    const hasMadeMulliganChoice =
        mulliganChoice !== null && mulliganChoice !== undefined;

    const isAuctionWinner = G.setupState?.auctionWinnerId === currentPlayerId;

    // 🟢 MUSTER STATE
    const isMusterStep =
        ctx.phase === 'regroup' && G.regroupStep === 'MUSTER_STEP';
    const myMusterState = isMusterStep
        ? G.musterState?.players?.[currentPlayerId]
        : null;

    // 🟢 MANEUVER AID STATE
    const isManeuverAidStep =
        ctx.phase === 'maneuver' && G.maneuverStep === 'MANEUVER_START';
    const myAidState = isManeuverAidStep
        ? G.aidState?.players?.[currentPlayerId]
        : null;

    // 🟢 CALCUL DU NUMÉRO DE SITE À POSER
    const rawSiteIdx = G.currentSiteIndex ?? 0;
    const targetSiteIdx = isSetupPhase ? rawSiteIdx : Math.max(1, rawSiteIdx);

    const siteSelectorPlayerId =
        targetSiteIdx === 0 ? fpPlayerId : shadowPlayerId;

    // 🟢 1. DÉTERMINATION DU JOUEUR QUI DOIT AGIR
    const isActionWindowActive = G.actionWindow?.isOpen ?? false;

    const isAwaitingSiteActive =
        awaitingSite &&
        (ctx.phase === 'setup' ||
            ctx.phase === 'fellowship' ||
            ctx.phase === 'regroup');

    const actingPlayerId = isSetupPhase
        ? currentPlayerId
        : isActionWindowActive
          ? G.actionWindow!.activePlayerId
          : isAwaitingSiteActive
            ? siteSelectorPlayerId
            : ctx.phase === 'shadow' || G.regroupStep === 'SHADOW_REFILL'
              ? shadowPlayerId
              : fpPlayerId;

    const actingPlayer = G.players?.[actingPlayerId];
    const isMyTurnToAct = currentPlayerId === actingPlayerId;

    // 🟢 2. ÉTAPE DE REGROUPEMENT SPÉCIFIQUE
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

    // 🟢 3. AUTRES ACTIONS STANDARD DE PHASE
    const isFellowshipAction =
        !isActionWindowActive &&
        !isAwaitingSiteActive &&
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
        type?:
            | 'BIDDING'
            | 'CHOOSING_FIRST'
            | 'MULLIGAN'
            | 'MUSTER'
            | 'STANDARD';
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
    } else if (isMulliganStep) {
        toastConfig = {
            show: true,
            title: 'PHASE DE MULLIGAN',
            body: hasMadeMulliganChoice
                ? "En attente du choix de l'adversaire..."
                : 'Examinez votre main de 8 cartes. Voulez-vous la garder ou faire un Mulligan ?',
            showPassButton: false,
            type: 'MULLIGAN',
        };
    } else if (isMusterStep && myMusterState) {
        // MUSTER
        toastConfig = {
            show: true,
            title: 'PHASE DE RALLIEMENT (MUSTER)',
            body: myMusterState.isDone
                ? "En attente de l'adversaire..."
                : `Vous avez ${myMusterState.allowedCount} carte(s) avec Rassembleur. Vous pouvez défausser jusqu'à ${myMusterState.allowedCount} carte(s) pour en piocher autant.`,
            showPassButton: false,
            type: 'MUSTER',
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
    } else if (
        isAwaitingSiteActive &&
        currentPlayerId === siteSelectorPlayerId
    ) {
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
    } else if (isManeuverAidStep && myAidState) {
        // AID
        toastConfig = {
            show: true,
            title: 'TRANSFERT DE SUIVANTS (AIDE)',
            body: myAidState.isDone
                ? "En attente du choix de l'adversaire..."
                : "Vous pouvez transférer vos Suivants (Aide) de votre zone de soutien vers un personnage éligible en payant leur coût d'Aide, ou valider.",
            showPassButton: false,
            type: 'AID' as any,
        };
    }

    // 🟢 5. OBTENTION DE LA CONSIGNE CONTEXTUELLE DU JOUEUR LOCAL
    const getInstructionText = (): string => {
        if (isBiddingStep) {
            return hasAlreadyBid
                ? `Votre mise (${currentBid} fardeau${currentBid! > 1 ? 'x' : ''}) est enregistrée.`
                : 'Choisissez le nombre de fardeaux que vous êtes prêt à miser.';
        }

        if (isChoosingFirstStep) {
            return isAuctionWinner
                ? "Vous avez remporté l'enchère ! Choisissez votre camp."
                : "L'adversaire détermine l'ordre des joueurs...";
        }

        if (isMulliganStep) {
            return hasMadeMulliganChoice
                ? 'Votre choix de Mulligan est enregistré.'
                : 'Décidez si vous conservez votre main de départ ou si vous remélangez.';
        }

        if (isMusterStep && myMusterState) {
            // CONSIGNE MUSTER
            if (myMusterState.isDone) {
                return 'Effet de Rassembleur validé. En attente de l’autre joueur...';
            }
            return `Défaussées : ${myMusterState.discardedCount} / ${myMusterState.allowedCount} carte(s). Cliquez sur vos cartes ou validez.`;
        }

        if (isActionWindowActive) {
            return isMyTurnToAct
                ? 'Une fenêtre d’action est ouverte : Jouez une carte/effet ou passez.'
                : `En attente de la réaction de l'adversaire...`;
        }

        if (isAwaitingSiteActive) {
            const isMyTurnToPlaceSite =
                currentPlayerId === siteSelectorPlayerId;
            if (isMyTurnToPlaceSite) {
                return targetSiteIdx === 0
                    ? 'Posez votre site 1 pour démarrer l’aventure.'
                    : 'Choix du prochain site à poser.';
            }
            return 'En attente de la sélection du site...';
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

        if (ctx.phase === 'archery') {
            const archeryStep = G.archeryState?.step;
            if (archeryStep === 'FP_ASSIGN') {
                const remaining = G.archeryState?.fpRemainingWounds ?? 0;
                return currentPlayerId === fpPlayerId
                    ? `Assignez vos ${remaining} blessure(s) d'archerie restantes aux compagnons.`
                    : `Les Peuples Libres attribuent ${remaining} blessure(s) d'archerie...`;
            }
            if (archeryStep === 'SHADOW_ASSIGN') {
                const remaining = G.archeryState?.shadowRemainingWounds ?? 0;
                return currentPlayerId === shadowPlayerId
                    ? `Assignez vos ${remaining} blessure(s) d'archerie restantes aux séides.`
                    : `L'Ombre attribue ${remaining} blessure(s) d'archerie...`;
            }
            return 'Phase d’Archerie en cours...';
        }

        if (ctx.phase === 'assignment') {
            const step = G.assignmentStep;
            if (step === 'FP_ASSIGN') {
                return currentPlayerId === fpPlayerId
                    ? 'Assignez vos compagnons aux séides de l’Ombre.'
                    : 'Les Peuples Libres effectuent leurs assignations de défense...';
            }
            if (step === 'SHADOW_ASSIGN') {
                return currentPlayerId === shadowPlayerId
                    ? 'Assignez vos séides restants aux compagnons de votre choix.'
                    : 'L’Ombre assigne ses séides restants...';
            }
            return 'Phase d’Assignation des combats.';
        }

        if (ctx.phase === 'regroup') {
            if (G.regroupStep === 'SHADOW_REFILL') {
                return currentPlayerId === shadowPlayerId
                    ? 'Ajustez votre main (max 8 cartes) et validez.'
                    : "L'Ombre réorganise sa main...";
            }
            if (G.regroupStep === 'FP_REFILL') {
                return currentPlayerId === fpPlayerId
                    ? 'Ajustez votre main à 8 cartes et terminez le tour.'
                    : 'Les Peuples Libres préparent leur main pour le tour suivant...';
            }
            return currentPlayerId === fpPlayerId
                ? 'Choisissez de voyager vers le site suivant ou de terminer le tour.'
                : 'Les Peuples Libres décident de la suite du voyage...';
        }

        if (isManeuverAidStep && myAidState) {
            if (myAidState.isDone) {
                return 'Choix d’Aide validé. En attente de l’autre joueur...';
            }
            return 'Glissez ou cliquez sur vos Suivants avec Aide pour les attacher, puis validez.';
        }

        return '';
    };

    // Le log narratif de la dernière action (ex: "Lurtz est assigné à Aragorn.")
    const currentNarrativeLog =
        G.statusMessage || statusMessage || 'Partie en cours';
    const instructionText = getInstructionText();

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
                                : 'SETUP'}
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

                    {/* Zone de Texte : Récit narratif principal + Consigne sous-jacente */}
                    <div
                        style={{
                            flex: 1,
                            textAlign: 'center',
                            padding: '0 12px',
                        }}
                    >
                        <S.MessageText>{currentNarrativeLog}</S.MessageText>
                        {instructionText && (
                            <div
                                style={{
                                    fontSize: '0.85rem',
                                    opacity: 0.8,
                                    marginTop: '2px',
                                    fontStyle: 'italic',
                                }}
                            >
                                {instructionText}
                            </div>
                        )}
                    </div>

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

                        {/* RENDU DU WIDGET D'ENCHÈRE */}
                        {toastConfig.type === 'BIDDING' && (
                            <BiddingWidget
                                currentBid={currentBid ?? null}
                                onSubmitBid={(amount) =>
                                    moves.submitBid?.(amount)
                                }
                                isWaitingForOpponent={hasAlreadyBid}
                            />
                        )}

                        {/* CHOIX DU PREMIER JOUEUR */}
                        {toastConfig.type === 'CHOOSING_FIRST' &&
                            isAuctionWinner && (
                                <div
                                    style={{
                                        display: 'flex',
                                        gap: '8px',
                                        marginTop: '12px',
                                    }}
                                >
                                    <S.ActionButton
                                        onClick={() =>
                                            moves.chooseFirstPlayer?.(true)
                                        }
                                    >
                                        Jouer Premier (Peuples Libres)
                                    </S.ActionButton>
                                    <S.ActionButton
                                        $variant="secondary"
                                        onClick={() =>
                                            moves.chooseFirstPlayer?.(false)
                                        }
                                    >
                                        Jouer Second (Ombre)
                                    </S.ActionButton>
                                </div>
                            )}

                        {/* CHOIX DU MULLIGAN */}
                        {toastConfig.type === 'MULLIGAN' &&
                            !hasMadeMulliganChoice && (
                                <div
                                    style={{
                                        display: 'flex',
                                        gap: '8px',
                                        marginTop: '12px',
                                    }}
                                >
                                    <S.ActionButton
                                        onClick={() =>
                                            moves.submitMulliganChoice?.(false)
                                        }
                                    >
                                        Garder ma main
                                    </S.ActionButton>
                                    <S.ActionButton
                                        $variant="secondary"
                                        onClick={() =>
                                            moves.submitMulliganChoice?.(true)
                                        }
                                    >
                                        Mulligan (8 nouvelles)
                                    </S.ActionButton>
                                </div>
                            )}

                        {/* BOUTON DE VALIDATION DE L'AIDE */}
                        {toastConfig.type === ('AID' as any) &&
                            myAidState &&
                            !myAidState.isDone && (
                                <S.ActionButton
                                    style={{ marginTop: '12px', width: '100%' }}
                                    onClick={() => {
                                        moves.confirmAid?.();
                                    }}
                                >
                                    Terminer l’étape d’Aide
                                </S.ActionButton>
                            )}

                        {/* BOUTON DE VALIDATION DU MUSTER */}
                        {toastConfig.type === 'MUSTER' &&
                            myMusterState &&
                            !myMusterState.isDone && (
                                <S.ActionButton
                                    style={{ marginTop: '12px', width: '100%' }}
                                    onClick={() => {
                                        moves.confirmMuster?.();
                                    }}
                                >
                                    {myMusterState.discardedCount > 0
                                        ? `Valider (${myMusterState.discardedCount} piochée(s))`
                                        : 'Ignorer "Rassembleur"'}
                                </S.ActionButton>
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
