import { useLayoutEffect, useRef, useState } from 'react';

/**
 * Incrémente un compteur à chaque changement de `value` (après le 1er rendu),
 * pour relancer une animation CSS one-shot.
 */
export function usePulseOnChange(
    value: string | number | boolean | null | undefined,
    enabled = true
): number {
    const [gen, setGen] = useState(0);
    const prevRef = useRef(value);
    const readyRef = useRef(false);

    useLayoutEffect(() => {
        if (!enabled) {
            prevRef.current = value;
            return;
        }
        if (!readyRef.current) {
            readyRef.current = true;
            prevRef.current = value;
            return;
        }
        if (Object.is(prevRef.current, value)) return;
        prevRef.current = value;
        setGen((g) => g + 1);
    }, [value, enabled]);

    return gen;
}
