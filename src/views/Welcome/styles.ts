import styled from 'styled-components';

/** Accueil plein viewport — pas de ScaledView 1920×1080. */
export const Root = styled.div`
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;  
    background-image: url('/interface/background_home.png');
    background-size: auto 100%;
    background-position: center;
    background-repeat: no-repeat;
    color: #e8e6e1;
`;

export const Menu = styled.nav`
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    min-width: min(320px, 86vw);
`;

export const MenuButton = styled.button`
    appearance: none;
    border: 1px solid rgba(232, 230, 225, 0.28);
    background: rgba(255, 255, 255, 0.04);
    color: inherit;
    font: inherit;
    font-size: 1.05rem;
    letter-spacing: 0.02em;
    padding: 14px 22px;
    cursor: pointer;
    text-align: center;
    transition:
        background 0.15s ease,
        border-color 0.15s ease;

    &:hover:not(:disabled),
    &:focus-visible:not(:disabled) {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(232, 230, 225, 0.55);
        outline: none;
    }

    &:disabled {
        opacity: 0.45;
        cursor: default;
    }
`;
