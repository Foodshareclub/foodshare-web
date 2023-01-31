import React, {ChangeEvent, useRef, useState} from 'react'
import {useAppSelector} from "@/hook";
import {Box, Button, Flex, Image, Input, Text} from "@chakra-ui/react";
import cloud from "../../assets/cloud.svg";
import {createPhotoUrl} from "@/utils";
import {Trans} from "@lingui/macro";
import {imgURLSelector} from "@/store/slices/userSelectors";

type PropsType = {
    url: string
    size: number
    onUpload: (filePath: string, file: File) => void
}

const Avatar: React.FC<PropsType> = ({url, size, onUpload}) => {

    const imgUrl = useAppSelector(imgURLSelector);

    const [pastUrl, setPastUrl] = useState<string | undefined>(imgUrl)
    const inputFileRef = useRef<HTMLInputElement | null>(null)

    const uploadAvatar = (event: ChangeEvent<HTMLInputElement>) => {
        const {file, filePath, url} = createPhotoUrl(event);
        onUpload(filePath, file);
        setPastUrl(url);
    }

    return (

        <Flex
            _hover={{bg: 'gray.50'}}
            justify="space-between"
            p={4}
            border="1px dashed #2D9CDB"
            borderRadius={10}
        >
            {(imgUrl || pastUrl)
                ? <img style={{
                    height: size,
                    width: size,
                    borderRadius: "10px",
                    margin: '0 auto'
                }}

                     src={pastUrl}
                     alt={pastUrl}
                />
                : <>
                    <Box alignSelf="center">
                        <Image
                            borderRadius='full'
                            boxSize='50px'
                            src={cloud}
                        />
                    </Box>

                    <Box>
                        <Text><Trans>Select a file or drag and drop here</Trans></Text>
                        <Text><Trans>JPG or PNG file size no more than 10MB</Trans></Text>
                    </Box>
                </>
            }
            <Box alignSelf="center">

                <Input
                    opacity={0}
                    position="absolute"
                    h="22%" left={0}
                    top="9%"
                    accept=".png"
                    ref={inputFileRef}
                    type="file"
                    onChange={(e) => uploadAvatar(e)}
                />

                <Button
                    onClick={() => inputFileRef?.current?.click()}
                    background={"#ff2d55"}
                    _hover={{bg: '#c92040'}}
                    color="#ffffff"
                >
                    <Trans>Download</Trans>
                </Button>
            </Box>
        </Flex>
    )
}
export default Avatar;