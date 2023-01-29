import {useMediaQuery} from "@/hook/index";

export const useGridSize = (): number | undefined => {
    const isSmallerThan500 = useMediaQuery('(min-width:500px)');
    const isSmallerThan700 = useMediaQuery('(min-width:700px)');
    const isSmallerThan1290 = useMediaQuery('(min-width:1290px)');

    if (isSmallerThan1290) {
        return 5;
    }
    if (isSmallerThan700) {
        return 4;
    }
    if (isSmallerThan500) {
        return 2;
    }
};