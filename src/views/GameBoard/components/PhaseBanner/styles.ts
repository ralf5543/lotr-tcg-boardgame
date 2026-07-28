import styled, { keyframes } from 'styled-components';

const slideBanner = keyframes`
  0% {
    opacity: 0;
    transform: translateX(-150px) scale(0.9);
  }
  20% {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
  70% {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateX(100vw) scale(1.05);
  }
`;

export const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    pointer-events: none;
`;

export const BannerTitle = styled.h1`
    color: #ffffff;
    font-size: 80px;
    font-weight: 100;
    font-family: DecipherTitle, serif;
    font-variant: small-caps;
    text-shadow: 0 4px 12px rgba(0, 0, 0, 0.9);
    margin: 0;
    animation: ${slideBanner} 3.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
`;