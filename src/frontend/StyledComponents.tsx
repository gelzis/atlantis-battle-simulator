import styled, {CSSProp} from 'styled-components'; // eslint-disable-line @typescript-eslint/no-unused-vars
import {AppBar, createTheme, Paper, Typography} from '@material-ui/core';

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace JSX {
        interface IntrinsicAttributes {
            css?: CSSProp
        }
    }
}

export const theme = createTheme({
    props: {
        MuiTypography: {
            variantMapping: {
                h1: 'h1',
                h2: 'h2',
                h3: 'h4',
                h4: 'h4',
                h5: 'h4',
                h6: 'h4',
                subtitle1: 'h2',
                subtitle2: 'h2',
                body1: 'span',
                body2: 'span',
            },
        },
    },
});

export const StyledAppBar = styled(AppBar)`
  margin-bottom: ${theme.spacing(4)}px;
`;

export const StyledPaper = styled(Paper)`
  padding: 10px;
  margin-bottom: ${theme.spacing(2)}px;
  position: relative;
`;

export const StyledPadlessPaper = styled(StyledPaper)`
  padding: 0;
`;

export const StyledHeading = styled(Typography)`
  margin: ${theme.spacing(2)}px 0;
`;

export const StyledSideHeading = styled(Typography)`
  margin-bottom: ${theme.spacing(1)}px;
`;

export const Formation = styled.div`
  display: flex;
  gap: ${theme.spacing(2)}px;
  margin-bottom: ${theme.spacing(2)}px;
`;

export const FormationItem = styled.div`
  
`;
