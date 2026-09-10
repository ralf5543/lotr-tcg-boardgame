import styled, { css, keyframes } from 'styled-components';

export interface CardContainerProps {
    $culture: string;
    $type: string;
    $subtype?: string;
    $signet?: string;
    $isShadow?: boolean;
    $isPlayable?: boolean;
    $isWounded?: boolean;
    $isTakingDamage?: boolean;
    $isExerting?: boolean;
    $exertGen?: number;
    $isOverwhelmed?: boolean;
    $isDead?: boolean;
    $isDisabled?: boolean;
    $isActionable?: boolean;
    $isOpponent?: boolean; // Position globale de la carte (HAUT = true, BAS = false)
    $recoilDown?: boolean;
    $kind: string;
    $size?: 'sm' | 'md' | 'lg';
    $isRoaming?: boolean;
    $isDiscardPhase?: boolean;
    $isAttachment?: boolean;
}

const isNotCharacter = (type?: string) =>
    Boolean(type) &&
    type !== 'COMPANION' &&
    type !== 'MINION' &&
    type !== 'ALLY';

const isForSupportArea = (
    type?: string,
    subtype?: string,
    isAttachment?: boolean
) => {
    if (!type || type === 'ALLY' || type === 'COMPANION' || type === 'MINION') {
        return false;
    }
    // Si c'est un attachement (ex: arme attachée à un perso), ce n'est pas pour la support area
    if (isAttachment) {
        return false;
    }
    // Si le subtype est explicitement SUPPORT-AREA, ou s'il n'y a pas de subtype d'attachement
    return subtype === 'SUPPORT-AREA' || !subtype;
};

// 💥 ANIMATION D'IMPACT DYNAMIQUE (RECUL PHYSIQUE)
const woundImpactAnimation = (recoilY: number) => keyframes`
  0% {
    transform: translate(0, 0) rotate(0deg) scale(1);
    filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 1)) brightness(1);
  }
  20% {
    /* Impact & Recul vertical exact selon la direction calculée */
    transform: translate(var(--strike-x, 0%), ${recoilY}px) rotate(var(--strike-rot, 4deg)) scale(0.92);
    filter: drop-shadow(0 0 12px red) brightness(1.6) sepia(1) hue-rotate(-50deg) saturate(5);
  }
  45% {
    transform: translate(calc(var(--strike-x, 0%) * 0.35), ${recoilY * 0.35}px) rotate(calc(var(--strike-rot, 4deg) * -0.25)) scale(0.97);
  }
  100% {
    transform: translate(0, 0) rotate(0deg) scale(1);
    filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 1)) brightness(1);
  }
`;

// Affaiblissement : un léger affaissement, pas un recul de coup
const exertFatigueAnimation = (sagY: number, gen = 0) => keyframes`
  /* ${gen} */
  0% {
    transform: translate(0, 0) rotate(0deg) scale(1);
    filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 1)) brightness(1);
  }
  32% {
    transform: translate(0, ${sagY}px) rotate(${sagY > 0 ? 1 : -1}deg) scale(0.985, 0.96);
    filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 1)) brightness(0.86) saturate(0.8);
  }
  100% {
    transform: translate(0, 0) rotate(0deg) scale(1);
    filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 1)) brightness(1);
  }
`;

export const CardContainer = styled.div<CardContainerProps>`
    aspect-ratio: 1/1.39;
    width: 130px;
    z-index: 2;
    background-image: ${(props) => {
        if (props.$culture === 'GOLLUM') {
            if (props.$type === 'COMPANION' || props.$type === 'ALLY') {
                return `url(interface/cards_backgrounds/${props.$culture}_freeps_character.webp)`;
            } else if (props.$type === 'MINION') {
                return `url(interface/cards_backgrounds/${props.$culture}_shadow_character.webp)`;
            } else if (props.$kind === 'FREE_PEOPLE') {
                return `url(interface/cards_backgrounds/${props.$culture}_freeps_modifier.webp)`;
            } else {
                return `url(interface/cards_backgrounds/${props.$culture}_shadow_modifier.webp)`;
            }
        } else {
            if (
                props.$type === 'COMPANION' ||
                props.$type === 'ALLY' ||
                props.$type === 'MINION'
            ) {
                return `url(interface/cards_backgrounds/${props.$culture}_character.webp)`;
            } else {
                return `url(interface/cards_backgrounds/${props.$culture}_modifier.webp)`;
            }
        }
    }};

    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
    display: flex;
    flex-direction: column;
    position: relative;
    color: black;
    background-color: black;
    border-radius: 4px;

    /* On gère le filtre visuel selon si la carte est jouable ou non */
    filter: ${(props) =>
        props.$isPlayable === false
            ? 'brightness(0.55) contrast(0.9) grayscale(0.15)'
            : 'brightness(1) contrast(1)'};

    transition:
        transform 0.2s ease,
        opacity 0.2s ease,
        filter 0.2s ease;
    user-select: none;
    -webkit-user-drag: ${(props) => (props.draggable ? 'element' : 'none')};

    /* ======------ Small cards ------====== */
    ${(props) =>
        props.$size === 'sm' &&
        css`
            width: 105px;
            border-radius: 8px 8px 49px 49px;
            border: 6px solid transparent;
            outline: 1px solid black;
            background-image: ${`url(interface/cultures_backgrounds/background_${props.$culture}.webp)`};
            background-size: auto;
            background-repeat: repeat;
            filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 1));

            &::before {
                position: absolute;
                top: -18px;
                left: 50%;
                transform: translateX(-50%);
                color: black;
                font-size: 9px;
                font-weight: bold;
                padding: 1px 4px;
                border-radius: 3px;
                z-index: 999;
                white-space: nowrap;
                pointer-events: none;
            }

            &::after {
                content: '';
                position: absolute;
                inset: -6px;
                z-index: -1;
                border-radius: 8px 8px 49px 49px;
                background: linear-gradient(
                    to right top,
                    rgba(0, 0, 0, 0) 0%,
                    rgba(0, 0, 0, 60%) 50%,
                    rgba(0, 0, 0, 0) 100%
                );
            }

            ${isForSupportArea(props.$type, props.$subtype) &&
            css`
                border-radius: 8px;

                &::after {
                    border-radius: 8px;
                }
            `}

            ${CardHeader} {
                min-height: 18px;
                padding-block-start: 0;
                padding-inline: 0;
                line-height: 1;
                background-color: rgba(0, 0, 0, 0.5);
                position: absolute;
                width: 100%;
                display: flex;
                align-items: center;
                padding-inline: 7px;
                z-index: 1;

                ${isForSupportArea(props.$type, props.$subtype) &&
                css`
                    inset: 0 70px 0 0;
                    width: auto;
                `}
            }

            ${CardTitles} {
                max-width: 86px;

                ${isForSupportArea(props.$type, props.$subtype) &&
                css`
                    inset: 0px 0px 0px 2px;
                `}
            }

            ${CardTitle} {
                font-size: 13px;
                margin-block-end: 1px;
                color: white;
                ${isForSupportArea(props.$type, props.$subtype) &&
                css`
                    font-size: 10px;
                `}
            }

            ${CardType} {
                font-size: 14px;
                line-height: 1;
            }

            ${VisualContainer} {
                padding-inline: 0;
                position: absolute;
                border-radius: 8px 8px 49px 49px;
                overflow: hidden;
                inset: 0;
                height: auto;

                ${isForSupportArea(props.$type, props.$subtype) &&
                css`
                    inset: 0;
                    height: auto;
                    border-radius: 0;
                `}
            }

            ${TextContainer} {
                inset: 81px 4px 22px;
            }

            ${GameText} {
                font-size: 13px;
            }

            ${TwilightBadge} {
                font-size: 20px;
                width: 35px;
                margin-inline-end: 14px;
            }

            ${StrengthBadge} {
                font-size: 20px;
                width: 70px;
                inset-block-start: 88px;
                inset-inline-start: -34px;
                background-position: 13px 3px;
            }

            ${VitalityBadge} {
                font-size: 20px;
                width: 44px;
                inset-block-start: 100px;
                inset-inline-start: 67px;
                background-position: 3px 3px;
            }

            ${CardSignet} {
                transform: translateX(-50%);
                inset-block-start: -10px;
                inset-inline-start: 94px;
                width: 25px;
            }

            ${ResistanceWrapper} {
                width: 39px;
                inset-block-start: 121px;
                inset-inline-start: 26px;
            }

            ${CardResistance} {
                font-size: 20px;
                background-position: 3px 2px;
            }

            ${RoamingNumber} {
                width: 39px;
                inset-block-start: 116px;
                inset-inline-start: 50%;
                transform: translateX(-50%);
                font-size: 20px;
                background-position: 1px 0px;
            }

            /* ======------ Attachment cards ($isAttachment ou RING) ------====== */
            ${(props.$isAttachment || props.$type === 'RING') &&
            css`
                aspect-ratio: initial;
                height: 100%;
                border-radius: 0;
                outline: none;

                &::after {
                    content: none;
                }

                ${CardHeader} {
                    display: none;
                }
                ${VisualContainer} {
                    inset: 0;
                    height: 100%;
                    border-radius: 6px;
                    display: none;
                }
                ${StrengthBadge} {
                    width: 25px;
                    inset-block-start: 28px;
                    inset-inline-start: -5px;
                    background-position: center;
                    background-size: 27px;
                    height: 30px;
                    font-size: 16px;
                }
                ${VitalityBadge} {
                    width: 25px;
                    inset-block-start: 57px;
                    inset-inline-start: -6px;
                    background-position: 1px center;
                    background-size: 27px;
                    height: 30px;
                    font-size: 16px;
                }
            `}

            /* ======------ Small RING card override ------====== */
            ${props.$type === 'RING' &&
            css`
                border: 0px;
                ${VisualContainer} {
                    display: block;
                    inset: 0px -6px;
                    border-radius: 6px;
                    overflow: hidden;
                    height: auto;
                }

                ${VitalityBadge} {
                    inset-inline-start: -1px;
                }

                ${StrengthBadge} {
                    inset-inline-start: -1px;
                }
            `}

            /* ======------ Impact Blessure ($size === 'sm') ------====== */
            ${props.$isTakingDamage &&
            css`
                will-change: transform, filter;
                animation: ${() => {
                        const recoilY = props.$recoilDown ? 35 : -35;
                        return woundImpactAnimation(recoilY);
                    }}
                    0.65s cubic-bezier(0.12, 0.85, 0.2, 1);
            `}
            /* ======------ Affaiblissement (exert) ------====== */
            ${props.$isExerting &&
            !props.$isTakingDamage &&
            css`
                will-change: transform, filter;
                animation: ${() => {
                        const sagY = props.$recoilDown ? 8 : -8;
                        return exertFatigueAnimation(sagY, props.$exertGen);
                    }}
                    0.5s cubic-bezier(0.22, 0.7, 0.3, 1);
            `}
            /* ======------ OVERWHELMED ------====== */
            ${props.$isOverwhelmed &&
            css`
                will-change: transform, filter;
                animation: ${() => {
                        const recoilY = props.$recoilDown ? 35 : -35;
                        return woundImpactAnimation(recoilY);
                    }}
                    0.65s cubic-bezier(0.12, 0.85, 0.2, 1);
            `}

            /* ======------ État Mort / Agonie ($size === 'sm') ------====== */
            ${props.$isDead &&
            css`
                filter: grayscale(80%) brightness(0.4) !important;
                opacity: 0.65;
                transform: scale(0.94);
                pointer-events: none; /* Empêche les interactions pendant que la carte succombe */
                transition:
                    filter 0.3s ease,
                    opacity 0.3s ease,
                    transform 0.3s ease;
            `}

            /* ======------ État Désactivé / Incapable ($size === 'sm') ------====== */
            ${props.$isDisabled &&
            css`
                filter: grayscale(60%) brightness(0.5) contrast(0.85) !important;
                opacity: 0.7;
                pointer-events: none;
                cursor: not-allowed;
            `}
            /* ======------ Carte jouable durant cette phase ($size === 'sm') ------====== */
            ${props.$isActionable &&
            css`
                box-shadow: rgb(255 247 10) 0px 0px 14px 7px;
            `}
        `}

    /* ======------ Large cards ------====== */
    ${(props) =>
        props.$size === 'lg' &&
        css`
            width: 400px;
            border-radius: 12px;
            overflow: hidden;

            ${CardHeader} {
                min-height: 75px;
                padding-block-start: 20px;
                padding-inline: 20px;
                line-height: 1;
            }

            ${CardTitles} {
                ${isNotCharacter(props.$type) &&
                css`
                    inset: 80px 325px 260px 25px;
                `}
            }

            ${CardTitle} {
                font-size: 26px;
                margin-block-end: 1px;

                ${isNotCharacter(props.$type) &&
                css`
                    min-height: 75px;
                    font-size: 24px;
                `}
            }

            ${CardSubtitle} {
                font-size: 18px;
            }

            ${CardTypes} {
                inset: 325px 60px 209px 60px;
                ${isNotCharacter(props.$type) &&
                css`
                    inset: 317px 40px 203px 100px;
                `}
            }

            ${CardType} {
                font-size: 20px;

                ${isNotCharacter(props.$type) &&
                css`
                    inset: 315px 40px 205px 100px;
                `}
            }

            ${Separator} {
                width: 20px;
            }

            ${VisualContainer} {
                height: 240px;
                padding-inline: 43px 45px;

                ${isNotCharacter(props.$type) &&
                css`
                    padding-inline: 0;
                    height: auto;
                    inset: 65px 36px 287px 83px;
                `}
            }

            ${TextContainer} {
                padding: 18px 12px;
                inset: 352px 20px 32px 86px;
            }

            ${GameText} {
                font-size: 16px;
            }

            ${LoreText} {
                font-size: 16px;
            }

            ${TwilightBadge} {
                font-size: 28px;
                width: 50px;
                margin-inline-end: 20px;
            }

            ${StrengthBadge} {
                font-size: 28px;
                width: 86px;
                inset-block-start: 336px;
                inset-inline-start: 5px;
                background-position: 18px 4px;
            }

            ${VitalityBadge} {
                font-size: 28px;
                width: 56px;
                inset-block-start: 416px;
                inset-inline-start: 20px;
                background-position: 4px 4px;
            }

            ${CardSignet} {
                width: 56px;
                inset-block-start: 474px;
                inset-inline-start: 24px;
            }

            ${ResistanceWrapper} {
                width: 56px;
                inset-block-start: 474px;
                inset-inline-start: 21px;
            }
            ${CardResistance} {
                font-size: 28px;
                background-position: 4px 4px;
            }

            ${RoamingNumber} {
                font-size: 28px;
                width: 56px;
                inset-block-start: 474px;
                inset-inline-start: 20px;
            }
        `}

    /* ======------ Large RING card ------====== */
    ${(props) =>
        props.$type === 'RING' &&
        props.$size === 'lg' &&
        css`
            ${VisualContainer} {
                inset: 0;
                border-radius: 6px;
                overflow: hidden;
            }

            ${TwilightBadge} {
                display: none;
            }

            ${CardTypes} {
                display: none;
            }

            ${CardTitle} {
                font-size: 24px;
                font-weight: 700;
            }
            ${CardSubtitle} {
                inset: 240px -310px -60px -10px;
                font-size: 24px;
                position: absolute;
                writing-mode: initial;
            }
        `}
`;

export const CardHeader = styled.div`
    display: flex;
    min-height: 15px;
    padding-block-start: 5px;
    padding-inline: 4px;
    line-height: 1;
`;

export const CardTitles = styled.div<{ $type?: string }>`
    display: flex;
    flex-direction: column;
    font-family: 'DecipherTitle', serif;
    font-variant: small-caps;
    z-index: 2;
    ${(props) =>
        isNotCharacter(props.$type) &&
        css`
            position: absolute;
            inset: 26px 109px 83px 7px;
            writing-mode: sideways-lr;
            line-height: 0.8;
            text-align: center;
        `}
`;

export const CardTitle = styled.p<{ $type?: string }>`
    font-size: 9px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-block-start: 0.5px;
    margin-block-start: 2px;
    ${(props) =>
        isNotCharacter(props.$type) &&
        css`
            font-size: 8px;
        `}
`;

export const CardSubtitle = styled.p<{ $type?: string }>`
    font-size: 7px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-block-start: 0.5px;
    ${(props) =>
        isNotCharacter(props.$type) &&
        css`
            font-size: 6px;
        `}
`;

export const CardTypes = styled.div<{ $type?: string }>`
    position: absolute;
    inset: 104px 15px 66px 16px;
    display: flex;
    justify-content: center;
    ${(props) =>
        isNotCharacter(props.$type) &&
        css`
            inset: 104px 15px 66px 34px;
        `}
`;

export const Separator = styled.span`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 10px;
`;

export const CardType = styled.p<{ $type?: string }>`
    font-family: DecipherTitle, serif;
    font-size: 7px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: flex;
    justify-content: center;
    align-items: center;
    font-variant: small-caps;
    text-transform: capitalize;
    ${(props) => isNotCharacter(props.$type) && css``}
`;

export const TwilightBadge = styled.span<{ $isShadow?: boolean }>`
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    color: white;
    font-weight: bold;
    font-size: 12px;
    width: 20px;
    aspect-ratio: 1;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-inline-end: 4px;
    text-align: center;
    font-family: LOTRIcons;
    z-index: 1;
`;

export const VisualContainer = styled.figure<{ $type?: string }>`
    height: 76px;
    margin: 0px;
    padding-inline: 13px;
    position: relative;
    overflow: hidden;
    ${(props) =>
        isNotCharacter(props.$type) &&
        css`
            height: 68px;
            margin: 0px;
            padding-inline: 0;
            position: absolute;
            inset: 20px 10px 7px 27px;
            inset-block-start: 20px;
        `}
`;

export const Visual = styled.img`
    width: 100%;
    height: 100%;
    object-fit: cover;
    user-select: none;
    -webkit-user-drag: none;
`;

const wraithOpacity = keyframes`
  0%,
  100% {
    opacity: 0.34;
  }
  16% {
    opacity: 0.72;
  }
  31% {
    opacity: 0.48;
  }
  54% {
    opacity: 0.86;
  }
  73% {
    opacity: 0.4;
  }
  88% {
    opacity: 0.68;
  }
`;

const wraithWarp = keyframes`
  0%,
  100% {
    transform: scale(1.03) translate3d(0, 0, 0);
  }
  28% {
    transform: scale(1.08) translate3d(-1.6%, 1.1%, 0) skewX(-0.6deg);
  }
  57% {
    transform: scale(1.05) translate3d(1.4%, -0.9%, 0) skewX(0.5deg);
  }
  81% {
    transform: scale(1.09) translate3d(-0.6%, -1.3%, 0) skewY(0.4deg);
  }
`;

const wraithInvert = keyframes`
  0%,
  100% {
    filter: invert(1) grayscale(1) contrast(1.4) brightness(1.08) blur(0.45px);
  }
  22% {
    filter: invert(1) grayscale(1) contrast(1.62) brightness(1.22) blur(1.35px);
  }
  49% {
    filter: invert(1) grayscale(1) contrast(1.28) brightness(0.98) blur(0.7px);
  }
  71% {
    filter: invert(1) grayscale(1) contrast(1.55) brightness(1.18) blur(1.8px);
  }
`;

const wraithVeil = keyframes`
  0%,
  100% {
    opacity: 0.28;
  }
  40% {
    opacity: 0.55;
  }
  70% {
    opacity: 0.18;
  }
`;

export const WraithWorldLayer = styled.div<{ $filterId: string }>`
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    overflow: hidden;
    border-radius: inherit;
    filter: url(#${(props) => props.$filterId});
    animation: ${wraithOpacity} 12.8s ease-in-out infinite;
    will-change: opacity;
`;

export const WraithWorldVisual = styled.div`
    width: 100%;
    height: 100%;
    animation: ${wraithWarp} 14.4s ease-in-out infinite;
    will-change: transform;

    ${Visual} {
        animation: ${wraithInvert} 11.2s ease-in-out infinite;
        will-change: filter;
    }
`;

export const WraithWorldVeil = styled.div`
    position: absolute;
    inset: -8%;
    pointer-events: none;
    background: radial-gradient(
        ellipse at 42% 28%,
        rgba(210, 236, 245, 0.55) 0%,
        rgba(90, 140, 160, 0.18) 46%,
        rgba(12, 22, 32, 0.35) 100%
    );
    mix-blend-mode: overlay;
    animation: ${wraithVeil} 10.2s ease-in-out infinite;
`;

export const WraithWorldFilterSvg = styled.svg`
    position: absolute;
    width: 0;
    height: 0;
    overflow: hidden;
`;

export const TextContainer = styled.div`
    padding: 3px;
    position: absolute;
    inset: 114px 8px 10px 27px;
`;

export const GameText = styled.p`
    font-size: 6px;
    color: black;
    overflow: hidden;
    margin-block-start: 2px;
    line-height: 1;
`;

export const LoreText = styled.p`
    font-size: 6px;
    color: black;
    overflow: hidden;
    margin-block-start: 8px;
    line-height: 1;
    font-family: DecipherLore;
`;

export const StrengthBadge = styled.span`
    background-image: url('interface/icons/icon_strength.png');
    background-size: contain;
    background-repeat: no-repeat;
    background-position: 5px 1px;
    color: #fff;
    font-weight: bold;
    font-size: 9px;
    width: 27px;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    inset-block-start: 113px;
    inset-inline-start: 3.5px;
    font-family: LOTRIcons;
    z-index: 1;
    pointer-events: none;
`;

export const VitalityBadge = styled.span`
    background-image: url('interface/icons/icon_vitality.png');
    background-size: contain;
    background-repeat: no-repeat;
    background-position: 1px center;
    color: #fff;
    font-weight: bold;
    font-size: 9px;
    width: 17px;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    inset-block-start: 139px;
    inset-inline-start: 8px;
    font-family: LOTRIcons;
    z-index: 1;
    pointer-events: none;
`;

export const RoamingNumber = styled.span<{ $isRoaming?: boolean }>`
    background-image: url('interface/icons/minion_site_number.webp');
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    width: 17px;
    aspect-ratio: 1;
    position: absolute;
    inset-block-start: 156px;
    inset-inline-start: 8px;
    text-align: center;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    z-index: 1;
    font-family: LOTRIcons;
    ${({ $isRoaming }) =>
        $isRoaming &&
        `
    filter: drop-shadow(0px 0px 5px red)
                        drop-shadow(0px 0px 5px red)
                        brightness(1.2);
  `}
`;

export const RoamingBadge = styled.span`
    position: absolute;
    top: 1px;
    right: -25px;
    background-color: darkred;
    color: white;
    font-weight: bold;
    font-size: 9px;
    padding: 2px 6px;
    border-radius: 9999px;
    z-index: 10;
`;

export const CardSignet = styled.span<{ $signet: string }>`
    background-image: ${(props) =>
        `url(interface/icons/signet_${props.$signet}.webp)`};
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    width: 16px;
    aspect-ratio: 1;
    position: absolute;
    inset-block-start: 156px;
    inset-inline-start: 9px;
    z-index: 1;
`;

export const ResistanceWrapper = styled.div`
    position: absolute;
    z-index: 1;
    inset-block-start: 156px;
    inset-inline-start: 8px;
    width: 17px;
    aspect-ratio: 1;
    width: 16px;
`;

export const CardResistance = styled.span<{ $isRingBearer: boolean }>`
    background-image: ${(props) =>
        props.$isRingBearer
            ? `url(interface/icons/resistance_ring.webp)`
            : `url(interface/icons/resistance.webp)`};
    background-size: contain;
    background-repeat: no-repeat;
    background-position: 1px center;
    width: 100%;
    height: 100%;
    position: absolute;
    inset-block-start: 50%;
    inset-inline-start: 50%;
    translate: -50% -50%;
    text-align: center;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    font-family: LOTRIcons;
    z-index: 1;
`;

export const BurdensOrbitalContainer = styled.div`
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    pointer-events: none;
    z-index: 2;
    margin-inline-start: 1px;
`;

interface OrbitalTokenProps {
    $angle: number;
    $radius: number;
    $size?: number;
}

export const OrbitalBurdenToken = styled.img<OrbitalTokenProps>`
    position: absolute;
    width: ${({ $size = 14 }) => $size}px;
    height: ${({ $size = 14 }) => $size}px;

    margin-top: calc(-${({ $size = 14 }) => $size}px / 2);
    margin-left: calc(-${({ $size = 14 }) => $size}px / 2);

    transform: rotate(${({ $angle }) => $angle}deg)
        translateY(-${({ $radius }) => $radius}px)
        rotate(-${({ $angle }) => $angle}deg);

    transition: transform 0.3s ease-out;
    filter: drop-shadow(0px 0px 4px rgba(255, 0, 0, 0.8));
`;

export const KeywordsContainer = styled.div`
    position: absolute;
    z-index: 2;
    inset-block-start: 20px;
    inset-inline-end: -11px;
    display: flex;
    max-height: 50%;
    flex-direction: column;
    gap: 4px;
    flex-wrap: wrap-reverse;
`;

export const AttachmentSubtype = styled.img`
    position: absolute;
    z-index: 2;
    inset-block-start: -1px;
    inset-inline-start: -3px;
    background-color: white;
    border-radius: 50%;
    padding: 2px;
    width: 20px;
    border: 1px solid black;
    filter: invert(1);
    aspect-ratio: 1;
`;

export const AttachmentSubtypeRing = styled.img`
    position: absolute;
    z-index: 2;
    inset-block-start: 4px;
    inset-inline-start: 2px;
    background-color: white;
    border-radius: 50%;
    padding: 2px;
    width: 20px;
    border: 1px solid black;
    filter: invert(1);
`;

export const WoundsOverlay = styled.div`
    position: absolute;
    inset: 30px 32px 33px -11px;
    z-index: 10;
    pointer-events: none;
`;

export const WoundToken = styled.img`
    height: fit-content;
    margin-inline-end: 4px;
`;

export const AbilityButton = styled.button<{ $abilityPhaseMatch?: boolean, $culture?: string }>`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    z-index: 11;
    inset-block-start: 50%;
    inset-inline-start: 0;
    transform: translate(-50%, -50%);
    width: 25px;
    aspect-ratio: 1;
    padding: 0;
    border-radius: 50%;
    color: #eee;
    font-size: 11px;
    line-height: 1;
    cursor: pointer;
    background-image: ${(props) =>
        `url(interface/icons/icon_signet_${props.$culture}.webp)`};
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    box-shadow: rgb(0, 0, 0) 0px 2px 2px;

    ${(props) =>
        props.$abilityPhaseMatch &&
        css`
            box-shadow: rgb(0, 0, 0) 0px 2px 2px, rgb(226, 192, 68) 0px 0px 10px 7px;
            &:active {
                box-shadow: inset 0 0 10px black, rgb(226, 192, 68) 0px 0px 8px 3px;
            }
        `}

    img {
        filter: drop-shadow(1px 2px 1px rgba(0, 0, 0, 0.5));
        width: auto;
        height: auto;
        max-height: 16px;
        max-width: 16px;
    }
    &::before {
        content: "";
        position: absolute;
        background-image: url(interface/tokens/token_player_top.webp);
        background-size: contain;
        background-repeat: no-repeat;
        z-index: 2;
        width: 22px;
        aspect-ratio: 1 / 1;
        pointer-events: none;
    }

    
`;

export const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translate(-50%, -95%);
  }
  to {
    opacity: 1;
    transform: translate(-50%, -100%);
  }
`;

export const AbilityBubble = styled.div<{ $top: number; $left: number }>`
    position: fixed;
    z-index: 10;
    top: ${(props) => props.$top}px;
    left: ${(props) => props.$left}px;
    transform: translate(-50%, -100%);
    max-width: 200px;
    padding: 6px 12px 6px 6px;
    border: 1px solid #333;
    font-size: 11px;
    line-height: 1.3;
    background-color: rgba(18, 18, 20, 0.95);
    border: 1px solid #e2c044;
    border-radius: 6px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.8);
    animation: ${fadeIn} 0.15s ease-out forwards;

    &::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        margin-left: -5px;
        border-width: 5px;
        border-style: solid;
        border-color: #e2c044 transparent transparent transparent;
    }
`;

export const AbilityBubbleClose = styled.button`
    position: absolute;
    top: 0px;
    right: 0px;
    width: 16px;
    height: 16px;
    padding: 0;
    border: 0;
    background: transparent;
    color: #c7c7c7;
    cursor: pointer;
    font-size: 12px;
    line-height: 1;
`;

export const AbilityBubbleList = styled.ul`
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 0;
    list-style: none;
`;

export const AbilityBubbleItem = styled.button`
    display: block;
    width: 100%;
    padding: 4px 6px;
    border: 0;
    background: transparent;
    color: white;
    text-align: left;
    cursor: pointer;
    font: inherit;
    opacity: 0.8;

    &:hover {
        opacity: 1;
    }
    span {
        color: #e2c044;
    }
`;

