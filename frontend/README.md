# InsightX - AI Chatbot Frontend

A modern, Gemini-inspired chatbot interface built with React and Vite.

## Features

### 🎨 Modern UI/UX
- Clean, minimalist design inspired by Google's Gemini
- Responsive layout that works on desktop and mobile
- Smooth animations and transitions
- Dark/light mode support (coming soon)

### 💬 Chat Interface
- Real-time message bubbles with typing indicators
- Message actions (like, dislike, copy, more options)
- Auto-scrolling to latest messages
- Rich text support with code blocks and formatting

### 📱 Sidebar Navigation
- Chat history with searchable conversations
- New chat creation
- Edit and delete chat functionality
- User profile section

### ⚙️ User Management
- Profile modal with settings
- Toggle switches for preferences
- User avatar and information display
- Privacy and security options

### 🎯 Input Features
- Multi-line text input with auto-resize
- Voice recording capability (UI ready)
- File attachment support (UI ready)
- Send button with keyboard shortcuts (Enter to send)

## Tech Stack

- **React 19** - Latest React with concurrent features
- **React Router DOM** - Client-side routing
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library
- **ESLint** - Code linting and formatting

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173`

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Layout.jsx      # Main app layout
│   ├── Header.jsx      # Top navigation bar
│   ├── Sidebar.jsx     # Chat history sidebar
│   ├── MessageBubble.jsx # Individual message component
│   └── ProfileModal.jsx # User settings modal
├── pages/              # Page components
│   └── Chat.jsx        # Main chat interface
├── App.jsx             # Root component with routing
├── main.jsx            # Application entry point
└── index.css           # Global styles and Tailwind imports
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Features in Development

- [ ] Backend integration
- [ ] Real-time messaging
- [ ] File upload functionality
- [ ] Voice message recording
- [ ] Message search
- [ ] Export chat history
- [ ] Custom themes
- [ ] Keyboard shortcuts
- [ ] Message reactions
- [ ] Chat sharing

## Contributing

This is a frontend-only implementation. The backend integration and real-time features are planned for future development.