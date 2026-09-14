import React, { useEffect, useState } from 'react';
import { canonicalPhaseName } from '../../canonicalPhaseName';
import * as S from './styles';

interface PhaseBannerProps {
    phaseName: string;
}

const PHASE_LABELS: Record<string, string> = {
    setup: 'Mise en place',
    fellowship: 'Phase de compagnie',
    shadow: "Phase de l'Ombre",
    maneuver: 'Phase de manoeuvre',
    archery: "Phase d'archerie",
    assignment: "Phase d'affectation",
    skirmish: "Phase de combat",
    regroup: 'Phase de ralliement',
};

export const PhaseBanner: React.FC<PhaseBannerProps> = ({ phaseName }) => {
    const [isVisible, setIsVisible] = useState(true);
    const displayPhase = canonicalPhaseName(phaseName);

    useEffect(() => {
        // Masque le composant après la durée de l'animation CSS
        const timer = setTimeout(() => {
            setIsVisible(false);
        }, 3000);

        return () => clearTimeout(timer);
    }, []); // Déclenché uniquement au montage (mount)

    if (!isVisible || !displayPhase) return null;

    const label = PHASE_LABELS[displayPhase] || displayPhase.toUpperCase();

    return (
        <S.Overlay>
            <S.BannerContent>
                <S.BannerTitle>{label}</S.BannerTitle>
                <S.BannerImage
                    src={`interface/icons/phase_${displayPhase}.webp`}
                />
            </S.BannerContent>
        </S.Overlay>
    );
};
