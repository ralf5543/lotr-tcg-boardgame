import type { CardState, CardKeyword } from '../../types';

export interface ParsedKeyword {
    raw: CardKeyword | string;
    key: string;       // ex: "DEFENDER", "DAMAGE", "ARCHER"
    value: number;     // ex: 1 pour "DEFENDER +1", 0 pour "ARCHER"
}

export function parseKeyword(raw: CardKeyword | string): ParsedKeyword {
    if (!raw) return { raw: '', key: '', value: 0 };
    
    const clean = raw.trim().toUpperCase();
    
    // Extrait le nom du mot-clé et sa valeur (ex: "DEFENDER +1", "HUNTER 2")
    const match = clean.match(/^([A-Z_-]+?)(?:\s*\+\s*|\s+)(\d+)$/);

    if (match) {
        return {
            raw,
            key: match[1].trim(),
            value: parseInt(match[2], 10),
        };
    }

    return {
        raw,
        key: clean,
        value: 0,
    };
}

export function getEffectiveKeywords(card: CardState): ParsedKeyword[] {
    const rawList: (CardKeyword | string)[] = [...(card.keywords || [])];

    // Attachements
    if (card.attachments && card.attachments.length > 0) {
        card.attachments.forEach((att) => {
            if (att.grantedKeywords) {
                rawList.push(...att.grantedKeywords);
            }
        });
    }

    // Effets temporaires
    if (card.tempKeywords && card.tempKeywords.length > 0) {
        card.tempKeywords.forEach((mod) => {
            rawList.push(mod.keyword);
        });
    }

    // Cumul des valeurs par mot-clé
    const map = new Map<string, number>();

    rawList.forEach((raw) => {
        const parsed = parseKeyword(raw);
        const currentVal = map.get(parsed.key) ?? 0;
        map.set(parsed.key, currentVal + parsed.value);
    });

    const result: ParsedKeyword[] = [];
    map.forEach((value, key) => {
        const rawString = value > 0 ? `${key} +${value}` : key;
        result.push({
            raw: rawString as CardKeyword,
            key,
            value,
        });
    });

    return result;
}

export function getKeywordValue(card: CardState, keywordKey: string): number {
    const effective = getEffectiveKeywords(card);
    const keyToFind = keywordKey.toUpperCase();
    
    const found = effective.find((k) => k.key === keyToFind);

    if (!found) return -1;
    return found.value;
}