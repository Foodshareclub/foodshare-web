import React from 'react';
import Header from "./components/header/Header";
import Main from "./components/main/Main";
import Footer from "./components/footer/Footer";
import {Route, Routes} from "react-router-dom";
import {Registration} from "./pages/registration/Registration";
import {Login} from "./pages/login/Login";
import ProductPage from "./pages/productPage/ProductPage";


function App() {
    return (
        <div style={{ margin: "0 5%"}}>

            <Header/>
            <Routes>
                <Route path={"/"} element={<Main/>}/>
                <Route path={"/login"} element={<Login/>}/>
                <Route path={"/registration"} element={<Registration/>}/>
                <Route path={"/oneProd"} element={<ProductPage/>}/>
            </Routes>

            <Footer/>
        </div>
    );
}

export default App;
