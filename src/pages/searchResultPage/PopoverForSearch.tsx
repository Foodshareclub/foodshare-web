import {
    Flex,
    IconButton,
    Input,
    Popover,
    PopoverArrow,
    PopoverBody,
    PopoverContent,
    PopoverTrigger,
    Radio,
    RadioGroup,
    Stack,
    useBoolean
} from "@chakra-ui/react";
import * as React from "react";
import {ChangeEvent, useState} from "react";
import {SearchIcon} from "@chakra-ui/icons";
import {t} from "@lingui/macro";
import {useNavigate} from "react-router-dom";

const PopoverForSearch = () => {
    const navigate = useNavigate();
    const [isEditing, setIsEditing] = useBoolean()
    const [searchValue, setSearchValue] = useState('');
    const [productType, setProductType] = useState('all');

    const onSearchHandler = (e: ChangeEvent<HTMLInputElement>) => setSearchValue(e.currentTarget.value);

    const onFindResultsHandler = async () => {
        if (searchValue) {
            navigate(`/s/${productType}?key_word=${searchValue}`);
            setProductType('all');
            setSearchValue('');
        }
    }
    return (
        <Popover
            isOpen={isEditing}
            onOpen={setIsEditing.on}
            onClose={setIsEditing.off}
            closeOnBlur={true}
            isLazy
            lazyBehavior='keepMounted'
            placement='bottom'
        >
            <Flex align="center" w={"30%"}>
                <IconButton
                    variant={"ghost"}
                    onClick={onFindResultsHandler}
                    cursor={"pointer"}
                    aria-label={""}
                    children={
                    <SearchIcon color={'red.500'}/>}/>
                <PopoverTrigger>
                    <Input
                        // focusBorderColor='#FF2D55'
                        value={searchValue}
                        onChange={onSearchHandler}
                        placeholder={t({
                            id: `msg.Input`,
                            message: `What are we in search of today?`
                        })}
                    />
                </PopoverTrigger>
            </Flex>

            <PopoverContent
                // color='white'
                bg='red.100'
                // borderColor='blue.800'
                width={'100%'}
                height={'50px'}
            >
                {/*<PopoverHeader pt={4} fontWeight='bold' border='0'>*/}
                {/*    Choose something*/}
                {/*</PopoverHeader>*/}
                <PopoverArrow/>
                {/*<PopoverCloseButton/>*/}
                <PopoverBody>
                    <RadioGroup
                        onChange={setProductType} value={productType}
                    >
                        <Stack direction='row'>
                            <Radio value='all'>All</Radio>
                            <Radio value='food'>Food</Radio>
                            <Radio value='things'>Things</Radio>
                            <Radio value='borrow'>Borrow</Radio>
                            <Radio value='wanted'>Wanted</Radio>
                        </Stack>
                    </RadioGroup>

                </PopoverBody>

            </PopoverContent>
        </Popover>
    )
}
export default PopoverForSearch