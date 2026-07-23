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
                case 'RINGWRAITH': return '"]"';
                case 'URUK-HAI': return '"_"';
                case 'SAURON': return '"|"';
                case 'DUNLAND': return '"~"';
                case 'RAIDER': return '"}"';
                case 'ORC': return '"`"';
                case 'men': return '"&"';
                case 'ONE-RING': return '"="';
                default: return '""';
            }
        }};
    }
`;