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
            if (VALID_KEYWORDS.has(rawKw)) {
                granted.add(rawKw);
            }
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
        // --- B. Embuscade (Ambush X) ---
        const ambushRegex =
            /<keyword>Ambush<\/keyword>\s*<symbol>twilight(\d+)<\/symbol>/gi;
        let ambushMatch;
        while ((ambushMatch = ambushRegex.exec(text)) !== null) {
            const cost = ambushMatch[1];
            const kw = `AMBUSH ${cost}`;
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

    if (type === 'COMPANION') {
        const isRingbound = keywords.includes('RING-BOUND');
        if (!isRingbearer && !isRingbound && !keywords.includes('UNBOUND')) {
            keywords.push('UNBOUND');
        }
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

    if (englishText) {
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
export function parseAttachedTo(text?: string, type?: string): string[][] | null {
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