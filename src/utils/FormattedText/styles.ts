import styled from 'styled-components';

export const CultureIcon = styled.span<{ $culture: string }>`
    font-family: 'LOTRSymbols';
    transform: translateY(0.13em);
    display: inline-block;

    &::before {
        content: ${({ $culture }) => {
            switch ($culture) {
                case 'ELVEN': return '"*"';
                case 'DWARVEN': return '"@"';
                case 'SHIRE': return '"#"';
                case 'GANDALF': return '"$"';
                case 'GONDOR': return '"%"';
                case 'ROHAN': return '"["';
                case 'GOLLUM': return '"¢"';
                case 'MORIA': return '"{"';
                case 'ISENGARD': return '"^"';
                case 'RAITH': return '"]"';
                case 'URUK-HAI': return '"_"';
                case 'SAURON': return '"|"';
                case 'DUNLAND': return '"~"';
                case 'RAIDER': return '"}"';
                case 'ORC': return '"`"';
                case 'MEN': return '"&"';
                case 'ONE-RING': return '"="';
                default: return '""';
            }
        }};
    }
`;

export const TwilightIcon = styled.span<{ $amount: string }>`
    font-family: 'LOTRSymbols';
    transform: translateY(0.2em);
    font-size: 1.1em;
    display: inline-block;

    &::before {
        content: ${({ $amount }) => {
            const key = String($amount).trim().toLowerCase();
            switch (key) {
                case '1': return '"¤"';
                case '2': return '"¥"';
                case '3': return '"¦"';
                case '4': return '"§"';
                case '5': return '"¨"';
                case '6': return '"ª"';
                case '7': return '"­"';
                case '8': return '"¯"';
                case '9': return '"°"';
                case 'x': return '"£"';
                default: return '""';
            }
        }};
    }
`;