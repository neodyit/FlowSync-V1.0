import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import Swal from 'sweetalert2'

// Centralized fetch interceptor to catch Subscription Block / Read-Only errors (403 Forbidden)
const originalFetch = window.fetch;
window.fetch = async function (...args) {
  const response = await originalFetch(...args);
  if (response.status === 403) {
    try {
      const clone = response.clone();
      const data = await clone.json();
      if (data.status === 'error' && data.message && (data.message.includes('Subscription') || data.message.includes('Read-Only'))) {
        Swal.fire({
          title: 'Action Blocked',
          text: data.message,
          icon: 'error',
          confirmButtonText: 'Acknowledge',
          confirmButtonColor: '#EF4444',
          customClass: {
            popup: 'rounded-[2rem] border border-rose-500/20 bg-white dark:bg-[#110A24] text-[#1E184B] dark:text-indigo-100 shadow-2xl',
            title: 'font-black text-xl text-rose-500',
            confirmButton: 'rounded-xl px-10 py-3 font-black uppercase tracking-widest text-xs'
          }
        });
      }
    } catch (e) {
      // Ignored
    }
  }
  return response;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
