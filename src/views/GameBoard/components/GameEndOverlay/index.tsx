import React, { useCallback } from 'react';
import type { GameResult } from '../../../../game/types';
import { useUiMessages } from '../../../../i18n/ui/useUiMessages';
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
    const ui = useUiMessages();

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

    const title =
        viewerPlayerId != null &&
        viewerPlayerId === result.winnerPlayerId
            ? ui.chrome.gameEnd.youWin
            : ui.chrome.gameEnd.namedWins(result.winnerName);

    const name = result.ringBearerName || '';
    const female = Boolean(result.ringBearerIsFemale);
    const detail =
        result.reason === 'SITE_NINE'
            ? ui.chrome.gameEnd.siteNine(name, female)
            : result.reason === 'CORRUPTION'
              ? ui.chrome.gameEnd.corruption(name, female)
              : result.reason === 'RING_BEARER_KILLED'
                ? ui.chrome.gameEnd.ringBearerKilled(name)
                : result.detail;

    return (
        <S.Veil
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-end-title"
        >
            <S.Panel>
                <S.Title id="game-end-title">{title}</S.Title>
                <S.Reason>{detail}</S.Reason>
                <S.Actions>
                    <S.PrimaryButton type="button" onClick={handleNewGame}>
                        {ui.chrome.gameEnd.newGame}
                    </S.PrimaryButton>
                    <S.SecondaryButton type="button" onClick={onDismiss}>
                        {ui.chrome.gameEnd.watchBoard}
                    </S.SecondaryButton>
                </S.Actions>
            </S.Panel>
        </S.Veil>
    );
};
