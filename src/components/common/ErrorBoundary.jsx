import React from 'react';
import { FiAlertOctagon, FiRefreshCw } from 'react-icons/fi';
import SafeIcon from './SafeIcon';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Frontend Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200 flex flex-col items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center space-y-6">
            <div className="flex justify-center">
              <div className="p-4 bg-red-500/10 rounded-2xl">
                <SafeIcon icon={FiAlertOctagon} className="text-red-400 text-4xl" />
              </div>
            </div>

            <div>
              <h1 className="text-xl font-bold text-white mb-2">AXiM Systems Error</h1>
              <p className="text-slate-400 text-sm">
                The AXiM Roundups Bridge encountered an unexpected error. Please refresh the page to restore connectivity.
              </p>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-all"
            >
              <SafeIcon icon={FiRefreshCw} />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
