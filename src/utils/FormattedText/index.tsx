import React from 'react';
import styled from 'styled-components';
import { CultureIcon, TwilightIcon } from './styles';

const TextWrapper = styled.span`
    white-space: pre-line; /* Rend les \n fonctionnels automatiquement */
`;

const BoldText = styled.strong`
    font-weight: bold;
`;

interface FormattedTextProps {
    text: string;
}

export const FormattedText: React.FC<FormattedTextProps> = ({ text }) => {
    // La Regex capture {CULTURE_...}, {TWILIGHT_...} (y compris {TWILIGHT_x}) et le **gras**
    const tokens = text.split(/(\{CULTURE_[^}]+\}|\{TWILIGHT_[^}]+\}|\*\*[^*]+\*\*)/g);

    return (
        <TextWrapper>
            {tokens.map((token, index) => {
                // A. CAS : TOKEN DE CULTURE / PICTO
                if (token.startsWith('{CULTURE_') && token.endsWith('}')) {
                    const cultureKey = token.replace('{CULTURE_', '').replace('}', '');
                    return <CultureIcon key={index} $culture={cultureKey} title={cultureKey} />;
                }

                // B. CAS : TOKEN DE CRÉPUSCULE / TWILIGHT
                if (token.startsWith('{TWILIGHT_') && token.endsWith('}')) {
                    const twilightKey = token.replace('{TWILIGHT_', '').replace('}', '');
                    return <TwilightIcon key={index} $amount={twilightKey} title={twilightKey} />;
                }

                // C. CAS : TEXTE EN GRAS (**mot**)
                if (token.startsWith('**') && token.endsWith('**')) {
                    const cleanText = token.slice(2, -2);
                    return <BoldText key={index}>{cleanText}</BoldText>;
                }

                // D. CAS : TEXTE NORMAL
                return <span key={index}>{token}</span>;
            })}
        </TextWrapper>
    );
};