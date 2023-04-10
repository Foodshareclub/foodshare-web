import {extendTheme} from "@chakra-ui/react";

const breakpoints = {
    sm: '320px',
    "ss":"500px",
    "mm":"550px",
    md: '768px',
    lg: '960px',
    xl: '1200px',
    '2xl': '1536px',
}
export const theme = extendTheme({ breakpoints })