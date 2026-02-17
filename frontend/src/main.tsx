import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './lib/i18n'; // Initialize i18n
import App from './App';
import reportWebVitals from './reportWebVitals';
import { registerServiceWorker } from './utils/registerServiceWorker';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for offline functionality
if (process.env.NODE_ENV === 'production') {
  registerServiceWorker().then((registration) => {
    if (registration) {
      console.log('✅ Offline mode enabled');
    }
  });
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
