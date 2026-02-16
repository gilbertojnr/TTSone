import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Error boundary component
const ErrorFallback: React.FC<{ error: Error }> = ({ error }) => (
  <div style={{ 
    padding: '20px', 
    color: '#f8fafc', 
    background: '#020617',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'Inter, sans-serif'
  }}>
    <h1 style={{ color: '#ef4444', marginBottom: '16px' }}>⚠️ Application Error</h1>
    <pre style={{ 
      background: '#1e293b', 
      padding: '16px', 
      borderRadius: '8px',
      maxWidth: '800px',
      overflow: 'auto'
    }}>{error.message}</pre>
    <button 
      onClick={() => window.location.reload()}
      style={{
        marginTop: '20px',
        padding: '12px 24px',
        background: '#6366f1',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer'
      }}
    >
      Reload Page
    </button>
  </div>
);

// Loading component
const LoadingScreen: React.FC = () => (
  <div style={{
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#020617',
    color: '#f8fafc',
    fontFamily: 'Inter, sans-serif'
  }}>
    <div style={{
      width: '48px',
      height: '48px',
      border: '3px solid #1e293b',
      borderTop: '3px solid #6366f1',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }} />
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
    <p style={{ marginTop: '16px', fontSize: '14px', color: '#64748b' }}>
      Loading TTS Cloud...
    </p>
  </div>
);

// Main app wrapper with error handling
const AppWrapper: React.FC = () => {
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading check
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  if (error) {
    return <ErrorFallback error={error} />;
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

// Wait for DOM to be ready before setting up error handlers and mounting
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM ready, initializing TTS Cloud...');
  
  // Global error handler - only set up after DOM is ready
  window.onerror = (message, source, lineno, colno, error) => {
    console.error('Global error:', { message, source, lineno, colno, error });
    const root = document.getElementById('root');
    if (root) {
      root.innerHTML = `<div style="padding:20px;color:red;background:#000;min-height:100vh;">
        <h1>JavaScript Error</h1>
        <pre>${message}</pre>
        <pre>Source: ${source}</pre>
        <pre>Line: ${lineno}</pre>
      </div>`;
    }
  };

  // Catch unhandled promise rejections
  window.onunhandledrejection = (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    const root = document.getElementById('root');
    if (root) {
      root.innerHTML = `<div style="padding:20px;color:red;background:#000;min-height:100vh;">
        <h1>Promise Error</h1>
        <pre>${event.reason}</pre>
      </div>`;
    }
  };

  const rootElement = document.getElementById('root');
  if (!rootElement) {
    document.body.innerHTML = '<div style="padding:20px;color:red;">Error: Could not find root element</div>';
    throw new Error("Could not find root element to mount to");
  }

  // Add loading indicator immediately
  rootElement.innerHTML = '<div style="padding:20px;color:white;background:#020617;min-height:100vh;display:flex;align-items:center;justify-content:center;">Initializing TTS Cloud...</div>';

  console.log('Starting React app...');

  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<AppWrapper />);
    console.log('React app mounted successfully');
  } catch (e) {
    console.error('Failed to mount React app:', e);
    rootElement.innerHTML = `<div style="padding:20px;color:red;background:#000;min-height:100vh;">
      <h1>Mount Error</h1>
      <pre>${e instanceof Error ? e.message : String(e)}</pre>
    </div>`;
  }
});
