import { css, keyframes } from 'styled-components';

/** Durée courte : assez pour capter l’œil, pas assez pour gêner. */
export const VALUE_PULSE_MS = 360;

const EASE_POP = 'cubic-bezier(0.34, 1.45, 0.64, 1)';

/**
 * `gen` doit apparaître dans le CSS interpolé (via calc) : sinon
 * styled-components réutilise le même nom d’anim et le navigateur ne
 * relance plus après le 1er pulse.
 */
export const valueChangePulseKeyframes = (gen: number) => keyframes`
    0% {
        transform: scale(calc(1 + ${gen} * 0));
    }
    38% {
        transform: scale(calc(1.5 + ${gen} * 0));
    }
    100% {
        transform: scale(calc(1 + ${gen} * 0));
    }
`;

/** Nouvel élément : 50 % → 150 % → 100 %. */
export const appearPulseKeyframes = keyframes`
    0% {
        transform: scale(0.5);
    }
    42% {
        transform: scale(1.5);
    }
    100% {
        transform: scale(1);
    }
`;

export const valueChangePulseCss = (gen?: number) =>
    gen
        ? css`
              transform-origin: center center;
              --value-pulse-gen: ${gen};
              animation: ${valueChangePulseKeyframes(gen)} ${VALUE_PULSE_MS}ms
                  ${EASE_POP};
          `
        : css``;

export const appearPulseCss = css`
    transform-origin: center center;
    animation: ${appearPulseKeyframes} ${VALUE_PULSE_MS}ms ${EASE_POP} both;
`;
