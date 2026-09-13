import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { BagProvider } from './context/BagContext';
import { AuthProvider } from './context/AuthContext';
import { WishlistProvider } from './context/WishlistContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <BagProvider>
          <WishlistProvider>
            <App />
          </WishlistProvider>
        </BagProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
