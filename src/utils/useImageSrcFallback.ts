import { useState } from 'react';

/**
 * Chaîne de repli pour les visuels carte / site :
 * .jpg → .webp → .png → (optionnel) image de secours.
 */
export function useImageSrcFallback(
    imageUrl: string | undefined,
    ultimateFallback?: string
): {
    src: string | undefined;
    onError: () => void;
} {
    const [prevImageUrl, setPrevImageUrl] = useState(imageUrl);
    const [fallbackSrc, setFallbackSrc] = useState<string | null>(null);

    if (imageUrl !== prevImageUrl) {
        setPrevImageUrl(imageUrl);
        setFallbackSrc(null);
    }

    const onError = () => {
        if (!imageUrl) return;
        const currentSrc = fallbackSrc || imageUrl;
        const basePath = currentSrc.replace(/\.(jpg|jpeg|png|webp)$/i, '');
        const currentExt = currentSrc
            .slice(currentSrc.lastIndexOf('.'))
            .toLowerCase();

        const nextExtMap: Record<string, string | null> = {
            '.jpg': '.webp',
            '.jpeg': '.webp',
            '.webp': '.png',
            '.png': null,
        };

        const nextExt = nextExtMap[currentExt];
        if (nextExt) {
            setFallbackSrc(`${basePath}${nextExt}`);
        } else if (ultimateFallback) {
            setFallbackSrc(ultimateFallback);
        }
    };

    return {
        src: fallbackSrc ?? imageUrl,
        onError,
    };
}
