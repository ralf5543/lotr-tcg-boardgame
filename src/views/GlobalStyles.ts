import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`

@font-face {
    font-family: 'DecipherRegular';
    src: url('/fonts/LOTR_TCG-Regular.ttf') format('truetype');
    font-display: swap; /* Permet d'afficher du texte système en attendant le chargement de la font */
}

@font-face {
    font-family: 'DecipherTitle';
    src: url('/fonts/LOTR_TCG_Title.ttf') format('truetype');
    font-display: swap;
}

@font-face {
    font-family: 'DecipherLore';
    src: url('/fonts/LOTR_TCG-Lore.ttf') format('truetype');
    font-display: swap; 
}


  /* 1. Le Reset & Box-Sizing universel */
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  /* 2. Configuration du Body et HTML */
  html, body {
    width: 100%;
    height: 100%;
    background-color: #0f0f14;
    color: #f7fafc;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    overflow-x: hidden; /* Évite les scrolls horizontaux indésirables */
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    font-family: 'DecipherRegular', serif;
  }

  /* 3. Optionnel : un petit reset sur les boutons et inputs pour t'éviter des surprises */
  button {
    font-family: inherit;
    border: none;
    background: none;
    cursor: pointer;
    outline: none;
  }
`;
