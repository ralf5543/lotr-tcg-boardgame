import { useState } from 'react';

/**
 * Chaîne de repli pour les visuels carte / site (filet de sécurité).
 * Les imageUrl devraient déjà pointer la bonne extension (convert /
 * `scripts/fix-card-image-urls.ts`). Si un fichier manque encore :
 * .jpg → .png → .webp → (optionnel) image de secours.
 * Chaque échec produit un 404 réseau — d’où l’intérêt de corriger les données.
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
            '.jpg': '.png',
            '.jpeg': '.png',
            '.png': '.webp',
            '.webp': null,
        };

        const nextExt = nextExtMap[currentExt];
        if (nextExt) {
            setFallbackSrc(`${basePath}${nextExt}`);
        } else if (ultimateFallback && currentSrc !== ultimateFallback) {
            setFallbackSrc(ultimateFallback);
        }
    };

    return {
        src: fallbackSrc ?? imageUrl,
        onError,
    };
}
