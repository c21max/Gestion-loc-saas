import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error('Application render error:', error)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6 text-slate-950">
          <div className="w-full max-w-xl rounded-lg border border-rose-200 bg-white p-6 shadow-sm">
            <h1 className="text-xl font-semibold">Erreur au chargement de l'application</h1>
            <p className="mt-3 text-sm text-slate-600">
              {this.state.error.message}
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
)
