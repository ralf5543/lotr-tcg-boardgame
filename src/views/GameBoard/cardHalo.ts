import { css } from 'styled-components';

/**
 * Halos plateau — voir `.cursor/rules/halo-colors.mdc`.
 * Or / rouge, même rendu, fixe (pas d’intensification au survol).
 */
export const boardHaloLook = (tone: 'choice' | 'hostile') =>
    tone === 'hostile'
        ? css`
              outline: 2px solid #e23b3b;
              outline-offset: 1px;
              box-shadow:
                  0 0 10px #e23b3b,
                  0 0 25px #c0392b,
                  0 0 45px rgba(255, 0, 0, 0.7),
                  0 0 70px rgba(255, 0, 0, 0.35);
          `
        : css`
              outline: 2px solid #e2c044;
              outline-offset: 1px;
              box-shadow:
                  0 0 10px #e2c044,
                  0 0 25px #c9a227,
                  0 0 45px rgba(226, 192, 68, 0.8),
                  0 0 70px rgba(226, 192, 68, 0.4);
          `;

/** Halo or main : plus discret que le plateau (compromis visible / non envahissant). */
export const playableEventHalo = css`
    overflow: visible;
    outline: 1px solid rgba(226, 192, 68, 0.95);
    box-shadow:
        rgb(0, 0, 0) 2px 4px 6px,
        rgb(226, 192, 68) 0px 0px 10px,
        rgb(201, 162, 39) 0px 0px 0px,
        rgba(226, 192, 68, 0.8) 0px 0px 12px,
        rgba(226, 192, 68, 0.4) 0px 0px 40px;
`;

