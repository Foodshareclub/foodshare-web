import {ChangeEvent} from "react";

type CreatePhotoUrl = {
    file: File
    filePath: string
    url: string
}

export const createPhotoUrl = (event: ChangeEvent<HTMLInputElement>) => {
    let file, filePath, url;
    if (event.target.files) {
        file = event.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        filePath = `${fileName}`;
        url = URL.createObjectURL(file);
    }

    return {file, filePath, url} as CreatePhotoUrl;
}