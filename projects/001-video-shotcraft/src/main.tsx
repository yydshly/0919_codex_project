import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

// Remotion's staticFile() must resolve against this site's nested deployment path.
window.remotion_staticBase = new URL(import.meta.env.BASE_URL, window.location.href).pathname.replace(/\/$/, '');
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
