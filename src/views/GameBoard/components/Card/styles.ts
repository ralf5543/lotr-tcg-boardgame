import styled, { css } from 'styled-components';

const getSignet = (signet: string): string => {
    switch (signet) {
        case 'ARAGORN':
            return 'url(interface/icons/signet_aragorn.webp)';
        case 'FRODO':
            return 'url(interface/icons/signet_frodo.webp)';
        case 'GANDALF':
            return 'url(interface/icons/signet_gandalf.webp)';
        case 'THEODEN':
            return 'url(interface/icons/signet_theoden.webp)';
        default:
            return '';
    }
};
const getCultureBackground = (culture: string, type: string, kind: string) => {
    if (culture === 'GONDOR') {
        if (type === 'COMPANION' || type === 'ALLY') {
            return 'url(interface/cards_backgrounds/gondor_character.webp)';
        } else return 'url(interface/cards_backgrounds/gondor_modifier.webp)';
    }
    if (culture === 'SHIRE') {
        if (type === 'COMPANION' || type === 'ALLY') {
            return 'url(interface/cards_backgrounds/shire_character.webp)';
        } else return 'url(interface/cards_backgrounds/shire_modifier.webp)';
    }
    if (culture === 'ELVEN') {
        if (type === 'COMPANION' || type === 'ALLY') {
            return 'url(interface/cards_backgrounds/elven_character.webp)';
        } else return 'url(interface/cards_backgrounds/elven_modifier.webp)';
    }
    if (culture === 'DWARVEN') {
        if (type === 'COMPANION' || type === 'ALLY') {
            return 'url(interface/cards_backgrounds/dwarven_character.webp)';
        } else return 'url(interface/cards_backgrounds/dwarven_modifier.webp)';
    }
    if (culture === 'GANDALF') {
        if (type === 'COMPANION' || type === 'ALLY') {
            return 'url(interface/cards_backgrounds/gandalf_character.webp)';
        } else return 'url(interface/cards_backgrounds/gandalf_modifier.webp)';
    }
    if (culture === 'ROHAN') {
        if (type === 'COMPANION' || type === 'ALLY') {
            return 'url(interface/cards_backgrounds/rohan_character.webp)';
        } else return 'url(interface/cards_backgrounds/rohan_modifier.webp)';
    }
    if (culture === 'GOLLUM') {
        if (type === 'COMPANION' || type === 'ALLY') {
            return 'url(interface/cards_backgrounds/gollum_freeps_character.webp)';
        } else if (type === 'MINION') {
            return 'url(interface/cards_backgrounds/gollum_shadow_character.webp)';
        } else if (kind === 'FREE_PEOPLES') {
            return 'url(interface/cards_backgrounds/gollum_freeps_modifier.webp)';
        } else
            return 'url(interface/cards_backgrounds/gollum_shadow_modifier.webp)';
    }
    if (culture === 'MORIA') {
        if (type === 'MINION') {
            return 'url(interface/cards_backgrounds/moria_character.webp)';
        } else return 'url(interface/cards_backgrounds/moria_modifier.webp)';
    }
    if (culture === 'ISENGARD') {
        if (type === 'MINION') {
            return 'url(interface/cards_backgrounds/isengard_character.webp)';
        } else return 'url(interface/cards_backgrounds/isengard_modifier.webp)';
    }
    if (culture === 'SAURON') {
        if (type === 'MINION') {
            return 'url(interface/cards_backgrounds/sauron_character.webp)';
        } else return 'url(interface/cards_backgrounds/sauron_modifier.webp)';
    }
    if (culture === 'RINGWRAITH') {
        if (type === 'MINION') {
            return 'url(interface/cards_backgrounds/ringwraith_character.webp)';
        } else
            return 'url(interface/cards_backgrounds/ringwraith_modifier.webp)';
    }
    if (culture === 'DUNLAND') {
        if (type === 'MINION') {
            return 'url(interface/cards_backgrounds/dunland_character.webp)';
        } else return 'url(interface/cards_backgrounds/dunland_modifier.webp)';
    }
    if (culture === 'ORC') {
        if (type === 'MINION') {
            return 'url(interface/cards_backgrounds/orc_character.webp)';
        } else return 'url(interface/cards_backgrounds/orc_modifier.webp)';
    }
    if (culture === 'URUK-HAI') {
        if (type === 'MINION') {
            return 'url(interface/cards_backgrounds/uruk_character.webp)';
        } else return 'url(interface/cards_backgrounds/uruk_modifier.webp)';
    }
    if (culture === 'MEN') {
        if (type === 'MINION') {
            return 'url(interface/cards_backgrounds/men_character.webp)';
        } else return 'url(interface/cards_backgrounds/men_modifier.webp)';
    }
};
const getCultureSmallBackground = (culture: string): string => {
    switch (culture) {
        case 'GONDOR':
            return 'url(interface/cultures_backgrounds/background_gondor.webp)';
        case 'SHIRE':
            return 'url(interface/cultures_backgrounds/background_shire.webp)';
        case 'ISENGARD':
            return 'url(interface/cultures_backgrounds/background_isengard.webp)';
        case 'RINGWRAITH':
            return 'url(interface/cultures_backgrounds/background_wraith.webp)';
        case 'ELVEN':
            return 'url(interface/cultures_backgrounds/background_elf.webp)';
        case 'DWARVEN':
            return 'url(interface/cultures_backgrounds/background_dwarf.webp)';
        case 'MORIA':
            return 'url(interface/cultures_backgrounds/background_moria.webp)';
        case 'SAURON':
            return 'url(interface/cultures_backgrounds/background_sauron.webp)';
        default:
            return '';
    }
};

const isNotCharacter = (type?: string) =>
    Boolean(type) &&
    type !== 'COMPANION' &&
    type !== 'MINION' &&
    type !== 'ALLY';

const isForSupportArea = (type?: string) => {
    if (!type || type === 'ALLY') return false;

    return (
        type === 'POSSESSION_SUPPORT' ||
        type === 'FOLLOWER' ||
        type === 'CONDITION_SUPPORT' ||
        type === 'ARTIFACT_SUPPORT'
    );
};

export const CardContainer = styled.div<{
    $culture: string;
    $type: string;
    $signet: string;
    $isShadow?: boolean;
    $isPlayable?: boolean;
    $kind: string;
    $size?: 'sm' | 'md' | 'lg';
}>`
    aspect-ratio: 1/1.39;
    width: 130px;
    background-image: ${(props) =>
        getCultureBackground(props.$culture, props.$type, props.$kind)};
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
        opacity 0.2s ease;
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
            background-image: ${getCultureSmallBackground(props.$culture)};
            background-size: auto;
            background-repeat: repeat;
            filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 1));

            &::after {
                content: '';
                position: absolute;
                inset: -6px;
                z-index: -1;
                border-radius: 8px 8px 49px 49px;
                background: linear-gradient(
                    to top right,
                    rgba(0, 0, 0, 0) 0%,
                    #000000 50%,
                    rgba(0, 0, 0, 0) 100%
                );
            }

            ${isForSupportArea(props.$type) &&
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

                ${isForSupportArea(props.$type) &&
                css`
                    inset: 0 70px 0 0;
                    width: auto;
                `}
            }

            ${CardTitles} {
                max-width: 86px;

                ${isForSupportArea(props.$type) &&
                css`
                    inset: 0px 0px 0px 2px;
                `}
            }

            ${CardTitle} {
                font-size: 13px;
                margin-block-end: 1px;
                color: white;
                ${isForSupportArea(props.$type) &&
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

                ${isForSupportArea(props.$type) &&
                css`
                    inset: 0;
                    height: auto;
                    border-radius: 0;
                `}
            }

            ${TextContainer} {
                inset: 81px 4px 22px;
            }

            ${KeywordText} {
                font-size: 13px;
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

            ${CardResistance} {
                width: 39px;
                inset-block-start: 116px;
                inset-inline-start: 50%;
                transform: translateX(-50%);
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
        `}

    /* ======------ Large cards ------====== */
    ${(props) =>
        props.$size === 'lg' &&
        css`
            width: 400px;
            border-radius: 12px;

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

            ${KeywordText} {
                font-size: 18px;
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
                inset-inline-start: 2px;
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

            ${CardResistance} {
                width: 56px;
                inset-block-start: 474px;
                inset-inline-start: 21px;
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

export const KeywordText = styled.p`
    font-size: 6px;
    margin: 0;
    font-weight: bold;
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
    inset-inline-start: 3px;
    font-family: LOTRIcons;
    z-index: 1;
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
}
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
    background-image: ${(props) => getSignet(props.$signet)};
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
export const CardResistance = styled.span<{ $isRingBearer: boolean }>`
    background-image: ${(props) =>
        props.$isRingBearer
            ? `url(interface/icons/resistance_ring.webp)`
            : `url(interface/icons/resistance.webp)`};
    background-size: contain;
    background-repeat: no-repeat;
    background-position: 1px center;
    width: 17px;
    aspect-ratio: 1;
    position: absolute;
    inset-block-start: 155px;
    inset-inline-start: 8px;
    text-align: center;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    font-family: LOTRIcons;
    z-index: 1;
`;
export const KeywordsContainer = styled.div`
    position: absolute;
    z-index: 2;
    inset-block-start: 20px;
    inset-inline-end: -11px;
`;
