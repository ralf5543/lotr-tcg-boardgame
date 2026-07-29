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
            box-shadow:
                0 0 12px #2ecc71,
                0 0 20px rgba(46, 204, 113, 0.6);
            transform: scale(1.05);
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

export const MinionWrapper = styled.div`
    /* S'assure que chaque carte garde sa taille naturelle */
    flex: 0 0 auto;
    transition: transform 0.2s ease-in-out;

    &:hover {
        transform: scale(1.08);
        z-index: 4;
    }
`;

/* =========================================================
   3. ENROBAGE DU COUPLE DE COMBAT (Escarmouche)
   ========================================================= */
export const SkirmishGroup = styled.div<{
    $isSkirmishPhase?: boolean;
    $isSelected?: boolean;
}>`
    position: relative;
    border-radius: 8px;
    transition: all 0.2s ease-in-out;

    ${({ $isSkirmishPhase }) =>
        $isSkirmishPhase &&
        css`
            cursor: pointer;
            &:hover {
                box-shadow: 0 0 12px rgba(231, 76, 60, 0.8);
            }
        `}

    ${({ $isSelected }) =>
        $isSelected &&
        css`
            outline: 3px solid #e74c3c;
            outline-offset: 4px;
            box-shadow: 0 0 16px rgba(231, 76, 60, 0.9);
        `}
`;
