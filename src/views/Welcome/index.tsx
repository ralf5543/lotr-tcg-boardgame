import React, { useState } from 'react';
import { OptionsModal } from '../GameBoard/components/OptionsModal';
import { useUiMessages } from '../../i18n/ui/useUiMessages';
import {
    createMatchWithSelectedDecks,
    MatchCreateError,
} from '../../decks/startMatch';
import * as S from './styles';

function goTo(search: string) {
    const url = new URL(window.location.href);
    url.search = search.startsWith('?') ? search.slice(1) : search;
    window.location.href = url.toString();
}

export const Welcome: React.FC = () => {
    const { welcome, options: opt, deckBuilder: db } = useUiMessages();
    const [optionsOpen, setOptionsOpen] = useState(false);
    const [starting, setStarting] = useState(false);

    const startPlay = async () => {
        if (starting) return;
        setStarting(true);
        try {
            const joined = await createMatchWithSelectedDecks();
            goTo(
                `?view=play&player=${encodeURIComponent(joined.playerID)}&match=${encodeURIComponent(joined.matchID)}`
            );
        } catch (err) {
            console.error(err);
            const message =
                err instanceof MatchCreateError && err.code === 'SERVER_FULL'
                    ? db.errors.serverFull
                    : err instanceof Error
                      ? err.message
                      : db.errors.startMatch;
            window.alert(message);
            setStarting(false);
        }
    };

    return (
        <S.Root>
            <S.Menu aria-label={welcome.menuAria}>
                <S.MenuButton
                    type="button"
                    disabled={starting}
                    onClick={() => {
                        void startPlay();
                    }}
                >
                    {welcome.play}
                </S.MenuButton>
                <S.MenuButton
                    type="button"
                    onClick={() => goTo('?view=decks')}
                >
                    {welcome.collection}
                </S.MenuButton>
                <S.MenuButton
                    type="button"
                    onClick={() => setOptionsOpen(true)}
                >
                    {opt.title}
                </S.MenuButton>
                <S.MenuButton type="button" disabled title={welcome.soon}>
                    {welcome.tutorial}
                </S.MenuButton>
            </S.Menu>

            {optionsOpen && (
                <OptionsModal
                    showQuitToHome={false}
                    onClose={() => setOptionsOpen(false)}
                />
            )}
        </S.Root>
    );
};
