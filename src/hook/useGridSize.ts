import {useMediaQuery} from "@/hook/index";

export const useGridSize = (): number | undefined => {
    const isSmallerThan550 = useMediaQuery('(min-width:550px)');
    const isSmallerThan700 = useMediaQuery('(min-width:700px)');
    const isSmallerThan1290 = useMediaQuery('(min-width:1290px)');

    if (isSmallerThan1290) {
        return 4;
    }
    if (isSmallerThan700) {
        return 3;
    }
    if (isSmallerThan550) {
        return 2;
    }
};