import {
    Box,
    Center,
    useColorModeValue,
    Heading,
    Text,
    Stack,
    Image,
} from '@chakra-ui/react';
import React from "react";
import {InitialProductStateType} from "../../../store/slices/productReducer";
import {navigatePhotosObject} from "../../../utils/navigatePhotosObject";
import soup from '../../../assets/soup.svg';
import navIcon from '../../../assets/map.svg';
import {useNavigate} from "react-router-dom";
type ProdPropsType ={
    item:InitialProductStateType
}
const OneCardOfMain:React.FC<ProdPropsType>=({item})=>{
    const navigate = useNavigate();
    return (
        <Center py={6}>
            <Box
                role={'group'}
                p={6}
                maxW={'330px'}
                w={'full'}
                bg={useColorModeValue('white', 'gray.800')}
                boxShadow={'2xl'}
                rounded={'lg'}
                pos={'relative'}
                zIndex={1}
            >
                <Box
                    rounded={'lg'}
                    mt={-12}
                    pos={'relative'}
                    height={'230px'}
                    _after={{
                        transition: 'all .3s ease',
                        content: '""',
                        w: 'full',
                        h: 'full',
                        pos: 'absolute',
                        top: 5,
                        left: 0,
                        backgroundImage: `url(${item.gif_url})`,
                        filter: 'blur(15px)',
                        zIndex: -1,
                    }}
                    _groupHover={{
                        _after: {
                            filter: 'blur(20px)',
                        },
                    }}>
                    <Image
                        onClick={() => navigate(`/oneProd`, {state: item})}
                        cursor="pointer"
                        rounded={'lg'}
                        height={230}
                        width={282}
                        objectFit={'cover'}
                        src={item.gif_url}
                    />
                </Box>
                <Stack pt={10} align={'center'}>
                    <Heading textAlign={"center"} noOfLines={1} fontSize={'2xl'} fontFamily={'body'} fontWeight={500}>
                       {item.post_name}
                    </Heading>
                    <Text textAlign={"center"} noOfLines={1} color={'gray.500'} fontSize={'sm'} textTransform={'uppercase'}>
                        {item.post_description}
                    </Text>
                    <Stack direction={'row'} align={'center'}>
                                    <Image
                                        borderRadius='full'
                                        src={navigatePhotosObject[item.post_type]}
                                        alt={soup}
                                    />
                    </Stack>
                </Stack>
            </Box>
        </Center>
    );
}
export default OneCardOfMain