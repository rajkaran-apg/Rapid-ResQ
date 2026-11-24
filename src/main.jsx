import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './lib/auth.jsx';
import './index.css';
import { ThemeProvider } from './lib/theme.jsx';

createRoot(document.getElementById('root')).render(
  <ThemeProvider>
    <HashRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter>
  </ThemeProvider>
);