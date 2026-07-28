import styled, { css } from 'styled-components';

export const CharacterStack = styled.div<{ $isBeingDragged?: boolean }>`
    position: relative;

    ${({ $isBeingDragged }) =>
        $isBeingDragged &&
        css`
            opacity: 0.4;
        `}
`;

export const CardDragTarget = styled.div<{
    $isOpponent?: boolean;
    $isTargeted?: boolean;
}>`
    position: relative;
    z-index: 2; /* 🟢 Priorité visuelle et d'interaction sur les attachements */
    transition: all 0.2s ease-in-out;

    /* 🟢 EFFET VISUEL QUAND LA CARTE EST CIBLÉE */
    ${({ $isTargeted }) =>
        $isTargeted &&
        css`
            border-color: #2ecc71 !important;
            box-shadow: 0 0 12px #2ecc71, 0 0 20px rgba(46, 204, 113, 0.6);
            transform: scale(1.05);
        `}
`;

export const AttachmentsContainer = styled.div`
    display: flex;
    flex-direction: column;
    position: absolute;
    inset-block-start: 0;
    inset-inline-start: -30px;
    height: 100%;
    z-index: 1;
    pointer-events: none; /* 🟢 Empeche les attachements de gêner le survol du personnage principal */
    border-radius: 6px;
    overflow: hidden;
    border: 2px solid black;
`;

export const AttachmentWrapper = styled.div<{ $index?: number }>`
    flex: 1;
    pointer-events: auto; /* Permet d'interagir avec les cartes attachées si besoin (hover, inspection) */
    border: 1px solid black;
    border-radius: 6px;
    filter: drop-shadow(0px -3px 3px black);
`;