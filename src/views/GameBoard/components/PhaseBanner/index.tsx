import React, { useEffect, useState } from 'react';
import * as S from './styles';

interface PhaseBannerProps {
    phaseName: string;
}

const PHASE_LABELS: Record<string, string> = {
    fellowship: 'Phase de compagnie',
    shadow: "Phase de l'Ombre",
    maneuver: 'Phase de manoeuvre',
    archery: "Phase d'archerie",
    assignment: "Phase d'affectation'",
    skirmish: "Phase de combat",
    regroup: 'Phase de ralliement',
};

export const PhaseBanner: React.FC<PhaseBannerProps> = ({ phaseName }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        // Masque le composant après la durée de l'animation CSS
        const timer = setTimeout(() => {
            setIsVisible(false);
        }, 3000);

        return () => clearTimeout(timer);
    }, []); // Déclenché uniquement au montage (mount)

    if (!isVisible || !phaseName) return null;

    const label = PHASE_LABELS[phaseName] || phaseName.toUpperCase();

    return (
        <S.Overlay>
            <S.BannerContent>
                <S.BannerTitle>{label}</S.BannerTitle>
                <S.BannerImage src={`interface/icons/phase_${phaseName}.webp`} />
            </S.BannerContent>
        </S.Overlay>
    );
};