import axios from "axios"

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    withCredentials: true
})

export async function getAllUsers() {
    try {
        const response = await api.get("/api/admin/users")
        return response.data
    } catch (err) {
        console.log(err)
    }
}

export async function deleteUser(userId) {
    try {
        const response = await api.delete(`/api/admin/users/${userId}`)
        return response.data
    } catch (err) {
        console.log(err)
    }
}