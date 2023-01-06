import {ChangeEvent} from "react";

export const savePhotoOnServer = async (event: ChangeEvent<HTMLInputElement>) => {
    try {
        console.log(event.target.files)
        const formData = new FormData();
        if (!event.target.files?.length) return
        const file = event.target.files[0];
        formData.append("image", file);

        return URL.createObjectURL(file)
    } catch (e) {
        console.warn(e);
        alert("Ошибка при загрузке файла");
    }
};