import React, { useCallback } from 'react';
import type { GameResult } from '../../../../game/types';
import { gameEndTitleForViewer } from '../../../../game/logic/gameEnd';
import * as S from './styles';

const MATCH_SYNC_CHANNEL = 'lotr_match_sync';

type Props = {
    result: GameResult;
    viewerPlayerId?: string;
    onDismiss: () => void;
};

export const GameEndOverlay: React.FC<Props> = ({
    result,
    viewerPlayerId,
    onDismiss,
}) => {
    const handleNewGame = useCallback(() => {
        const newMatchId = 'match_' + Date.now();
        const syncChannel = new BroadcastChannel(MATCH_SYNC_CHANNEL);
        syncChannel.postMessage({ type: 'NEW_MATCH', matchId: newMatchId });
        syncChannel.close();
        const url = new URL(window.location.href);
        url.searchParams.set('match', newMatchId);
        window.location.href = url.toString();
    }, []);

    if (result.overlayDismissed) return null;

    const title = gameEndTitleForViewer(result, viewerPlayerId);

    return (
        <S.Veil role="dialog" aria-modal="true" aria-labelledby="game-end-title">
            <S.Panel>
                <S.Title id="game-end-title">{title}</S.Title>
                <S.Reason>{result.detail}</S.Reason>
                <S.Actions>
                    <S.PrimaryButton type="button" onClick={handleNewGame}>
                        Nouvelle partie
                    </S.PrimaryButton>
                    <S.SecondaryButton type="button" onClick={onDismiss}>
                        Regarder le plateau
                    </S.SecondaryButton>
                </S.Actions>
            </S.Panel>
        </S.Veil>
    );
};
