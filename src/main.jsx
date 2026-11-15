import React from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/bungee'
import '@fontsource-variable/bricolage-grotesque'
import './styles.css'
import App from './App.jsx'
import { detectApi } from './api.js'

detectApi().then(() => createRoot(document.getElementById('root')).render(<App />))
