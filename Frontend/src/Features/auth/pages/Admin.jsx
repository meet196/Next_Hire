import React, { useState, useEffect } from 'react'
import "../admin.scss"  
import { getAllUsers, deleteUser } from '../services/admin.api'
import { useNavigate } from "react-router"
import toast from 'react-hot-toast'
import { useAuth } from '../hooks/useAuth'


function AdminUsers() {
    const [users, setUsers] = useState([])
    const { handleLogout } = useAuth()
    const navigate = useNavigate()

    async function fetchUsers() {
        try {
            const data = await getAllUsers()
            setUsers(data.users)
        } catch (error) {
            toast.error(error.response?.data?.message || "Users fetch failed")
        }
    }

    async function confirmDelete(userId) {
        try {
            await deleteUser(userId)
            toast.success("User deleted successfully")
            fetchUsers()
        } catch (error) {
            toast.error(error.response?.data?.message || "Delete failed")
        }
    }

    function handleDelete(userId) {
        toast((t) => (
            <div>
                <p>Delete this user?</p>
                <div className="toast-buttons">
                    <button
                        onClick={() => {
                            toast.dismiss(t.id)
                            confirmDelete(userId)
                        }}
                    >
                        Yes
                    </button>
                    <button onClick={() => toast.dismiss(t.id)}>No</button>
                </div>
            </div>
        ))
    }

    async function onLogoutClick() {
        await handleLogout()
        navigate("/login")
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    return (
        <div className="admin-users">
            <button className="logout-btn" onClick={onLogoutClick}>Logout</button>
            <h1>All Users</h1>

            <div className="users-box">
                {users.map((user) => (
                    <div className="user-row" key={user._id}>
                        <div className="user-info">
                            <p className="user-name">{user.name}</p>
                            <p className="user-email">{user.email}</p>
                        </div>

                        <div className="user-actions">
                            <span className="role-badge">{user.role}</span>
                            <button onClick={() => handleDelete(user._id)}>Delete</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default AdminUsers