import styled from 'styled-components';

export const Veil = styled.div`
    position: absolute;
    inset: 0;
    z-index: 80;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: rgba(8, 6, 4, 0.72);
    backdrop-filter: blur(2px);
`;

export const Panel = styled.div`
    width: min(420px, 100%);
    padding: 28px 28px 24px;
    border: 1px solid rgba(212, 184, 134, 0.35);
    border-radius: 4px;
    background: linear-gradient(
        165deg,
        rgba(36, 28, 18, 0.96) 0%,
        rgba(18, 14, 10, 0.98) 100%
    );
    box-shadow: 0 18px 48px rgba(0, 0, 0, 0.55);
    text-align: center;
    color: #f3ead7;
`;

export const Title = styled.h2`
    margin: 0 0 10px;
    font-family: 'DecipherTitle', Georgia, serif;
    font-size: 1.35rem;
    font-weight: 600;
    letter-spacing: 0.03em;
    line-height: 1.25;
    color: #f7efdf;
`;

export const Reason = styled.p`
    margin: 0 0 22px;
    font-family: 'DecipherRegular', Georgia, serif;
    font-size: 1rem;
    line-height: 1.4;
    color: rgba(243, 234, 215, 0.82);
`;

export const Actions = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
`;

const buttonBase = `
    appearance: none;
    width: 100%;
    padding: 11px 16px;
    border-radius: 3px;
    font-family: 'DecipherRegular', Georgia, serif;
    font-size: 0.95rem;
    font-weight: 600;
    letter-spacing: 0.02em;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
`;

export const PrimaryButton = styled.button`
    ${buttonBase}
    border: 1px solid rgba(212, 184, 134, 0.55);
    background: rgba(212, 184, 134, 0.18);
    color: #f7efdf;

    &:hover {
        background: rgba(212, 184, 134, 0.28);
        border-color: rgba(212, 184, 134, 0.75);
    }
`;

export const SecondaryButton = styled.button`
    ${buttonBase}
    border: 1px solid rgba(243, 234, 215, 0.22);
    background: transparent;
    color: rgba(243, 234, 215, 0.88);

    &:hover {
        border-color: rgba(243, 234, 215, 0.4);
        color: #f7efdf;
    }
`;
