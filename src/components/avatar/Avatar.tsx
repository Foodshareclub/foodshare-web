import React, {ChangeEvent, useEffect, useState} from 'react'
import {downloadImgFromDBTC} from "../../store/slices/userReducer";
import {useAppDispatch, useAppSelector} from "../../hook/hooks";

type PropsType = {
    url: string | null
    size: number
    uploading: boolean
    onUpload: (filePath: string, url: string, file: File) => void
}

const Avatar: React.FC<PropsType> = ({url, size, uploading, onUpload}) => {
    const dispatch = useAppDispatch()
    const [pastUrl, setPastUrl] = useState<string | undefined>("")
    useEffect(() => {
        if (url) {
            dispatch(downloadImgFromDBTC({dir: "avatars", imgUrl: url})).unwrap().then(res => setPastUrl(res))
        }
    }, [])
    const imgUrl = useAppSelector(state => state.user.imgUrl);

    const uploadAvatar = (event: ChangeEvent<HTMLInputElement>) => {

        if (!event.target.files || event.target.files.length === 0) return
        const file = event.target.files[0]
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `${fileName}`
        const url = URL.createObjectURL(file)
        onUpload(filePath, url, file)
        setPastUrl(url)
    }

    return (
        <div style={{width: size}} aria-live="polite">
            <img
                src={pastUrl ? pastUrl : `https://place-hold.it/${size}x${size}`}
                alt={pastUrl ? 'Avatar' : 'No image'}
                style={{height: size, width: size}}
            />
            <div className="visually-hidden">
                <input
                    type="file"
                    id="single"
                    accept="image/*"
                    onChange={uploadAvatar}
                    disabled={uploading}
                />
            </div>
        </div>
    )
}
export default Avatar;