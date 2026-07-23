import React from 'react';
import styled from 'styled-components';
import { CultureIcon } from './styles';

const TextWrapper = styled.p`
    white-space: pre-line; /* Rend les \n fonctionnels automatiquement */
`;

const BoldText = styled.strong`
    font-weight: bold;
`;

interface FormattedTextProps {
    text: string;
}

export const FormattedText: React.FC<FormattedTextProps> = ({ text }) => {
    // 1. On découpe la chaîne globale selon les tokens {CULTURE_...} et le **gras**
    // La Regex capture à la fois {CULTURE_XXX} et les blocs **chaine**
    const tokens = text.split(/(\{CULTURE_[A-Z_]+\}|\*\*[^*]+\*\*)/g);

    return (
        <TextWrapper>
            {tokens.map((token, index) => {
                // A. CAS : TOKEN DE CULTURE / PICTO
                if (token.startsWith('{CULTURE_') && token.endsWith('}')) {
                    const cultureKey = token.replace('{CULTURE_', '').replace('}', '');
                    return <CultureIcon key={index} $culture={cultureKey} title={cultureKey} />;
                }

                // B. CAS : TEXTE EN GRAS (**mot**)
                if (token.startsWith('**') && token.endsWith('**')) {
                    const cleanText = token.slice(2, -2);
                    return <BoldText key={index}>{cleanText}</BoldText>;
                }

                // C. CAS : TEXTE NORMAL (avec \n géré par white-space: pre-line)
                return <span key={index}>{token}</span>;
            })}
        </TextWrapper>
    );
};