import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import logoImg from './assets/logo.png'

// index.html points to a favicon that doesn't exist in this project — set
// the real one (the app's logo) here instead, since files inside src/
// need to go through Vite's bundler rather than being referenced directly
// from a static HTML file.
const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
if (favicon) favicon.href = logoImg

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
