import React from 'react';
import * as S from './styles';
import type { Ctx } from 'boardgame.io';
import type { GameState } from '../../../../game/types';
import { TRANSLATIONS } from '../../../../game/translations';

interface GameControlsProps {
    G: GameState;
    ctx: Ctx;
    playerID: string | null;
    statusMessage?: string;
    isMyTurn: boolean;
    awaitingSite: boolean;
    moves: {
        endFellowshipPhase?: () => void;
        endShadowPhase?: () => void;
        moveNextSite?: () => void;
        endTurn?: () => void;
        passActionWindow?: () => void; // 🟢 Nouveau move pour passer
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

    // 🟢 1. DÉTERMINATION DU JOUEUR QUI DOIT AGIR
    // Si une fenêtre d'action interactive est ouverte dans G, elle prime sur tout le reste !
    const isActionWindowActive = G.actionWindow?.isOpen ?? false;

    const actingPlayerId = isActionWindowActive
        ? G.actionWindow!.activePlayerId
        : awaitingSite || ctx.phase === 'shadow'
          ? '1'
          : '0';

    const actingPlayer = G.players?.[actingPlayerId];
    const isMyTurnToAct = currentPlayerId === actingPlayerId;

    // 🟢 2. CONFIGURATION DYNAMIQUE DU TOASTER
    let toastConfig: {
        show: boolean;
        title: string;
        body: string;
        showPassButton: boolean;
    } = {
        show: false,
        title: 'ACTION REQUISE',
        body: '',
        showPassButton: false,
    };

    if (isActionWindowActive && isMyTurnToAct) {
        // CAS A : Fenêtre d'action/réaction générique (ex: Combat, Événements)
        toastConfig = {
            show: true,
            title: G.actionWindow?.title || 'À VOTRE TOUR DE RÉAGIR',
            body:
                G.actionWindow?.message ||
                'Voulez-vous jouer une carte / un effet ou passer ?',
            showPassButton: G.actionWindow?.canPass ?? true,
        };
    } else if (awaitingSite && currentPlayerId === '1') {
        // CAS B : Pose de site obligatoire pour l'Ombre
        toastConfig = {
            show: true,
            title: 'ACTION REQUISE',
            body: 'Choisissez et posez un site sur la case inexplorée.',
            showPassButton: false, // On ne peut pas "passer" la pose de site obligatoire
        };
    }

    // Message supérieur du bandeau
    const getDynamicStatusMessage = (): string => {
        if (isActionWindowActive) {
            return isMyTurnToAct
                ? 'Une fenêtre d’action est ouverte : Jouez une carte/effet ou passez.'
                : `En attente de la réaction de ${actingPlayer?.profile?.name || `Joueur ${actingPlayerId}`}...`;
        }

        if (awaitingSite) {
            return currentPlayerId === '1'
                ? 'Choix du prochain site à poser.'
                : "En attente du joueur de l'Ombre pour poser le prochain site...";
        }

        if (ctx.phase === 'fellowship') {
            return currentPlayerId === '0'
                ? 'Jouez vos compagnons ou soutiens, puis terminez la phase.'
                : 'Le joueur des Peuples Libres prépare sa compagnie...';
        }

        if (ctx.phase === 'shadow') {
            return currentPlayerId === '1'
                ? 'Jouez vos séides et traqueurs et soutiens.'
                : "Le joueur de l'Ombre prépare ses forces...";
        }

        if (ctx.phase === 'regroup') {
            return currentPlayerId === '0'
                ? 'Choisissez de voyager vers le site suivant ou de terminer le tour.'
                : 'Les Peuples Libres décident de la suite du voyage...';
        }

        return statusMessage || 'Partie en cours';
    };

    const isFellowshipAction =
        !isActionWindowActive &&
        ctx.phase === 'fellowship' &&
        currentPlayerId === '0';
    const isShadowAction =
        !isActionWindowActive &&
        ctx.phase === 'shadow' &&
        currentPlayerId === '1';
    const isRegroupAction =
        !isActionWindowActive &&
        ctx.phase === 'regroup' &&
        currentPlayerId === '0';

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

                    <S.MessageText>
                        {getDynamicStatusMessage()}
                    </S.MessageText>

                    <S.ActionGroup>
                        {isFellowshipAction && (
                            <S.ActionButton
                                onClick={() => moves.endFellowshipPhase?.()}
                            >
                                Fin de Communauté ➔
                            </S.ActionButton>
                        )}

                        {isShadowAction && (
                            <S.ActionButton
                                onClick={() => moves.endShadowPhase?.()}
                            >
                                Fin de l'Ombre ➔
                            </S.ActionButton>
                        )}

                        {isRegroupAction && (
                            <>
                                <S.ActionButton
                                    onClick={() => moves.moveNextSite?.()}
                                >
                                    Avancer au site 🏕️
                                </S.ActionButton>
                                <S.ActionButton
                                    $variant="secondary"
                                    onClick={() => moves.endTurn?.()}
                                >
                                    Terminer le tour 🏁
                                </S.ActionButton>
                            </>
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

                        {toastConfig.showPassButton && (
                            <S.ActionButton
                                $variant="secondary"
                                style={{ marginTop: '8px', width: '100%' }}
                                onClick={() => moves.passActionWindow?.()}
                            >
                                🛑 PASSER (Ne rien jouer)
                            </S.ActionButton>
                        )}
                    </S.ToastBody>
                </S.ToastWidget>
            )}
        </>
    );
};
