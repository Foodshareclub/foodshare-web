import {createClient} from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY
export const access_token = process.env.REACT_APP_SUPABASE_JWT_SECRET

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    schema: "public",
    global: {
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
    },
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    }
},)


export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey,
    {
        global: {
            headers: {
                Authorization: `Bearer ${access_token}`,
            },
        },
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    },
)