import { useContext, useEffect } from "react";
import { AuthContext } from "../auth.context";
import { login, register, logout, getMe } from "../services/auth.api";
import toast from "react-hot-toast"


export const useAuth = () => {

    const context = useContext(AuthContext)
    const { user, setUser, loading, setLoading } = context

const handleLogin = async ({ email, password }) => {
    try {
        const data = await login({ email, password })
        setUser(data.user)
        toast.success("Login successfully!")
        return data.user
    } catch (err) {
        toast.error(err.response?.data?.message || "Invalid email or password")
    } finally {
        setLoading(false)
    }
}

const handleRegister = async ({ username, email, password }) => {
    setLoading(true)
    try {
        const data = await register({ username, email, password })
        setUser(data.user)
        toast.success("Account created successfully!")
    } catch (err) {
        toast.error(err.response?.data?.message || "Registration failed")
    } finally {
        setLoading(false)
    }
}

const handleLogout = async () => {
    setLoading(true)
    try {
        await logout()
        setUser(null)
        toast.success("Logout successfully!")
    } catch (err) {
        toast.error("Logout failed")
    } finally {
        setLoading(false)
    }
}

    useEffect(() => {

        const getAndSetUser = async () => {
            try {
                const data = await getMe()
                setUser(data.user)
            } catch (err) { } finally {
                setLoading(false)
            }
        }

        getAndSetUser()

    }, [])

    return { user, loading, handleRegister, handleLogin, handleLogout }
}