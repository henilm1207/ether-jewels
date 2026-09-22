import { Component } from 'react';

// Lazy route chunks are fetched by hashed filename; after a deploy replaces
// the build, a tab still open on the old app will 404 fetching a chunk it
// hasn't loaded yet. That's not a real crash — reload once to pick up the
// new build. Guarded by sessionStorage so a genuinely broken chunk doesn't
// reload-loop forever.
const CHUNK_ERROR_PATTERN = /fetch dynamically imported module|error loading dynamically imported module|importing a module script failed/i;
const CHUNK_RELOAD_FLAG = 'chunk-reload-attempted';

function isChunkLoadError(error) {
  return !!error && CHUNK_ERROR_PATTERN.test(String((error && error.message) || error));
}

// TEMPORARY DIAGNOSTIC: shows the real error + stack on screen so a crash can
// be reported precisely. Revert to the clean fallback once diagnosed.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, reloading: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidMount() {
    // A successful mount means the current build's chunks are all fetchable
    // — clear the flag so a future deploy gets its own reload attempt.
    try { sessionStorage.removeItem(CHUNK_RELOAD_FLAG); } catch { /* ignore */ }
  }
  componentDidCatch(err) {
    console.error('UI crashed:', err);
    if (isChunkLoadError(err)) {
      let alreadyTried = false;
      try { alreadyTried = sessionStorage.getItem(CHUNK_RELOAD_FLAG) === '1'; } catch { /* ignore */ }
      if (!alreadyTried) {
        try { sessionStorage.setItem(CHUNK_RELOAD_FLAG, '1'); } catch { /* ignore */ }
        this.setState({ reloading: true });
        window.location.reload();
      }
    }
  }
  render() {
    if (this.state.reloading) return null;
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
