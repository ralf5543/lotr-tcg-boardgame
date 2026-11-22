import React, { useEffect, useState } from 'react';
import { canonicalPhaseName } from '../../canonicalPhaseName';
import { useUiMessages } from '../../../../i18n/ui/useUiMessages';
import { longPhaseLabel } from '../../../../i18n/ui';
import * as S from './styles';

interface PhaseBannerProps {
    phaseName: string;
}

export const PhaseBanner: React.FC<PhaseBannerProps> = ({ phaseName }) => {
    const [isVisible, setIsVisible] = useState(true);
    const displayPhase = canonicalPhaseName(phaseName);
    const ui = useUiMessages();

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
        }, 3000);

        return () => clearTimeout(timer);
    }, []);

    if (!isVisible || !displayPhase) return null;

    const label =
        longPhaseLabel(ui.chrome, displayPhase) ||
        displayPhase.toUpperCase();

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
