import * as S from './styles';

interface PlayerNumber {
    value: string;
}

export const TokenPlayer: React.FC<PlayerNumber> = ({ value }) => {

    return (
        <S.Token $value={value}>
            <S.Avatar src='avatars/avatar_small.webp' />
        </S.Token>
    );
};
