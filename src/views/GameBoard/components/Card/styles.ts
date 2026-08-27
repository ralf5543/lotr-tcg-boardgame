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
    $isOverwhelmed?: boolean;
    $isDead?: boolean;
    $isDisabled?: boolean;
    $isOpponent?: boolean; // Position globale de la carte (HAUT = true, BAS = false)
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
                        // Si en HAUT ($isOpponent = true) -> Recule vers le haut (-35px)
                        // Si en BAS ($isOpponent = false) -> Recule vers le bas (+35px)
                        const recoilY = props.$isOpponent ? -35 : 35;
                        return woundImpactAnimation(recoilY);
                    }}
                    0.65s cubic-bezier(0.12, 0.85, 0.2, 1);
            `}
            /* ======------ OVERWHELMED ------====== */
            ${props.$isOverwhelmed &&
            css`
                will-change: transform, filter;
                animation: ${() => {
                        // Si en HAUT ($isOpponent = true) -> Recule vers le haut (-35px)
                        // Si en BAS ($isOpponent = false) -> Recule vers le bas (+35px)
                        const recoilY = props.$isOpponent ? -35 : 35;
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
`;

export const WoundToken = styled.img`
    height: fit-content;
    margin-inline-end: 4px;
`;
