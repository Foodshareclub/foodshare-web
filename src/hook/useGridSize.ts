import {useMediaQuery} from "@/hook/index";

export const useGridSize = (): number | undefined => {
    const isSmallerThan550 = useMediaQuery('(min-width:550px)');
    const isSmallerThan700 = useMediaQuery('(min-width:700px)');
    const isSmallerThan1128 = useMediaQuery('(min-width:1128px)');
    const isSmallerThan1640 = useMediaQuery('(min-width:1640px)');
    const isSmallerThan1880 = useMediaQuery('(min-width:1880px)');

    if (isSmallerThan1880) {
        return 6;
    }if (isSmallerThan1640) {
        return 5;
    }if (isSmallerThan1128) {
        return 4;
    }
    if (isSmallerThan700) {
        return 3;
    }
    if (isSmallerThan550) {
        return 2;
    }
};