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
 * Formate le texte de jeu : balises CSV → Markdown d’affichage.
 * Source de vérité CSV = `<keyword>…</keyword>` (pas `<b>`).
 */
export function formatGameText(text?: string): string | undefined {
    if (!text) return undefined;
    return text
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(
            /<keyword>Ambush<\/keyword>\s*(<symbol>twilight\d+<\/symbol>)/gi,
            '**Ambush** $1'
        )
        // Ancien markup HTML dans certaines traductions → même rendu que <keyword>
        .replace(/<b>([^<]+)<\/b>/gi, '**$1**')
        .replace(/<keyword>([^<]+)<\/keyword>/gi, '**$1**')
        // Point collé après le gras (`**fierce**.` → `**fierce.**`)
        .replace(/\*\*([^*]+?)\*\*\./g, (_m, inner: string) =>
            /[.!?…]$/.test(inner.trim()) ? `**${inner}**.` : `**${inner}.**`
        )
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
 * Mot-clé dans un « is / gains / make … Fierce » (While, Skirmish, etc.) —
 * ce n’est pas un mot-clé imprimé de la carte.
 */
function isGrantedKeywordMarkup(text: string, matchIndex: number): boolean {
    const before = text
        .slice(0, matchIndex)
        .replace(/<\/?[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trimEnd();
    return /\b(?:is(?:\s+an?)?|gains|make)\b[\w\s+'’-]*$/i.test(before);
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
            if (isGrantedKeywordMarkup(text, match.index)) continue;
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
            part
                .trim()
                .split(/\s+or\s+/i)
                .forEach((subPart) => {
                    const cleanPart = subPart
                        .trim()
                        .toUpperCase()
                        .replace(/\s+/g, '-');
                    if (!cleanPart) return;

                    if (GAME_PHASES.has(cleanPart)) {
                        textPhasesSet.add(cleanPart);
                    } else {
                        subTypeParts.push(cleanPart);
                    }
                });
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

    // « Plays on a plains site you control » (terrain + contrôle)
    const terrainControlled = text.match(
        /plays on an?\s+([a-z-]+)\s+site you control/i
    );
    if (terrainControlled) {
        const siteKw = parseSiteLocationKeyword(terrainControlled[1]);
        if (siteKw) return [[siteKw, 'SITE']];
        return null;
    }

    // « Plays on a site you control » / « Plays on a site »
    if (/plays on a site(?:\s+you control)?/i.test(text)) {
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

/** « Plays on a (terrain) site you control ». */
export function parseRequiresControlledSite(text?: string): boolean {
    if (!text) return false;
    return /plays on an?(?:\s+[a-z-]+)?\s+site you control/i.test(text);
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

const FILTER_STOPWORDS = new Set(['A', 'AN', 'THE', 'OR', 'YOUR']);

const FILTER_ALIASES: Record<string, string> = {
    URUKHAI: 'URUK-HAI',
    NAZGUL: 'NAZGÛL',
    RINGBEARER: 'RING-BEARER',
    RINGBOUND: 'RING-BOUND',
    PIPES: 'PIPE',
    COMPANIONS: 'COMPANION',
    MINIONS: 'MINION',
    ALLIES: 'ALLY',
    CONDITIONS: 'CONDITION',
    POSSESSIONS: 'POSSESSION',
    ARTIFACTS: 'ARTIFACT',
    ENTS: 'ENT',
    HUNTERS: 'HUNTER',
    TRACKERS: 'TRACKER',
    MOUNTS: 'MOUNT',
    ORCS: 'ORC',
    DWARVES: 'DWARF',
    ELVES: 'ELF',
    HOBBITS: 'HOBBIT',
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
        VALID_KEYWORDS.has(token) ||
        // Mots-clés à valeur (HUNTER 1…) : le pluriel / le spot utilise la clé nue
        token === 'HUNTER' ||
        token === 'TOIL' ||
        token === 'AMBUSH'
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
        let token = normalizeFilterToken(word);
        // Pluriel de race Man (« dunland Men ») — culture Men reste via symbole.
        if (token === 'MEN') token = 'MAN';
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

function parseBearerMustBeName(fullText?: string): string | null {
    if (!fullText) return null;
    const match = fullText.match(/Bearer must be\s+([^.\n]+)/i);
    if (!match) return null;
    const name = match[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (!name || /^(a|an)\s+/i.test(name)) return null;
    return name;
}

function parseExertSubject(
    raw: string,
    cardTitle?: string,
    fullText?: string
): {
    target: 'SELF' | 'BEARER' | string[][];
    count: number;
    mode?: 'DESIGNATION';
    excludeSource?: boolean;
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

    if (/^\d+\s+/.test(body) || /^(one|two)\s+/i.test(body)) {
        const numbered = body.match(/^(one|two|\d+)\s+(.+)$/i);
        if (!numbered) return null;
        const n = parseBurdenWord(numbered[1]);
        if (!n) return null;
        const filters = parseClassFilters(numbered[2]);
        if (filters.length === 0) return null;
        return { target: [filters], count: n };
    }

    // « spot X pipes » : X = nombre variable, la classe passe par les filtres connus.
    const variableClass = body.match(/^X\s+(.+)$/i);
    if (variableClass) {
        const filters = parseClassFilters(variableClass[1]);
        if (filters.length === 0) return null;
        return { target: [filters], count: 1 };
    }

    if (/^bearer$/i.test(body)) {
        return { target: 'BEARER', count };
    }
    if (/^this\b/i.test(body)) {
        return { target: 'SELF', count };
    }
    if (/^(him|her|it)$/i.test(body)) {
        return { target: 'SELF', count };
    }

    const title = (cardTitle || '').trim();
    if (title && body.toLowerCase() === title.toLowerCase()) {
        return { target: 'SELF', count };
    }

    const bearerName = parseBearerMustBeName(fullText);
    if (bearerName && body.toLowerCase() === bearerName.toLowerCase()) {
        return { target: 'BEARER', count };
    }

    const articleMatch = body.match(/^(a|an)\s+(.+)$/i);
    if (articleMatch) {
        const filters = parseClassFilters(articleMatch[2]);
        if (filters.length === 0) return null;
        return { target: [filters], count, mode: 'DESIGNATION' };
    }

    // « another orc minion » → filtres + excludeSource (pas la carte elle-même)
    const anotherMatch = body.match(/^another\s+(.+)$/i);
    if (anotherMatch) {
        const filters = parseClassFilters(anotherMatch[1]);
        if (filters.length === 0) return null;
        return { target: [filters], count, excludeSource: true };
    }

    // « your » : pas encore.
    if (/^your\b/i.test(body)) return null;

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

/** « (limit +5) » en fin de clause make. */
function stripMakeStatLimit(effectText: string): {
    text: string;
    limit?: number;
} {
    const match = effectText
        .replace(/\s+/g, ' ')
        .trim()
        .match(/^(.*?)\s*\(\s*limit\s*\+(\d+)\s*\)\s*\.?$/i);
    if (!match) return { text: effectText };
    const limit = parseInt(match[2], 10);
    if (!Number.isFinite(limit) || limit <= 0) return { text: effectText };
    return { text: match[1].trim(), limit };
}

/** Nom de la carte → « this companion … » pour réutiliser le parse make SELF. */
function rewriteNamedSelfMakeText(
    effectText: string,
    cardTitle?: string
): string {
    const title = (cardTitle || '').trim();
    if (!title) return effectText;
    const plain = effectText
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (plain.toLowerCase().startsWith(`${title.toLowerCase()} `)) {
        return `this companion ${plain.slice(title.length).trim()}`;
    }
    return effectText;
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

const NON_CHARACTER_FILTERS = new Set([
    'CONDITION',
    'POSSESSION',
    'ARTIFACT',
    'SITE',
    'EVENT',
    'FOLLOWER',
    'HAND-WEAPON',
    'RANGED-WEAPON',
]);

function isCharacterishHealTarget(
    target: 'SELF' | 'BEARER' | 'SKIRMISHING' | 'WINNER' | string[][]
): boolean {
    if (target === 'SELF' || target === 'BEARER') return true;
    if (!Array.isArray(target)) return false;
    const tokens = target.flat().map((token) => token.toUpperCase());
    if (tokens.some((token) => NON_CHARACTER_FILTERS.has(token))) return false;
    return tokens.length > 0;
}

function effectTargetConflictsWithCost(
    costTarget: 'SELF' | 'BEARER' | string[][],
    effectTarget: 'SELF' | 'BEARER' | 'SKIRMISHING' | 'WINNER' | string[][]
): boolean {
    if (costTarget === 'SELF' || costTarget === 'BEARER') return false;
    if (!Array.isArray(costTarget)) return false;
    if (effectTarget === 'SELF' || effectTarget === 'BEARER') return false;
    if (effectTarget === costTarget) return false;
    if (Array.isArray(effectTarget)) {
        return JSON.stringify(effectTarget) !== JSON.stringify(costTarget);
    }
    return true;
}

/** Cible d’un soin / d’une défausse : him, bearer, that CLASS, a CLASS. */
function parseNounTarget(
    raw: string,
    costTarget: 'SELF' | 'BEARER' | string[][],
    cardTitle?: string
): 'SELF' | 'BEARER' | string[][] | null {
    const normalized = raw
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/him or her/gi, 'him')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/[.\s]+$/, '')
        .replace(/\s+from play$/i, '')
        .trim();
    const plain = normalized.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!plain) return null;

    // « every / all conditions » → géré à part (DISCARD_ALL)
    if (/^(every|all)\s+conditions?$/i.test(plain)) {
        return [['CONDITION']];
    }

    // « a Shadow possession or Shadow artifact » / « a isengard or moria condition »
    const dnf = parseArticleOrFilters(plain);
    if (dnf) return dnf;

    if (
        /\b(and|or|each|every|all|may|from|twice|times|up to|except|stacked|borne)\b/i.test(
            plain
        )
    ) {
        return null;
    }

    if (/^(him|her|it)$/i.test(plain)) {
        return parseEffectTarget(normalized, costTarget);
    }
    if (/^bearer$/i.test(plain)) return 'BEARER';
    if (/^this(?:\s+[\w’-]+)?$/i.test(plain)) return 'SELF';
    const title = (cardTitle || '').trim();
    if (title && plain.toLowerCase() === title.toLowerCase()) return 'SELF';
    if (/^that\s+[\w’-]+$/i.test(plain)) {
        if (costTarget === 'SELF' || costTarget === 'BEARER') return null;
        return costTarget;
    }

    // Nom propre sans article (« Discard Gollum », « Discard Sméagol »)
    if (!/\s/.test(plain) && isProperNameToken(plain)) {
        return [[plain]];
    }

    const article = normalized.match(/^(a|an)\s+([\s\S]+)$/i);
    if (!article) return null;
    const filters = parseClassFilters(article[2]);
    if (filters.length === 0) return null;
    return [filters];
}

/**
 * « a X or Y TYPE » → [[X,TYPE],[Y,TYPE]]
 * « a Shadow possession or Shadow artifact » → [[SHADOW,POSSESSION],[SHADOW,ARTIFACT]]
 */
function parseArticleOrFilters(plain: string): string[][] | null {
    const article = plain.match(/^(a|an)\s+(.+)$/i);
    if (!article) return null;
    const body = article[2].trim();
    if (!/\bor\b/i.test(body)) return null;

    // Forme B d’abord : « isengard or moria condition » (TYPE partagé à la fin)
    // Pas si une branche contient déjà un type (« Shadow possession or Shadow artifact »)
    const shared = body.match(
        /^(.+?)\s+or\s+(.+?)\s+(condition|possession|artifact|companion|minion|ally|character)s?$/i
    );
    const typeWordRe =
        /\b(condition|possession|artifact|companion|minion|ally|character)s?\b/i;
    if (
        shared &&
        !typeWordRe.test(shared[1]) &&
        !typeWordRe.test(shared[2])
    ) {
        const left = parseClassFilters(shared[1]);
        const right = parseClassFilters(shared[2]);
        const typeToken = normalizeFilterToken(shared[3]);
        if (
            left.length > 0 &&
            right.length > 0 &&
            isKnownFilterToken(typeToken)
        ) {
            return [
                [...left, typeToken],
                [...right, typeToken],
            ];
        }
    }

    // Forme A : « Shadow possession or Shadow artifact » (chaque branche complète)
    const branches = body.split(/\s+or\s+/i).map((b) => b.trim());
    if (branches.length < 2) return null;
    const branchFilters = branches.map((b) => parseClassFilters(b));
    if (branchFilters.every((f) => f.length > 0)) {
        return branchFilters;
    }
    return null;
}

function isDiscardEveryAll(raw: string): boolean {
    const plain = raw
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/[.\s]+$/, '')
        .replace(/\s+from play$/i, '');
    return /^(every|all)\s+conditions?$/i.test(plain);
}

function phasesJoinedByOr(
    markers: {
        phases: string[];
        phase: string;
        markerStart: number;
        bodyStart: number;
    }[],
    index: number,
    text: string
): string[] {
    const extras: string[] = [];
    for (let i = index; i > 0; i--) {
        const prev = markers[i - 1];
        const prevBody = stripAbilityMarkup(
            text.slice(prev.bodyStart, markers[i].markerStart)
        );
        if (!/^or$/i.test(prevBody)) break;
        extras.unshift(...prev.phases);
    }
    return [...extras, ...markers[index].phases];
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

    // « wound a companion (except the Ring-bearer) »
    const woundExcept = rest.match(
        /^wound\s+(a|an)\s+companion\s*\(\s*except the Ring-bearer\s*\)\.?$/i
    );
    if (woundExcept) {
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
            cost: [],
            effects: [
                {
                    type: 'WOUND',
                    count: 1,
                    target: [['COMPANION']],
                    excludeRingBearer: true,
                },
            ],
            source: winnerParsed.winner === 'BEARER' ? 'ATTACHMENT' : 'SELF',
            text: clause,
        };
    }

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
    cardTitle?: string,
    fullText?: string
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

    const discardAClass = text.match(/^discard\s+((?:a|an)\s+.+)$/i);
    if (discardAClass && !/\bfrom hand\b/i.test(text)) {
        const noun = parseNounTarget(discardAClass[1], [['']]);
        if (noun && Array.isArray(noun)) {
            return {
                discardFromPlay: [
                    { count: 1, target: noun, mode: 'DESIGNATION' },
                ],
            };
        }
        return null;
    }

    const exertMatch = text.match(/^Exert\s+([\s\S]+)$/i);
    if (exertMatch) {
        if (/\b(and|or)\b/i.test(exertMatch[1])) return null;
        const subject = parseExertSubject(exertMatch[1], cardTitle, fullText);
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
        const subject = parseExertSubject(spotMatch[1], cardTitle, fullText);
        if (!subject) return null;
        return {
            spot: [
                {
                    count: subject.count,
                    target: subject.target,
                    ...(subject.excludeSource ? { excludeSource: true } : {}),
                },
            ],
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
    cardTitle?: string,
    fullText?: string
): Record<string, unknown> | null {
    const segments = raw
        .split(/\s+and\s+/i)
        .map((segment) => segment.trim())
        .filter(Boolean);
    if (segments.length === 0) return null;
    const clauses = segments.map((segment) =>
        parsePreventCostClause(segment, cardTitle, fullText)
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

/** Passif `While wearing` : fardeaux à la place (+ force optionnelle). */
function parseWhileWearingEffects(
    rest: string
): {
    count: number;
    onlyInSkirmish: boolean;
    strengthBonus?: number;
} | null {
    const cleaned = stripAbilityMarkup(rest)
        .replace(/\u2013|\u2014/g, '-')
        .replace(/\s+/g, ' ')
        .trim();
    if (!cleaned) return null;

    const patterns: RegExp[] = [
        /^While wearing The One Ring,\s*the Ring-bearer is strength ([+-]\d+),\s*and each time (?:he or she|he|she) is about to take a wound(?: (during a skirmish|in a skirmish))?,\s*add (a|one|two|\d+) burdens? instead\.?$/i,
        /^While wearing The One Ring,\s*each time the Ring-bearer is about to take a wound(?: (during a skirmish|in a skirmish))?,\s*add (a|one|two|\d+) burdens? instead\.?$/i,
        /^While the Ring-bearer is wearing The One Ring,\s*each time (?:he or she|he|she) is about to take a wound(?: (in a skirmish|during a skirmish))?,\s*add (a|one|two|\d+) burdens? instead\.?$/i,
        /^While wearing The One Ring,\s*each time bearer is about to take a wound(?: (during a skirmish|in a skirmish))?,\s*add (a|one|two|\d+) burdens? instead\.?$/i,
        // hunter / etc. : on prend au moins le remplacement fardeaux
        /^While wearing The One Ring,[\s\S]*?each time (?:he or she|he|she|the Ring-bearer|bearer) is about to take a wound(?: (during a skirmish|in a skirmish))?,\s*add (a|one|two|\d+) burdens? instead\.?$/i,
    ];

    for (const pattern of patterns) {
        const match = cleaned.match(pattern);
        if (!match) continue;

        let strengthBonus: number | undefined;
        let skirmishGroup: string | undefined;
        let burdenGroup: string | undefined;

        if (match.length >= 4 && /^[+-]\d+$/.test(match[1] || '')) {
            strengthBonus = parseInt(match[1], 10);
            skirmishGroup = match[2];
            burdenGroup = match[3];
        } else {
            skirmishGroup = match[1];
            burdenGroup = match[2];
        }

        const count = parseBurdenWord(burdenGroup || '');
        if (!count) return null;
        return {
            count,
            onlyInSkirmish: Boolean(skirmishGroup),
            ...(strengthBonus !== undefined && Number.isFinite(strengthBonus)
                ? { strengthBonus }
                : {}),
        };
    }
    return null;
}

/** Cherche un passif While wearing n’importe où sur la carte. */
function findWhileWearingOnCard(
    fullText: string
): ReturnType<typeof parseWhileWearingEffects> {
    const plain = stripAbilityMarkup(fullText)
        .replace(/\u2013|\u2014/g, '-')
        .replace(/\s+/g, ' ');
    let start = plain.search(/While wearing The One Ring/i);
    if (start < 0) {
        start = plain.search(/While the Ring-bearer is wearing The One Ring/i);
        if (start < 0) return null;
    }
    let slice = plain.slice(start).trim();
    // Ne pas avaler la capacité de phase qui suit (Skirmish: …)
    const phaseCut = slice.search(
        /\b(?:Fellowship|Shadow|Maneuver|Archery|Assignment|Skirmish|Regroup|Response)\s*:/i
    );
    if (phaseCut > 0) {
        slice = slice.slice(0, phaseCut).trim();
    }
    return parseWhileWearingEffects(slice);
}

/**
 * Each time you play a [classe], add twilight N.
 * Requis, pas de « you may », pas de complément (during, on, here…).
 */
function parseEachTimeYouPlayAbilities(
    text: string,
    cardId?: string
): Record<string, unknown>[] {
    const found: Record<string, unknown>[] = [];
    const re =
        /Each time you play (?:a|an) ([\s\S]+?), add <symbol>twilight(\d+)<\/symbol>\./gi;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
        const subject = match[1]
            .trim()
            .replace(/\bhand\s+weapons?\b/gi, 'HAND-WEAPON')
            .replace(/\branged\s+weapons?\b/gi, 'RANGED-WEAPON')
            .replace(/\bweapons?\b/gi, 'WEAPON');
        if (
            /\b(you may|and|or|during|here|whose|except|another|from|to)\b/i.test(
                subject
            )
        ) {
            continue;
        }
        const filters = parseClassFilters(subject);
        if (filters.length === 0) continue;
        const twilight = parseInt(match[2], 10);
        if (!Number.isFinite(twilight) || twilight <= 0) continue;

        found.push({
            id: `${cardId || 'ability'}:${found.length}:each-time-play`,
            phases: [],
            trigger: { type: 'YOU_PLAY', played: [filters] },
            cost: [],
            effects: [{ type: 'ADD_TWILIGHT', count: twilight }],
            source: 'SELF',
            text: stripAbilityMarkup(match[0]),
        });
    }
    return found;
}

/**
 * Each time this minion wins a skirmish / the fellowship moves,
 * you may spot another X to take control of a site.
 */
function parseEachTimeTakeControlSiteAbilities(
    text: string,
    cardTitle?: string,
    cardId?: string
): Record<string, unknown>[] {
    const found: Record<string, unknown>[] = [];

    const winRe =
        /Each time ([\s\S]+?) wins a skirmish, you may spot ([\s\S]+?) to take control of a site\./gi;
    let match: RegExpExecArray | null;
    while ((match = winRe.exec(text)) !== null) {
        const winnerParsed = parseWinsSkirmishWinner(
            match[1].trim(),
            cardTitle
        );
        if (!winnerParsed) continue;
        const spot = parseExertSubject(match[2].trim(), cardTitle, text);
        if (!spot || spot.target === 'SELF' || spot.target === 'BEARER') {
            continue;
        }
        if (!Array.isArray(spot.target)) continue;

        found.push({
            id: `${cardId || 'ability'}:${found.length}:each-time-win-control`,
            phases: ['RESPONSE'],
            trigger: {
                type: 'WINS_SKIRMISH',
                winner: winnerParsed.winner,
                ...(winnerParsed.yours ? { yours: true } : {}),
            },
            optional: true,
            cost: [
                {
                    spot: [
                        {
                            count: spot.count,
                            target: spot.target,
                            ...(spot.excludeSource
                                ? { excludeSource: true }
                                : {}),
                        },
                    ],
                },
            ],
            effects: [{ type: 'TAKE_CONTROL_SITE' }],
            source: winnerParsed.winner === 'BEARER' ? 'ATTACHMENT' : 'SELF',
            text: stripAbilityMarkup(match[0]),
        });
    }

    const moveRe =
        /Each time the fellowship moves, you may spot ([\s\S]+?) to take control of a site\./gi;
    while ((match = moveRe.exec(text)) !== null) {
        const spot = parseExertSubject(match[1].trim(), cardTitle, text);
        if (!spot || spot.target === 'SELF' || spot.target === 'BEARER') {
            continue;
        }
        if (!Array.isArray(spot.target)) continue;

        found.push({
            id: `${cardId || 'ability'}:${found.length}:each-time-move-control`,
            phases: ['RESPONSE'],
            trigger: { type: 'FELLOWSHIP_MOVES' },
            optional: true,
            cost: [
                {
                    spot: [
                        {
                            count: spot.count,
                            target: spot.target,
                            ...(spot.excludeSource
                                ? { excludeSource: true }
                                : {}),
                        },
                    ],
                },
            ],
            effects: [{ type: 'TAKE_CONTROL_SITE' }],
            source: 'SELF',
            text: stripAbilityMarkup(match[0]),
        });
    }

    return found;
}

/**
 * When / Each time this minion wins a skirmish, you may stack him/it
 * on a site you control. (Dunland Looter, Hillman Rabble…)
 */
function parseWinsSkirmishStackOnSiteAbilities(
    text: string,
    cardTitle?: string,
    cardId?: string
): Record<string, unknown>[] {
    const found: Record<string, unknown>[] = [];
    const re =
        /(?:When|Each time)\s+([\s\S]+?)\s+wins a skirmish,\s*you may stack (?:him|her|it|this minion|this) on a site you control\.?/gi;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
        const winnerParsed = parseWinsSkirmishWinner(
            match[1].trim(),
            cardTitle
        );
        if (!winnerParsed) continue;

        found.push({
            id: `${cardId || 'ability'}:${found.length}:win-stack-site`,
            phases: ['RESPONSE'],
            trigger: {
                type: 'WINS_SKIRMISH',
                winner: winnerParsed.winner,
                ...(winnerParsed.yours ? { yours: true } : {}),
            },
            optional: true,
            cost: [],
            effects: [{ type: 'STACK_ON_CONTROLLED_SITE' }],
            source: winnerParsed.winner === 'BEARER' ? 'ATTACHMENT' : 'SELF',
            text: stripAbilityMarkup(match[0]),
        });
    }
    return found;
}

/** Spot « a CLASS » / « N CLASS » pour While — refuse le reste inconnu. */
function parseWhileSpotSubject(
    raw: string
): { count: number; target: string[][] } | null {
    const cleaned = stripAbilityMarkup(raw).replace(/\s+/g, ' ').trim();
    if (!cleaned) return null;
    if (
        /\b(and|or|each|other|whose|bearing|except|from|to|may|token|burden|threat|twilight|wound|exhausted|roaming|mounted|home|resistance|title)\b/i.test(
            cleaned
        )
    ) {
        return null;
    }

    const numbered = cleaned.match(/^(\d+)\s+(.+)$/i);
    if (numbered) {
        const count = parseInt(numbered[1], 10);
        if (!Number.isFinite(count) || count <= 0) return null;
        const filters = parseClassFilters(numbered[2]);
        if (filters.length === 0) return null;
        return { count, target: [filters] };
    }

    const article = cleaned.match(/^(a|an)\s+(.+)$/i);
    if (!article) return null;
    const filters = parseClassFilters(article[2]);
    if (filters.length === 0) return null;
    return { count: 1, target: [filters] };
}

function parseWhileStrengthWho(
    raw: string,
    cardTitle?: string
): 'SELF' | 'BEARER' | null {
    const who = stripAbilityMarkup(raw).replace(/\s+/g, ' ').trim();
    if (
        /^(this minion|this companion|him|her|he|she|it)$/i.test(who)
    ) {
        return 'SELF';
    }
    if (/^bearer$/i.test(who)) return 'BEARER';
    const title = (cardTitle || '').trim();
    if (title && who.toLowerCase() === title.toLowerCase()) return 'SELF';
    return null;
}

/** Terrains / lieux de site utilisables dans « at a … site ». */
const SITE_LOCATION_KEYWORDS = new Set([
    'BATTLEGROUND',
    'DWELLING',
    'FOREST',
    'MARSH',
    'MOUNTAIN',
    'PLAINS',
    'RIVER',
    'SANCTUARY',
    'UNDERGROUND',
]);

function parseSiteLocationKeyword(raw: string): string | null {
    const cleaned = stripAbilityMarkup(raw).replace(/\s+/g, ' ').trim();
    if (!cleaned) return null;
    const upper = cleaned.toUpperCase();
    if (!SITE_LOCATION_KEYWORDS.has(upper)) return null;
    return upper;
}

/**
 * While (this X is | the fellowship is | Name is) at a [terrain] site, … is strength ±N.
 * Inclut « each [classe] ». Refuse and Fierce / Damage / multi-clauses.
 */
function parseWhileAtSiteStrengthAbilities(
    text: string,
    cardTitle?: string,
    cardId?: string
): Record<string, unknown>[] {
    const found: Record<string, unknown>[] = [];

    const selfPatterns: RegExp[] = [
        /While this (?:minion|companion) is at an? ([^,]+?) site, ([^,]+?) is strength ([+-]\d+)\./gi,
        /While at an? ([^,]+?) site, ([^,]+?) is strength ([+-]\d+)\./gi,
        /While the fellowship is at an? ([^,]+?) site, ([^,]+?) is strength ([+-]\d+)\./gi,
    ];

    for (const re of selfPatterns) {
        let match: RegExpExecArray | null;
        while ((match = re.exec(text)) !== null) {
            const sentence = match[0];
            if (
                /\b(and|or|each|may|fierce|damage|archery|discard|wound|heal|draw)\b/i.test(
                    sentence
                )
            ) {
                continue;
            }
            const keyword = parseSiteLocationKeyword(match[1]);
            if (!keyword) continue;
            const who = parseWhileStrengthWho(match[2], cardTitle);
            if (!who) continue;
            const value = parseInt(match[3], 10);
            if (!Number.isFinite(value) || value === 0) continue;

            found.push({
                id: `${cardId || 'ability'}:${found.length}:while-at-site`,
                phases: [],
                trigger: { type: 'WHILE', atSiteKeyword: keyword },
                cost: [],
                effects: [
                    {
                        type: 'MODIFY_STAT',
                        stat: 'STRENGTH',
                        value,
                        target: who,
                    },
                ],
                source: who === 'BEARER' ? 'ATTACHMENT' : 'SELF',
                text: stripAbilityMarkup(sentence),
            });
        }
    }

    // « While Úlairë Nertëa is at a forest site, he is strength +2. »
    const namedRe =
        /While ([A-ZÀ-ŸÉ][^,]+?) is at an? ([^,]+?) site, ([^,]+?) is strength ([+-]\d+)\./gi;
    let match: RegExpExecArray | null;
    while ((match = namedRe.exec(text)) !== null) {
        const sentence = match[0];
        if (
            /\b(and|or|each|may|fierce|damage|archery|discard|wound|heal|draw|this minion|this companion|the fellowship|bearer)\b/i.test(
                sentence
            )
        ) {
            continue;
        }
        const atName = stripAbilityMarkup(match[1]).replace(/\s+/g, ' ').trim();
        const siteKw = parseSiteLocationKeyword(match[2]);
        if (!siteKw || !atName) continue;
        const value = parseInt(match[4], 10);
        if (!Number.isFinite(value) || value === 0) continue;

        const title = (cardTitle || '').trim();
        const isSelf =
            title && atName.toLowerCase() === title.toLowerCase();
        const who = isSelf
            ? parseWhileStrengthWho(match[3], cardTitle)
            : null;
        const target = isSelf
            ? who
            : [[atName]];
        if (!target || (isSelf && !who)) continue;

        found.push({
            id: `${cardId || 'ability'}:${found.length}:while-at-site`,
            phases: [],
            trigger: { type: 'WHILE', atSiteKeyword: siteKw },
            cost: [],
            effects: [
                {
                    type: 'MODIFY_STAT',
                    stat: 'STRENGTH',
                    value,
                    target,
                },
            ],
            source: 'SELF',
            text: stripAbilityMarkup(sentence),
        });
    }

    const eachRe =
        /While the fellowship is at an? ([^,]+?) site, each ([^,]+?) is strength ([+-]\d+)\./gi;
    while ((match = eachRe.exec(text)) !== null) {
        const sentence = match[0];
        if (
            /\b(and|or|may|fierce|damage|archery|other|your|who|whose)\b/i.test(
                sentence
            )
        ) {
            continue;
        }
        const keyword = parseSiteLocationKeyword(match[1]);
        if (!keyword) continue;
        const eachTarget = parseWhileEachClass(match[2]);
        if (!eachTarget) continue;
        const value = parseInt(match[3], 10);
        if (!Number.isFinite(value) || value === 0) continue;

        found.push({
            id: `${cardId || 'ability'}:${found.length}:while-at-site-each`,
            phases: [],
            trigger: { type: 'WHILE', atSiteKeyword: keyword },
            cost: [],
            effects: [
                {
                    type: 'MODIFY_STAT',
                    stat: 'STRENGTH',
                    value,
                    target: eachTarget,
                },
            ],
            source: 'SELF',
            text: stripAbilityMarkup(sentence),
        });
    }

    return found;
}

/**
 * While (this X / bearer / fellowship / Name is) at a [terrain] site,
 * … is|gains Fierce | Damage +N | Archer | Muster.
 * Un seul mot-clé — refuse and / strength+ / multi-clauses / cannot.
 */
function parseWhileAtSiteKeywordAbilities(
    text: string,
    cardTitle?: string,
    cardId?: string
): Record<string, unknown>[] {
    const found: Record<string, unknown>[] = [];
    const kwTail =
        '((?:<keyword>[^<]*</keyword>|\\*\\*[^*]+\\*\\*|damage\\s*\\+\\s*\\d+|fierce|archer|muster)\\.?)';
    const verb = '(?:is|gains)';

    const patterns: { re: RegExp; forceBearer?: boolean }[] = [
        {
            re: new RegExp(
                `While this (?:minion|companion) is at an? ([^,]+?) site, ([^,]+?) ${verb} (?:an?\\s+)?${kwTail}`,
                'gi'
            ),
        },
        {
            re: new RegExp(
                `While at an? ([^,]+?) site, ([^,]+?) ${verb} (?:an?\\s+)?${kwTail}`,
                'gi'
            ),
        },
        {
            re: new RegExp(
                `While the fellowship is at an? ([^,]+?) site, ([^,]+?) ${verb} (?:an?\\s+)?${kwTail}`,
                'gi'
            ),
        },
        {
            re: new RegExp(
                `While bearer is at an? ([^,]+?) site, ([^,]+?) ${verb} (?:an?\\s+)?${kwTail}`,
                'gi'
            ),
            forceBearer: true,
        },
    ];

    for (const { re, forceBearer } of patterns) {
        let match: RegExpExecArray | null;
        while ((match = re.exec(text)) !== null) {
            const sentence = match[0];
            if (
                /\b(and|or|each|may|strength|archery|discard|wound|heal|draw|cannot)\b/i.test(
                    sentence
                )
            ) {
                continue;
            }
            const siteKw = parseSiteLocationKeyword(match[1]);
            if (!siteKw) continue;
            const who = forceBearer
                ? 'BEARER'
                : parseWhileStrengthWho(match[2], cardTitle);
            if (!who) continue;
            const grant = parseWhileKeywordGrant(match[3]);
            if (!grant) continue;
            const after = stripAbilityMarkup(
                text.slice(match.index + match[0].length)
            ).trim();
            if (/^and\b/i.test(after)) continue;

            found.push({
                id: `${cardId || 'ability'}:${found.length}:while-at-site-kw`,
                phases: [],
                trigger: { type: 'WHILE', atSiteKeyword: siteKw },
                cost: [],
                effects: [
                    {
                        type: 'MODIFY_KEYWORD',
                        keyword: grant.keyword,
                        target: who,
                    },
                ],
                source: who === 'BEARER' ? 'ATTACHMENT' : 'SELF',
                text: stripAbilityMarkup(sentence),
            });
        }
    }

    // « While Gandalf is at an underground site, he gains muster. »
    const namedRe = new RegExp(
        `While ([A-ZÀ-ŸÉ][^,]+?) is at an? ([^,]+?) site, ([^,]+?) ${verb} (?:an?\\s+)?${kwTail}`,
        'gi'
    );
    let match: RegExpExecArray | null;
    while ((match = namedRe.exec(text)) !== null) {
        const sentence = match[0];
        if (
            /\b(and|or|each|may|strength|archery|discard|wound|heal|draw|cannot|this minion|this companion|the fellowship|bearer)\b/i.test(
                sentence
            )
        ) {
            continue;
        }
        const atName = stripAbilityMarkup(match[1]).replace(/\s+/g, ' ').trim();
        const siteKw = parseSiteLocationKeyword(match[2]);
        if (!siteKw || !atName) continue;
        const grant = parseWhileKeywordGrant(match[4]);
        if (!grant) continue;
        const after = stripAbilityMarkup(
            text.slice(match.index + match[0].length)
        ).trim();
        if (/^and\b/i.test(after)) continue;

        const title = (cardTitle || '').trim();
        const isSelf =
            title && atName.toLowerCase() === title.toLowerCase();
        const who = isSelf
            ? parseWhileStrengthWho(match[3], cardTitle)
            : null;
        const target = isSelf ? who : [[atName]];
        if (!target || (isSelf && !who)) continue;

        found.push({
            id: `${cardId || 'ability'}:${found.length}:while-at-site-kw`,
            phases: [],
            trigger: { type: 'WHILE', atSiteKeyword: siteKw },
            cost: [],
            effects: [
                {
                    type: 'MODIFY_KEYWORD',
                    keyword: grant.keyword,
                    target,
                },
            ],
            source: 'SELF',
            text: stripAbilityMarkup(sentence),
        });
    }

    // « While the fellowship is at a battleground site, each gandalf character gains muster. »
    const eachRe = new RegExp(
        `While the fellowship is at an? ([^,]+?) site, each ([^,]+?) ${verb} (?:an?\\s+)?${kwTail}`,
        'gi'
    );
    while ((match = eachRe.exec(text)) !== null) {
        const sentence = match[0];
        if (
            /\b(and|or|may|strength|archery|discard|wound|heal|draw|cannot|other|your|who|whose)\b/i.test(
                sentence
            )
        ) {
            continue;
        }
        const siteKw = parseSiteLocationKeyword(match[1]);
        if (!siteKw) continue;
        const eachTarget = parseWhileEachClass(match[2]);
        if (!eachTarget) continue;
        const grant = parseWhileKeywordGrant(match[3]);
        if (!grant) continue;
        const after = stripAbilityMarkup(
            text.slice(match.index + match[0].length)
        ).trim();
        if (/^and\b/i.test(after)) continue;

        found.push({
            id: `${cardId || 'ability'}:${found.length}:while-at-site-each-kw`,
            phases: [],
            trigger: { type: 'WHILE', atSiteKeyword: siteKw },
            cost: [],
            effects: [
                {
                    type: 'MODIFY_KEYWORD',
                    keyword: grant.keyword,
                    target: eachTarget,
                },
            ],
            source: 'SELF',
            text: stripAbilityMarkup(sentence),
        });
    }

    return found;
}

/**
 * While you can spot N [terrain] sites, each [classe] gains/is Fierce|Damage|Muster|Archer.
 */
function parseWhileSpotSiteEachKeywordAbilities(
    text: string,
    cardId?: string
): Record<string, unknown>[] {
    const found: Record<string, unknown>[] = [];
    const kwTail =
        '((?:<keyword>[^<]*</keyword>|\\*\\*[^*]+\\*\\*|damage\\s*\\+\\s*\\d+|fierce|archer|muster)\\.?)';
    const re = new RegExp(
        `While you can spot (\\d+) ([^,]+?) sites?, each ([^,]+?) (?:is|gains) (?:an?\\s+)?${kwTail}`,
        'gi'
    );
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
        const count = parseInt(match[1], 10);
        if (!Number.isFinite(count) || count <= 0) continue;
        const siteKw = parseSiteLocationKeyword(match[2]);
        if (!siteKw) continue;
        const eachTarget = parseWhileEachClass(match[3]);
        if (!eachTarget) continue;
        const grant = parseWhileKeywordGrant(match[4]);
        if (!grant) continue;
        const after = stripAbilityMarkup(
            text.slice(match.index + match[0].length)
        ).trim();
        if (/^and\b/i.test(after)) continue;

        found.push({
            id: `${cardId || 'ability'}:${found.length}:while-spot-site-each-kw`,
            phases: [],
            trigger: {
                type: 'WHILE',
                spotSiteKeyword: { keyword: siteKw, count },
            },
            cost: [],
            effects: [
                {
                    type: 'MODIFY_KEYWORD',
                    keyword: grant.keyword,
                    target: eachTarget,
                },
            ],
            source: 'SELF',
            text: stripAbilityMarkup(match[0]),
        });
    }
    return found;
}

/**
 * Bénéficiaire « each [classe] » — filtres connus uniquement.
 * Refuse skirmishing / of your / who has / not roaming / etc.
 */
function parseWhileEachClass(raw: string): string[][] | null {
    const cleaned = stripAbilityMarkup(raw).replace(/\s+/g, ' ').trim();
    if (!cleaned) return null;
    if (
        /\b(and|or|skirmishing|whose|who|that|bearing|your|other|hunter|roaming|wounded|mounted|exhausted|except|from|to|may|token|burden|threat|twilight|resistance|title|gains|cannot|more|less)\b/i.test(
            cleaned
        )
    ) {
        return null;
    }
    // Garder les <symbol> : culture Men ≠ race Man (pluriel plain « men »).
    const filters = parseClassFilters(raw);
    if (filters.length === 0) return null;
    return [filters];
}

/**
 * Spot While : classe (a/an/N) ou nom propre (The Balrog).
 */
function parseWhileSpotSubjectOrName(
    raw: string
): { count: number; target: string[][] } | null {
    const classed = parseWhileSpotSubject(raw);
    if (classed) return classed;

    const cleaned = stripAbilityMarkup(raw).replace(/\s+/g, ' ').trim();
    if (!cleaned) return null;
    if (
        /\b(and|or|each|other|whose|bearing|except|from|to|may|token|burden|threat|twilight|wound|exhausted|roaming|mounted|home|resistance|title|control|site|unique)\b/i.test(
            cleaned
        )
    ) {
        return null;
    }
    // Nom propre : The Balrog, Gandalf…
    if (!/^(the\s+)?[A-ZÀ-ŸÉ]/.test(cleaned)) return null;
    const withoutThe = cleaned.replace(/^the\s+/i, '');
    if (!/^[A-ZÀ-ŸÉ]/.test(withoutThe)) return null;
    // Titre entier (avec The) pour matcher card.title
    return { count: 1, target: [[cleaned]] };
}

/**
 * While you can spot [classe], skip the archery phase.
 * Skip the archery phase. (WHILE vide — vrai en jeu)
 * Refuse control sites / at this site / and the maneuver / bearing unique.
 */
function parseWhileSkipArcheryAbilities(
    text: string,
    cardId?: string
): Record<string, unknown>[] {
    const found: Record<string, unknown>[] = [];

    const spotRe =
        /While you can spot ([^,.]+), skip the archery phase\./gi;
    let match: RegExpExecArray | null;
    while ((match = spotRe.exec(text)) !== null) {
        const spot = parseWhileSpotSubjectOrName(match[1]);
        if (!spot) continue;

        found.push({
            id: `${cardId || 'ability'}:${found.length}:while-skip-archery`,
            phases: [],
            trigger: {
                type: 'WHILE',
                spot: [{ count: spot.count, target: spot.target }],
            },
            cost: [],
            effects: [{ type: 'SKIP_PHASE', phase: 'ARCHERY' }],
            source: 'SELF',
            text: stripAbilityMarkup(match[0]),
        });
    }

    const bareRe =
        /(?:^|[.!?])(?:\s|<[^>]+>)*Skip the archery phase\./gi;
    while ((match = bareRe.exec(text)) !== null) {
        const clause = 'Skip the archery phase.';
        // Refuse si d’autres phases suivent (virgule)
        const after = stripAbilityMarkup(
            text.slice(match.index + match[0].length)
        ).trim();
        if (/^,\s*the\s+\w+\s+phase/i.test(after)) continue;

        found.push({
            id: `${cardId || 'ability'}:${found.length}:while-skip-archery`,
            phases: [],
            trigger: { type: 'WHILE' },
            cost: [],
            effects: [{ type: 'SKIP_PHASE', phase: 'ARCHERY' }],
            source: 'SELF',
            text: clause,
        });
    }

    return found;
}

/**
 * While you can spot X, the Free Peoples player cannot replace …
 * Scopes : current site / current region / any site.
 */
function parseWhileCannotReplaceSiteAbilities(
    text: string,
    cardId?: string
): Record<string, unknown>[] {
    const found: Record<string, unknown>[] = [];

    const patterns: {
        re: RegExp;
        scope: 'CURRENT' | 'REGION' | 'ANY';
    }[] = [
        {
            re: /While you can spot ([^,.]+), the Free Peoples player cannot replace the fellowship[''\u2019]s current site\./gi,
            scope: 'CURRENT',
        },
        {
            re: /While you can spot ([^,.]+), the Free Peoples player cannot replace a site in the current region\./gi,
            scope: 'REGION',
        },
        {
            re: /While you can spot ([^,.]+), the Free Peoples player cannot replace a site\./gi,
            scope: 'ANY',
        },
    ];

    for (const { re, scope } of patterns) {
        let match: RegExpExecArray | null;
        while ((match = re.exec(text)) !== null) {
            const spot = parseWhileSpotSubjectOrName(match[1]);
            if (!spot) continue;

            found.push({
                id: `${cardId || 'ability'}:${found.length}:while-cannot-replace`,
                phases: [],
                trigger: {
                    type: 'WHILE',
                    spot: [{ count: spot.count, target: spot.target }],
                },
                cost: [],
                effects: [
                    {
                        type: 'CANNOT_REPLACE_SITE',
                        player: 'FREE_PEOPLE',
                        scope,
                    },
                ],
                source: 'SELF',
                text: stripAbilityMarkup(match[0]),
            });
        }
    }

    return found;
}

/**
 * While no opponent controls a site, [bearer|self] is strength ±N.
 */
function parseWhileNoOpponentControlsStrengthAbilities(
    text: string,
    cardTitle?: string,
    cardId?: string
): Record<string, unknown>[] {
    const found: Record<string, unknown>[] = [];
    const re =
        /While no opponent controls a site, ([^,]+?) is strength ([+-]\d+)\./gi;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
        if (/\b(and|or|each|may|fierce|damage)\b/i.test(match[0])) continue;
        const who = parseWhileStrengthWho(match[1], cardTitle);
        if (!who) continue;
        const value = parseInt(match[2], 10);
        if (!Number.isFinite(value) || value === 0) continue;

        found.push({
            id: `${cardId || 'ability'}:${found.length}:while-no-opp-control`,
            phases: [],
            trigger: { type: 'WHILE', noOpponentControlsSite: true },
            cost: [],
            effects: [
                {
                    type: 'MODIFY_STAT',
                    stat: 'STRENGTH',
                    value,
                    target: who,
                },
            ],
            source: who === 'BEARER' ? 'ATTACHMENT' : 'SELF',
            text: stripAbilityMarkup(match[0]),
        });
    }
    return found;
}

/**
 * While you can spot [classe|crépuscule], [self/bearer] is strength ±N.
 * Passif uniquement — refuse each / and fierce / for each / etc.
 */
function parseWhileSpotStrengthAbilities(
    text: string,
    cardTitle?: string,
    cardId?: string
): Record<string, unknown>[] {
    const found: Record<string, unknown>[] = [];

    const twilightRe =
        /While you can spot (\d+) twilight tokens?, ([^,]+?) is strength ([+-]\d+)\./gi;
    let match: RegExpExecArray | null;
    while ((match = twilightRe.exec(text)) !== null) {
        const who = parseWhileStrengthWho(match[2], cardTitle);
        if (!who) continue;
        const twilight = parseInt(match[1], 10);
        const value = parseInt(match[3], 10);
        if (!Number.isFinite(twilight) || twilight <= 0) continue;
        if (!Number.isFinite(value) || value === 0) continue;

        found.push({
            id: `${cardId || 'ability'}:${found.length}:while-spot`,
            phases: [],
            trigger: { type: 'WHILE', spotTwilight: twilight },
            cost: [],
            effects: [
                {
                    type: 'MODIFY_STAT',
                    stat: 'STRENGTH',
                    value,
                    target: who,
                },
            ],
            source: who === 'BEARER' ? 'ATTACHMENT' : 'SELF',
            text: stripAbilityMarkup(match[0]),
        });
    }

    const classRe =
        /While you can spot ((?:a|an|\d+) [^,.]+), ([^,]+?) is strength ([+-]\d+)\./gi;
    while ((match = classRe.exec(text)) !== null) {
        if (/twilight tokens?/i.test(match[1])) continue;
        const spot = parseWhileSpotSubject(match[1]);
        if (!spot) continue;
        const who = parseWhileStrengthWho(match[2], cardTitle);
        if (!who) continue;
        const value = parseInt(match[3], 10);
        if (!Number.isFinite(value) || value === 0) continue;

        found.push({
            id: `${cardId || 'ability'}:${found.length}:while-spot`,
            phases: [],
            trigger: {
                type: 'WHILE',
                spot: [{ count: spot.count, target: spot.target }],
            },
            cost: [],
            effects: [
                {
                    type: 'MODIFY_STAT',
                    stat: 'STRENGTH',
                    value,
                    target: who,
                },
            ],
            source: who === 'BEARER' ? 'ATTACHMENT' : 'SELF',
            text: stripAbilityMarkup(match[0]),
        });
    }

    return found;
}

/**
 * While you can spot [classe], each [classe] is strength ±N.
 * Cible classe (string[][]) — pas SELF/BEARER. Refuse skirmishing / of your / …
 */
function parseWhileSpotEachStrengthAbilities(
    text: string,
    cardId?: string
): Record<string, unknown>[] {
    const found: Record<string, unknown>[] = [];
    const re =
        /While you can spot ((?:a|an|\d+) [^,.]+), each ([^,]+?) is strength ([+-]\d+)\./gi;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
        if (/twilight tokens?/i.test(match[1])) continue;
        const spot = parseWhileSpotSubject(match[1]);
        if (!spot) continue;
        const eachTarget = parseWhileEachClass(match[2]);
        if (!eachTarget) continue;
        const value = parseInt(match[3], 10);
        if (!Number.isFinite(value) || value === 0) continue;

        found.push({
            id: `${cardId || 'ability'}:${found.length}:while-spot-each`,
            phases: [],
            trigger: {
                type: 'WHILE',
                spot: [{ count: spot.count, target: spot.target }],
            },
            cost: [],
            effects: [
                {
                    type: 'MODIFY_STAT',
                    stat: 'STRENGTH',
                    value,
                    target: eachTarget,
                },
            ],
            source: 'SELF',
            text: stripAbilityMarkup(match[0]),
        });
    }
    return found;
}

/**
 * While you can spot [classe], each [classe] is Damage +N | fierce.
 * Miroir force each — un seul mot-clé, pas d’and / other / archer.
 */
function parseWhileSpotEachKeywordAbilities(
    text: string,
    cardId?: string
): Record<string, unknown>[] {
    const found: Record<string, unknown>[] = [];
    const kwTail =
        '((?:<keyword>[^<]*</keyword>|\\*\\*[^*]+\\*\\*|damage\\s*\\+\\s*\\d+|fierce)\\.?)';
    const re = new RegExp(
        `While you can spot ((?:a|an|\\d+) [^,.]+), each ([^,]+?) is ${kwTail}`,
        'gi'
    );
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
        if (/twilight tokens?/i.test(match[1])) continue;
        const spot = parseWhileSpotSubject(match[1]);
        if (!spot) continue;
        const eachTarget = parseWhileEachClass(match[2]);
        if (!eachTarget) continue;
        const grant = parseWhileKeywordGrant(match[3]);
        if (!grant) continue;
        const after = stripAbilityMarkup(
            text.slice(match.index + match[0].length)
        ).trim();
        if (/^and\b/i.test(after)) continue;

        found.push({
            id: `${cardId || 'ability'}:${found.length}:while-spot-each-kw`,
            phases: [],
            trigger: {
                type: 'WHILE',
                spot: [{ count: spot.count, target: spot.target }],
            },
            cost: [],
            effects: [
                {
                    type: 'MODIFY_KEYWORD',
                    keyword: grant.keyword,
                    target: eachTarget,
                },
            ],
            source: 'SELF',
            text: stripAbilityMarkup(match[0]),
        });
    }
    return found;
}

/** Adversaire de « While skirmishing a … » — classe ou fierce minion. */
function parseWhileSkirmishingOpponent(raw: string): string[][] | null {
    const cleaned = stripAbilityMarkup(raw).replace(/\s+/g, ' ').trim();
    if (!cleaned) return null;
    if (
        /\b(and|or|each|other|whose|bearing|roaming|wounded|mounted|exhausted|non-hunter|hunter|except|from|to|may)\b/i.test(
            cleaned
        )
    ) {
        return null;
    }
    if (/^fierce minion$/i.test(cleaned)) {
        return [['FIERCE', 'MINION']];
    }
    const filters = parseClassFilters(cleaned);
    if (filters.length === 0) return null;
    return [filters];
}

/**
 * While skirmishing a [classe|fierce minion], [self] is strength ±N.
 */
function parseWhileSkirmishingStrengthAbilities(
    text: string,
    cardTitle?: string,
    cardId?: string
): Record<string, unknown>[] {
    const found: Record<string, unknown>[] = [];
    const re =
        /While skirmishing (?:a|an) ([^,]+), ([^,]+?) is strength ([+-]\d+)\./gi;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
        const opponent = parseWhileSkirmishingOpponent(match[1]);
        if (!opponent) continue;
        const who = parseWhileStrengthWho(match[2], cardTitle);
        if (!who || who === 'BEARER') continue;
        const value = parseInt(match[3], 10);
        if (!Number.isFinite(value) || value === 0) continue;

        found.push({
            id: `${cardId || 'ability'}:${found.length}:while-skirmish`,
            phases: [],
            trigger: {
                type: 'WHILE',
                skirmishing: { target: opponent },
            },
            cost: [],
            effects: [
                {
                    type: 'MODIFY_STAT',
                    stat: 'STRENGTH',
                    value,
                    target: who,
                },
            ],
            source: 'SELF',
            text: stripAbilityMarkup(match[0]),
        });
    }
    return found;
}

/** Classe portée : weapon / possession / mount / follower… */
function parseWhileBearingClass(raw: string): string[][] | null {
    const cleaned = stripAbilityMarkup(raw)
        .replace(/\bhand\s+weapons?\b/gi, 'HAND-WEAPON')
        .replace(/\branged\s+weapons?\b/gi, 'RANGED-WEAPON')
        .replace(/\bweapons?\b/gi, 'WEAPON')
        .replace(/\s+/g, ' ')
        .trim();
    if (!cleaned) return null;
    if (
        /\b(and|or|each|other|whose|except|from|to|may|named|search|card)\b/i.test(
            cleaned
        )
    ) {
        return null;
    }
    const filters = parseClassFilters(cleaned);
    if (filters.length === 0) return null;
    return [filters];
}

/**
 * While [self] bears / is bearing a [classe], [self] is strength ±N | Damage | fierce.
 */
function parseWhileBearingAbilities(
    text: string,
    cardTitle?: string,
    cardId?: string
): Record<string, unknown>[] {
    const found: Record<string, unknown>[] = [];
    const subjectAlt = 'this minion|this companion|[^,]+?';
    const kwTail =
        '((?:<keyword>[^<]*</keyword>|\\*\\*[^*]+\\*\\*|damage\\s*\\+\\s*\\d+|fierce)\\.?)';

    const strengthRe = new RegExp(
        `While (${subjectAlt}) (?:bears|is bearing) (?:a|an) ([^,]+), ([^,]+?) is strength ([+-]\\d+)\\.`,
        'gi'
    );
    let match: RegExpExecArray | null;
    while ((match = strengthRe.exec(text)) !== null) {
        const bearer = parseWhileStrengthWho(match[1], cardTitle);
        if (!bearer || bearer !== 'SELF') continue;
        const bearing = parseWhileBearingClass(match[2]);
        if (!bearing) continue;
        const who = parseWhileStrengthWho(match[3], cardTitle);
        if (!who || who !== 'SELF') continue;
        const value = parseInt(match[4], 10);
        if (!Number.isFinite(value) || value === 0) continue;

        found.push({
            id: `${cardId || 'ability'}:${found.length}:while-bearing`,
            phases: [],
            trigger: { type: 'WHILE', bearing: { target: bearing } },
            cost: [],
            effects: [
                {
                    type: 'MODIFY_STAT',
                    stat: 'STRENGTH',
                    value,
                    target: 'SELF',
                },
            ],
            source: 'SELF',
            text: stripAbilityMarkup(match[0]),
        });
    }

    const keywordRe = new RegExp(
        `While (${subjectAlt}) (?:bears|is bearing) (?:a|an) ([^,]+), ([^,]+?) is ${kwTail}`,
        'gi'
    );
    while ((match = keywordRe.exec(text)) !== null) {
        const bearer = parseWhileStrengthWho(match[1], cardTitle);
        if (!bearer || bearer !== 'SELF') continue;
        const bearing = parseWhileBearingClass(match[2]);
        if (!bearing) continue;
        const who = parseWhileStrengthWho(match[3], cardTitle);
        if (!who || who !== 'SELF') continue;
        const grant = parseWhileKeywordGrant(match[4]);
        if (!grant) continue;
        const after = stripAbilityMarkup(
            text.slice(match.index + match[0].length)
        ).trim();
        if (/^and\b/i.test(after)) continue;

        found.push({
            id: `${cardId || 'ability'}:${found.length}:while-bearing`,
            phases: [],
            trigger: { type: 'WHILE', bearing: { target: bearing } },
            cost: [],
            effects: [
                {
                    type: 'MODIFY_KEYWORD',
                    keyword: grant.keyword,
                    target: 'SELF',
                },
            ],
            source: 'SELF',
            text: stripAbilityMarkup(match[0]),
        });
    }

    return found;
}

/** « damage +1 » / « fierce » seuls — refuse and / each. */
function parseWhileKeywordGrant(
    raw: string
): { keyword: string } | null {
    const plain = stripAbilityMarkup(raw)
        .replace(/\*+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\.+$/, '');
    if (/\b(and|or|each)\b/i.test(plain)) return null;

    const damage = plain.match(/^damage\s*\+\s*(\d+)$/i);
    if (damage) {
        const n = parseInt(damage[1], 10);
        if (!Number.isFinite(n) || n <= 0 || n > 4) return null;
        return { keyword: `DAMAGE +${n}` };
    }
    if (/^fierce$/i.test(plain)) return { keyword: 'FIERCE' };
    if (/^archer$/i.test(plain)) return { keyword: 'ARCHER' };
    if (/^muster$/i.test(plain)) return { keyword: 'MUSTER' };
    return null;
}

/**
 * While you can spot [classe|crépuscule], [self/bearer] is Damage +N | fierce.
 * Miroir force — un seul mot-clé, pas d’and.
 */
function parseWhileSpotKeywordAbilities(
    text: string,
    cardTitle?: string,
    cardId?: string
): Record<string, unknown>[] {
    const found: Record<string, unknown>[] = [];
    const kwTail =
        '((?:<keyword>[^<]*</keyword>|\\*\\*[^*]+\\*\\*|damage\\s*\\+\\s*\\d+|fierce)\\.?)';

    const twilightRe = new RegExp(
        `While you can spot (\\d+) twilight tokens?, ([^,]+?) is ${kwTail}`,
        'gi'
    );
    let match: RegExpExecArray | null;
    while ((match = twilightRe.exec(text)) !== null) {
        const who = parseWhileStrengthWho(match[2], cardTitle);
        if (!who) continue;
        const twilight = parseInt(match[1], 10);
        if (!Number.isFinite(twilight) || twilight <= 0) continue;
        const grant = parseWhileKeywordGrant(match[3]);
        if (!grant) continue;
        // « is fierce and Damage +1 » : le regex s’arrête trop tôt — on refuse
        const after = stripAbilityMarkup(
            text.slice(match.index + match[0].length)
        ).trim();
        if (/^and\b/i.test(after)) continue;

        found.push({
            id: `${cardId || 'ability'}:${found.length}:while-spot-kw`,
            phases: [],
            trigger: { type: 'WHILE', spotTwilight: twilight },
            cost: [],
            effects: [
                {
                    type: 'MODIFY_KEYWORD',
                    keyword: grant.keyword,
                    target: who,
                },
            ],
            source: who === 'BEARER' ? 'ATTACHMENT' : 'SELF',
            text: stripAbilityMarkup(match[0]),
        });
    }

    const classRe = new RegExp(
        `While you can spot ((?:a|an|\\d+) [^,.]+), ([^,]+?) is ${kwTail}`,
        'gi'
    );
    while ((match = classRe.exec(text)) !== null) {
        if (/twilight tokens?/i.test(match[1])) continue;
        const spot = parseWhileSpotSubject(match[1]);
        if (!spot) continue;
        const who = parseWhileStrengthWho(match[2], cardTitle);
        if (!who) continue;
        const grant = parseWhileKeywordGrant(match[3]);
        if (!grant) continue;
        const after = stripAbilityMarkup(
            text.slice(match.index + match[0].length)
        ).trim();
        if (/^and\b/i.test(after)) continue;

        found.push({
            id: `${cardId || 'ability'}:${found.length}:while-spot-kw`,
            phases: [],
            trigger: {
                type: 'WHILE',
                spot: [{ count: spot.count, target: spot.target }],
            },
            cost: [],
            effects: [
                {
                    type: 'MODIFY_KEYWORD',
                    keyword: grant.keyword,
                    target: who,
                },
            ],
            source: who === 'BEARER' ? 'ATTACHMENT' : 'SELF',
            text: stripAbilityMarkup(match[0]),
        });
    }

    return found;
}

/**
 * Sites — famille sûre move :
 * « When the fellowship moves to/from this site|here, … »
 * Effets : add/remove twilight fixe ; discard each ally.
 * Refuse may / spot / for each / sanctuary / phase / multi-clause.
 */
function parseSiteMoveAbilities(
    text: string,
    cardId?: string
): Record<string, unknown>[] {
    const found: Record<string, unknown>[] = [];

    const twilightRe =
        /When the fellowship moves (to|from) (?:this site|here), (remove|add) <symbol>twilight(\d+)<\/symbol>\./gi;
    let match: RegExpExecArray | null;
    while ((match = twilightRe.exec(text)) !== null) {
        const sentence = match[0];
        if (
            /\b(may|spot|each|if|during|burden|threat|wound|discard|draw|heal)\b/i.test(
                sentence
            )
        ) {
            continue;
        }
        const direction =
            match[1].toLowerCase() === 'to' ? 'MOVES_TO' : 'MOVES_FROM';
        const op = match[2].toLowerCase();
        const count = parseInt(match[3], 10);
        if (!Number.isFinite(count) || count <= 0) continue;

        found.push({
            id: `${cardId || 'ability'}:${found.length}:site-move`,
            phases: [],
            trigger: { type: direction },
            cost: [],
            effects: [
                op === 'add'
                    ? { type: 'ADD_TWILIGHT', count }
                    : { type: 'REMOVE_TWILIGHT', count },
            ],
            source: 'SELF',
            text: stripAbilityMarkup(sentence),
        });
    }

    const discardAlliesRe =
        /When the fellowship moves (to|from) (?:this site|here), discard each ally(?: from play)?\./gi;
    while ((match = discardAlliesRe.exec(text)) !== null) {
        const direction =
            match[1].toLowerCase() === 'to' ? 'MOVES_TO' : 'MOVES_FROM';
        found.push({
            id: `${cardId || 'ability'}:${found.length}:site-move`,
            phases: [],
            trigger: { type: direction },
            cost: [],
            effects: [{ type: 'DISCARD_ALL', target: [['ALLY']] }],
            source: 'SELF',
            text: stripAbilityMarkup(match[0]),
        });
    }

    return found;
}

/**
 * Parse abilities pour Type=SITE.
 * Ne réutilise pas parseAbilities entier : familles élargies une par une.
 */
export function parseSiteAbilities(
    text: string,
    cardId?: string
): Record<string, unknown>[] | undefined {
    if (!text) return undefined;
    const abilities: Record<string, unknown>[] = [];
    parseSiteMoveAbilities(text, cardId).forEach((ability, index) => {
        abilities.push({
            ...ability,
            id: `${cardId || 'ability'}:${index}:site-move`,
        });
    });
    return abilities.length > 0 ? abilities : undefined;
}


/**
 * Passifs « X is strength +N for each … you can spot » / « for each of these races ».
 * Trigger WHILE vide (vrai en jeu). Refuse wound/assigned/discarded/control/skirmish.
 */
function parseForEachStrengthAbilities(
    text: string,
    cardTitle?: string,
    cardId?: string
): Record<string, unknown>[] {
    const found: Record<string, unknown>[] = [];
    const refuse =
        /\b(wound|assigned|discarded|control|skirmish|twilight|threat|burden|site|bearing|over|less|more than)\b/i;

    // Source CSV : <keyword>…</keyword>, <br>, <i> rappels. On normalise les
    // frontières de phrase sans toucher aux <symbol> (filtres culture).
    const working = text
        .replace(/<i>[\s\S]*?<\/i>/gi, ' ')
        .replace(/<\/?keyword>/gi, '')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/\*\*/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const resolveWho = (
        raw: string
    ): 'SELF' | 'BEARER' | string[][] | null => {
        const who = stripAbilityMarkup(raw).replace(/\s+/g, ' ').trim();
        if (/^this (?:minion|companion)$/i.test(who)) return 'SELF';
        if (/^bearer$/i.test(who)) return 'BEARER';
        const title = (cardTitle || '').trim();
        if (title && who.toLowerCase() === title.toLowerCase()) return 'SELF';
        if (/^[A-ZÀ-ŸÉ]/.test(who) && !/\b(and|or|each)\b/i.test(who)) {
            return [[who]];
        }
        return null;
    };

    const normalizeRace = (raw: string): string | null => {
        const cleaned = stripAbilityMarkup(raw).replace(/\s+/g, ' ').trim();
        if (!cleaned) return null;
        const lower = cleaned.toLowerCase();
        if (/^hobbits?$/.test(lower)) return 'HOBBIT';
        if (/^dwarves$|^dwarf$/.test(lower)) return 'DWARF';
        if (/^elves$|^elf$/.test(lower)) return 'ELF';
        if (/^men$|^man$/.test(lower)) return 'MAN';
        if (/^orcs?$/.test(lower)) return 'ORC';
        if (/^ents?$/.test(lower)) return 'ENT';
        if (/^wizards?$/.test(lower)) return 'WIZARD';
        if (/^uruk-hai$/.test(lower)) return 'URUK-HAI';
        return null;
    };

    const racesRe =
        /(?:^|[.!?]\s*)((?:This (?:minion|companion)|[A-ZÀ-ŸÉ][^,.]*?)) is strength \+(\d+) for (?:each|every) of these races you can spot in the fellowship:\s*([^.]+)\./gi;
    let match: RegExpExecArray | null;
    while ((match = racesRe.exec(working)) !== null) {
        if (refuse.test(match[0])) continue;
        const target = resolveWho(match[1]);
        if (!target) continue;
        const value = parseInt(match[2], 10);
        if (!Number.isFinite(value) || value <= 0) continue;
        const raceParts = stripAbilityMarkup(match[3])
            .replace(/\band\b/gi, ',')
            .split(',')
            .map((p) => p.trim())
            .filter(Boolean);
        const races: string[] = [];
        for (const part of raceParts) {
            const race = normalizeRace(part);
            if (!race) {
                races.length = 0;
                break;
            }
            if (!races.includes(race)) races.push(race);
        }
        if (races.length === 0) continue;

        found.push({
            id: `${cardId || 'ability'}:${found.length}:for-each-races`,
            phases: [],
            trigger: { type: 'WHILE' },
            cost: [],
            effects: [
                {
                    type: 'MODIFY_STAT',
                    stat: 'STRENGTH',
                    value,
                    target,
                    perDistinctRace: { races, inFellowship: true },
                },
            ],
            source: 'SELF',
            text: stripAbilityMarkup(match[0]),
        });
    }

    const eachRe =
        /(?:^|[.!?]\s*)((?:This (?:minion|companion)|Bearer|[A-ZÀ-ŸÉ][^,.]*?)) is strength \+(\d+) for (?:each|every) (other )?(?:a |an )?([^,.]+?) you (?:can )?spot(?: \(limit \+(\d+)\))?\./gi;
    while ((match = eachRe.exec(working)) !== null) {
        if (/for (?:each|every) of these races/i.test(match[0])) continue;
        if (refuse.test(match[0])) continue;
        const target = resolveWho(match[1]);
        if (!target) continue;
        const value = parseInt(match[2], 10);
        if (!Number.isFinite(value) || value <= 0) continue;
        if (match[3]) continue; // « other » : hors scope sûr
        const spotRaw = match[4].trim();
        if (/\b(and|or|who|whose|that|with|from|to|may)\b/i.test(spotRaw)) {
            continue;
        }
        const filters = parseClassFilters(spotRaw);
        if (filters.length === 0) continue;
        const limit = match[5] ? parseInt(match[5], 10) : undefined;
        if (limit !== undefined && (!Number.isFinite(limit) || limit <= 0)) {
            continue;
        }

        found.push({
            id: `${cardId || 'ability'}:${found.length}:for-each-spot`,
            phases: [],
            trigger: { type: 'WHILE' },
            cost: [],
            effects: [
                {
                    type: 'MODIFY_STAT',
                    stat: 'STRENGTH',
                    value,
                    target,
                    perSpot: {
                        target: [filters],
                        ...(limit !== undefined ? { limit } : {}),
                    },
                },
            ],
            source: 'SELF',
            text: stripAbilityMarkup(match[0]),
        });
    }

    return found;
}

function parseWhenPlayedAbilities(
    text: string,
    cardId?: string
): Record<string, unknown>[] {
    const found: Record<string, unknown>[] = [];
    const requiredRe =
        /When you play this(?:\s+(?:minion|possession|condition|companion|artifact|ally|follower))?, (?!you may)([\s\S]+?)\./gi;
    let match: RegExpExecArray | null;
    while ((match = requiredRe.exec(text)) !== null) {
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

    const optionalDrawRe =
        /When you play this(?:\s+(?:minion|possession|condition|companion|artifact|ally|follower))?, you may draw (a card|\d+ cards?)\./gi;
    while ((match = optionalDrawRe.exec(text)) !== null) {
        const countToken = match[1].trim().toLowerCase();
        const count =
            countToken === 'a card' ? 1 : parseInt(countToken, 10);
        if (!Number.isFinite(count) || count <= 0) continue;

        found.push({
            id: `${cardId || 'ability'}:${found.length}:when-played-may`,
            phases: [],
            trigger: { type: 'WHEN_PLAYED' },
            optional: true,
            cost: [],
            effects: [{ type: 'DRAW', count }],
            source: 'SELF',
            text: stripAbilityMarkup(match[0]),
        });
    }

    const optionalDiscardHandRe =
        /When you play this(?:\s+(?:minion|possession|condition|companion|artifact|ally|follower))?, you may discard up to (\d+) cards? from (?:your )?hand\./gi;
    while ((match = optionalDiscardHandRe.exec(text)) !== null) {
        const count = parseInt(match[1], 10);
        if (!Number.isFinite(count) || count <= 0) continue;

        found.push({
            id: `${cardId || 'ability'}:${found.length}:when-played-may`,
            phases: [],
            trigger: { type: 'WHEN_PLAYED' },
            optional: true,
            cost: [],
            effects: [{ type: 'DISCARD_FROM_HAND', count, upTo: true }],
            source: 'SELF',
            text: stripAbilityMarkup(match[0]),
        });
    }

    // « you may spot … to replace the fellowship's current site … »
    const optionalSpotReplaceRe =
        /When you play this(?:\s+(?:minion|possession|condition|companion|artifact|ally|follower))?, you may spot ([\s\S]+?) to (replace the fellowship[''\u2019]s current site with (?:an? [a-z-]+ site|a site) from your adventure deck)\./gi;
    while ((match = optionalSpotReplaceRe.exec(text)) !== null) {
        if (/\b(and|or|each|may)\b/i.test(match[1])) continue;
        const subject = parseExertSubject(match[1].trim());
        if (!subject) continue;
        const effect = parseReplaceSiteEffect(match[2].trim());
        if (!effect) continue;

        found.push({
            id: `${cardId || 'ability'}:${found.length}:when-played-may`,
            phases: [],
            trigger: { type: 'WHEN_PLAYED' },
            optional: true,
            cost: [
                {
                    spot: [
                        {
                            count: subject.count,
                            target: subject.target,
                            ...(subject.excludeSource
                                ? { excludeSource: true }
                                : {}),
                        },
                    ],
                },
            ],
            effects: [effect],
            source: 'SELF',
            text: stripAbilityMarkup(match[0]),
        });
    }

    return found;
}

function parseTakeControlSiteEffect(
    remainder: string
): Record<string, unknown> | null {
    const clause = stripAbilityMarkup(remainder)
        .replace(/\s+/g, ' ')
        .replace(/[.\s]+$/u, '')
        .trim();
    if (!clause) return null;

    if (/^take control of a site$/i.test(clause)) {
        return { type: 'TAKE_CONTROL_SITE' };
    }

    return null;
}

function parseForceChooseMoveAgainEffect(
    remainder: string
): Record<string, unknown> | null {
    const clause = stripAbilityMarkup(remainder)
        .replace(/\s+/g, ' ')
        .replace(/[.\s]+$/u, '')
        .trim();
    if (!clause) return null;

    if (
        /^make the Free Peoples player choose to move again this turn(?:\s*\(if the move limit allows\))?$/i.test(
            clause
        )
    ) {
        return { type: 'FORCE_CHOOSE_MOVE_AGAIN' };
    }

    return null;
}

/** « liberate a site » — ignore parenthèse optionnelle (or two if mounted…). */
function parseLiberateSiteEffect(
    remainder: string
): Record<string, unknown> | null {
    const clause = stripAbilityMarkup(remainder)
        .replace(/\s+/g, ' ')
        .replace(/\([^)]*\)/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/[.\s]+$/u, '')
        .trim();
    if (!clause) return null;

    if (/^liberate a site$/i.test(clause)) {
        return { type: 'LIBERATE_SITE' };
    }

    return null;
}

function parseReplaceSiteEffect(
    remainder: string
): Record<string, unknown> | null {
    const clause = stripAbilityMarkup(remainder)
        .replace(/\s+/g, ' ')
        .replace(/[.\s]+$/u, '')
        .trim();
    if (!clause) return null;

    // « … with an underground site from your adventure deck »
    const withTerrain = clause.match(
        /^replace the fellowship[''\u2019]s current site with an? ([a-z-]+) site from your adventure deck$/i
    );
    if (withTerrain) {
        const siteKw = parseSiteLocationKeyword(withTerrain[1]);
        if (!siteKw) return null;
        return {
            type: 'REPLACE_SITE',
            scope: 'CURRENT',
            from: 'SITES_DECK',
            siteKeyword: siteKw,
        };
    }

    // « … with a site from your adventure deck » (sans filtre terrain)
    if (
        /^replace the fellowship[''\u2019]s current site with a site from your adventure deck$/i.test(
            clause
        )
    ) {
        return {
            type: 'REPLACE_SITE',
            scope: 'CURRENT',
            from: 'SITES_DECK',
        };
    }

    // « replace a site in the fellowship's current region with a site from your adventure deck »
    if (
        /^replace a site in the fellowship[''\u2019]s current region with a site from your adventure deck$/i.test(
            clause
        )
    ) {
        return {
            type: 'REPLACE_SITE',
            scope: 'REGION',
            from: 'SITES_DECK',
        };
    }

    return null;
}

function parseExchangeSiteEffect(
    remainder: string
): Record<string, unknown> | null {
    const clause = stripAbilityMarkup(remainder)
        .replace(/\s+/g, ' ')
        .replace(/[.\s]+$/u, '')
        .trim();
    if (!clause) return null;

    // « exchange one of your sites on the adventure path with another site from your adventure deck »
    if (
        /^exchange one of your sites on the adventure path with another site from your adventure deck$/i.test(
            clause
        )
    ) {
        return {
            type: 'EXCHANGE_SITE',
            from: 'SITES_DECK',
        };
    }

    return null;
}

/** Événements sans balise de phase : Spot X to add twilightN and exchange … */
function parseStandaloneSpotTwilightExchangeAbilities(
    text: string,
    cardTitle?: string,
    cardId?: string
): Record<string, unknown>[] {
    const spotMatch = text.match(
        /^Spot\s+([\s\S]+?)\s+to\s+add\s+<symbol>twilight(\d+)<\/symbol>\s+and\s+(exchange\s+[\s\S]+)$/i
    );
    if (!spotMatch) return [];
    if (/\b(and|or)\b/i.test(spotMatch[1])) return [];

    const spotSubject = parseExertSubject(spotMatch[1], cardTitle, text);
    const twilight = parseInt(spotMatch[2], 10);
    const exchange = parseExchangeSiteEffect(spotMatch[3]);
    if (!spotSubject || !exchange || !Number.isFinite(twilight) || twilight <= 0) {
        return [];
    }

    return [
        {
            id: `${cardId || 'ability'}:0`,
            phases: [],
            cost: [
                {
                    spot: [
                        {
                            count: spotSubject.count,
                            target: spotSubject.target,
                            ...(spotSubject.excludeSource
                                ? { excludeSource: true }
                                : {}),
                        },
                    ],
                },
            ],
            effects: [
                { type: 'ADD_TWILIGHT', count: twilight },
                exchange,
            ],
            source: 'SELF',
            text: stripAbilityMarkup(spotMatch[0])
                .replace(/\s+/g, ' ')
                .replace(/[.\s]+$/u, '')
                .trim(),
        },
    ];
}

/** Événements sans balise de phase : « Spot X to replace Y » sur tout le gametext. */
function parseStandaloneSpotReplaceAbilities(
    text: string,
    cardTitle?: string,
    cardId?: string
): Record<string, unknown>[] {
    const plain = stripAbilityMarkup(text).replace(/\s+/g, ' ').trim();
    const spotReplaceMatch = plain.match(
        /^Spot\s+([\s\S]+?)\s+to\s+(replace\s+[\s\S]+)$/i
    );
    if (!spotReplaceMatch) return [];
    if (/\b(and|or)\b/i.test(spotReplaceMatch[1])) return [];

    const spotSubject = parseExertSubject(
        spotReplaceMatch[1],
        cardTitle,
        text
    );
    const effect = parseReplaceSiteEffect(spotReplaceMatch[2]);
    if (!spotSubject || !effect) return [];

    return [
        {
            id: `${cardId || 'ability'}:0`,
            phases: [],
            cost: [
                {
                    spot: [
                        {
                            count: spotSubject.count,
                            target: spotSubject.target,
                            ...(spotSubject.excludeSource
                                ? { excludeSource: true }
                                : {}),
                        },
                    ],
                },
            ],
            effects: [effect],
            source: 'SELF',
            text: plain,
        },
    ];
}

/** Effet dont la magnitude est le nombre spoté (X). Fragments sûrs seulement. */
function parseCountFromSpotEffect(
    remainder: string
): Record<string, unknown> | null {
    const replace = parseReplaceSiteEffect(remainder);
    if (replace) return replace;

    const raw = remainder.replace(/[.\s]+$/, '').trim();
    const clause = stripAbilityMarkup(raw).replace(/[.\s]+$/, '').trim();
    if (!clause) return null;

    if (/^remove X burdens$/i.test(clause)) {
        return { type: 'REMOVE_BURDENS', countFromSpot: true };
    }
    if (
        /^remove <symbol>twilightX<\/symbol>$/i.test(raw) ||
        /^remove twilight\s*X$/i.test(clause)
    ) {
        return { type: 'REMOVE_TWILIGHT', countFromSpot: true };
    }

    const healSignet = clause.match(
        /^heal (?:a|an) companion with the (\w+) signet X times$/i
    );
    if (healSignet) {
        const name = healSignet[1].toUpperCase();
        const token = `SIGNET_${name}`;
        if (!VALID_TARGET_TYPES.has(token)) return null;
        return {
            type: 'HEAL',
            countFromSpot: true,
            target: [['COMPANION', token]],
        };
    }

    if (/^heal X companions$/i.test(clause)) {
        return {
            type: 'HEAL',
            multiFromSpot: true,
            target: [['COMPANION']],
        };
    }

    return null;
}

/**
 * Effets terminaux sûrs après « Discard … to … » (sans magnitude X).
 * Pas de make / heal : familles à part.
 */
function parseDiscardToEffect(
    remainder: string,
    cardTitle?: string
): Record<string, unknown> | null {
    const replace = parseReplaceSiteEffect(remainder);
    if (replace) return replace;

    const takeControl = parseTakeControlSiteEffect(remainder);
    if (takeControl) return takeControl;

    const forceMove = parseForceChooseMoveAgainEffect(remainder);
    if (forceMove) return forceMove;

    const liberate = parseLiberateSiteEffect(remainder);
    if (liberate) return liberate;

    const clause = stripAbilityMarkup(remainder)
        .replace(/[.\s]+$/, '')
        .trim();
    if (!clause) return null;

    const threatMatch = clause.match(
        /^remove\s+(a|one|two|\d+)\s+threats?$/i
    );
    if (threatMatch) {
        const count = parseBurdenWord(threatMatch[1]);
        if (!count) return null;
        return { type: 'REMOVE_THREATS', count };
    }

    const discardMatch = clause.match(/^discard\s+((?:a|an)\s+.+)$/i);
    if (discardMatch) {
        const target = parseNounTarget(discardMatch[1], [['']], cardTitle);
        if (!target || !Array.isArray(target)) return null;
        return { type: 'DISCARD', count: 1, target };
    }

    const exertMatch = clause.match(/^exert\s+((?:a|an)\s+.+)$/i);
    if (exertMatch) {
        const target = parseNounTarget(exertMatch[1], [['']], cardTitle);
        if (!target || !Array.isArray(target)) return null;
        return { type: 'EXERT', count: 1, target };
    }

    const cancelMatch = clause.match(
        /^cancel a skirmish involving\s+(.+)$/i
    );
    if (cancelMatch) {
        const involving = parseCancelInvolving(
            cancelMatch[1],
            [['']],
            cardTitle
        );
        if (!involving) return null;
        return { type: 'CANCEL_SKIRMISH', involving };
    }

    return null;
}

/** Cible du « involving … » pour cancel skirmish. */
function parseCancelInvolving(
    raw: string,
    costTarget: 'SELF' | 'BEARER' | string[][],
    cardTitle?: string
): 'SELF' | 'BEARER' | string[][] | null {
    const plain = stripAbilityMarkup(raw).replace(/[.\s]+$/, '').trim();
    if (!plain) return null;
    if (/^(him|her|it)$/i.test(plain)) {
        return parseEffectTarget(plain, costTarget);
    }
    if (/^bearer$/i.test(plain)) return 'BEARER';
    return parseNounTarget(plain, costTarget, cardTitle);
}

/**
 * « Any Shadow player may remove ⓉN to prevent this ».
 * Uniquement remove twilight N — autre coût Ombre = inconnu (inerte).
 */
function parseShadowMayPrevent(
    leftover: string
): { removeTwilight: number } | null {
    const plain = stripAbilityMarkup(leftover).replace(/[.\s]+$/g, '').trim();
    if (!plain) return null;
    const match = plain.match(
        /^Any Shadow player may remove\s+twilight(\d+)\s+to prevent this$/i
    );
    if (!match) return null;
    return { removeTwilight: parseInt(match[1], 10) };
}

/** Leftover vide, ou prevent Ombre twilight reconnu. Sinon → ne pas émettre. */
function isOnlyShadowPreventClause(leftover: string): boolean {
    const plain = stripAbilityMarkup(leftover).replace(/[.\s]+$/g, '').trim();
    if (!plain) return true;
    return parseShadowMayPrevent(leftover) !== null;
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

    const phaseAlt = ABILITY_PHASES.join('|');
    const phaseRe = new RegExp(
        `<keyword>((?:${phaseAlt})(?:\\s+or\\s+(?:${phaseAlt}))*)[:.]?\\s*<\\/keyword>`,
        'gi'
    );
    const markers: {
        phase: string;
        phases: string[];
        markerStart: number;
        bodyStart: number;
    }[] = [];
    let markerMatch: RegExpExecArray | null;
    while ((markerMatch = phaseRe.exec(text)) !== null) {
        const phaseParts = markerMatch[1]
            .split(/\s+or\s+/i)
            .map((part) => part.replace(/[:.]/g, '').trim().toUpperCase())
            .filter(Boolean);
        if (phaseParts.length === 0) continue;
        markers.push({
            phase: phaseParts[phaseParts.length - 1],
            phases: phaseParts,
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
        if (/^or$/i.test(bodyPlain)) return;

        const phases = phasesJoinedByOr(markers, index, text);

        if (marker.phase === 'RESPONSE') {
            const wearMatch = bodyPlain.match(
                /^If\s+(bearer|the Ring-bearer)\s+is about to take a wound( in a skirmish)?,\s*(?:he or she|he|she)\s+wears The One Ring until the regroup phase\.?\s*([\s\S]*)$/i
            );
            const whileWearing = wearMatch
                ? parseWhileWearingEffects(wearMatch[3] || '')
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
                            ...(whileWearing.strengthBonus
                                ? { strengthBonus: whileWearing.strengthBonus }
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
                .map((option) => option.trim())
                .filter(Boolean);
            const costOptions = optionTexts.map((option) =>
                parsePreventCostOption(option, cardTitle, text)
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
                    phases,
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

        // Phase : Add N burden(s) to wear The One Ring until the regroup phase.
        const wearCostMatch = bodyPlain.match(
            /^Add\s+(a|one|two|\d+)\s+burdens?\s+to wear The One Ring until the regroup phase\.?/i
        );
        if (wearCostMatch) {
            const burdenCost = parseBurdenWord(wearCostMatch[1]);
            const whileWearing = findWhileWearingOnCard(text);
            if (burdenCost && whileWearing) {
                abilities.push({
                    id: `${cardId || 'ability'}:${abilities.length}`,
                    phases,
                    cost: [{ addBurdens: burdenCost }],
                    effects: [
                        {
                            type: 'WEAR_RING',
                            expiresAtPhase: 'REGROUP',
                            replaceWoundWithBurdens: whileWearing.count,
                            ...(whileWearing.onlyInSkirmish
                                ? { onlyInSkirmish: true }
                                : {}),
                            ...(whileWearing.strengthBonus
                                ? { strengthBonus: whileWearing.strengthBonus }
                                : {}),
                        },
                    ],
                    source: 'ATTACHMENT',
                    text: `${marker.phase}: Add ${wearCostMatch[1]} burden${burdenCost > 1 ? 's' : ''} to wear The One Ring until the regroup phase.`,
                });
                return;
            }
        }

        // Phase : If X is not assigned…, exert him|X N to add his strength to another companion.
        const addOwnStrengthMatch = bodyPlain.match(
            /^If\s+([\s\S]+?)\s+is not assigned to a skirmish,\s*exert\s+([\s\S]+?)\s+to add (?:his|her|its) strength to another companion\.?$/i
        );
        if (addOwnStrengthMatch) {
            const subject = parseExertSubject(
                addOwnStrengthMatch[2],
                cardTitle,
                text
            );
            const who = addOwnStrengthMatch[1].trim();
            const title = (cardTitle || '').trim();
            const whoIsSelf =
                /^(this|he|she|it)$/i.test(who) ||
                (title && who.toLowerCase() === title.toLowerCase());
            if (
                subject &&
                whoIsSelf &&
                (subject.target === 'SELF' ||
                    (title &&
                        Array.isArray(subject.target) &&
                        subject.target[0]?.[0]?.toLowerCase() ===
                            title.toLowerCase()))
            ) {
                abilities.push({
                    id: `${cardId || 'ability'}:${abilities.length}`,
                    phases,
                    requiresUnassigned: true,
                    cost: [
                        {
                            exert: [
                                {
                                    count: subject.count,
                                    target: 'SELF',
                                },
                            ],
                        },
                    ],
                    effects: [
                        {
                            type: 'ADD_TEMP_STAT',
                            stat: 'STRENGTH',
                            value: 0,
                            valueFromSourceStat: 'STRENGTH',
                            target: [['COMPANION']],
                            excludeSource: true,
                            expiresAtPhase: parseUntilExpiry(
                                bodyPlain,
                                marker.phase
                            ),
                        },
                    ],
                    source: 'SELF',
                    text: `${marker.phase}: If ${who} is not assigned to a skirmish, exert ${addOwnStrengthMatch[2].trim()} to add his strength to another companion.`,
                });
                return;
            }
        }

        // Exert X twice or remove a threat to make him strength +N
        // (avant makeMatch : sinon « Exert … or remove … to make » est mangé)
        const exertOrThreatMake = bodyPlain.match(
            /^Exert\s+([\s\S]+?)\s+or remove\s+(a|one|two|\d+)\s+threats?\s+to make\s+([\s\S]+)/i
        );
        if (exertOrThreatMake) {
            const subject = parseExertSubject(
                exertOrThreatMake[1],
                cardTitle,
                text
            );
            const threatCount = parseBurdenWord(exertOrThreatMake[2]);
            if (subject && threatCount) {
                const expiresAtPhase = parseUntilExpiry(
                    exertOrThreatMake[3],
                    marker.phase
                );
                const effectTarget = parseEffectTarget(
                    exertOrThreatMake[3],
                    subject.target
                );
                const effects = parseMakeEffects(
                    exertOrThreatMake[3],
                    effectTarget,
                    expiresAtPhase
                );
                if (effects && effects.length > 0) {
                    abilities.push({
                        id: `${cardId || 'ability'}:${abilities.length}`,
                        phases,
                        cost: [
                            {
                                exert: [
                                    {
                                        count: subject.count,
                                        target: subject.target,
                                        ...(subject.mode
                                            ? { mode: subject.mode }
                                            : {}),
                                    },
                                ],
                            },
                            { removeThreats: threatCount },
                        ],
                        effects,
                        source:
                            subject.target === 'BEARER' ? 'ATTACHMENT' : 'SELF',
                        text: `${marker.phase}: Exert ${exertOrThreatMake[1].trim()} or remove ${exertOrThreatMake[2]} threat${threatCount > 1 ? 's' : ''} to make ${exertOrThreatMake[3]}`
                            .replace(/<[^>]+>/g, '')
                            .replace(/\s+/g, ' ')
                            .replace(/\s+\./g, '.')
                            .trim(),
                    });
                    return;
                }
            }
        }

        const removeTwilightMake = body.match(
            /^Remove\s+<symbol>twilight(\d+)<\/symbol>\s+to make\s+([\s\S]+)/i
        );
        if (removeTwilightMake) {
            const twilight = parseInt(removeTwilightMake[1], 10);
            if (!Number.isFinite(twilight) || twilight <= 0) return;

            let effectText = removeTwilightMake[2];
            if (/\bfor each\b/i.test(effectText.replace(/<[^>]+>/g, ' '))) {
                return;
            }
            // Un seul effet force (pas « and fierce / and Damage »)
            const effectPlainCheck = effectText
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ');
            if (
                /\band\b/i.test(
                    effectPlainCheck.replace(/\(\s*limit\s*\+\d+\s*\)/i, '')
                )
            ) {
                return;
            }

            const { text: withoutLimit, limit } = stripMakeStatLimit(effectText);
            effectText = rewriteNamedSelfMakeText(withoutLimit, cardTitle);

            const expiresAtPhase = parseUntilExpiry(effectText, marker.phase);
            const parsedMake = parseMakeTargetAndEffects(
                effectText,
                'SELF',
                expiresAtPhase
            );
            if (!parsedMake || parsedMake.effects.length === 0) return;
            if (parsedMake.effects.length !== 1) return;
            const only = parsedMake.effects[0];
            if (!only || only.type !== 'ADD_TEMP_STAT') return;
            if (limit !== undefined) {
                only.limit = limit;
            }

            const source =
                parsedMake.target === 'BEARER' ? 'ATTACHMENT' : 'SELF';
            const clause =
                `${marker.phase}: Remove twilight${twilight} to make ${removeTwilightMake[2]}`
                    .replace(/<[^>]+>/g, '')
                    .replace(/\s+/g, ' ')
                    .replace(/\s+\./g, '.')
                    .trim();

            abilities.push({
                id: `${cardId || 'ability'}:${abilities.length}`,
                phases,
                cost: [{ removeTwilight: twilight }],
                effects: parsedMake.effects,
                source,
                text: clause,
            });
            return;
        }

        const makeMatch = body.match(
            /^Exert\s+([\s\S]+?)\s+to make\s+([\s\S]+)/i
        );
        if (makeMatch) {
            if (/\b(and|or)\b/i.test(makeMatch[1])) return;
            const subject = parseExertSubject(makeMatch[1], cardTitle, text);
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
                phases,
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
                phases,
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
            const allowSubject = parseExertSubject(allowMatch[1], cardTitle, text);
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
                phases,
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
            /^Exert\s+([\s\S]+?)\s+to draw\s+(a|\d+)\s+cards?\s*\.?$/i
        );
        if (drawMatch) {
            if (/\b(and|or)\b/i.test(drawMatch[1])) return;
            const drawSubject = parseExertSubject(drawMatch[1], cardTitle, text);
            if (!drawSubject) return;
            const drawCount = parseBurdenWord(drawMatch[2]);
            if (!drawCount) return;

            const drawClause =
                `${marker.phase}: Exert ${drawMatch[1].trim()} to draw ${drawMatch[2]} card${drawCount > 1 ? 's' : ''}`
                    .replace(/<[^>]+>/g, '')
                    .replace(/\s+/g, ' ')
                    .replace(/\s+\./g, '.')
                    .trim();

            abilities.push({
                id: `${cardId || 'ability'}:${abilities.length}`,
                phases,
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

        const healMatch = body.match(
            /^Exert\s+([\s\S]+?)\s+to heal\s+([\s\S]+)/i
        );
        if (healMatch) {
            if (/\b(and|or)\b/i.test(healMatch[1])) return;
            const healSubject = parseExertSubject(healMatch[1], cardTitle, text);
            if (!healSubject) return;
            const healTarget = parseNounTarget(
                healMatch[2],
                healSubject.target,
                cardTitle
            );
            if (!healTarget || !isCharacterishHealTarget(healTarget)) return;
            if (effectTargetConflictsWithCost(healSubject.target, healTarget)) {
                return;
            }

            const healClause =
                `${marker.phase}: Exert ${healMatch[1].trim()} to heal ${healMatch[2]}`
                    .replace(/<[^>]+>/g, '')
                    .replace(/\s+/g, ' ')
                    .replace(/\s+\./g, '.')
                    .trim();

            abilities.push({
                id: `${cardId || 'ability'}:${abilities.length}`,
                phases,
                cost: [
                    {
                        exert: [
                            {
                                count: healSubject.count,
                                target: healSubject.target,
                                ...(healSubject.mode
                                    ? { mode: healSubject.mode }
                                    : {}),
                            },
                        ],
                    },
                ],
                effects: [{ type: 'HEAL', count: 1, target: healTarget }],
                source:
                    healSubject.target === 'BEARER' ? 'ATTACHMENT' : 'SELF',
                text: healClause,
            });
            return;
        }

        const healBareMatch = body.match(/^Heal\s+([\s\S]+)/i);
        if (healBareMatch) {
            const healTarget = parseNounTarget(
                healBareMatch[1],
                [['']],
                cardTitle
            );
            if (
                !healTarget ||
                !Array.isArray(healTarget) ||
                !isCharacterishHealTarget(healTarget)
            ) {
                return;
            }

            const healBareClause = `${marker.phase}: Heal ${healBareMatch[1]}`
                .replace(/<[^>]+>/g, '')
                .replace(/\s+/g, ' ')
                .replace(/\s+\./g, '.')
                .trim();

            abilities.push({
                id: `${cardId || 'ability'}:${abilities.length}`,
                phases,
                cost: [],
                effects: [{ type: 'HEAL', count: 1, target: healTarget }],
                source: 'SELF',
                text: healBareClause,
            });
            return;
        }

        const replaceSiteMatch = body.match(
            /^Exert\s+([\s\S]+?)\s+to\s+(replace\s+[\s\S]+)/i
        );
        if (replaceSiteMatch) {
            if (/\b(and|or)\b/i.test(replaceSiteMatch[1])) return;
            const subject = parseExertSubject(
                replaceSiteMatch[1],
                cardTitle,
                text
            );
            const effect = parseReplaceSiteEffect(replaceSiteMatch[2]);
            if (!subject || !effect) return;

            const replaceClause =
                `${marker.phase}: Exert ${replaceSiteMatch[1].trim()} to ${replaceSiteMatch[2]}`
                    .replace(/<[^>]+>/g, '')
                    .replace(/\s+/g, ' ')
                    .replace(/\s+\./g, '.')
                    .trim();

            abilities.push({
                id: `${cardId || 'ability'}:${abilities.length}`,
                phases,
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
                effects: [effect],
                source: subject.target === 'BEARER' ? 'ATTACHMENT' : 'SELF',
                text: replaceClause,
            });
            return;
        }

        const takeControlMatch = body.match(
            /^Exert\s+([\s\S]+?)\s+to\s+(take control of a site)\s*\.?$/i
        );
        if (takeControlMatch) {
            if (/\b(and|or)\b/i.test(takeControlMatch[1])) return;
            const subject = parseExertSubject(
                takeControlMatch[1],
                cardTitle,
                text
            );
            const effect = parseTakeControlSiteEffect(takeControlMatch[2]);
            if (!subject || !effect) return;

            const takeControlClause =
                `${marker.phase}: Exert ${takeControlMatch[1].trim()} to take control of a site`
                    .replace(/<[^>]+>/g, '')
                    .replace(/\s+/g, ' ')
                    .replace(/\s+\./g, '.')
                    .trim();

            abilities.push({
                id: `${cardId || 'ability'}:${abilities.length}`,
                phases,
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
                effects: [effect],
                source: subject.target === 'BEARER' ? 'ATTACHMENT' : 'SELF',
                text: takeControlClause,
            });
            return;
        }

        // « Stack this minion on a site you control. »
        const stackOnSiteMatch = bodyPlain.match(
            /^Stack (?:this minion|him|it|this) on a site you control\.?$/i
        );
        if (stackOnSiteMatch) {
            const stackClause = `${marker.phase}: Stack this minion on a site you control.`
                .replace(/\s+/g, ' ')
                .trim();
            abilities.push({
                id: `${cardId || 'ability'}:${abilities.length}`,
                phases,
                cost: [],
                effects: [{ type: 'STACK_ON_CONTROLLED_SITE' }],
                source: 'SELF',
                text: stackClause,
            });
            return;
        }

        // « Exert X to stack a besieger / a Sauron minion on a site you control. »
        const exertStackOtherMatch = bodyPlain.match(
            /^Exert\s+([\s\S]+?)\s+to\s+stack\s+(a\s+[\s\S]+?)\s+on a site you control\.?$/i
        );
        if (exertStackOtherMatch) {
            if (/\b(and|or)\b/i.test(exertStackOtherMatch[1])) return;
            const subject = parseExertSubject(
                exertStackOtherMatch[1],
                cardTitle,
                text
            );
            const filters = parseClassFilters(exertStackOtherMatch[2]);
            if (!subject || filters.length === 0) return;

            const stackClause = `${marker.phase}: Exert ${exertStackOtherMatch[1].trim()} to stack ${exertStackOtherMatch[2].trim()} on a site you control.`
                .replace(/<[^>]+>/g, '')
                .replace(/\s+/g, ' ')
                .replace(/\s+\./g, '.')
                .trim();

            abilities.push({
                id: `${cardId || 'ability'}:${abilities.length}`,
                phases,
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
                effects: [
                    {
                        type: 'STACK_ON_CONTROLLED_SITE',
                        target: [filters],
                    },
                ],
                source: subject.target === 'BEARER' ? 'ATTACHMENT' : 'SELF',
                text: stackClause,
            });
            return;
        }

        // « Remove a threat to stack your Sauron minion on a site you control. »
        const threatStackOtherMatch = bodyPlain.match(
            /^Remove\s+(\d+|a|one)\s+threats?\s+to\s+stack\s+your\s+([\s\S]+?)\s+on a site you control\.?$/i
        );
        if (threatStackOtherMatch) {
            const rawCount = threatStackOtherMatch[1].toLowerCase();
            const threatCount =
                rawCount === 'a' || rawCount === 'one'
                    ? 1
                    : parseInt(rawCount, 10);
            const filters = parseClassFilters(threatStackOtherMatch[2]);
            if (
                !Number.isFinite(threatCount) ||
                threatCount < 1 ||
                filters.length === 0
            ) {
                return;
            }

            const stackClause =
                `${marker.phase}: Remove ${threatCount === 1 ? 'a' : threatCount} threat${threatCount > 1 ? 's' : ''} to stack your ${threatStackOtherMatch[2].trim()} on a site you control.`
                    .replace(/<[^>]+>/g, '')
                    .replace(/\s+/g, ' ')
                    .replace(/\s+\./g, '.')
                    .trim();

            abilities.push({
                id: `${cardId || 'ability'}:${abilities.length}`,
                phases,
                cost: [{ removeThreats: threatCount }],
                effects: [
                    {
                        type: 'STACK_ON_CONTROLLED_SITE',
                        target: [filters],
                    },
                ],
                source: 'SELF',
                text: stackClause,
            });
            return;
        }

        // « If stacked on a site you control, play this minion. Its/His twilight cost is -N. »
        const playFromStackMatch = bodyPlain.match(
            /^If stacked on a site you control,\s*play this minion\.?\s*(?:Its|His|Her) twilight cost is -(\d+)\.?$/i
        );
        if (playFromStackMatch) {
            const reduce = parseInt(playFromStackMatch[1], 10);
            if (!Number.isFinite(reduce) || reduce < 0) return;
            const playClause =
                `${marker.phase}: If stacked on a site you control, play this minion. Its twilight cost is -${reduce}.`
                    .replace(/\s+/g, ' ')
                    .trim();
            abilities.push({
                id: `${cardId || 'ability'}:${abilities.length}`,
                phases,
                cost: [],
                effects: [
                    { type: 'PLAY_FROM_STACK', twilightReduce: reduce },
                ],
                source: 'SELF',
                requiresStackedOnControlledSite: true,
                text: playClause,
            });
            return;
        }

        const discardMatch = body.match(
            /^Exert\s+([\s\S]+?)\s+to discard\s+([\s\S]+)/i
        );
        if (discardMatch) {
            if (/\b(and|or)\b/i.test(discardMatch[1])) return;
            const discardSubject = parseExertSubject(
                discardMatch[1],
                cardTitle,
                text
            );
            if (!discardSubject) return;

            if (isDiscardEveryAll(discardMatch[2])) {
                const discardClause =
                    `${marker.phase}: Exert ${discardMatch[1].trim()} to discard ${discardMatch[2]}`
                        .replace(/<[^>]+>/g, '')
                        .replace(/\s+/g, ' ')
                        .replace(/\s+\./g, '.')
                        .trim();
                abilities.push({
                    id: `${cardId || 'ability'}:${abilities.length}`,
                    phases,
                    cost: [
                        {
                            exert: [
                                {
                                    count: discardSubject.count,
                                    target: discardSubject.target,
                                    ...(discardSubject.mode
                                        ? { mode: discardSubject.mode }
                                        : {}),
                                },
                            ],
                        },
                    ],
                    effects: [
                        { type: 'DISCARD_ALL', target: [['CONDITION']] },
                    ],
                    source:
                        discardSubject.target === 'BEARER'
                            ? 'ATTACHMENT'
                            : 'SELF',
                    text: discardClause,
                });
                return;
            }

            const discardTarget = parseNounTarget(
                discardMatch[2],
                discardSubject.target,
                cardTitle
            );
            if (!discardTarget) return;
            if (
                effectTargetConflictsWithCost(
                    discardSubject.target,
                    discardTarget
                )
            ) {
                return;
            }

            const discardClause =
                `${marker.phase}: Exert ${discardMatch[1].trim()} to discard ${discardMatch[2]}`
                    .replace(/<[^>]+>/g, '')
                    .replace(/\s+/g, ' ')
                    .replace(/\s+\./g, '.')
                    .trim();

            abilities.push({
                id: `${cardId || 'ability'}:${abilities.length}`,
                phases,
                cost: [
                    {
                        exert: [
                            {
                                count: discardSubject.count,
                                target: discardSubject.target,
                                ...(discardSubject.mode
                                    ? { mode: discardSubject.mode }
                                    : {}),
                            },
                        ],
                    },
                ],
                effects: [
                    { type: 'DISCARD', count: 1, target: discardTarget },
                ],
                source:
                    discardSubject.target === 'BEARER'
                        ? 'ATTACHMENT'
                        : 'SELF',
                text: discardClause,
            });
            return;
        }

        // Spot X to add twilightN and exchange Y
        const spotTwilightExchangeMatch = body.match(
            /^Spot\s+([\s\S]+?)\s+to\s+add\s+<symbol>twilight(\d+)<\/symbol>\s+and\s+(exchange\s+[\s\S]+)/i
        );
        if (spotTwilightExchangeMatch) {
            if (/\b(and|or)\b/i.test(spotTwilightExchangeMatch[1])) return;
            const spotSubject = parseExertSubject(
                spotTwilightExchangeMatch[1],
                cardTitle,
                text
            );
            const twilight = parseInt(spotTwilightExchangeMatch[2], 10);
            const exchange = parseExchangeSiteEffect(
                spotTwilightExchangeMatch[3]
            );
            if (
                !spotSubject ||
                !exchange ||
                !Number.isFinite(twilight) ||
                twilight <= 0
            ) {
                return;
            }

            abilities.push({
                id: `${cardId || 'ability'}:${abilities.length}`,
                phases,
                cost: [
                    {
                        spot: [
                            {
                                count: spotSubject.count,
                                target: spotSubject.target,
                                ...(spotSubject.excludeSource
                                    ? { excludeSource: true }
                                    : {}),
                            },
                        ],
                    },
                ],
                effects: [
                    { type: 'ADD_TWILIGHT', count: twilight },
                    exchange,
                ],
                source: 'SELF',
                text: stripAbilityMarkup(
                    `${marker.phase}: Spot ${spotTwilightExchangeMatch[1].trim()} to add twilight${twilight} and ${spotTwilightExchangeMatch[3]}`
                )
                    .replace(/\s+/g, ' ')
                    .replace(/\s+\./g, '.')
                    .trim(),
            });
            return;
        }

        // Spot X to replace Y (events / special abilities)
        const spotReplaceMatch = body.match(
            /^Spot\s+([\s\S]+?)\s+to\s+(replace\s+[\s\S]+)/i
        );
        if (spotReplaceMatch) {
            if (/\b(and|or)\b/i.test(spotReplaceMatch[1])) return;
            const spotSubject = parseExertSubject(
                spotReplaceMatch[1],
                cardTitle,
                text
            );
            const effect = parseReplaceSiteEffect(spotReplaceMatch[2]);
            if (!spotSubject || !effect) return;

            const spotReplaceClause =
                `${marker.phase}: Spot ${spotReplaceMatch[1].trim()} to ${spotReplaceMatch[2]}`
                    .replace(/<[^>]+>/g, '')
                    .replace(/\s+/g, ' ')
                    .replace(/\s+\./g, '.')
                    .trim();

            abilities.push({
                id: `${cardId || 'ability'}:${abilities.length}`,
                phases,
                cost: [
                    {
                        spot: [
                            {
                                count: spotSubject.count,
                                target: spotSubject.target,
                                ...(spotSubject.excludeSource
                                    ? { excludeSource: true }
                                    : {}),
                            },
                        ],
                    },
                ],
                effects: [effect],
                source: 'SELF',
                text: spotReplaceClause,
            });
            return;
        }

        // Spot X and discard this (condition) to …
        const spotAndDiscardSelfMatch = body.match(
            /^Spot\s+([\s\S]+?)\s+and\s+discard\s+this(?:\s+(?:condition|possession|card))?\s+to\s+([\s\S]+)/i
        );
        if (spotAndDiscardSelfMatch) {
            if (/\b(and|or)\b/i.test(spotAndDiscardSelfMatch[1])) return;
            const spotSubject = parseExertSubject(
                spotAndDiscardSelfMatch[1],
                cardTitle,
                text
            );
            const effect =
                parseForceChooseMoveAgainEffect(spotAndDiscardSelfMatch[2]) ||
                parseTakeControlSiteEffect(spotAndDiscardSelfMatch[2]) ||
                parseLiberateSiteEffect(spotAndDiscardSelfMatch[2]) ||
                parseDiscardToEffect(spotAndDiscardSelfMatch[2], cardTitle);
            if (!spotSubject || !effect) return;
            if (
                spotSubject.target !== 'SELF' &&
                spotSubject.target !== 'BEARER' &&
                !Array.isArray(spotSubject.target)
            ) {
                return;
            }

            const clause =
                `${marker.phase}: Spot ${spotAndDiscardSelfMatch[1].trim()} and discard this condition to ${spotAndDiscardSelfMatch[2]}`
                    .replace(/<[^>]+>/g, '')
                    .replace(/\s+/g, ' ')
                    .replace(/\s+\./g, '.')
                    .trim();

            abilities.push({
                id: `${cardId || 'ability'}:${abilities.length}`,
                phases,
                cost: [
                    {
                        spot: [
                            {
                                count: spotSubject.count,
                                target: spotSubject.target,
                                ...(spotSubject.excludeSource
                                    ? { excludeSource: true }
                                    : {}),
                            },
                        ],
                        discardFromPlay: [{ count: 1, target: 'SELF' }],
                    },
                ],
                effects: [effect],
                source: 'SELF',
                text: clause,
            });
            return;
        }

        // Spot X and exert Y to liberate / …
        const spotAndExertMatch = body.match(
            /^Spot\s+([\s\S]+?)\s+and\s+exert\s+([\s\S]+?)\s+to\s+([\s\S]+)/i
        );
        if (spotAndExertMatch) {
            if (/\b(and|or)\b/i.test(spotAndExertMatch[1])) return;
            if (/\b(and|or)\b/i.test(spotAndExertMatch[2])) return;
            const spotSubject = parseExertSubject(
                spotAndExertMatch[1],
                cardTitle,
                text
            );
            const exertSubject = parseExertSubject(
                spotAndExertMatch[2],
                cardTitle,
                text
            );
            const effect =
                parseLiberateSiteEffect(spotAndExertMatch[3]) ||
                parseTakeControlSiteEffect(spotAndExertMatch[3]) ||
                parseDiscardToEffect(spotAndExertMatch[3], cardTitle);
            if (!spotSubject || !exertSubject || !effect) return;

            const clause =
                `${marker.phase}: Spot ${spotAndExertMatch[1].trim()} and exert ${spotAndExertMatch[2].trim()} to ${spotAndExertMatch[3]}`
                    .replace(/<[^>]+>/g, '')
                    .replace(/\s+/g, ' ')
                    .replace(/\s+\./g, '.')
                    .trim();

            abilities.push({
                id: `${cardId || 'ability'}:${abilities.length}`,
                phases,
                cost: [
                    {
                        spot: [
                            {
                                count: spotSubject.count,
                                target: spotSubject.target,
                                ...(spotSubject.excludeSource
                                    ? { excludeSource: true }
                                    : {}),
                            },
                        ],
                        exert: [
                            {
                                count: exertSubject.count,
                                target: exertSubject.target,
                                ...(exertSubject.mode
                                    ? { mode: exertSubject.mode }
                                    : {}),
                            },
                        ],
                    },
                ],
                effects: [effect],
                source:
                    exertSubject.target === 'BEARER' ? 'ATTACHMENT' : 'SELF',
                text: clause,
            });
            return;
        }

        // Discard this and exert X to liberate / …
        const discardSelfAndExertMatch = body.match(
            /^Discard\s+this(?:\s+(?:condition|possession|card))?\s+and\s+exert\s+([\s\S]+?)\s+to\s+([\s\S]+)/i
        );
        if (discardSelfAndExertMatch) {
            if (/\b(and|or)\b/i.test(discardSelfAndExertMatch[1])) return;
            const exertSubject = parseExertSubject(
                discardSelfAndExertMatch[1],
                cardTitle,
                text
            );
            const effect =
                parseLiberateSiteEffect(discardSelfAndExertMatch[2]) ||
                parseTakeControlSiteEffect(discardSelfAndExertMatch[2]) ||
                parseDiscardToEffect(discardSelfAndExertMatch[2], cardTitle);
            if (!exertSubject || !effect) return;

            const clause =
                `${marker.phase}: Discard this and exert ${discardSelfAndExertMatch[1].trim()} to ${discardSelfAndExertMatch[2]}`
                    .replace(/<[^>]+>/g, '')
                    .replace(/\s+/g, ' ')
                    .replace(/\s+\./g, '.')
                    .trim();

            abilities.push({
                id: `${cardId || 'ability'}:${abilities.length}`,
                phases,
                cost: [
                    {
                        discardFromPlay: [{ count: 1, target: 'SELF' }],
                        exert: [
                            {
                                count: exertSubject.count,
                                target: exertSubject.target,
                                ...(exertSubject.mode
                                    ? { mode: exertSubject.mode }
                                    : {}),
                            },
                        ],
                    },
                ],
                effects: [effect],
                source: 'SELF',
                text: clause,
            });
            return;
        }

        // Spot X to discard Y (events / special abilities)
        const spotDiscardMatch = body.match(
            /^Spot\s+([\s\S]+?)\s+to discard\s+([\s\S]+)/i
        );
        if (spotDiscardMatch) {
            if (/\b(and|or)\b/i.test(spotDiscardMatch[1])) return;
            const spotSubject = parseExertSubject(
                spotDiscardMatch[1],
                cardTitle,
                text
            );
            if (!spotSubject) return;
            const discardTarget = parseNounTarget(
                spotDiscardMatch[2],
                [['']],
                cardTitle
            );
            if (!discardTarget || !Array.isArray(discardTarget)) return;

            const spotDiscardClause =
                `${marker.phase}: Spot ${spotDiscardMatch[1].trim()} to discard ${spotDiscardMatch[2]}`
                    .replace(/<[^>]+>/g, '')
                    .replace(/\s+/g, ' ')
                    .replace(/\s+\./g, '.')
                    .trim();

            abilities.push({
                id: `${cardId || 'ability'}:${abilities.length}`,
                phases,
                cost: [
                    {
                        spot: [
                            {
                                count: spotSubject.count,
                                target: spotSubject.target,
                                ...(spotSubject.mode
                                    ? { mode: spotSubject.mode }
                                    : {}),
                            },
                        ],
                    },
                ],
                effects: [
                    { type: 'DISCARD', count: 1, target: discardTarget },
                ],
                source: 'SELF',
                text: spotDiscardClause,
            });
            return;
        }

        const discardAndSpotMatch = body.match(
            /^Discard\s+([\s\S]+?)\s+and\s+spot\s+([\s\S]+?)\s+to\s+([\s\S]+)/i
        );
        if (discardAndSpotMatch) {
            const discardTarget = parseNounTarget(
                discardAndSpotMatch[1],
                [['']],
                cardTitle
            );
            const spotSubject = parseExertSubject(
                discardAndSpotMatch[2],
                cardTitle,
                text
            );
            const effect = parseCountFromSpotEffect(discardAndSpotMatch[3]);
            if (
                !discardTarget ||
                !spotSubject ||
                !Array.isArray(spotSubject.target) ||
                !effect
            ) {
                return;
            }

            const discardAndSpotClause =
                `${marker.phase}: Discard ${discardAndSpotMatch[1].trim()} and spot ${discardAndSpotMatch[2].trim()} to ${discardAndSpotMatch[3]}`
                    .replace(/<[^>]+>/g, '')
                    .replace(/\s+/g, ' ')
                    .replace(/\s+\./g, '.')
                    .trim();

            const discardCost =
                discardTarget === 'SELF' || discardTarget === 'BEARER'
                    ? { count: 1, target: discardTarget }
                    : Array.isArray(discardTarget)
                      ? {
                            count: 1,
                            target: discardTarget,
                            mode: 'DESIGNATION' as const,
                        }
                      : null;
            if (!discardCost) return;

            abilities.push({
                id: `${cardId || 'ability'}:${abilities.length}`,
                phases,
                cost: [
                    {
                        discardFromPlay: [discardCost],
                        spot: [
                            {
                                count: spotSubject.count,
                                target: spotSubject.target,
                            },
                        ],
                    },
                ],
                effects: [effect],
                source: 'SELF',
                text: discardAndSpotClause,
            });
            return;
        }

        const discardToMatch = body.match(
            /^Discard\s+([\s\S]+?)\s+to\s+([\s\S]+)/i
        );
        if (discardToMatch) {
            const discardTarget = parseNounTarget(
                discardToMatch[1],
                [['']],
                cardTitle
            );
            const effect = parseDiscardToEffect(
                discardToMatch[2],
                cardTitle
            );
            if (!discardTarget || !effect) return;

            const discardToClause =
                `${marker.phase}: Discard ${discardToMatch[1].trim()} to ${discardToMatch[2]}`
                    .replace(/<[^>]+>/g, '')
                    .replace(/\s+/g, ' ')
                    .replace(/\s+\./g, '.')
                    .trim();

            const discardCost =
                discardTarget === 'SELF' || discardTarget === 'BEARER'
                    ? { count: 1, target: discardTarget }
                    : {
                          count: 1,
                          target: discardTarget,
                          mode: 'DESIGNATION' as const,
                      };

            abilities.push({
                id: `${cardId || 'ability'}:${abilities.length}`,
                phases,
                cost: [{ discardFromPlay: [discardCost] }],
                effects: [effect],
                source: 'SELF',
                text: discardToClause,
            });
            return;
        }

        const discardBareMatch = body.match(/^Discard\s+([\s\S]+)/i);
        if (discardBareMatch) {
            const discardTarget = parseNounTarget(
                discardBareMatch[1],
                [['']],
                cardTitle
            );
            if (!discardTarget || !Array.isArray(discardTarget)) return;

            const discardBareClause =
                `${marker.phase}: Discard ${discardBareMatch[1]}`
                    .replace(/<[^>]+>/g, '')
                    .replace(/\s+/g, ' ')
                    .replace(/\s+\./g, '.')
                    .trim();

            abilities.push({
                id: `${cardId || 'ability'}:${abilities.length}`,
                phases,
                cost: [],
                effects: [
                    { type: 'DISCARD', count: 1, target: discardTarget },
                ],
                source: 'SELF',
                text: discardBareClause,
            });
            return;
        }

        const cancelSkirmishMatch = body.match(
            /^Exert\s+([\s\S]+?)\s+to cancel a skirmish involving\s+([\s\S]+)/i
        );
        if (cancelSkirmishMatch) {
            if (/\b(and|or)\b/i.test(cancelSkirmishMatch[1])) return;
            const subject = parseExertSubject(
                cancelSkirmishMatch[1],
                cardTitle,
                text
            );
            if (!subject) return;

            const involvingChunk = cancelSkirmishMatch[2];
            const involvingSentence = involvingChunk.split(/\./)[0] || '';
            const leftoverAfterDot = involvingChunk
                .slice(involvingSentence.length)
                .replace(/^\./, '')
                .trim();
            if (!isOnlyShadowPreventClause(leftoverAfterDot)) return;

            const involving = parseCancelInvolving(
                involvingSentence,
                subject.target,
                cardTitle
            );
            if (!involving) return;

            const shadowMayPrevent =
                parseShadowMayPrevent(leftoverAfterDot) || undefined;

            const cancelClause =
                `${marker.phase}: Exert ${cancelSkirmishMatch[1].trim()} to cancel a skirmish involving ${involvingSentence.trim()}`
                    .replace(/<[^>]+>/g, '')
                    .replace(/\s+/g, ' ')
                    .replace(/\s+\./g, '.')
                    .trim();

            abilities.push({
                id: `${cardId || 'ability'}:${abilities.length}`,
                phases,
                cost: [
                    {
                        exert: [
                            {
                                count: subject.count,
                                target: subject.target,
                                ...(subject.mode
                                    ? { mode: subject.mode }
                                    : {}),
                            },
                        ],
                    },
                ],
                effects: [
                    {
                        type: 'CANCEL_SKIRMISH',
                        involving,
                        ...(shadowMayPrevent
                            ? { shadowMayPrevent }
                            : {}),
                    },
                ],
                source:
                    subject.target === 'BEARER' ? 'ATTACHMENT' : 'SELF',
                text: cancelClause,
            });
            return;
        }

        const woundMatch = body.match(
            /^Exert\s+([\s\S]+?)\s+to wound\s+([\s\S]+)/i
        );
        if (!woundMatch) return;
        if (/\b(and|or)\b/i.test(woundMatch[1])) return;

        const woundSubject = parseExertSubject(woundMatch[1], cardTitle, text);
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
            phases,
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

    parseForEachStrengthAbilities(text, cardTitle, cardId).forEach(
        (ability) => {
            abilities.push({
                ...ability,
                id: `${cardId || 'ability'}:${abilities.length}`,
            });
        }
    );

    parseEachTimeYouPlayAbilities(text, cardId).forEach((ability) => {
        abilities.push({
            ...ability,
            id: `${cardId || 'ability'}:${abilities.length}`,
        });
    });

    parseEachTimeTakeControlSiteAbilities(text, cardTitle, cardId).forEach(
        (ability) => {
            abilities.push({
                ...ability,
                id: `${cardId || 'ability'}:${abilities.length}`,
            });
        }
    );

    parseWinsSkirmishStackOnSiteAbilities(text, cardTitle, cardId).forEach(
        (ability) => {
            abilities.push({
                ...ability,
                id: `${cardId || 'ability'}:${abilities.length}`,
            });
        }
    );

    parseWhileNoOpponentControlsStrengthAbilities(
        text,
        cardTitle,
        cardId
    ).forEach((ability) => {
        abilities.push({
            ...ability,
            id: `${cardId || 'ability'}:${abilities.length}`,
        });
    });

    parseWhileSpotStrengthAbilities(text, cardTitle, cardId).forEach(
        (ability) => {
            abilities.push({
                ...ability,
                id: `${cardId || 'ability'}:${abilities.length}`,
            });
        }
    );

    parseWhileAtSiteStrengthAbilities(text, cardTitle, cardId).forEach(
        (ability) => {
            abilities.push({
                ...ability,
                id: `${cardId || 'ability'}:${abilities.length}`,
            });
        }
    );

    parseWhileAtSiteKeywordAbilities(text, cardTitle, cardId).forEach(
        (ability) => {
            abilities.push({
                ...ability,
                id: `${cardId || 'ability'}:${abilities.length}`,
            });
        }
    );

    parseWhileSpotSiteEachKeywordAbilities(text, cardId).forEach((ability) => {
        abilities.push({
            ...ability,
            id: `${cardId || 'ability'}:${abilities.length}`,
        });
    });

    parseWhileSpotEachStrengthAbilities(text, cardId).forEach((ability) => {
        abilities.push({
            ...ability,
            id: `${cardId || 'ability'}:${abilities.length}`,
        });
    });

    parseWhileSpotKeywordAbilities(text, cardTitle, cardId).forEach(
        (ability) => {
            abilities.push({
                ...ability,
                id: `${cardId || 'ability'}:${abilities.length}`,
            });
        }
    );

    parseWhileSpotEachKeywordAbilities(text, cardId).forEach((ability) => {
        abilities.push({
            ...ability,
            id: `${cardId || 'ability'}:${abilities.length}`,
        });
    });

    parseWhileSkirmishingStrengthAbilities(text, cardTitle, cardId).forEach(
        (ability) => {
            abilities.push({
                ...ability,
                id: `${cardId || 'ability'}:${abilities.length}`,
            });
        }
    );

    parseWhileBearingAbilities(text, cardTitle, cardId).forEach((ability) => {
        abilities.push({
            ...ability,
            id: `${cardId || 'ability'}:${abilities.length}`,
        });
    });

    parseWhileSkipArcheryAbilities(text, cardId).forEach((ability) => {
        abilities.push({
            ...ability,
            id: `${cardId || 'ability'}:${abilities.length}`,
        });
    });

    parseWhileCannotReplaceSiteAbilities(text, cardId).forEach((ability) => {
        abilities.push({
            ...ability,
            id: `${cardId || 'ability'}:${abilities.length}`,
        });
    });

    if (markers.length === 0) {
        parseStandaloneSpotTwilightExchangeAbilities(
            text,
            cardTitle,
            cardId
        ).forEach((ability) => {
            abilities.push({
                ...ability,
                id: `${cardId || 'ability'}:${abilities.length}`,
            });
        });
        parseStandaloneSpotReplaceAbilities(text, cardTitle, cardId).forEach(
            (ability) => {
                abilities.push({
                    ...ability,
                    id: `${cardId || 'ability'}:${abilities.length}`,
                });
            }
        );
    }

    return abilities.length > 0 ? abilities : undefined;
}
