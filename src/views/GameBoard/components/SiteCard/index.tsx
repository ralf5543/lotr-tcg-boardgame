import React from 'react';
import type { SiteCardState } from '../../../../game/types';
import * as S from './styles';

export interface SiteCardProps {
    site: SiteCardState;
    size?: S.SiteCardSize;
    playersHere?: { p0?: boolean; p1?: boolean };
    className?: string;
    style?: React.CSSProperties;
}

export const SiteCard: React.FC<SiteCardProps> = ({
    site,
    size = 'md',
    playersHere,
    className,
    style,
}) => {
    return (
        <S.Container $size={size} className={className} style={style}>
            {/* Entête présent pour tous les formats */}
            <S.Header>
                <S.Title>{site.name}</S.Title>
                <S.TwilightBadge>🌙 {site.twilightCost}</S.TwilightBadge>
            </S.Header>

            {/* Visuel affiché en md et lg */}
            {size !== 'sm' && site.imageUrl && (
                <S.VisualContainer>
                    <S.Visual src={site.imageUrl} alt={site.name} />
                </S.VisualContainer>
            )}

            {/* Texte de règles affiché uniquement sur le format lg (Zoom) */}
            {size === 'lg' && site.text && <S.Text>{site.text}</S.Text>}

            {/* Pied de carte (joueur/proprio ou présence) */}
            <S.Footer>
                <span>{site.ownerId !== undefined ? `P${site.ownerId}` : ''}</span>
                {playersHere && (playersHere.p0 || playersHere.p1) && (
                    <span style={{ background: '#e2c044', color: '#000', padding: '1px 4px', borderRadius: '3px', fontWeight: 'bold' }}>
                        {playersHere.p0 && '🚶 P0 '}
                        {playersHere.p1 && '🚶 P1'}
                    </span>
                )}
            </S.Footer>
        </S.Container>
    );
};