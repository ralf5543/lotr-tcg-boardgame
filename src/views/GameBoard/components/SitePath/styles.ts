import styled from 'styled-components';

export const SitespathContainer = styled.section`
        position: absolute;
    inset-block-start: 75px;
    inset-block-end: 50px;
    inset-inline-start: 20px;
    padding: 12px;
    background: rgb(26, 29, 36);
    border-radius: 8px;
    width: 360px;
`;

export const SitesGrid = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 24px;
`;

export const SiteCard = styled.div<{ $isCurrent: boolean, $site: boolean }>`
  position: relative;
  width: 100%;
  aspect-ratio: 4 / 1;
  borderRadius: 6px;
  border: ${(props) =>
      (props.$isCurrent ?? true) ? '2px solid #e2c044' : '1px dashed #444'};
  background: ${(props) =>
        (props.$site ?? true)
            ? '2px solid #e2c044'
            : '1px dashed #444'};
  display: flex;
  flexDirection: column;
  justifyContent: space-between;
  padding: 6px;
  boxShadow: isCurrent ? '0 0 10px rgba(226, 192, 68, 0.4)' : 'none';
  background-image: ${(props) =>
      (props.$isCurrent ?? true) ? '0 0 10px rgba(226, 192, 68, 0.4)' : 'none'};
`;

export const SiteToken = styled.span`
    position: absolute,
    top: -10px,
    left: 50%,
    transform: translateX(-50%),
    width: 20px,
    height: 20px,
    borderRadius: 50%,
    background: #e2c044,
    border: 2px solid #fff,
    boxShadow: 0 2px 4px rgba(0,0,0,0.5),
    zIndex: 2,
`;



