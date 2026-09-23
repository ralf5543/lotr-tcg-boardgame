import React from 'react';
import styled from 'styled-components';
import { CultureIcon, TwilightIcon } from './styles';

const TextWrapper = styled.span`
    white-space: pre-line; /* Rend les \n fonctionnels automatiquement */
`;

const BoldText = styled.strong`
    font-weight: bold;
`;

const ItalicText = styled.em`
    font-style: italic;
`;

interface FormattedTextProps {
    text: string;
}

/** CSV / JSON : `urukhai` → URUK-HAI (clé police / styles). */
function normalizeCultureSymbol(raw: string): string {
    const key = raw.trim().toUpperCase().replace(/\s+/g, '-');
    if (key === 'URUKHAI') return 'URUK-HAI';
    if (key === 'ONERING' || key === 'ONE-RING') return 'ONE-RING';
    if (key === 'RAITH') return 'WRAITH';
    return key;
}

export const FormattedText: React.FC<FormattedTextProps> = ({ text }) => {
    // Si text est undefined, null ou pas une chaîne, on utilise une chaîne vide
    const safeText = text || '';

    // Symboles, gras Markdown, italique HTML (<i>…</i>)
    const tokens = safeText.split(
        /(<symbol>[^<]+<\/symbol>|\*\*[^*]+\*\*|<i>[\s\S]*?<\/i>)/gi
    );

    return (
        <TextWrapper>
            {tokens.map((token, index) => {
                // A. CAS : BALISE <symbol>...</symbol>
                if (/^<symbol>[^<]+<\/symbol>$/i.test(token)) {
                    const rawSymbol = token.replace(/<\/?symbol>/gi, '').trim();

                    // A.1 Symbole de Crépuscule : ex. "twilight1", "twilight2", "twilightX"
                    if (rawSymbol.toLowerCase().startsWith('twilight')) {
                        const amount = rawSymbol.slice(8); // Extrait "1", "2", "X", etc.
                        return (
                            <TwilightIcon
                                key={index}
                                $amount={amount}
                                title={`Twilight ${amount}`}
                            />
                        );
                    }

                    // A.2 Symbole de Culture : ex. "gondor", "rohan", "urukhai"
                    const cultureKey = normalizeCultureSymbol(rawSymbol);
                    return (
                        <CultureIcon
                            key={index}
                            $culture={cultureKey}
                            title={cultureKey}
                        />
                    );
                }

                // B. CAS : TEXTE EN GRAS (**mot**)
                if (token.startsWith('**') && token.endsWith('**')) {
                    const cleanText = token.slice(2, -2);
                    return <BoldText key={index}>{cleanText}</BoldText>;
                }

                // C. CAS : ITALIQUE HTML (<i>…</i>) — rappels de règles, etc.
                if (/^<i>[\s\S]*<\/i>$/i.test(token)) {
                    const cleanText = token.replace(/<\/?i>/gi, '');
                    return <ItalicText key={index}>{cleanText}</ItalicText>;
                }

                // D. CAS : TEXTE NORMAL
                return <span key={index}>{token}</span>;
            })}
        </TextWrapper>
    );
};
