import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error, info) {
    console.error('Podcast Vault runtime error:', error, info)
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,background:'#09090b',color:'#fff',fontFamily:'system-ui'}}>
          <div style={{maxWidth:680,width:'100%',border:'1px solid #2a2a33',borderRadius:20,padding:24,background:'#111216'}}>
            <h1 style={{marginTop:0}}>Podcast Vault gặp lỗi khi khởi động</h1>
            <p style={{color:'#aaa'}}>Mở DevTools → Console để xem chi tiết. Thông báo lỗi:</p>
            <pre style={{whiteSpace:'pre-wrap',wordBreak:'break-word',padding:14,borderRadius:12,background:'#08080a',color:'#ffb4c8'}}>{String(this.state.error?.message || this.state.error)}</pre>
            <button onClick={() => location.reload()} style={{border:0,borderRadius:12,padding:'11px 16px',fontWeight:700,cursor:'pointer'}}>Tải lại trang</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)

if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(console.error)
    })
  } else {
    // Development must never be controlled by an old production service worker.
    // Remove stale registrations/caches so a normal refresh always loads current Vite code.
    navigator.serviceWorker.getRegistrations()
      .then(registrations => Promise.all(registrations.map(registration => registration.unregister())))
      .catch(() => {})

    if ('caches' in window) {
      caches.keys()
        .then(keys => Promise.all(keys.map(key => caches.delete(key))))
        .catch(() => {})
    }
  }
}
