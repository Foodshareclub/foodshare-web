import React, {ChangeEvent} from 'react'

type PropsType = {
    url?: string
    size: number
    uploading: boolean
    onUpload: (filePath: string, file: string) => void
}

const Avatar: React.FC<PropsType> = ({url, size, uploading, onUpload}) => {


    const uploadAvatar = (event: ChangeEvent<HTMLInputElement>) => {

        if (!event.target.files || event.target.files.length === 0) return
        const file = event.target.files[0]
        const fileExt = file.name.split('.').pop()
        const fileName = `${Math.random()}.${fileExt}`
        const filePath = `${fileName}`
        const url = URL.createObjectURL(file)
        console.log(file)
        console.log(fileExt)
        console.log(fileName)
        console.log(filePath)

        onUpload(filePath, url)
    }

    return (
        <div style={{width: size}} aria-live="polite">
            <img
                src={url ? url : `https://place-hold.it/${size}x${size}`}
                alt={url ? 'Avatar' : 'No image'}
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