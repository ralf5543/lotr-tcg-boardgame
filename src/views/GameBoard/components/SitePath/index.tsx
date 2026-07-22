// src/components/SitePath.tsx
import React from 'react';
import type { SiteCard } from '../../../../game/types';
import * as S from './styles';

interface SitePathProps {
    path: (SiteCard | null)[];
    currentSiteIndex: number; // 0 à 8
}

// Helper pour connaître le bonus crépusculaire de région selon la position (0-based)
const getRegionBonus = (index: number): number => {
    if (index <= 2) return 0; // Sites 1, 2, 3 (Région 1)
    if (index <= 5) return 3; // Sites 4, 5, 6 (Région 2)
    return 6;                 // Sites 7, 8, 9 (Région 3)
};

export const SitePath: React.FC<SitePathProps> = ({ path, currentSiteIndex }) => {
    // S'assurer d'avoir toujours un tableau de 9 cases
    const slots = Array.from({ length: 9 }, (_, i) => path[i] ?? null);

    return (
        <S.SitespathContainer>
            <h3 style={{ margin: '0 0 8px 0', color: '#e2c044', fontSize: '14px', textTransform: 'uppercase' }}>
                Chemin d'Aventure (Path)
            </h3>

            {/* Conteneur horizontal des 9 sites */}
            <S.SitesGrid>
                {slots.map((site, index) => {
                    const isCurrent = index === currentSiteIndex;
                    const regionBonus = getRegionBonus(index);

                    return (
                        <S.SiteCard 
                          $isCurrent={isCurrent}
                            key={index}
                        >
                            {/* Pion de la Compagnie */}
                            {isCurrent && (
                                <S.SiteToken />
                            )}

                            {/* En-tête : Numéro de site & Bonus Région */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#888' }}>
                                <span>Site {index + 1}</span>
                                <span style={{ color: regionBonus > 0 ? '#ff7b72' : '#888' }}>
                                    Reg: +{regionBonus}
                                </span>
                            </div>

                            {/* Contenu du site s'il est posé */}
                            {site ? (
                                <>
                                    <div style={{ fontWeight: 'bold', fontSize: '11px', color: '#fff', textAlign: 'center' }}>
                                        {site.name}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '9px', color: site.ownerId === '0' ? '#79c0ff' : '#d2a8ff' }}>
                                            P{site.ownerId}
                                        </span>
                                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#e2c044' }}>
                                            🌙 {site.twilightCost}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <div style={{ fontSize: '10px', color: '#555', textAlign: 'center', marginTop: '12px' }}>
                                    Inexploré
                                </div>
                            )}
                        </S.SiteCard>
                    );
                })}
            </S.SitesGrid>
        </S.SitespathContainer>
    );
};