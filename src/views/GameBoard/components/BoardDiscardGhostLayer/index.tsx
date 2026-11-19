import React from 'react';
import { createPortal } from 'react-dom';
import type { GameState } from '../../../../game/types';
import type { BoardDiscardGhost } from '../../hooks/useBoardDiscardGhosts';
import { Card } from '../Card';
import * as S from './styles';
import { BOARD_CARD_SM_WIDTH } from './styles';

type Props = {
    ghosts: BoardDiscardGhost[];
    G: GameState;
};

/**
 * Fantômes de cartes qui viennent de quitter le plateau pour la défausse.
 * Positionnés en `fixed` sur la dernière place à l’écran.
 */
export const BoardDiscardGhostLayer: React.FC<Props> = ({ ghosts, G }) => {
    if (ghosts.length === 0 || typeof document === 'undefined') return null;

    return createPortal(
        <S.Layer aria-hidden>
            {ghosts.map((ghost) => {
                const scale =
                    ghost.width > 0 ? ghost.width / BOARD_CARD_SM_WIDTH : 1;
                return (
                    <S.Ghost
                        key={ghost.id}
                        $top={ghost.top}
                        $left={ghost.left}
                        $width={ghost.width}
                        $height={ghost.height}
                    >
                        <S.GhostScale $scale={scale}>
                            <Card
                                card={ghost.card}
                                size="sm"
                                visualOnly
                                suppressHover
                                G={G}
                            />
                        </S.GhostScale>
                    </S.Ghost>
                );
            })}
        </S.Layer>,
        document.body
    );
};
