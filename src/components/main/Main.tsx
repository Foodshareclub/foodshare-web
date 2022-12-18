import React from 'react';
import {styled} from '@mui/material/styles';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import {supabase} from "../../supaBase.config";
import {Button} from "@mui/material";
import burger from "../../assets/burgers.png";

const Item = styled(Paper)(({theme}) => ({
    backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
    ...theme.typography.body2,
    padding: theme.spacing(1),
    textAlign: 'center',
    color: theme.palette.text.secondary,
}));

export default function Main() {
    async function getCities() {
        const countries = await supabase.from('subway_stations').insert({

            name: "testmogilev",
            created_at: new Date,

        })
        console.log(countries)
    }

    async function getCity() {
        const countries = await supabase.from('subway_stations').select("*")
        console.log(countries)
    }


    return (
        <Box sx={{flexGrow: 1, height: "70%"}}>
            <Grid container spacing={3} sx={{margin: "0", width: "98%"}}>
                <Grid item xs={4}>
                    <div style={{fontWeight: "700", fontSize: "16px", textAlign: "center", margin: "0 2%"}}>
                        <img src={burger} alt="soup"/>
                        <div style={{margin: "2% 8%"}}>
                            <div style={{display: 'flex', justifyContent: "space-between"}}>
                                <div style={{fontWeight: "700", fontSize: "16px"}}>Address:</div>
                                <div style={{fontWeight: "400"}}>Partizanskaya street</div>
                            </div>
                            <div style={{display: 'flex', justifyContent: "space-between"}}>
                                <div style={{fontWeight: "700", fontSize: "16px"}}>Available:</div>
                                <div style={{fontWeight: "400"}}> 4 - 6 pm</div>
                            </div>
                            <div style={{display: 'flex', justifyContent: "space-between"}}>
                                <div style={{fontWeight: "700", fontSize: "16px"}}>Quantity:</div>
                                <div style={{fontWeight: "400"}}> 5</div>
                            </div>
                            <div style={{display: 'flex', justifyContent: "space-between"}}>
                                <div style={{fontWeight: "700", fontSize: "16px"}}>Food type:</div>
                                <div style={{fontWeight: "400"}}>Canned food</div>
                            </div>
                        </div>

                    </div>
                </Grid>
            </Grid>
        </Box>
    );
}