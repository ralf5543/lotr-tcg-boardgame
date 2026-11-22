import styled, { css } from 'styled-components';

export const Backdrop = styled.div`
    position: absolute;
    inset: 0;
    z-index: 1600;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px;
    background: rgba(8, 10, 14, 0.6);
    backdrop-filter: blur(5px);
    animation: optionsOverlayIn 0.22s ease-out;

    @keyframes optionsOverlayIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }
`;

export const Panel = styled.div`
    display: flex;
    flex-direction: column;
    width: min(820px, 100%);
    height: min(620px, 100%);
    border-radius: 12px;
    border: 1px solid #444;
    background: rgba(26, 29, 36, 0.96);
    box-shadow: 4px 12px 40px rgba(0, 0, 0, 0.55);
    color: #fff;
    overflow: hidden;
`;

export const Header = styled.header`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    flex-shrink: 0;
    padding: 16px 18px 14px;
    border-bottom: 1px solid #444;
`;

export const Title = styled.h2`
    margin: 0;
    font-family: 'DecipherTitle', Georgia, serif;
    font-size: 24px;
    font-weight: 400;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #e2c044;
`;

export const CloseButton = styled.button`
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.22);
    background: #21262d;
    color: #fff;
    font-size: 28px;
    line-height: 1;
    cursor: pointer;
    transition:
        background 0.15s ease,
        border-color 0.15s ease;

    &:hover {
        background: #30363d;
        border-color: #e2c044;
    }
`;

export const Body = styled.div`
    display: flex;
    flex: 1;
    min-height: 0;
`;

export const TabList = styled.nav`
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex-shrink: 0;
    width: 180px;
    padding: 14px 10px;
    border-right: 1px solid #444;
    background: rgba(18, 20, 26, 0.55);
`;

export const TabButton = styled.button<{ $active?: boolean }>`
    appearance: none;
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid
        ${(props) => (props.$active ? 'rgba(226, 192, 68, 0.55)' : 'transparent')};
    background: ${(props) =>
        props.$active ? 'rgba(226, 192, 68, 0.14)' : 'transparent'};
    color: ${(props) => (props.$active ? '#e2c044' : 'rgba(255, 255, 255, 0.82)')};
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
    transition:
        background 0.15s ease,
        border-color 0.15s ease,
        color 0.15s ease;

    &:hover {
        background: ${(props) =>
            props.$active ? 'rgba(226, 192, 68, 0.18)' : 'rgba(255, 255, 255, 0.06)'};
        color: #fff;
    }
`;

export const Content = styled.div`
    flex: 1;
    min-width: 0;
    padding: 18px 22px 20px;
    overflow-y: auto;
`;

export const SectionTitle = styled.h3`
    margin: 0 0 6px;
    font-size: 16px;
    font-weight: 700;
    color: #fff;
`;

export const SectionHint = styled.p`
    margin: 0 0 18px;
    font-size: 13px;
    line-height: 1.4;
    color: rgba(255, 255, 255, 0.55);
`;

export const FieldGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: 14px;
`;

export const Field = styled.div`
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

export const FieldRow = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
`;

export const Label = styled.label`
    font-size: 14px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.92);
`;

export const Hint = styled.span`
    font-size: 12px;
    color: rgba(255, 255, 255, 0.45);
`;

export const Select = styled.select`
    appearance: none;
    width: 100%;
    max-width: 280px;
    padding: 9px 12px;
    border-radius: 8px;
    border: 1px solid #444;
    background: #21262d
        url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%23ffffff' d='M1 1l5 5 5-5'/%3E%3C/svg%3E")
        no-repeat right 12px center;
    color: #fff;
    font: inherit;
    font-size: 14px;
    cursor: pointer;

    &:hover,
    &:focus {
        border-color: rgba(226, 192, 68, 0.65);
        outline: none;
    }

    option {
        background: #21262d;
        color: #fff;
    }
`;

export const ToggleRow = styled.label`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid #444;
    background: #21262d;
    cursor: pointer;

    &:hover {
        border-color: rgba(226, 192, 68, 0.4);
    }
`;

export const Checkbox = styled.input.attrs({ type: 'checkbox' })`
    width: 18px;
    height: 18px;
    accent-color: #e2c044;
    cursor: pointer;
`;

export const SliderRow = styled.div`
    display: grid;
    grid-template-columns: minmax(120px, 1fr) minmax(140px, 220px) 40px;
    align-items: center;
    gap: 12px;
`;

export const Slider = styled.input.attrs({ type: 'range', min: 0, max: 100 })`
    width: 100%;
    accent-color: #e2c044;
    cursor: pointer;

    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
`;

export const SliderValue = styled.span`
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    color: rgba(255, 255, 255, 0.7);
    text-align: right;
`;

export const AccountList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

export const AccountItem = styled.button`
    appearance: none;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    width: 100%;
    padding: 12px 14px;
    border-radius: 8px;
    border: 1px solid #444;
    background: #21262d;
    color: #fff;
    text-align: left;
    cursor: pointer;
    transition:
        background 0.15s ease,
        border-color 0.15s ease;

    &:hover:not(:disabled) {
        background: #30363d;
        border-color: rgba(226, 192, 68, 0.45);
    }

    &:disabled {
        opacity: 0.55;
        cursor: not-allowed;
    }
`;

export const AccountItemTitle = styled.span`
    font-size: 14px;
    font-weight: 700;
`;

export const AccountItemHint = styled.span`
    font-size: 12px;
    color: rgba(255, 255, 255, 0.48);
`;

export const Footer = styled.footer`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-shrink: 0;
    padding: 12px 18px 14px;
    border-top: 1px solid #444;
    background: rgba(18, 20, 26, 0.55);
`;

const actionButton = css`
    appearance: none;
    padding: 9px 16px;
    border-radius: 8px;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition:
        background 0.15s ease,
        border-color 0.15s ease,
        color 0.15s ease;
`;

export const GhostButton = styled.button`
    ${actionButton}
    border: 1px solid #444;
    background: transparent;
    color: rgba(255, 255, 255, 0.85);

    &:hover {
        background: rgba(255, 255, 255, 0.06);
        color: #fff;
    }
`;

export const DangerButton = styled.button`
    ${actionButton}
    border: 1px solid rgba(226, 59, 59, 0.55);
    background: rgba(226, 59, 59, 0.12);
    color: #ff8f8f;

    &:hover {
        background: rgba(226, 59, 59, 0.22);
        border-color: rgba(226, 59, 59, 0.8);
        color: #ffc0c0;
    }
`;

export const QuitConfirm = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    margin-left: auto;
`;

export const QuitPrompt = styled.span`
    font-size: 13px;
    color: rgba(255, 255, 255, 0.7);
`;

export const PlaceholderNote = styled.p`
    margin: 18px 0 0;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px dashed rgba(255, 255, 255, 0.18);
    background: rgba(255, 255, 255, 0.03);
    font-size: 12px;
    line-height: 1.45;
    color: rgba(255, 255, 255, 0.5);
`;
