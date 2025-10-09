import React, { useState } from 'react'
import { Menu, X, Settings, HelpCircle, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import ProfileModal from './ProfileModal'
import './Header.css'

const Header = ({ onToggleSidebar }) => {
  const [showProfileModal, setShowProfileModal] = useState(false)
  const { user, isAuthenticated, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
  }

  const getUserInitial = () => {
    if (user?.name) {
      return user.name.charAt(0).toUpperCase()
    }
    return 'U'
  }

  return (
    <header className="header">
      <div className="header-left">
        <button 
          className="menu-button"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>
        <h1 className="app-title">InsightX</h1>
      </div>
      
      <div className="header-right">
        <button className="header-button" aria-label="Help">
          <HelpCircle size={20} />
        </button>
        <button 
          className="header-button" 
          onClick={() => setShowProfileModal(true)}
          aria-label="Settings"
        >
          <Settings size={20} />
        </button>
        {isAuthenticated && (
          <button 
            className="header-button logout-button"
            onClick={handleLogout}
            aria-label="Logout"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        )}
        <button 
          className="profile-button"
          onClick={() => setShowProfileModal(true)}
          aria-label="Profile"
        >
          <div className="profile-avatar">
            <span>{getUserInitial()}</span>
          </div>
        </button>
      </div>

      {showProfileModal && (
        <ProfileModal onClose={() => setShowProfileModal(false)} />
      )}
    </header>
  )
}

export default Header
