import {ChangeEvent, useCallback, useRef, useState} from "react";
import {Button} from "@chakra-ui/react";
import {convertFileToBase64} from "@/utils/convertFileToBase64";
import {profileAPI} from "@/api";
import {useAppSelector} from "@/hook";
import {AllValuesType} from "@/api/profileAPI";
import {createPhotoUrl} from "@/utils";
import {supabase} from "@/supaBase.config";




export const FileInput = () => {
    const inputFileRef = useRef<HTMLInputElement | null>(null)
    const [ava, setAva] = useState('')
    const [isAvaBroken, setIsAvaBroken] = useState(false)
    const value = useAppSelector<AllValuesType>(state => state.user.value);
    
    const uploadHandler = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
        const {filePath} = createPhotoUrl(e);
        if (e.target.files && e.target.files.length) {
            console.log(e.target.files)
            const file = e.target.files[0]
            console.log(file.size,'file.size')
            if (file.size < 4000000) {
                convertFileToBase64(file, (file64: string) => {
                    //console.log(file64)
                    setAva(file64)
                    supabase.storage.from(`avatars/${value.id}`).upload(filePath, file64,{upsert:true}).then(res=>console.log(res))
                })
            } else {
                console.error('Error: ', 'Файл слишком большого размера')
            }
        }
    }, [value.id])

    const errorHandler = () => {
        setIsAvaBroken(true)
        alert('Кривая картинка')
    }

    return (
        <div style={{marginLeft: '4%'}}>
            <img
                src={isAvaBroken ? "" : ava}
                onError={errorHandler}
                alt="ava"
            />
            <label>
                <input type="file"
                       onChange={uploadHandler}
                       style={{display: 'none'}}
                       ref={inputFileRef}
                />
                <Button
                    onClick={() => inputFileRef?.current?.click()}
                >change</Button>
            </label>
        </div>
    )
}