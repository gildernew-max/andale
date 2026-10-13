import { Component, StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import FunnelCounts from './FunnelCounts.jsx'
import { isFunnelHash } from './funnelCounts.js'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Nunito','Avenir Next',system-ui,sans-serif", padding: 24, textAlign: 'center' }}>
          <div>
            <p style={{ fontWeight: 800, margin: '0 0 12px' }}>Algo salió mal.</p>
            <button type="button" onClick={() => window.location.reload()}>Recargar</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function Root() {
  const [funnel, setFunnel] = useState(() => isFunnelHash(window.location.hash))
  useEffect(() => {
    const sync = () => setFunnel(isFunnelHash(window.location.hash))
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])
  return funnel ? <FunnelCounts /> : <App />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </StrictMode>,
)
