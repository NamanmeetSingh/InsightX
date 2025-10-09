import React, { useState } from 'react'
import { X, User, Settings, Moon, Sun, LogOut, Bell, Shield } from 'lucide-react'
import './ProfileModal.css'

const ProfileModal = ({ onClose }) => {
  const [darkMode, setDarkMode] = useState(false)
  const [notifications, setNotifications] = useState(true)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Profile & Settings</h2>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-content">
          <div className="profile-section">
            <div className="profile-avatar-large">
              <span>U</span>
            </div>
            <div className="profile-details">
              <h3>User Name</h3>
              <p>user@example.com</p>
              <button className="edit-profile-button">Edit Profile</button>
            </div>
          </div>

          <div className="settings-section">
            <h3>Preferences</h3>
            
            <div className="setting-item">
              <div className="setting-info">
                <Moon size={20} />
                <div>
                  <span className="setting-title">Dark Mode</span>
                  <span className="setting-description">Switch between light and dark themes</span>
                </div>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={darkMode}
                  onChange={(e) => setDarkMode(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <Bell size={20} />
                <div>
                  <span className="setting-title">Notifications</span>
                  <span className="setting-description">Receive notifications for new messages</span>
                </div>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={notifications}
                  onChange={(e) => setNotifications(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>
          </div>

          <div className="actions-section">
            <button className="action-button">
              <Shield size={20} />
              Privacy & Security
            </button>
            <button className="action-button">
              <Settings size={20} />
              Advanced Settings
            </button>
            <button className="action-button logout">
              <LogOut size={20} />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfileModal
