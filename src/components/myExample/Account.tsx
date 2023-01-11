import {useState, useEffect, SetStateAction} from 'react'
import {supabase} from "../../supaBase.config";
import Avatar from "./Avatar";


// @ts-ignore
const Account = ({session}) => {
    const [loading, setLoading] = useState(true)
    const [username, setUsername] = useState<string | null>(null)
    const [website, setWebsite] = useState<string | null>(null)
    const [avatar_url, setAvatarUrl] = useState<string | null>(null)

    const [address, setAddress] = useState<string | null>(null)


    useEffect(() => {
        getProfile()
    }, [session])

    const getProfile = async () => {
        try {
            setLoading(true)
            const {user} = session
            console.log(session)
            let {data, error, status} = await supabase
                .from('profiles')
                .select(`username, website, avatar_url`)
                .eq('id', user.id)
                .single()

            if (error && status !== 406) {
                throw error
            }

            if (data) {
                setUsername(data.username)
                setWebsite(data.website)
                setAvatarUrl(data.avatar_url)
            }
        } catch (error: any) {
            alert(error.message)
        } finally {
            setLoading(false)
        }
    }
    const getAddresses = async () => {
        try {
            setLoading(true)
            const {user} = session
            console.log(session)
            let {data, error, status} = await supabase
                .from('addresses')
                .select(`*`)
                .eq('id', user.id)
                .single()

            if (error && status !== 406) {
                throw error
            }

            if (data) {
                setAddress(data.address)
            }
        } catch (error: any) {
            alert(error.message)
        } finally {
            setLoading(false)
        }
    }

    const updateProfile = async (e: any) => {
        e.preventDefault()

        try {
            setLoading(true)
            const {user} = session

            const updates = {
                id: user.id,
                username,
                website,
                avatar_url,
                updated_at: new Date(),
            }

            let {error} = await supabase.from('profiles').upsert(updates)

            if (error) {
                throw error
            }
        } catch (error: any) {
            alert(error.message)
        } finally {
            setLoading(false)
        }
    }
    const updateAddress = async (e: any) => {
        e.preventDefault()

        try {
            setLoading(true)
            const {user} = session

            const updates = {
                id: user.id,
                address,
                updated_at: new Date(),
            }

            let {error} = await supabase.from('addresses').upsert(updates)

            if (error) {
                throw error
            }
        } catch (error: any) {
            alert(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div aria-live="polite">
            {loading ? (
                'Saving ...'
            ) : (
                <form onSubmit={(e) => {
                    updateProfile(e)
                    updateAddress(e)
                }
                } className="form-widget">
                    <Avatar
                        url={avatar_url}
                        size={150}
                        onUpload={(url: string) => {
                            setAvatarUrl(url)
                            updateProfile({username, website, avatar_url: url})
                        }}
                    />
                    <div>Email: {session.user.email}</div>
                    <div>
                        <label htmlFor="username">Name</label>
                        <input
                            id="username"
                            type="text"
                            value={username || ''}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="website">Website</label>
                        <input
                            id="website"
                            type="url"
                            value={website || ''}
                            onChange={(e) => setWebsite(e.target.value)}
                        />
                    </div>
                    <div>
                        <label htmlFor="address">Address</label>
                        <input
                            id="address"
                            type="text"
                            value={address || ''}
                            onChange={(e) => setAddress(e.target.value)}
                        />
                    </div>
                    <div>
                        <button className="button primary block" disabled={loading}>
                            Update profile
                        </button>
                    </div>
                </form>
            )}
            <button type="button" className="button block" onClick={() => supabase.auth.signOut()}>
                Sign Out
            </button>
        </div>
    )
}

export default Account