import { ChangeEvent } from "react";

export const savePhotoOnServer = async (event: ChangeEvent<HTMLInputElement>) => {
  try {
    const formData = new FormData();
    if (event.target.files !== null){
      const file = event.target.files[0];
        formData.append("image", file);
        const url = URL.createObjectURL(file)
        // const  data  = await UserApi.updateUserFile(formData);
        //console.log(data.data.url);
        console.log(url)
      return url
        // return data.data.url;
    }
  } catch (e) {
    console.warn(e);
    alert("Ошибка при загрузке файла");
  }
};