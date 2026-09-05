import styled, {CSSProp} from 'styled-components'; // eslint-disable-line @typescript-eslint/no-unused-vars
import {AppBar, createTheme, Paper, Typography} from '@mui/material';

declare module 'react' {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace JSX {
        interface IntrinsicAttributes {
            css?: CSSProp
        }
    }
}

export const theme = createTheme({
    components: {
        MuiTypography: {
            defaultProps: {
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
    },
});

export const StyledAppBar = styled(AppBar)`
  margin-bottom: ${theme.spacing(4)};
`;

export const StyledPaper = styled(Paper)`
  padding: 10px;
  margin-bottom: ${theme.spacing(2)};
  position: relative;
`;

export const StyledPadlessPaper = styled(StyledPaper)`
  padding: 0;
`;

export const StyledHeading = styled(Typography)`
  margin: ${theme.spacing(2)} 0;
`;

export const StyledSideHeading = styled(Typography)`
  margin-bottom: ${theme.spacing(1)};
`;
