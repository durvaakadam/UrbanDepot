import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));

// 🔇 Suppress hot-update logs in console
const originalLog = console.log;
console.log = (...args) => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('hot-update')) {
    return; // ignore hot-update logs
  }
  originalLog(...args);
};

// 🚫 Force unregister service workers (so no fetch spam from old SWs)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister().then(() => {
          console.log('✅ Service Worker unregistered');
        });
      });
    });
  });
}

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Optional: performance metrics
reportWebVitals();
