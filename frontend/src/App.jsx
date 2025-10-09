import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ChatProvider } from './contexts/ChatContext'
import Layout from './components/Layout'
import Chat from './pages/Chat'
import './App.css'

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Chat />} />
        <Route path="chat/:chatId" element={<Chat />} />
      </Route>
    </Routes>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <ChatProvider>
        <Router>
          <div className="App">
            <AppRoutes />
          </div>
        </Router>
      </ChatProvider>
    </AuthProvider>
  )
}

export default App