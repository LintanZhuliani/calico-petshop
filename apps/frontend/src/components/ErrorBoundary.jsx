import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
          <div className="bg-white p-8 rounded-3xl shadow-lg max-w-md w-full text-center space-y-4">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined !text-[40px]">warning</span>
            </div>
            <h1 className="text-xl font-bold text-slate-800">Oops! Sesuatu tidak beres.</h1>
            <p className="text-sm text-slate-500">
              Maaf, aplikasi mengalami masalah saat menampilkan layar ini. Mohon muat ulang halaman.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 active:scale-95 transition-all"
            >
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
