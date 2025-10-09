import React, { useState } from 'react'
import { Menu, X, Settings, HelpCircle } from 'lucide-react'
import ProfileModal from './ProfileModal'
import './Header.css'

const Header = ({ onToggleSidebar }) => {
  const [showProfileModal, setShowProfileModal] = useState(false)

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
        <button 
          className="profile-button"
          onClick={() => setShowProfileModal(true)}
          aria-label="Profile"
        >
          <div className="profile-avatar">
            <span>U</span>
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
