import React, { useState } from 'react';
import { OptionsModal } from '../GameBoard/components/OptionsModal';
import { useUiMessages } from '../../i18n/ui/useUiMessages';
import * as S from './styles';

function goTo(search: string) {
    const url = new URL(window.location.href);
    url.search = search.startsWith('?') ? search.slice(1) : search;
    window.location.href = url.toString();
}

export const Welcome: React.FC = () => {
    const { welcome, options: opt } = useUiMessages();
    const [optionsOpen, setOptionsOpen] = useState(false);

    return (
        <S.Root>
            <S.Menu aria-label={welcome.menuAria}>
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
                <S.MenuButton
                    type="button"
                    onClick={() => goTo('?view=play&player=0&match=default')}
                >
                    {welcome.play}
                </S.MenuButton>
                <S.MenuButton type="button" disabled title={welcome.soon}>
                    {welcome.tutorial}
                </S.MenuButton>
            </S.Menu>

            {optionsOpen && (
                <OptionsModal onClose={() => setOptionsOpen(false)} />
            )}
        </S.Root>
    );
};
