import {
    GAME_PHASES,
    VALID_KEYWORDS,
    VALID_RACES,
    VALID_TARGET_TYPES,
    VALID_CULTURES,
} from './constants.ts';

/**
 * Nettoie et supprime les guillemets/apostrophes environnants d'une chaîne de texte.
 */
export function stripQuotes(text?: string): string | undefined {
    if (!text) return undefined;
    const cleaned = text
        .trim()
        .replace(/^["'«»“”‘’`\s]+|["'«»“”‘’`\s]+$/g, '')
        .replace(/["“”«»]/g, '')
        .trim();
    return cleaned.length > 0 ? cleaned : undefined;
}

/**
 * Lit le contenu brut d'un CSV et gère les cellules contenant des retours à la ligne ou des guillemets.
 */
export function parseCsvContent(content: string): string[][] {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        const nextChar = content[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                currentCell += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            currentRow.push(currentCell.trim());
            currentCell = '';
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') i++;
            currentRow.push(currentCell.trim());
            if (currentRow.some((cell) => cell.length > 0))
                rows.push(currentRow);
            currentRow = [];
            currentCell = '';
        } else {
            currentCell += char;
        }
    }

    if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
    }

    return rows;
}

/**
 * Nettoie le texte de Lore (saveur) d'une carte.
 */
export function cleanLoreText(text?: string): string | undefined {
    return stripQuotes(text);
}

/**
 * Formate le texte de jeu pour transformer les balises HTML/Keyword en gras ou symboles Markdown.
 */
export function formatGameText(text?: string): string | undefined {
    if (!text) return undefined;
    return text
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(
            /<keyword>Ambush<\/keyword>\s*(<symbol>twilight\d+<\/symbol>)/gi,
            '**Ambush** $1'
        )
        .replace(/<keyword>([^<]+)<\/keyword>/gi, '**$1**')
        .trim();
}

/**
 * Normalise le nom de la culture (ex: MAN -> MEN).
 */
export function mapCulture(cultureStr?: string): string | undefined {
    if (!cultureStr) return undefined;
    const cleanCulture = cultureStr.trim().toUpperCase();
    return cleanCulture === 'MAN' ? 'MEN' : cleanCulture;
}

/**
 * Extrait le portrait/signet au bas d'une carte (ex: Signet_Frodo -> FRODO).
 */
export function parseSignet(bottomIcon?: string): string | undefined {
    if (!bottomIcon || !bottomIcon.startsWith('Signet_')) return undefined;
    return bottomIcon.replace('Signet_', '').toUpperCase();
}

/**
 * Convertit une valeur de statistique texte en nombre (avec fallback textuel si la valeur primaire est vide).
 */
export function parseStat(
    primaryValue: string,
    fallbackText: string
): number | undefined {
    if (primaryValue !== '' && primaryValue !== undefined) {
        const parsed = parseInt(primaryValue, 10);
        if (!isNaN(parsed)) return parsed;
    }
    if (fallbackText && fallbackText.trim() !== '') {
        const parsedFallback = parseInt(fallbackText.trim(), 10);
        if (!isNaN(parsedFallback)) return parsedFallback;
    }
    return undefined;
}

/**
 * Construit l'objet i18n multilingue (Titre, Sous-titre, Texte de jeu, Lore).
 */
export function coerceOrphanGameTextAsLore(
    gameText: string | undefined,
    lore: string | undefined,
    englishHasGameText: boolean
): { gameText?: string; lore?: string } {
    const text = (gameText || '').trim();
    const loreText = (lore || '').trim();
    if (!englishHasGameText && text && !loreText) {
        return { lore: text };
    }
    return {
        ...(text ? { gameText: text } : {}),
        ...(loreText ? { lore: loreText } : {}),
    };
}

export function buildLangBlock(
    title?: string,
    subtitle?: string,
    gameText?: string,
    lore?: string
) {
    const block: Record<string, string | undefined> = {
        title: stripQuotes(title),
        subtitle: stripQuotes(subtitle),
        gameText: formatGameText(gameText),
        loreText: cleanLoreText(lore),
    };

    Object.keys(block).forEach((key) => {
        if (block[key] === undefined) delete block[key];
    });

    return Object.keys(block).length > 0 ? block : undefined;
}

/**
 * Mot-clé Ambush X : `<keyword>Ambush</keyword> <symbol>twilightN</symbol>`
 * (espace optionnel, ex. Southron Invaders).
 */
const AMBUSH_KEYWORD_REGEX =
    /<keyword>Ambush<\/keyword>\s*<symbol>twilight(\d+)<\/symbol>/gi;

function collectAmbushKeywords(text: string): string[] {
    const found: string[] = [];
    const regex = new RegExp(AMBUSH_KEYWORD_REGEX.source, 'gi');
    let match;
    while ((match = regex.exec(text)) !== null) {
        const kw = `AMBUSH ${match[1]}`;
        if (!found.includes(kw)) found.push(kw);
    }
    return found;
}

function isAmbushGrantedToBearer(text: string, matchIndex: number): boolean {
    const before = text.slice(0, matchIndex);
    const splitAt = Math.max(
        before.lastIndexOf('<br>'),
        before.lastIndexOf('\n')
    );
    const clause = before.slice(splitAt === -1 ? 0 : splitAt);
    return /\bBearer\s+(?:is|gains)\b/i.test(clause);
}

/**
 * Extrait les mots-clés octroyés au porteur par une carte d'attachement ou de suivant.
 */
export function parseGrantsKeywords(text?: string): string[] | undefined {
    if (!text) return undefined;

    const granted = new Set<string>();
    const pattern = /\b([A-Z][a-z]*)\s+(?:is|gains)\s+(.+?)(?=<br|$|\n)/gi;
    let match;

    while ((match = pattern.exec(text)) !== null) {
        const subject = match[1];

        if (!/^(Bearer|He|She|It)$/i.test(subject) || !/^[A-Z]/.test(subject)) {
            continue;
        }

        const clauseAfterVerb = match[2];
        const kwRegex = /<keyword>([^<]+)<\/keyword>/gi;
        let kwMatch;

        while ((kwMatch = kwRegex.exec(clauseAfterVerb)) !== null) {
            const rawKw = kwMatch[1].trim().replace(/\.$/, '').toUpperCase();
            // Ambush X : la valeur est dans le symbole twilight, pas dans le tag keyword.
            if (rawKw === 'AMBUSH') continue;

            if (VALID_KEYWORDS.has(rawKw)) {
                granted.add(rawKw);
            }
        }

        for (const ambush of collectAmbushKeywords(clauseAfterVerb)) {
            granted.add(ambush);
        }
    }

    return granted.size > 0 ? Array.from(granted) : undefined;
}

/**
 * Extrait le coût détaillé du mot-clé AID sous forme d'objet structuré.
 */
export function parseAidCost(
    text?: string
): { type: 'TWILIGHT' | 'THREAT' | 'BURDEN'; amount: number } | undefined {
    if (!text) return undefined;

    // 1. Coût en Twilight : <keyword>Aid</keyword> - <symbol>twilightX</symbol>
    const twilightMatch = text.match(
        /<keyword>Aid<\/keyword>\s*-\s*<symbol>twilight(\d+)<\/symbol>/i
    );
    if (twilightMatch && twilightMatch[1]) {
        return { type: 'TWILIGHT', amount: parseInt(twilightMatch[1], 10) };
    }

    // 2. Coût en Menace : <keyword>Aid</keyword> - Add a threat. / Add 2 threats.
    const threatMatch = text.match(
        /<keyword>Aid<\/keyword>\s*-\s*Add\s+(a|\d+)\s+threat/i
    );
    if (threatMatch && threatMatch[1]) {
        const count =
            threatMatch[1].toLowerCase() === 'a'
                ? 1
                : parseInt(threatMatch[1], 10);
        return { type: 'THREAT', amount: count };
    }

    // 3. Coût en Fardeau : <keyword>Aid</keyword> - Add a burden. / Add 2 burdens.
    const burdenMatch = text.match(
        /<keyword>Aid<\/keyword>\s*-\s*Add\s+(a|\d+)\s+burden/i
    );
    if (burdenMatch && burdenMatch[1]) {
        const count =
            burdenMatch[1].toLowerCase() === 'a'
                ? 1
                : parseInt(burdenMatch[1], 10);
        return { type: 'BURDEN', amount: count };
    }

    return undefined;
}

/**
 * Extrait la liste globale des mots-clés d'une carte (Ambush, Ring-bound, Unbound, Aid, etc.).
 */
export function parseKeywords(
    text?: string,
    titleVO?: string,
    type?: string,
    isRingbearer?: boolean
): string[] | undefined {
    const keywords: string[] = [];

    // --- A. Mot-clé AID systématique pour les Followers ---
    if (type === 'FOLLOWER') {
        keywords.push('AID');
    }

    if (text) {
        // --- B. Embuscade (Ambush X) : mot-clé du séide, pas celui conféré au porteur ---
        const ambushRegex = new RegExp(AMBUSH_KEYWORD_REGEX.source, 'gi');
        let ambushMatch;
        while ((ambushMatch = ambushRegex.exec(text)) !== null) {
            if (isAmbushGrantedToBearer(text, ambushMatch.index)) continue;
            const kw = `AMBUSH ${ambushMatch[1]}`;
            if (!keywords.includes(kw)) keywords.push(kw);
        }

        // --- C. Mots-clés standards (<keyword>WORD.</keyword>) ---
        const regex = /<keyword>([A-Z][^<]*\.)<\/keyword>/g;
        let match;
        while ((match = regex.exec(text)) !== null) {
            const rawKw = match[1].slice(0, -1).trim();
            const upperKw = rawKw.toUpperCase();

            // Éviter de dupliquer 'AID'
            if (upperKw.startsWith('AID')) continue;

            if (VALID_KEYWORDS.has(upperKw) && !keywords.includes(upperKw)) {
                keywords.push(upperKw);
            }
        }
    }

    // --- D. Statuts particuliers (Ring-bound, Unbound) ---
    if (
        titleVO &&
        titleVO.toLowerCase().startsWith('sam') &&
        !keywords.includes('RING-BOUND')
    ) {
        keywords.push('RING-BOUND');
    }

    return keywords.length > 0 ? keywords : undefined;
}

/**
 * Identifie les sous-types de cartes ainsi que les phases d'action autorisées (Manoeuvre, Archery, Skirmish, etc.).
 */
export function parseClassAndPhases(
    classStr?: string,
    englishText?: string,
    type?: string
) {
    const textPhasesSet = new Set<string>();
    const subTypeParts: string[] = [];

    // A. Lecture de la colonne Class du CSV
    if (classStr && classStr.trim()) {
        const parts = classStr.split(/[,;/]/);
        parts.forEach((part) => {
            const cleanPart = part.trim().toUpperCase().replace(/\s+/g, '-');
            if (!cleanPart) return;

            if (GAME_PHASES.has(cleanPart)) {
                textPhasesSet.add(cleanPart);
            } else {
                subTypeParts.push(cleanPart);
            }
        });
    }

    // B. Analyse du texte anglais pour les balises <keyword> et les expressions "At the start of..."
    if (englishText) {
        // 1. Mots-clés de phase classiques (<keyword>Maneuver.</keyword>)
        const keywordRegex = /<keyword>([^<]+)<\/keyword>/gi;
        let match;
        while ((match = keywordRegex.exec(englishText)) !== null) {
            const rawKeyword = match[1]
                .replace(/[:.,]/g, '')
                .trim()
                .toUpperCase();
            if (GAME_PHASES.has(rawKeyword)) {
                textPhasesSet.add(rawKeyword);
            }
        }

        // 2. Détection des déclenchements "At the start of (each|the|your) [PHASE] phase"
        const startOfRegex =
            /At the start of (?:each|the|your)?\s*(\w+)\s+phase/gi;
        let startMatch;
        while ((startMatch = startOfRegex.exec(englishText)) !== null) {
            const phaseName = startMatch[1].toUpperCase(); // Ex: FELLOWSHIP, SHADOW, MANEUVER, etc.
            const startOfPhaseKey = `START_OF_${phaseName}`;

            if (GAME_PHASES.has(startOfPhaseKey)) {
                textPhasesSet.add(startOfPhaseKey);
            }
        }

        // 3. Règle spéciale : Le mot-clé Muster donne une action au début du Regroupement
        if (/<keyword>Muster<\/keyword>/i.test(englishText)) {
            textPhasesSet.add('START_OF_REGROUP');
        }
    }

    const detectedPhases = Array.from(textPhasesSet);
    const subtype =
        subTypeParts.length > 0 ? subTypeParts.join('-') : undefined;
    const isEvent = type === 'EVENT';

    return {
        subtype,
        phases:
            isEvent && detectedPhases.length > 0 ? detectedPhases : undefined,
        actionPhases:
            !isEvent && detectedPhases.length > 0 ? detectedPhases : undefined,
    };
}

/**
 * Détermine à quel type de cible une carte d'attachement ou un Suivant (Follower) peut être attaché.
 */
export function parseAttachedTo(
    text?: string,
    type?: string
): string[][] | null {
    if (!text) return null;

    // 🟢 RÈGLE ABSOLUE : Un Follower n'a PAS de propriété attachedTo d'origine !
    if (type === 'FOLLOWER') {
        return null;
    }

    if (/plays on a site/i.test(text)) {
        return [['SITE']];
    }

    // Détection spécifique aux Suivants (transfer to a companion / transfer to a minion)
    if (/transfer this to a companion/i.test(text)) {
        return [['COMPANION']];
    }
    if (/transfer this to a minion/i.test(text)) {
        return [['MINION']];
    }

    const match = text.match(/(?:Bearer must be|Plays on)\s+([^.\n]+)/i);
    if (!match) return null;

    let rawClause = match[1].replace(/\(except[^)]+\)/gi, '').trim();
    const textWithoutTags = rawClause.replace(/<[^>]+>/g, '').trim();
    const isGeneric = /^(a|an)\s+/i.test(textWithoutTags);

    if (!isGeneric && textWithoutTags.length > 0) {
        return [[textWithoutTags]];
    }

    function extractKeywords(segment: string) {
        const keywords: string[] = [];
        segment = segment.replace(
            /<(symbol|keyword)>(.*?)<\/\1>/gi,
            (_, tag, content) => {
                if (content) {
                    const clean = content
                        .replace(
                            /[^a-zA-Z-áéíóúÁÉÍÓÚàèìòùÀÈÌÒÙäëïöüÄËÏÖÜûÛñÑ]/g,
                            ''
                        )
                        .toUpperCase();
                    if (clean) keywords.push(clean);
                }
                return ' ';
            }
        );

        const cleanSegment = segment.replace(/<[^>]+>/g, ' ');
        const words = cleanSegment.split(/\s+/);
        for (const word of words) {
            const cleanWord = word
                .replace(/[^a-zA-Z-áéíóúÁÉÍÓÚàèìòùÀÈÌÒÙäëïöüÄËÏÖÜûÛñÑ]/g, '')
                .toUpperCase();
            if (cleanWord && !['A', 'AN', 'OR'].includes(cleanWord)) {
                keywords.push(cleanWord);
            }
        }
        return keywords;
    }

    if (rawClause.includes(',') || /\bor\b/i.test(rawClause)) {
        const parts = rawClause.split(/,|\s+or\s+/i);
        const results: string[][] = [];
        for (const part of parts) {
            const kw = extractKeywords(part);
            if (kw.length > 0) results.push(kw);
        }
        return results.length > 0 ? results : null;
    }

    const combinedKeywords = extractKeywords(rawClause);
    return combinedKeywords.length > 0 ? [combinedKeywords] : null;
}

/**
 * Analyse les conditions requises pour jouer une carte ("To play, ...").
 */
export function parseToPlayConditions(text?: string): any[] | undefined {
    if (!text) return undefined;

    const match = text.match(/(?:^|[\n.]).*?To play,\s+([^.\n]+)/i);
    if (!match) return undefined;

    let rawClause = match[1].trim();
    rawClause = rawClause.replace(/\((or\s+[^)]+)\)/gi, '$1');

    const protectedClause = rawClause
        .replace(/\b(\d+)\s+or\s+more\b/gi, '$1_OR_MORE')
        .replace(/\b(\d+)\s+or\s+less\b/gi, '$1_OR_LESS');

    function extractCount(str: string): number {
        const m = str.match(/\b(\d+)\b/);
        return m ? parseInt(m[1], 10) : 1;
    }

    function normalizeToken(token: string): string {
        const clean = token.replace(
            /[^a-zA-Z-áéíóúÁÉÍÓÚàèìòùÀÈÌÒÙäëïöüÄËÏÖÜûÛñÑ]/g,
            ''
        );
        const upper = clean.toUpperCase();
        const plurals: Record<string, string> = {
            ELVES: 'ELF',
            DWARVES: 'DWARF',
            HOBBITS: 'HOBBIT',
            ENTS: 'ENT',
            ORCS: 'ORC',
            RANGERS: 'RANGER',
            MINIONS: 'MINION',
            COMPANIONS: 'COMPANION',
            ALLIES: 'ALLY',
            KNIGHTS: 'KNIGHT',
            SPIDERS: 'SPIDER',
            TROLLS: 'TROLL',
            NAZGÛL: 'NAZGÛL',
        };
        return plurals[upper] || upper;
    }

    function parseStatConditions(segment: string) {
        const conds: any = {};
        const vitMatch = segment.match(
            /with\s+(\d+)(?:_OR_MORE|_OR_LESS)?\s+vitality/i
        );
        if (vitMatch) conds.minVitality = parseInt(vitMatch[1], 10);
        const strMatch = segment.match(
            /with\s+(\d+)(?:_OR_MORE|_OR_LESS)?\s+strength/i
        );
        if (strMatch) conds.minStrength = parseInt(strMatch[1], 10);
        return conds;
    }

    function parseTarget(bodyText: string) {
        const targets: string[] = [];
        let processedText = bodyText.replace(
            /<symbol>(gondor|rohan)<\/symbol>\s+men\b/gi,
            '<symbol>$1</symbol> MAN'
        );
        processedText = processedText.replace(
            /\b(gondor|rohan)\s+men\b/gi,
            '$1 MAN'
        );
        processedText = processedText.replace(
            /with\s+\d+(?:_OR_MORE|_OR_LESS)?\s+(vitality|strength|resistance)/gi,
            ''
        );

        let cleanBody = processedText.replace(
            /<symbol>(.*?)<\/symbol>/gi,
            (_, culture) => {
                if (culture) targets.push(culture.toUpperCase());
                return ' ';
            }
        );

        cleanBody = cleanBody.replace(
            /<keyword>(.*?)<\/keyword>/gi,
            (_, kw) => {
                if (kw) targets.push(kw.replace(/[:.,]/g, '').toUpperCase());
                return ' ';
            }
        );

        cleanBody = cleanBody.replace(/[*_#<>[\]()]/g, ' ').trim();
        const words = cleanBody.split(/\s+/).filter(Boolean);

        const EXCLUDED_WORDS = new Set([
            'A',
            'AN',
            'YOUR',
            'OR',
            'FROM',
            'IN',
            'PLAY',
            'HAND',
            'CARD',
            'CARDS',
            'SPOT',
            'EXERT',
            'DISCARD',
            'REMOVE',
            'ADD',
            'AND',
            'WITH',
            'MORE',
            'LESS',
            'THAN',
            'HAS',
            'HAVE',
            'VITALITY',
            'STRENGTH',
            'RESISTANCE',
        ]);

        for (const word of words) {
            const normalized = normalizeToken(word);
            if (normalized && !EXCLUDED_WORDS.has(normalized)) {
                let finalToken = normalized;
                if (
                    finalToken === 'MEN' &&
                    targets.some((t) => ['GONDOR', 'ROHAN'].includes(t))
                ) {
                    finalToken = 'MAN';
                }
                const isKnownTarget =
                    VALID_RACES.has(finalToken) ||
                    VALID_TARGET_TYPES.has(finalToken) ||
                    VALID_CULTURES.has(finalToken);
                const isProperName = /^[A-Z][a-zà-ÿ]+/.test(word);
                targets.push(
                    isKnownTarget
                        ? finalToken
                        : isProperName
                          ? word
                          : finalToken
                );
            }
        }
        return targets;
    }

    const rawOptions = protectedClause.split(/\s+or\s+/i);
    const parsedOptions: any[] = [];

    for (let optionText of rawOptions) {
        optionText = optionText.trim();
        const optionObj: any = {};
        const segments = optionText.split(/\s+and\s+/i);

        for (let segment of segments) {
            segment = segment.trim();
            const verbMatch = segment.match(
                /\b(spot|exert|discard|remove|add)\b/i
            );
            const currentVerb = verbMatch ? verbMatch[1].toLowerCase() : 'spot';
            const count = extractCount(segment);

            if (
                /discard.*hand/i.test(segment) ||
                (currentVerb === 'discard' && /hand/i.test(segment))
            ) {
                optionObj.discardFromHand = count;
            } else if (/burdens?/i.test(segment)) {
                if (currentVerb === 'remove') optionObj.removeBurdens = count;
                else if (currentVerb === 'add') optionObj.addBurdens = count;
                else optionObj.spotBurdens = count;
            } else if (/threats?/i.test(segment)) {
                if (currentVerb === 'remove') optionObj.removeThreats = count;
                else if (currentVerb === 'add') optionObj.addThreats = count;
                else optionObj.spotThreats = count;
            } else {
                const targets = parseTarget(segment);
                const statConds = parseStatConditions(segment);

                if (targets.length > 0) {
                    const key =
                        currentVerb === 'discard'
                            ? 'discardFromPlay'
                            : currentVerb;
                    if (!optionObj[key]) optionObj[key] = [];

                    const targetObj: any = { count, target: [targets] };
                    if (Object.keys(statConds).length > 0) {
                        Object.assign(targetObj, statConds);
                    }
                    optionObj[key].push(targetObj);
                }
            }
        }
        if (Object.keys(optionObj).length > 0) {
            parsedOptions.push(optionObj);
        }
    }
    return parsedOptions.length > 0 ? parsedOptions : undefined;
}

const ABILITY_PHASES = [
    'FELLOWSHIP',
    'SHADOW',
    'MANEUVER',
    'ARCHERY',
    'ASSIGNMENT',
    'SKIRMISH',
    'REGROUP',
    'RESPONSE',
] as const;

function normalizeParsedKeyword(raw: string): string | undefined {
    const clean = raw
        .replace(/[:.]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();
    if (VALID_KEYWORDS.has(clean)) return clean;
    const spaced = clean.replace(/(\w)\+(\d)/, '$1 +$2');
    if (VALID_KEYWORDS.has(spaced)) return spaced;
    return undefined;
}

function findKnownKeyword(text: string): string | undefined {
    const tagged = text.match(/<keyword>([^<]+)<\/keyword>/i);
    if (tagged) {
        const fromTag = normalizeParsedKeyword(tagged[1]);
        if (fromTag) return fromTag;
    }

    const plain = text
        .replace(/<[^>]+>/g, ' ')
        .replace(/[:.]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();

    const sorted = [...VALID_KEYWORDS].sort((a, b) => b.length - a.length);
    for (const kw of sorted) {
        if (plain.includes(kw)) return kw;
    }
    return undefined;
}

const FILTER_STOPWORDS = new Set(['A', 'AN', 'THE', 'OR']);

const FILTER_ALIASES: Record<string, string> = {
    URUKHAI: 'URUK-HAI',
    NAZGUL: 'NAZGÛL',
    RINGBEARER: 'RING-BEARER',
    RINGBOUND: 'RING-BOUND',
};

function normalizeFilterToken(raw: string): string {
    const upper = raw.replace(/[^a-zA-ZÀ-ÿÛû-]/g, '').toUpperCase();
    return FILTER_ALIASES[upper] || upper;
}

function isKnownFilterToken(token: string): boolean {
    return (
        VALID_RACES.has(token) ||
        VALID_TARGET_TYPES.has(token) ||
        VALID_CULTURES.has(token) ||
        VALID_KEYWORDS.has(token)
    );
}

function isProperNameToken(word: string): boolean {
    return /^[A-ZÀ-ŸÉ][a-zà-ÿ]/.test(word);
}

/** Filtres de classe : uniquement tokens connus (ou nom propre). Reste inconnu → []. */
function parseClassFilters(raw: string): string[] {
    const filters: string[] = [];
    let unknown = false;
    let segment = raw.replace(
        /<(symbol|keyword)>(.*?)<\/\1>/gi,
        (_, _tag, content) => {
            const token = normalizeFilterToken(String(content || ''));
            if (!token) return ' ';
            if (isKnownFilterToken(token)) {
                filters.push(token);
            } else {
                unknown = true;
            }
            return ' ';
        }
    );
    segment = segment.replace(/<[^>]+>/g, ' ');
    segment = segment
        .replace(/\bhand\s+weapons?\b/gi, 'HAND-WEAPON')
        .replace(/\branged\s+weapons?\b/gi, 'RANGED-WEAPON');
    for (const word of segment.split(/\s+/).filter(Boolean)) {
        const token = normalizeFilterToken(word);
        if (!token || FILTER_STOPWORDS.has(token)) continue;
        if (isKnownFilterToken(token)) {
            filters.push(token);
            continue;
        }
        if (isProperNameToken(word)) {
            filters.push(word);
            continue;
        }
        unknown = true;
    }
    if (unknown || filters.length === 0) return [];
    return filters;
}

function parseExertSubject(
    raw: string,
    cardTitle?: string
): {
    target: 'SELF' | 'BEARER' | string[][];
    count: number;
    mode?: 'DESIGNATION';
} | null {
    let count = 1;
    let body = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    const twiceMatch = body.match(/^(.*)\s+twice$/i);
    if (twiceMatch) {
        count = 2;
        body = twiceMatch[1].trim();
    } else {
        const timesMatch = body.match(/^(.*)\s+(\d+)\s+times$/i);
        if (timesMatch) {
            count = parseInt(timesMatch[2], 10);
            body = timesMatch[1].trim();
        }
    }

    if (/^bearer$/i.test(body)) {
        return { target: 'BEARER', count };
    }
    if (/^this\b/i.test(body)) {
        return { target: 'SELF', count };
    }

    const title = (cardTitle || '').trim();
    if (title && body.toLowerCase() === title.toLowerCase()) {
        return { target: 'SELF', count };
    }

    const articleMatch = body.match(/^(a|an)\s+(.+)$/i);
    if (articleMatch) {
        const filters = parseClassFilters(articleMatch[2]);
        if (filters.length === 0) return null;
        return { target: [filters], count, mode: 'DESIGNATION' };
    }

    // « another / your » : pas encore.
    if (/^(another|your)\b/i.test(body)) return null;

    return { target: [[body]], count };
}

/** `this companion` / `him` / le nom de la carte → SELF. Autre nom → on refuse. */
function parseAllowSkirmishTarget(
    raw: string,
    cardTitle?: string
): 'SELF' | null {
    const who = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (/^(this companion|him|her|it)$/i.test(who)) return 'SELF';
    const title = (cardTitle || '').trim();
    if (title && who.toLowerCase() === title.toLowerCase()) return 'SELF';
    return null;
}

function parseUntilExpiry(
    effectText: string,
    phase: string
): 'REGROUP' | 'SKIRMISH' | 'TURN_END' {
    if (/until the regroup phase/i.test(effectText)) return 'REGROUP';
    if (/until the end of (?:the |this )?skirmish/i.test(effectText)) {
        return 'SKIRMISH';
    }
    if (/until the end of (?:the |this )?turn/i.test(effectText)) {
        return 'TURN_END';
    }
    return phase === 'SKIRMISH' ? 'SKIRMISH' : 'REGROUP';
}

function parseEffectTarget(
    effectText: string,
    costTarget: 'SELF' | 'BEARER' | string[][]
): 'SELF' | 'BEARER' | string[][] {
    if (/^\s*bearer\b/i.test(effectText.replace(/<[^>]+>/g, '').trim())) {
        return 'BEARER';
    }
    if (costTarget === 'BEARER') return 'BEARER';
    if (costTarget === 'SELF') return 'SELF';
    // « make him » vise la même carte que le coût nommé (Exert Sam → Sam, pas l’event).
    return costTarget;
}

const STAT_NAMES: Record<string, 'STRENGTH' | 'VITALITY' | 'RESISTANCE'> = {
    STRENGTH: 'STRENGTH',
    VITALITY: 'VITALITY',
    RESISTANCE: 'RESISTANCE',
};

function parseMakeEffectPiece(chunk: string):
    | { kind: 'keyword'; keyword: string }
    | { kind: 'stat'; stat: 'STRENGTH' | 'VITALITY' | 'RESISTANCE'; value: number }
    | undefined {
    const keyword = findKnownKeyword(chunk);
    if (keyword) return { kind: 'keyword', keyword };

    const plain = chunk
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    const match = plain.match(
        /^(strength|vitality|resistance)\s*([+-]\d+)\b/i
    );
    if (!match) return undefined;

    const stat = STAT_NAMES[match[1].toUpperCase()];
    if (!stat) return undefined;
    return { kind: 'stat', stat, value: parseInt(match[2], 10) };
}

function parseMakeEffectsFromRemainder(
    remainder: string,
    effectTarget: 'SELF' | 'BEARER' | 'SKIRMISHING' | 'WINNER' | string[][],
    expiresAtPhase: 'REGROUP' | 'SKIRMISH' | 'TURN_END'
) {
    const pieces = remainder
        .split(/\band\b/i)
        .map((piece) => piece.trim())
        .filter(Boolean);
    if (pieces.length === 0) return undefined;

    const parsed = pieces.map(parseMakeEffectPiece);
    if (parsed.some((piece) => !piece)) return undefined;

    return parsed.map((piece) =>
        piece!.kind === 'keyword'
            ? {
                  type: 'ADD_TEMP_KEYWORD' as const,
                  keyword: piece!.keyword,
                  target: effectTarget,
                  expiresAtPhase,
              }
            : {
                  type: 'ADD_TEMP_STAT' as const,
                  stat: piece!.stat,
                  value: piece!.value,
                  target: effectTarget,
                  expiresAtPhase,
              }
    );
}

function parseMakeEffects(
    effectText: string,
    effectTarget: 'SELF' | 'BEARER' | 'SKIRMISHING' | 'WINNER' | string[][],
    expiresAtPhase: 'REGROUP' | 'SKIRMISH' | 'TURN_END'
) {
    const remainder = remainderAfterPronoun(effectText);
    if (!remainder) return undefined;
    return parseMakeEffectsFromRemainder(
        remainder,
        effectTarget,
        expiresAtPhase
    );
}

function splitClassAndMakeRemainder(
    effectText: string
): { classRaw: string; remainder: string } | null {
    const noUntil = effectText
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/\s+until the .+$/i, '')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/[.\s]+$/, '');

    const stat = noUntil.match(
        /^(.*?)\s+((?:strength|vitality|resistance)\s*[+-]\d+(?:\s+and\s+[\s\S]+)?)$/i
    );
    if (stat?.[1]?.trim()) {
        return { classRaw: stat[1].trim(), remainder: stat[2].trim() };
    }

    const kwTagged = noUntil.match(
        /^(.*?)\s+(<keyword>[^<]+<\/keyword>(?:\s+and\s+[\s\S]+)?)$/i
    );
    if (kwTagged?.[1]?.trim() && findKnownKeyword(kwTagged[2])) {
        return { classRaw: kwTagged[1].trim(), remainder: kwTagged[2].trim() };
    }

    const kwPlain = noUntil.match(
        /^(.*?)\s+((?:damage|defender)\s*\+\d+|fierce|archer)(\s+and\s+[\s\S]+)?$/i
    );
    if (kwPlain?.[1]?.trim() && findKnownKeyword(kwPlain[2])) {
        return {
            classRaw: kwPlain[1].trim(),
            remainder: `${kwPlain[2]}${kwPlain[3] || ''}`.trim(),
        };
    }

    return null;
}

function parseOrBearingBonus(effectText: string): {
    base: string;
    value: number;
    attachment: string[][];
} | null {
    const match = effectText
        .replace(/\s+/g, ' ')
        .trim()
        .match(
            /^([\s\S]+?)\s*\(\s*or\s+\+(\d+)\s+if bearing a\s+([\s\S]+?)\s*\)\s*\.?$/i
        );
    if (!match) return null;
    const filters = parseClassFilters(match[3]);
    if (filters.length === 0) return null;
    return {
        base: match[1].trim(),
        value: parseInt(match[2], 10),
        attachment: [filters],
    };
}

function parseMakeTargetAndEffects(
    effectText: string,
    costTarget: 'SELF' | 'BEARER' | string[][],
    expiresAtPhase: 'REGROUP' | 'SKIRMISH' | 'TURN_END'
):
    | {
          target: 'SELF' | 'BEARER' | 'SKIRMISHING' | 'WINNER' | string[][];
          effects: NonNullable<ReturnType<typeof parseMakeEffectsFromRemainder>>;
      }
    | undefined {
    const bearing = parseOrBearingBonus(effectText);
    const textToParse = bearing?.base ?? effectText;
    if (bearing && bearing.value <= 0) return undefined;

    const effectPlain = textToParse
        .replace(/him or her/gi, 'him')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ');
    if (/\bor\b/i.test(effectPlain)) return undefined;

    const pronounTarget = parseEffectTarget(textToParse, costTarget);
    const pronounEffects = parseMakeEffects(
        textToParse,
        pronounTarget,
        expiresAtPhase
    );
    let parsed:
        | {
              target: 'SELF' | 'BEARER' | 'SKIRMISHING' | 'WINNER' | string[][];
              effects: NonNullable<
                  ReturnType<typeof parseMakeEffectsFromRemainder>
              >;
          }
        | undefined;
    if (pronounEffects) {
        parsed = { target: pronounTarget, effects: pronounEffects };
    } else {
        const thisMatch = textToParse
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .match(/^this\s+\w+\s+([\s\S]+)/i);
        if (thisMatch) {
            const effects = parseMakeEffectsFromRemainder(
                thisMatch[1],
                'SELF',
                expiresAtPhase
            );
            if (effects) parsed = { target: 'SELF', effects };
        }
    }

    if (!parsed) {
        const split = splitClassAndMakeRemainder(textToParse);
        if (!split) return undefined;
        const article = split.classRaw.match(/^(a|an)\s+(.+)$/i);
        if (!article) return undefined;
        if (
            /\b(and|or|each|skirmishing|that|your|another)\b/i.test(article[2])
        ) {
            return undefined;
        }
        const filters = parseClassFilters(article[2]);
        if (filters.length === 0) return undefined;
        const effects = parseMakeEffectsFromRemainder(
            split.remainder,
            [filters],
            expiresAtPhase
        );
        if (!effects) return undefined;
        parsed = { target: [filters], effects };
    }

    if (bearing) {
        const statEffects = parsed.effects.filter(
            (effect) => effect.type === 'ADD_TEMP_STAT'
        );
        if (statEffects.length !== 1 || parsed.effects.length !== 1) {
            return undefined;
        }
        const statEffect = statEffects[0];
        if (
            !statEffect ||
            statEffect.type !== 'ADD_TEMP_STAT' ||
            bearing.value <= statEffect.value
        ) {
            return undefined;
        }
        statEffect.bearingBonus = {
            value: bearing.value,
            attachment: bearing.attachment,
        };
    }

    return parsed;
}

function remainderAfterPronoun(effectText: string): string | undefined {
    const pronounMatch = effectText.match(
        /^\s*(him or her|him|her|it|bearer|that\s+[\w’-]+)\s+/i
    );
    if (!pronounMatch) return undefined;

    const remainder = effectText.slice(pronounMatch[0].length);
    const remainderPlain = remainder.replace(/<[^>]+>/g, ' ').trim();
    if (/^(a|an)\s+/i.test(remainderPlain)) return undefined;
    return remainder;
}

function remainderAfterWinnerRef(effectText: string): string | undefined {
    const refMatch = effectText.match(
        /^\s*(him or her|him|her|it|that\s+[\w’-]+)\s+/i
    );
    if (!refMatch) return undefined;

    const remainder = effectText.slice(refMatch[0].length);
    const remainderPlain = remainder.replace(/<[^>]+>/g, ' ').trim();
    if (/^(a|an)\s+/i.test(remainderPlain)) return undefined;
    return remainder;
}

function parseWinsSkirmishWinner(
    raw: string,
    cardTitle?: string
): { winner: 'SELF' | 'BEARER' | string[][]; yours?: boolean } | null {
    const plain = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (/^this\b/i.test(plain)) return { winner: 'SELF' };
    if (/^bearer$/i.test(plain)) return { winner: 'BEARER' };
    const title = (cardTitle || '').trim();
    if (title && plain.toLowerCase() === title.toLowerCase()) {
        return { winner: 'SELF' };
    }
    if (/^(another|each)\b/i.test(plain)) return null;

    const yours = /^your\s+/i.test(plain);
    const withoutArticle = raw.replace(/^(a|an|the|your)\s+/i, '');
    const stripped = withoutArticle
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (/^(another|each)\b/i.test(stripped)) return null;

    const filters = parseClassFilters(withoutArticle);
    if (filters.length === 0) return null;
    return yours ? { winner: [filters], yours: true } : { winner: [filters] };
}

function winsSkirmishCostIsSafe(cost: Record<string, unknown>): boolean {
    const selectors = [
        ...((cost.exert as { target?: unknown }[] | undefined) || []),
        ...((cost.spot as { target?: unknown }[] | undefined) || []),
    ];
    for (const req of selectors) {
        if (req.target === 'SELF' || req.target === 'BEARER') continue;
        if (!Array.isArray(req.target)) return false;
        const tokens = (req.target as string[][]).flat();
        if (
            tokens.some(
                (token) =>
                    !isKnownFilterToken(token) && !isProperNameToken(token)
            )
        ) {
            return false;
        }
    }
    return true;
}

function parseWinsSkirmishResponse(
    body: string,
    cardTitle: string | undefined,
    cardId: string | undefined,
    abilityIndex: number
): Record<string, unknown> | null {
    const match = body.match(
        /^If\s+([\s\S]+?)\s+wins a skirmish,\s*([\s\S]+)/i
    );
    if (!match) return null;

    const winnerParsed = parseWinsSkirmishWinner(match[1].trim(), cardTitle);
    if (!winnerParsed) return null;

    const rest = match[2].trim().replace(/[.\s]+$/g, '');
    const toMake = rest.match(/^(?:([\s\S]+?)\s+to\s+)?make\s+([\s\S]+)/i);
    if (!toMake) return null;

    const costText = toMake[1]?.trim();
    const effectText = toMake[2].trim();
    const effectPlain = effectText.replace(/<[^>]+>/g, ' ');
    if (
        /\b(heal|discard|wound|kill|play|draw|stack|control|reveal|prevent)\b/i.test(
            effectPlain
        )
    ) {
        return null;
    }

    let cost: Record<string, unknown>[] = [];
    if (costText) {
        const parsedCost = parsePreventCostOption(costText, cardTitle);
        if (!parsedCost || !winsSkirmishCostIsSafe(parsedCost)) return null;
        cost = [parsedCost];
    }

    const expiresAtPhase = parseUntilExpiry(effectText, 'RESPONSE');
    const remainder = remainderAfterWinnerRef(effectText);
    if (!remainder) return null;
    const effects = parseMakeEffectsFromRemainder(
        remainder,
        'WINNER',
        expiresAtPhase
    );
    if (!effects || effects.length === 0) return null;

    const clause = `RESPONSE: If ${match[1].trim()} wins a skirmish, ${rest}`
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .replace(/\s+\./g, '.')
        .trim();

    return {
        id: `${cardId || 'ability'}:${abilityIndex}`,
        phases: ['RESPONSE'],
        trigger: {
            type: 'WINS_SKIRMISH',
            winner: winnerParsed.winner,
            ...(winnerParsed.yours ? { yours: true } : {}),
        },
        cost,
        effects,
        source: winnerParsed.winner === 'BEARER' ? 'ATTACHMENT' : 'SELF',
        text: clause,
    };
}

function parseWoundTriggerTarget(
    raw: string
): 'SELF' | 'BEARER' | string[][] | null {
    const plain = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (/^bearer$/i.test(plain)) return 'BEARER';
    if (/^this\b/i.test(plain)) return 'SELF';

    const withoutArticle = raw.replace(/^(a|an|the)\s+/i, '');
    const filters = parseClassFilters(withoutArticle);
    if (filters.length === 0) return null;
    return [filters];
}

function parsePreventCostClause(
    segment: string,
    cardTitle?: string
): Record<string, unknown> | null {
    const text = segment.replace(/[.,;]+$/g, '').trim();
    if (!text) return null;

    const addTw = text.match(/^add\s*<symbol>twilight(\d+)<\/symbol>$/i);
    if (addTw) return { addTwilight: parseInt(addTw[1], 10) };

    const remTw = text.match(/^remove\s*<symbol>twilight(\d+)<\/symbol>$/i);
    if (remTw) return { removeTwilight: parseInt(remTw[1], 10) };

    const spotTw = text.match(
        /^spot\s+(\d+)\s+twilight tokens?$/i
    );
    if (spotTw) return { spotTwilight: parseInt(spotTw[1], 10) };

    const discardHand = text.match(
        /^discard\s+(a|one|two|\d+)\s+cards?\s+from hand$/i
    );
    if (discardHand) {
        const count = parseBurdenWord(discardHand[1]);
        if (!count) return null;
        return { discardFromHand: count };
    }

    if (/^discard\s+this(?:\s+[\w’-]+)?$/i.test(text)) {
        return { discardFromPlay: [{ count: 1, target: 'SELF' }] };
    }

    const exertMatch = text.match(/^Exert\s+([\s\S]+)$/i);
    if (exertMatch) {
        if (/\b(and|or)\b/i.test(exertMatch[1])) return null;
        const subject = parseExertSubject(exertMatch[1], cardTitle);
        if (!subject) return null;
        return {
            exert: [
                {
                    count: subject.count,
                    target: subject.target,
                    ...(subject.mode ? { mode: subject.mode } : {}),
                },
            ],
        };
    }

    const spotMatch = text.match(/^spot\s+([\s\S]+)$/i);
    if (spotMatch) {
        if (/\b(and|or)\b/i.test(spotMatch[1])) return null;
        if (/\b(twilight|tokens?|burdens?|threats?)\b/i.test(spotMatch[1])) {
            return null;
        }
        const subject = parseExertSubject(spotMatch[1], cardTitle);
        if (!subject) return null;
        return {
            spot: [{ count: subject.count, target: subject.target }],
        };
    }

    return null;
}

function mergePreventCostClauses(
    clauses: Record<string, unknown>[]
): Record<string, unknown> | null {
    const option: Record<string, unknown> = {};
    for (const clause of clauses) {
        if (clause.exert) {
            option.exert = [
                ...((option.exert as unknown[]) || []),
                ...(clause.exert as unknown[]),
            ];
        }
        if (clause.spot) {
            option.spot = [
                ...((option.spot as unknown[]) || []),
                ...(clause.spot as unknown[]),
            ];
        }
        if (clause.discardFromPlay) {
            option.discardFromPlay = [
                ...((option.discardFromPlay as unknown[]) || []),
                ...(clause.discardFromPlay as unknown[]),
            ];
        }
        if (typeof clause.discardFromHand === 'number') {
            option.discardFromHand =
                (typeof option.discardFromHand === 'number'
                    ? option.discardFromHand
                    : 0) + clause.discardFromHand;
        }
        if (typeof clause.addTwilight === 'number') {
            option.addTwilight =
                (typeof option.addTwilight === 'number'
                    ? option.addTwilight
                    : 0) + clause.addTwilight;
        }
        if (typeof clause.removeTwilight === 'number') {
            option.removeTwilight =
                (typeof option.removeTwilight === 'number'
                    ? option.removeTwilight
                    : 0) + clause.removeTwilight;
        }
        if (typeof clause.spotTwilight === 'number') {
            option.spotTwilight =
                (typeof option.spotTwilight === 'number'
                    ? option.spotTwilight
                    : 0) + clause.spotTwilight;
        }
    }
    if (Object.keys(option).length === 0) return null;
    return option;
}

/** Une alternative de coût (clauses liées par `and`). `or` = plusieurs abilities. */
function parsePreventCostOption(
    raw: string,
    cardTitle?: string
): Record<string, unknown> | null {
    const segments = raw
        .split(/\s+and\s+/i)
        .map((segment) => segment.trim())
        .filter(Boolean);
    if (segments.length === 0) return null;
    const clauses = segments.map((segment) =>
        parsePreventCostClause(segment, cardTitle)
    );
    if (clauses.some((clause) => !clause)) return null;
    return mergePreventCostClauses(clauses as Record<string, unknown>[]);
}

function preventAbilitySource(
    cost: Record<string, unknown>
): 'SELF' | 'ATTACHMENT' {
    const exert = cost.exert as { target?: unknown }[] | undefined;
    const spot = cost.spot as { target?: unknown }[] | undefined;
    if (exert?.[0]?.target === 'BEARER' || spot?.[0]?.target === 'BEARER') {
        return 'ATTACHMENT';
    }
    return 'SELF';
}

function parseBurdenWord(raw: string): number | null {
    const token = raw.trim().toLowerCase();
    if (token === 'a' || token === 'one') return 1;
    if (token === 'two') return 2;
    const n = parseInt(token, 10);
    return Number.isFinite(n) && n > 0 ? n : null;
}

function stripAbilityMarkup(text: string): string {
    return text
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\s+\./g, '.')
        .trim();
}

/** Passif `While wearing` : fardeaux à la place, sans clause extra (force, hunter…). */
function parseWhileWearingReplacement(
    rest: string
): { count: number; onlyInSkirmish: boolean } | null {
    const cleaned = stripAbilityMarkup(rest);
    if (!cleaned) return null;

    const patterns = [
        /^While wearing The One Ring,\s*each time the Ring-bearer is about to take a wound(?: (during a skirmish|in a skirmish))?,\s*add (a|one|two|\d+) burdens? instead\.?$/i,
        /^While the Ring-bearer is wearing The One Ring,\s*each time (?:he or she|he|she) is about to take a wound(?: (in a skirmish|during a skirmish))?,\s*add (a|one|two|\d+) burdens? instead\.?$/i,
    ];

    for (const pattern of patterns) {
        const match = cleaned.match(pattern);
        if (!match) continue;
        const count = parseBurdenWord(match[2]);
        if (!count) return null;
        return { count, onlyInSkirmish: Boolean(match[1]) };
    }
    return null;
}

function parseWhenPlayedAbilities(
    text: string,
    cardId?: string
): Record<string, unknown>[] {
    const found: Record<string, unknown>[] = [];
    const re =
        /When you play this(?:\s+(?:minion|possession|condition|companion|artifact|ally|follower))?, (?!you may)([\s\S]+?)\./gi;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
        const clause = match[1].trim();
        const addOnly = clause.match(/^add <symbol>twilight(\d+)<\/symbol>$/i);
        const spotAdd = clause.match(
            /^spot ([\s\S]+?) to add <symbol>twilight(\d+)<\/symbol>$/i
        );

        let cost: Record<string, unknown>[] = [];
        let twilight = 0;

        if (addOnly) {
            twilight = parseInt(addOnly[1], 10);
        } else if (spotAdd) {
            if (/\b(and|or|each|may)\b/i.test(spotAdd[1])) continue;
            const subject = parseExertSubject(spotAdd[1].trim());
            if (!subject) continue;
            twilight = parseInt(spotAdd[2], 10);
            cost = [
                {
                    spot: [
                        {
                            count: subject.count,
                            target: subject.target,
                        },
                    ],
                },
            ];
        } else {
            continue;
        }

        if (!Number.isFinite(twilight) || twilight <= 0) continue;

        found.push({
            id: `${cardId || 'ability'}:${found.length}:when-played`,
            phases: [],
            trigger: { type: 'WHEN_PLAYED' },
            cost,
            effects: [{ type: 'ADD_TWILIGHT', count: twilight }],
            source: 'SELF',
            text: stripAbilityMarkup(match[0]),
        });
    }
    return found;
}

/**
 * Famille : `[Phase]: Exert [self/bearer/X] to make [him/bearer] KEYWORD|STAT [until …]?`
 */
export function parseAbilities(
    text?: string,
    cardTitle?: string,
    cardId?: string
) {
    if (!text) return undefined;

    const phaseRe = new RegExp(
        `<keyword>(${ABILITY_PHASES.join('|')})[:.]?\\s*<\\/keyword>`,
        'gi'
    );
    const markers: { phase: string; markerStart: number; bodyStart: number }[] =
        [];
    let markerMatch: RegExpExecArray | null;
    while ((markerMatch = phaseRe.exec(text)) !== null) {
        markers.push({
            phase: markerMatch[1].toUpperCase(),
            markerStart: markerMatch.index,
            bodyStart: markerMatch.index + markerMatch[0].length,
        });
    }

    const abilities: Record<string, unknown>[] = [];

    markers.forEach((marker, index) => {
        const bodyEnd =
            index + 1 < markers.length
                ? markers[index + 1].markerStart
                : text.length;
        const body = text.slice(marker.bodyStart, bodyEnd).trim();
        const bodyPlain = stripAbilityMarkup(body);

        if (marker.phase === 'RESPONSE') {
            const wearMatch = bodyPlain.match(
                /^If\s+(bearer|the Ring-bearer)\s+is about to take a wound( in a skirmish)?,\s*(?:he or she|he|she)\s+wears The One Ring until the regroup phase\.?\s*([\s\S]*)$/i
            );
            const whileWearing = wearMatch
                ? parseWhileWearingReplacement(wearMatch[3] || '')
                : null;
            if (wearMatch && whileWearing) {
                const inSkirmish = Boolean(wearMatch[2]);
                abilities.push({
                    id: `${cardId || 'ability'}:${abilities.length}`,
                    phases: ['RESPONSE'],
                    trigger: {
                        type: 'ABOUT_TO_WOUND',
                        target: 'BEARER',
                        ...(inSkirmish ? { inSkirmish: true } : {}),
                    },
                    cost: [],
                    effects: [
                        {
                            type: 'WEAR_RING',
                            expiresAtPhase: 'REGROUP',
                            replaceWoundWithBurdens: whileWearing.count,
                            ...(whileWearing.onlyInSkirmish
                                ? { onlyInSkirmish: true }
                                : {}),
                        },
                    ],
                    source: 'ATTACHMENT',
                    text: `RESPONSE: If ${wearMatch[1]} is about to take a wound${inSkirmish ? ' in a skirmish' : ''}, he wears The One Ring until the regroup phase.`,
                });
                return;
            }
        }

        const preventMatch = body.match(
            /^If\s+([\s\S]+?)\s+is about to take a wound( in a skirmish)?,\s*([\s\S]+?)\s+to prevent that wound/i
        );
        if (preventMatch) {
            const remainder = stripAbilityMarkup(
                body.slice(preventMatch[0].length)
            ).replace(/^[.\s]+/, '');
            if (remainder) return;

            const triggerTarget = parseWoundTriggerTarget(
                preventMatch[1].trim()
            );
            if (!triggerTarget) return;

            const inSkirmish = Boolean(preventMatch[2]);
            const optionTexts = preventMatch[3]
                .split(/\s+or\s+/i)
                .map((text) => text.trim())
                .filter(Boolean);
            const costOptions = optionTexts.map((text) =>
                parsePreventCostOption(text, cardTitle)
            );
            if (costOptions.length === 0 || costOptions.some((cost) => !cost)) {
                return;
            }

            optionTexts.forEach((optionText, index) => {
                const cost = costOptions[index] as Record<string, unknown>;
                const clause =
                    `${marker.phase}: If ${preventMatch[1].trim()} is about to take a wound${inSkirmish ? ' in a skirmish' : ''}, ${optionText} to prevent that wound`
                        .replace(/<[^>]+>/g, '')
                        .replace(/\s+/g, ' ')
                        .replace(/\s+\./g, '.')
                        .trim();

                abilities.push({
                    id: `${cardId || 'ability'}:${abilities.length}`,
                    phases: [marker.phase],
                    trigger: {
                        type: 'ABOUT_TO_WOUND',
                        target: triggerTarget,
                        ...(inSkirmish ? { inSkirmish: true } : {}),
                    },
                    cost: [cost],
                    effects: [{ type: 'PREVENT_WOUND' }],
                    source: preventAbilitySource(cost),
                    text: clause,
                });
            });
            return;
        }

        if (marker.phase === 'RESPONSE') {
            const winsMatch = body.match(
                /^If\s+([\s\S]+?)\s+wins a skirmish,/i
            );
            if (winsMatch) {
                const parsed = parseWinsSkirmishResponse(
                    body,
                    cardTitle,
                    cardId,
                    abilities.length
                );
                if (parsed) abilities.push(parsed);
                return;
            }
        }

        const makeMatch = body.match(
            /^Exert\s+([\s\S]+?)\s+to make\s+([\s\S]+)/i
        );
        if (makeMatch) {
            if (/\b(and|or)\b/i.test(makeMatch[1])) return;
            const subject = parseExertSubject(makeMatch[1], cardTitle);
            if (!subject) return;
            const effectText = makeMatch[2];
            if (/\bfor each\b/i.test(effectText.replace(/<[^>]+>/g, ' '))) return;

            const expiresAtPhase = parseUntilExpiry(effectText, marker.phase);
            const parsedMake = parseMakeTargetAndEffects(
                effectText,
                subject.target,
                expiresAtPhase
            );
            if (!parsedMake || parsedMake.effects.length === 0) return;

            const source = subject.target === 'BEARER' ? 'ATTACHMENT' : 'SELF';
            const clause = `${marker.phase}: Exert ${makeMatch[1].trim()} to make ${effectText}`
                .replace(/<[^>]+>/g, '')
                .replace(/\s+/g, ' ')
                .replace(/\s+\./g, '.')
                .trim();

            abilities.push({
                id: `${cardId || 'ability'}:${abilities.length}`,
                phases: [marker.phase],
                cost: [
                    {
                        exert: [
                            {
                                count: subject.count,
                                target: subject.target,
                                ...(subject.mode ? { mode: subject.mode } : {}),
                            },
                        ],
                    },
                ],
                effects: parsedMake.effects,
                source,
                text: clause,
            });
            return;
        }

        const makeBareMatch = body.match(/^Make\s+((?:a|an)\s+[\s\S]+)/i);
        if (makeBareMatch) {
            const effectText = makeBareMatch[1];
            if (/\bfor each\b/i.test(effectText.replace(/<[^>]+>/g, ' '))) {
                return;
            }
            const expiresAtPhase = parseUntilExpiry(effectText, marker.phase);
            const parsedMake = parseMakeTargetAndEffects(
                effectText,
                [['']],
                expiresAtPhase
            );
            if (
                !parsedMake ||
                parsedMake.effects.length === 0 ||
                !Array.isArray(parsedMake.target)
            ) {
                return;
            }

            const clause = `${marker.phase}: Make ${effectText}`
                .replace(/<[^>]+>/g, '')
                .replace(/\s+/g, ' ')
                .replace(/\s+\./g, '.')
                .trim();

            abilities.push({
                id: `${cardId || 'ability'}:${abilities.length}`,
                phases: [marker.phase],
                cost: [],
                effects: parsedMake.effects,
                source: 'SELF',
                text: clause,
            });
            return;
        }

        const allowMatch = body.match(
            /^Exert\s+([\s\S]+?)\s+to allow\s+([\s\S]+?)\s+to skirmish/i
        );
        if (allowMatch) {
            if (/\b(and|or)\b/i.test(allowMatch[1])) return;
            const allowSubject = parseExertSubject(allowMatch[1], cardTitle);
            if (!allowSubject) return;
            if (parseAllowSkirmishTarget(allowMatch[2], cardTitle) !== 'SELF') {
                return;
            }

            const allowClause =
                `${marker.phase}: Exert ${allowMatch[1].trim()} to allow ${allowMatch[2].trim()} to skirmish`
                    .replace(/<[^>]+>/g, '')
                    .replace(/\s+/g, ' ')
                    .replace(/\s+\./g, '.')
                    .trim();

            abilities.push({
                id: `${cardId || 'ability'}:${abilities.length}`,
                phases: [marker.phase],
                cost: [
                    {
                        exert: [
                            {
                                count: allowSubject.count,
                                target: allowSubject.target,
                                ...(allowSubject.mode
                                    ? { mode: allowSubject.mode }
                                    : {}),
                            },
                        ],
                    },
                ],
                effects: [{ type: 'ALLOW_SKIRMISH', target: 'SELF' }],
                source:
                    allowSubject.target === 'BEARER' ? 'ATTACHMENT' : 'SELF',
                text: allowClause,
            });
            return;
        }

        const drawMatch = body.match(
            /^Exert\s+([\s\S]+?)\s+to draw\s+(\d+)\s+cards?\s*\.?$/i
        );
        if (drawMatch) {
            if (/\b(and|or)\b/i.test(drawMatch[1])) return;
            const drawSubject = parseExertSubject(drawMatch[1], cardTitle);
            if (!drawSubject) return;
            const drawCount = parseInt(drawMatch[2], 10);
            if (!drawCount || drawCount < 1) return;

            const drawClause =
                `${marker.phase}: Exert ${drawMatch[1].trim()} to draw ${drawCount} cards`
                    .replace(/<[^>]+>/g, '')
                    .replace(/\s+/g, ' ')
                    .replace(/\s+\./g, '.')
                    .trim();

            abilities.push({
                id: `${cardId || 'ability'}:${abilities.length}`,
                phases: [marker.phase],
                cost: [
                    {
                        exert: [
                            {
                                count: drawSubject.count,
                                target: drawSubject.target,
                                ...(drawSubject.mode
                                    ? { mode: drawSubject.mode }
                                    : {}),
                            },
                        ],
                    },
                ],
                effects: [{ type: 'DRAW', count: drawCount }],
                source:
                    drawSubject.target === 'BEARER' ? 'ATTACHMENT' : 'SELF',
                text: drawClause,
            });
            return;
        }

        const woundMatch = body.match(
            /^Exert\s+([\s\S]+?)\s+to wound\s+([\s\S]+)/i
        );
        if (!woundMatch) return;
        if (/\b(and|or)\b/i.test(woundMatch[1])) return;

        const woundSubject = parseExertSubject(woundMatch[1], cardTitle);
        if (!woundSubject) return;

        const woundClause = woundMatch[2]
            .split(';')[0]
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/\.$/, '');

        const skirmishingWound =
            /^(?:a|an) character(?: that)? (?:he or she|he|she|it|this \w+|bearer) is skirmishing$/i.test(
                woundClause
            );

        let woundTarget: 'SELF' | 'BEARER' | 'SKIRMISHING' | string[][] | null =
            null;
        if (skirmishingWound) {
            woundTarget = 'SKIRMISHING';
        } else {
            const woundArticle = woundClause.match(/^(a|an|the)\s+(.+)$/i);
            if (!woundArticle) return;
            const woundFilters = parseClassFilters(woundArticle[2]);
            if (woundFilters.length === 0) return;
            woundTarget = [woundFilters];
        }

        const omitFromArcheryTotal =
            /does not add to the fellowship archery total/i.test(body);
        const woundSource =
            woundSubject.target === 'BEARER' ? 'ATTACHMENT' : 'SELF';
        const woundText = `${marker.phase}: Exert ${woundMatch[1].trim()} to wound ${woundMatch[2]}`
            .replace(/<[^>]+>/g, '')
            .replace(/\s+/g, ' ')
            .replace(/\s+\./g, '.')
            .trim();

        abilities.push({
            id: `${cardId || 'ability'}:${abilities.length}`,
            phases: [marker.phase],
            cost: [
                {
                    exert: [
                        {
                            count: woundSubject.count,
                            target: woundSubject.target,
                            ...(woundSubject.mode
                                ? { mode: woundSubject.mode }
                                : {}),
                        },
                    ],
                },
            ],
            effects: [
                {
                    type: 'WOUND',
                    count: 1,
                    target: woundTarget,
                },
            ],
            source: woundSource,
            text: woundText,
            ...(omitFromArcheryTotal ? { omitFromArcheryTotal: true } : {}),
        });
    });

    parseWhenPlayedAbilities(text, cardId).forEach((ability) => {
        abilities.push({
            ...ability,
            id: `${cardId || 'ability'}:${abilities.length}`,
        });
    });

    return abilities.length > 0 ? abilities : undefined;
}
