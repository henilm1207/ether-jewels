import { Component } from 'react';

// TEMPORARY DIAGNOSTIC: shows the real error + stack on screen so a crash can
// be reported precisely. Revert to the clean fallback once diagnosed.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(err) {
    console.error('UI crashed:', err);
  }
  render() {
    if (this.state.hasError) {
      const err = this.state.error;
      return (
        <div className="py-20 text-center container">
          <h1 className="font-heading text-2xl mb-4">Something went wrong</h1>
          <p className="text-gray-600 mb-6">Please refresh the page or return home.</p>
          <a href="/" className="btn btn--primary">Return home</a>
          <div className="text-left mx-auto mt-8 bg-red-50 border border-red-200 rounded text-xs font-mono whitespace-pre-wrap" style={{ maxWidth: '720px', padding: '12px' }}>
            <p className="font-bold mb-2">[diagnostic — tell the developer these 2 lines]</p>
            <p>{err ? String((err && err.message) || err) : '(no message)'}</p>
            <p className="mt-2 text-gray-600">{err && err.stack ? String(err.stack).split('\n').slice(0, 4).join('\n') : '(no stack)'}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
