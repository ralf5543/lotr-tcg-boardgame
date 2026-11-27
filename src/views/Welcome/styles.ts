import styled, { keyframes } from 'styled-components';

/** Ratio du PNG `background_home.png` (2048×768). */
const BG_ASPECT = '2048 / 768';

/** Accueil plein viewport — pas de ScaledView 1920×1080. */
export const Root = styled.div`
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    background-image: url('interface/home_composition/background_home.png');
    background-size: auto 100%;
    background-position: center;
    background-repeat: no-repeat;
    color: #e8e6e1;
`;

/**
 * Cadre = zone réellement peinte par le fond (`auto 100%` + centré).
 * Les calques décoratifs (feuillage…) s’ancrent ici en % — ils suivent
 * le recadrage quand le viewport est plus étroit que l’image.
 */
export const Scene = styled.div`
    position: absolute;
    inset-block: 0;
    inset-inline-start: 50%;
    transform: translateX(-50%);
    height: 100%;
    aspect-ratio: ${BG_ASPECT};
    pointer-events: none;

    &::before {
        content: '';
        position: absolute;
        z-index: 1;
        inset: 0;
        background:
            /* Fondu latéral gauche et droit */
            linear-gradient(
                to right,
                #000 0%,
                rgba(0, 0, 0, 0.9) 7%,
                rgba(0, 0, 0, 0.75) 13%,
                rgba(0, 0, 0, 0.55) 16.67%,
                transparent 21%,
                transparent 79%,
                rgba(0, 0, 0, 0.55) 83.33%,
                rgba(0, 0, 0, 0.75) 87%,
                rgba(0, 0, 0, 0.9) 93%,
                #000 100%
            ),
            /* Léger assombrissement vertical */
            linear-gradient(
                to bottom,
                rgba(0, 0, 0, 0.5) 0%,
                transparent 12%,
                transparent 88%,
                rgba(0, 0, 0, 0.5) 100%
            );
    }
`;

/**
 * Vent léger : pivot centre-bas → le pied bouge à peine,
 * rotation + skewX s’amplifient vers les bords / le haut du PNG.
 */
const foliageSway = keyframes`
    0% {
        transform: rotate(0deg) skewX(0deg);
    }
    18% {
        transform: rotate(0.75deg) skewX(1.25deg);
    }
    42% {
        transform: rotate(-0.45deg) skewX(-0.75deg);
    }
    63% {
        transform: rotate(0.6deg) skewX(1.05deg);
    }
    82% {
        transform: rotate(-0.28deg) skewX(-0.55deg);
    }
    100% {
        transform: rotate(0deg) skewX(0deg);
    }
`;

export const Foliage = styled.div`
    position: absolute;
    top: -2%;
    left: 0%;
    width: 40%;
    aspect-ratio: 2048 / 1091;
    background-image: url(interface/home_composition/foliage.png);
    background-size: 100% 100%;
    background-position: center center;
    background-repeat: no-repeat;
    transform-origin: 50% 100%;
    will-change: transform;
    animation: ${foliageSway} 9.5s ease-in-out infinite;

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
`;

/**
 * Bannière = calques empilés (un seul PNG ne peut pas cumuler deux cinématiques
 * indépendantes ni un scale « plus fort en bas ») :
 * - haut 10 % figé
 * - balancier (rotate/skew) sur le tissu
 * - bandes internes : scaleX croissant vers le bas, rythme désynchronisé
 */
const bannerSway = keyframes`
    0% {
        transform: rotate(0deg) skewX(0deg) skewY(0deg);
    }
    20% {
        transform: rotate(3.4deg) skewX(2.4deg) skewY(0.45deg);
    }
    45% {
        transform: rotate(-2.4deg) skewX(-1.8deg) skewY(-0.35deg);
    }
    68% {
        transform: rotate(2.8deg) skewX(2.1deg) skewY(0.4deg);
    }
    86% {
        transform: rotate(-1.3deg) skewX(-1.05deg) skewY(-0.22deg);
    }
    100% {
        transform: rotate(0deg) skewX(0deg) skewY(0deg);
    }
`;

const bannerBillowSoft = keyframes`
    0%,
    100% {
        transform: scaleX(1);
    }
    35% {
        transform: scaleX(1.04);
    }
    70% {
        transform: scaleX(0.97);
    }
`;

const bannerBillowMid = keyframes`
    0%,
    100% {
        transform: scaleX(1);
    }
    30% {
        transform: scaleX(1.1);
    }
    65% {
        transform: scaleX(0.92);
    }
`;

const bannerBillowHard = keyframes`
    0%,
    100% {
        transform: scaleX(1);
    }
    28% {
        transform: scaleX(1.22);
    }
    62% {
        transform: scaleX(0.84);
    }
`;

const bannerFace = `
    position: absolute;
    inset: 0;
    background-image: url(interface/home_composition/banner_gondor.png);
    background-size: auto 100%;
    background-position: center center;
    background-repeat: no-repeat;
`;

export const Banner = styled.div`
    position: absolute;
    top: 41%;
    left: 25.65%;
    width: 8%;
    aspect-ratio: 327 / 542;
    pointer-events: none;

    /* Attache / haut — jamais animé */
    &::before {
        content: '';
        ${bannerFace}
        clip-path: inset(0 0 89% 0);
        z-index: 1;
    }
`;

/** Tissu entier : balancier (indépendant du scale des bandes). */
export const BannerSwing = styled.div`
    position: absolute;
    inset: 0;
    transform-origin: 50% 10%;
    will-change: transform;
    animation: ${bannerSway} 11s ease-in-out infinite;

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
`;

type BannerStripTone = 'soft' | 'mid' | 'hard';

const stripTone: Record<
    BannerStripTone,
    { clip: string; anim: ReturnType<typeof keyframes>; duration: string }
> = {
    soft: {
        clip: 'inset(9% 0 50% 0)',
        anim: bannerBillowSoft,
        duration: '7.2s',
    },
    mid: {
        clip: 'inset(46% 0 20% 0)',
        anim: bannerBillowMid,
        duration: '8.4s',
    },
    hard: {
        clip: 'inset(76% 0 0 0)',
        anim: bannerBillowHard,
        duration: '6.5s',
    },
};

/** Bande de tissu : même PNG, scaleX plus marqué vers le bas. */
export const BannerStrip = styled.div<{ $tone: BannerStripTone }>`
    ${bannerFace}
    clip-path: ${(p) => stripTone[p.$tone].clip};
    transform-origin: 50% 10%;
    will-change: transform;
    animation: ${(p) => stripTone[p.$tone].anim}
        ${(p) => stripTone[p.$tone].duration} ease-in-out infinite;

    @media (prefers-reduced-motion: reduce) {
        animation: none;
    }
`;

export const Menu = styled.nav`
    position: relative;
    z-index: 1;
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

export const Select = styled.select`
    appearance: none;
    width: 100%;
    box-sizing: border-box;
    padding: 12px 14px;
    border: 1px solid rgba(232, 230, 225, 0.28);
    background: rgba(0, 0, 0, 0.45);
    color: #e8e6e1;
    font: inherit;
    font-size: 1rem;
    cursor: pointer;

    &:focus {
        outline: none;
        border-color: rgba(226, 192, 68, 0.65);
    }

    &:disabled {
        opacity: 0.55;
        cursor: default;
    }

    option {
        background: #1a1a1a;
        color: #e8e6e1;
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
