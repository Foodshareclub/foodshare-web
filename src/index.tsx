import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.scss';
import {Provider} from "react-redux";
import {BrowserRouter} from "react-router-dom";
import store from "./store/redux-store";
import {ChakraProvider} from '@chakra-ui/react';
import {theme} from "./utils/themeBreakPoint";
import ContainerForChat from "@/components/containerForChat/ContainerForChat";


const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);
root.render(
    <Provider store={store}>
        <BrowserRouter>
            <ChakraProvider theme={theme}><ContainerForChat/></ChakraProvider>
        </BrowserRouter>
    </Provider>
);

