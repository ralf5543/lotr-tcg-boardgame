import styled from 'styled-components';

/** Accueil plein viewport — pas de ScaledView 1920×1080. */
export const Root = styled.div`
    position: relative;
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

    &::before {
        content: '';
        position: absolute;
        inset-block-start: 50%;
        inset-inline-start: 50%;
        transform: translate(-50%, -50%);
        height: 100vh;
         aspect-ratio: 2508 / 941;
         position: absolute;
         pointer-events: none;

    background:
        /* Fondu latéral gauche et droit */
        linear-gradient(
            to right,
            #000 0%,
            rgba(0, 0, 0, 0.90) 7%,
            rgba(0, 0, 0, 0.75) 13%,
            rgba(0, 0, 0, 0.55) 16.67%,
            transparent 21%,
            transparent 79%,
            rgba(0, 0, 0, 0.55) 83.33%,
            rgba(0, 0, 0, 0.75) 87%,
            rgba(0, 0, 0, 0.90) 93%,
            #000 100%
        ),

        /* Léger assombrissement vertical */
        linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.50) 0%,
            transparent 12%,
            transparent 88%,
            rgba(0, 0, 0, 0.50) 100%
        );
    }
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
    background: rgba(0, 0, 0, 0.5);
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
        background: rgba(0, 0, 0, 0.3);
        border-color: rgba(232, 230, 225, 0.55);
        outline: none;
    }

    &:disabled {
        opacity: 0.45;
        cursor: default;
    }
`;

const panelChrome = `
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: min(360px, 88vw);
    max-width: 420px;
    padding: 22px 20px;
    border: 1px solid rgba(232, 230, 225, 0.28);
    background: rgba(0, 0, 0, 0.62);
`;

/** Panneau fonctionnel Créer / Rejoindre — chrome provisoire. */
export const Panel = styled.div`
    ${panelChrome}
`;

export const PanelForm = styled.form`
    ${panelChrome}
`;

export const PanelTitle = styled.h2`
    margin: 0;
    font: inherit;
    font-size: 1.15rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-align: center;
`;

export const PanelHint = styled.p`
    margin: 0;
    font-size: 0.9rem;
    line-height: 1.4;
    color: rgba(232, 230, 225, 0.72);
    text-align: center;
`;

export const CodeBox = styled.div`
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 1.35rem;
    letter-spacing: 0.12em;
    text-align: center;
    padding: 14px 12px;
    border: 1px solid rgba(226, 192, 68, 0.45);
    background: rgba(0, 0, 0, 0.45);
    color: #e2c044;
    user-select: all;
    word-break: break-all;
`;

export const Field = styled.label`
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 0.9rem;
    color: rgba(232, 230, 225, 0.85);
`;

export const TextInput = styled.input`
    appearance: none;
    width: 100%;
    box-sizing: border-box;
    padding: 12px 14px;
    border: 1px solid rgba(232, 230, 225, 0.28);
    background: rgba(0, 0, 0, 0.45);
    color: #e8e6e1;
    font: inherit;
    font-size: 1rem;
    letter-spacing: 0.06em;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

    &::placeholder {
        color: rgba(232, 230, 225, 0.35);
        letter-spacing: 0;
    }

    &:focus {
        outline: none;
        border-color: rgba(226, 192, 68, 0.65);
    }
`;

export const ErrorText = styled.p`
    margin: 0;
    font-size: 0.88rem;
    color: #ff8f8f;
    text-align: center;
`;

export const ButtonRow = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;
