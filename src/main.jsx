import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { LangProvider } from './context/LangContext';
import { AuthProvider } from './context/AuthContext';
import { FooterDataProvider } from './context/FooterDataContext';
import './styles/tokens.css';
import './styles/base.css';
import './styles/overlays.css';
import './styles/footer.css';
import './styles/admin.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <LangProvider>
        <AuthProvider>
          <FooterDataProvider>
            <App />
          </FooterDataProvider>
        </AuthProvider>
      </LangProvider>
    </BrowserRouter>
  </React.StrictMode>
);
