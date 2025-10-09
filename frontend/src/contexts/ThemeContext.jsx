import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Theme reducer
const themeReducer = (state, action) => {
  switch (action.type) {
    case 'TOGGLE_THEME':
      return {
        ...state,
        isDarkMode: !state.isDarkMode,
      };
    case 'SET_THEME':
      return {
        ...state,
        isDarkMode: action.payload,
      };
    default:
      return state;
  }
};

// Initial state
const initialState = {
  isDarkMode: false,
};

// Create context
const ThemeContext = createContext();

// Theme provider component
export const ThemeProvider = ({ children }) => {
  const [state, dispatch] = useReducer(themeReducer, initialState);

  // Load theme preference from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    let isDarkMode = false;
    
    if (savedTheme) {
      isDarkMode = savedTheme === 'dark';
    } else {
      isDarkMode = systemPrefersDark;
    }

    dispatch({ type: 'SET_THEME', payload: isDarkMode });
    
    // Apply theme class to document root
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, []);

  // Save theme preference and apply class when theme changes
  useEffect(() => {
    localStorage.setItem('theme', state.isDarkMode ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', state.isDarkMode);
  }, [state.isDarkMode]);

  // Toggle theme function
  const toggleTheme = () => {
    dispatch({ type: 'TOGGLE_THEME' });
  };

  // Set specific theme function
  const setTheme = (isDark) => {
    dispatch({ type: 'SET_THEME', payload: isDark });
  };

  const value = {
    isDarkMode: state.isDarkMode,
    toggleTheme,
    setTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

// Custom hook to use theme context
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;