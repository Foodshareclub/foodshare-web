import {ChangeEvent} from "react";

export const createPhotoUrl = (event: ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files?.length) return
        const file = event.target.files[0];
        return URL.createObjectURL(file)
};