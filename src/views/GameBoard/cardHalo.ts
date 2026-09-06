import { css } from 'styled-components';

/** Halo or : event jouable (main, et drag encore en zone cancel). */
export const playableEventHalo = css`
    overflow: visible;
    outline: 1px solid rgba(226, 192, 68, 0.95);
    box-shadow:
        0 4px 6px rgba(0, 0, 0, 1),
        0 0 18px 3px rgba(226, 192, 68, 0.65);
`;

/** Halo bleu : spot to play satisfait — même rendu pour « prêt à jouer ». */
export const spotMetHalo = css`
    border: 1px solid #00f2fe;
    box-shadow: 0 0 10px rgba(0, 242, 254, 0.6);
`;
