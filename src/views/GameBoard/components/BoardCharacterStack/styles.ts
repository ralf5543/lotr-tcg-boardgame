import styled, { css, keyframes } from 'styled-components';

const designationPulse = keyframes`
    0%,
    100% {
        filter: drop-shadow(0 0 8px #e2c044)
            drop-shadow(0 0 16px rgba(226, 192, 68, 0.55));
    }
    50% {
        filter: drop-shadow(0 0 14px #ffe07a)
            drop-shadow(0 0 26px rgba(226, 192, 68, 0.9));
    }
`;

const designationGlow = css`
    cursor: pointer !important;
    outline: 2px solid #e2c044;
    outline-offset: 3px;
    border-radius: 8px;
    animation: ${designationPulse} 1.4s ease-in-out infinite;
`;

export const CharacterStack = styled.div<{ $isBeingDragged?: boolean }>`
    position: relative;
    overflow: visible;

    ${({ $isBeingDragged }) =>
        $isBeingDragged &&
        css`
            opacity: 0.4;
        `}
`;

export const CardDragTarget = styled.div<{
    $isOpponent?: boolean;
    $isTargeted?: boolean;
    $isTargetable?: boolean;
    $isDesignationTarget?: boolean;
    $suppressHoverScale?: boolean;
    $isDead?: boolean;
}>`
    position: relative;
    z-index: 2;
    transition: transform 0.2s ease-in-out, filter 0.2s ease-in-out;

    ${({ $isTargetable, $isDesignationTarget }) =>
        $isTargetable &&
        $isDesignationTarget &&
        designationGlow}

    ${({ $isTargetable, $isDesignationTarget, $suppressHoverScale }) =>
        $isTargetable &&
        !$isDesignationTarget &&
        css`
            cursor: pointer !important;

            &:hover {
                ${!$suppressHoverScale &&
                css`
                    transform: scale(1.05);
                `}
                filter: drop-shadow(0 0 12px #e74c3c)
                    drop-shadow(0 0 20px rgba(231, 76, 60, 0.8));
            }
        `}

    ${({ $isTargeted }) =>
    $isTargeted &&
    css`
        border-color: #ffd700 !important;
        box-shadow:
            0 0 10px #ffd700,
            0 0 25px #ffb700,
            0 0 45px rgba(255, 183, 0, 0.8),
            0 0 70px rgba(255, 215, 0, 0.4);
        transform: scale(1.08);
        z-index: 10;
    `}
`;

/* =========================================================
   1. ATTACHEMENTS CLASSIQUES (Possessions / Objets)
   ========================================================= */
export const AttachmentsContainer = styled.div`
    display: flex;
    flex-direction: column;
    position: absolute;
    inset-block-start: 0;
    inset-inline-start: -30px;
    height: 100%;
    z-index: 1;
    pointer-events: none; /* Empeche les attachements de gêner le survol du personnage principal */
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

/* =========================================================
   2. SÉIDES ASSIGNÉS EN COMBAT (Minions)
   ========================================================= */
export const AssignedMinionsContainer = styled.div<{ $isOpponent?: boolean }>`
    display: grid;
    /* grid-template-columns: repeat(6, max-content); */
    column-gap: 20px;
    row-gap: 10px;
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    margin-bottom: 26px;
    z-index: 3;

    /* 🟢 ANCRAGE SELON LA DIRECTION DU JOUEUR */
    ${({ $isOpponent }) =>
        $isOpponent
            ? css`
                  inset-block-start: 100%;
                  margin-block-start: 26px;
              `
            : css`
                  inset-block-end: 100%;
                  margin-block-end: 26px;
              `}

    /* --- 1er Séide (Pointe de la pyramide : Toujours collé au Compagnon) --- */
    & > *:nth-child(1) {
        grid-row: ${({ $isOpponent }) => ($isOpponent ? 1 : 3)};
        grid-column: span 6;
        justify-self: center;
    }

    /* --- 2ème étage (2 Séides) --- */
    & > *:nth-child(2) {
        grid-row: 2;
        grid-column: span 3;
        justify-self: end;
    }
    & > *:nth-child(3) {
        grid-row: 2;
        grid-column: span 3;
        justify-self: start;
    }

    /* --- 3ème étage (3 Séides : Le plus éloigné du Compagnon) --- */
    & > *:nth-child(4) {
        grid-row: ${({ $isOpponent }) => ($isOpponent ? 3 : 1)};
        grid-column: span 2;
        justify-self: center;
    }
    & > *:nth-child(5) {
        grid-row: ${({ $isOpponent }) => ($isOpponent ? 3 : 1)};
        grid-column: span 2;
        justify-self: center;
    }
    & > *:nth-child(6) {
        grid-row: ${({ $isOpponent }) => ($isOpponent ? 3 : 1)};
        grid-column: span 2;
        justify-self: center;
    }
`;

export const MinionWrapper = styled.div<{
    $isTargetable?: boolean;
    $isDesignationTarget?: boolean;
    $suppressHoverScale?: boolean;
}>`
    position: relative;
    flex: 0 0 auto;
    transition: transform 0.2s ease-in-out, filter 0.2s ease-in-out;

    ${({ $isTargetable, $isDesignationTarget }) =>
        $isTargetable &&
        $isDesignationTarget &&
        designationGlow}

    ${({ $isTargetable, $isDesignationTarget, $suppressHoverScale }) =>
        $isTargetable &&
        !$isDesignationTarget &&
        css`
            cursor: pointer !important;

            &:hover {
                ${!$suppressHoverScale &&
                css`
                    transform: scale(1.05);
                `}
                filter: drop-shadow(0 0 12px #e74c3c);
                outline: 2px solid #e74c3c;
                border-radius: 8px;
            }
        `}
`;

/* =========================================================
   3. ENROBAGE DU COUPLE DE COMBAT (Escarmouche)
   ========================================================= */
export const SkirmishGroup = styled.div<{
    $isSelected?: boolean;
    $isSelectable?: boolean;
    $isOpponent?: boolean;
}>`
    position: relative;
    z-index: 1;
    border-radius: 8px;
    transition: filter 0.2s ease-in-out;

    /* PONT INVISIBLE : Donne de la texture entre le personnage et ses séides */
    &::before {
        content: '';
        position: absolute;
        top: -60px;
        bottom: 0;
        left: 0;
        right: 0;
        background: transparent;
        pointer-events: auto;
        z-index: 0;
    }

    ${({ $isSelectable, $isSelected }) =>
        $isSelectable &&
        !$isSelected &&
        css`
            cursor: pointer;
            &:hover {
                filter: drop-shadow(red 0px 0px 25px)
                    drop-shadow(red 0px 0px 25px);
            }
        `}/*${({ $isSelected }) =>
        $isSelected &&
        css`
            &::after {
                content: 'X';
                width: 50px;
                height: 50px;
                border: 2px solid green;
                position: absolute;
                inset-block-end: 100%;
                inset-inline-start: 50%;
                z-index: 9;
                background-color: red;
                transform: translateX(-50%);
                margin-block-end: -17px;
            }
        `}
    ${({ $isOpponent }) =>
        $isOpponent &&
        css`
            &::after {
                inset-block-end: auto;
                inset-block-start: 100%;
            }
        `}*/
`;

export const DeathPicto = styled.img`
    position: absolute;
    z-index: 1;
    inset-block-start: 50%;
    inset-inline-start: 50%;
    translate: -50% -50%;
    height: 50px;

    /* 1. État final par défaut */
    opacity: 0.7;
    scale: 1.2;

    /* 2. Transition classique */
    transition: opacity 3s ease, scale 3s ease;

    /* 3. État initial au moment où React l'insère dans le DOM */
    @starting-style {
        opacity: 0;
        scale: 0.3;
    }
`;
