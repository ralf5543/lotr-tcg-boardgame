import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`

/* ==================----------------- FONTS -----------------================== */

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

@font-face {
    font-family: 'LOTRIcons';
    src: url('/fonts/LOTR_TCG_Icons-Bold.ttf';) format('truetype');
    font-display: swap; 
}

@font-face {
    font-family: 'LOTRSymbols';
    src: url('/fonts/LOTRSymbols.ttf') format('truetype');
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
  line-height: 1.2;
  cursor: none;
}

button {
  font-family: inherit;
  border: none;
  background: none;
  cursor: pointer;
  outline: none;
}

img {
  display: inline-block;
}

html, body, button, a, [draggable="true"], *, *::before, *::after {
  cursor: none !important;
}
`;
