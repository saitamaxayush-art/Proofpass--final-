import { Component } from 'react'

export default class ErrorBoundary extends Component {
  first = null
  state = { err: null }
  static getDerivedStateFromError(err) {
    return { err }
  }
  componentDidCatch(err, info) {
    if (!this.first) this.first = { err, stack: info && info.componentStack }
    console.error(err)
  }
  render() {
    if (!this.state.err) return this.props.children
    if (this.props.fallback !== undefined) return this.props.fallback
    const f = this.first || { err: this.state.err }
    return (
      <main id="main" className="w" style={{ paddingTop: 'calc(var(--header-h) + 32px)', paddingBottom: '60px' }}>
        <div className="table-card glass" style={{ padding: '24px', border: '1px solid var(--st-x)' }}>
          <h2 style={{ fontSize: '1.2rem', color: 'var(--st-x)', marginBottom: '12px' }}>An error occurred on this page</h2>
          <pre style={{ padding: '16px', background: 'var(--surface-2)', borderRadius: '8px', overflowX: 'auto', whiteSpace: 'pre-wrap', font: '13px monospace', color: 'var(--ink)' }}>
            {String(f.err.stack || f.err)}
            {f.stack}
          </pre>
        </div>
      </main>
    )
  }
}
