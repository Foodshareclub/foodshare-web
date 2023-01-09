import { useState } from 'react'
import {supabase} from "../../supaBase.config";


export default function Auth() {
    const [loading, setLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const handleLogin = async (e:any) => {
        e.preventDefault()
               try {
            setLoading(true)
            const {data:{user}, error } =  await supabase.auth.signUp({email,password})
            console.log(user)
            // const { error } = await supabase.auth.signInWithOtp({ email })
            if (error) throw error
            alert('Check your email for the login link!')
        } catch (error:any) {
            alert(error.error_description || error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="row flex-center flex">
            <div className="col-6 form-widget" aria-live="polite">
                <h1 className="header">Supabase + React</h1>
                <p className="description">Sign in via magic link with your email below</p>
                {loading ? (
                    'Sending magic link...'
                ) : (
                    <form onSubmit={handleLogin}>
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            className="inputField"
                            type="email"
                            placeholder="Your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            className="inputField"
                            type="password"
                            placeholder="Your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <button className="button block" aria-live="polite">
                            Send magic link
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}