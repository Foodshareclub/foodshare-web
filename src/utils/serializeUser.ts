import {User} from "@supabase/supabase-js";

const serializeUser = (user:User) =>
    user
        ? {
            id: user.id,
            email: user.email,
            ...user.user_metadata
        }
        : null

export default serializeUser