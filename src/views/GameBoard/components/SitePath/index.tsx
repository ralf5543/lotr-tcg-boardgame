import React from 'react';
import * as S from './styles';

interface SitePathProps {
  currentSite: number;
}

export const SitePath: React.FC<SitePathProps> = ({ currentSite }) => {
  return (
    <S.Container>
      <S.Title>🗺️ SITE PATH</S.Title>
      <S.List>
        <S.SiteCard $active={true}>
          <span style={{ fontSize: '10px' }}>Site Actuel : {currentSite} / 9</span>
        </S.SiteCard>
        <S.SiteCard>
          <span style={{ fontSize: '10px', opacity: 0.5 }}>🎄 Prochain Site</span>
        </S.SiteCard>
      </S.List>
    </S.Container>
  );
};