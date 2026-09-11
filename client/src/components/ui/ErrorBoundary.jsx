import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err) {
    console.error('UI crashed:', err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="py-20 text-center container">
          <h1 className="font-heading text-2xl mb-4">Something went wrong</h1>
          <p className="text-gray-600 mb-6">Please refresh the page or return home.</p>
          <a href="/" className="btn btn--primary">Return home</a>
        </div>
      );
    }
    return this.props.children;
  }
}
