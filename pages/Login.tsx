import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/use-auth';
import { Logo } from '../components/Logo';
import { useTheme } from '../contexts/ThemeContext';
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';

export function Login() {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [setupKey, setSetupKey] = useState('');
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const { user, loginMutation, registerMutation } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    if (user) {
      navigate('/app');
    }
  }, [user, navigate]);

  // Allow setup mode via URL parameter: /login?setup=true
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('setup') === 'true') {
      setIsRegisterMode(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      if (isRegisterMode) {
        await registerMutation.mutateAsync({ username, password, name, role: 'admin', setupKey });
      } else {
        await loginMutation.mutateAsync({ username, password });
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    }
  };

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900 overflow-hidden relative selection:bg-primary-500/30">
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 z-50 p-2.5 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg border border-gray-200/50 dark:border-gray-700/50 hover:bg-white dark:hover:bg-gray-700 hover:scale-105 transition-all text-gray-700 dark:text-gray-300"
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? (
          <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>

      {/* Left Side - Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 lg:p-16 relative z-10 transition-all duration-500 ease-in-out">
        <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-block hover:scale-105 transition-transform duration-300">
              <Logo size="lg" showText={true} />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white mt-6">
              {isRegisterMode ? 'Create Account' : 'Welcome back'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-base">
              {isRegisterMode ? ' detailed analytics and reporting' : 'Enter your credentials to access your dashboard'}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="animate-in fade-in zoom-in-95 duration-300 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-sm flex items-start gap-3 shadow-sm">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="font-medium">{error}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegisterMode && (
              <div className="space-y-5 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="group">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                    Setup Key <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={setupKey}
                    onChange={(e) => setSetupKey(e.target.value)}
                    className="w-full px-4 py-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all shadow-sm group-hover:border-gray-300 dark:group-hover:border-gray-600"
                    placeholder="Enter setup key"
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 ml-1">Contact administrator for key</p>
                </div>
                <div className="group">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all shadow-sm group-hover:border-gray-300 dark:group-hover:border-gray-600"
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>
            )}

            <div className="group">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 ml-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all shadow-sm group-hover:border-gray-300 dark:group-hover:border-gray-600"
                placeholder="admin"
                required
                autoComplete="username"
              />
            </div>

            <div className="group">
              <div className="flex items-center justify-between mb-1.5 ml-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </label>
                {!isRegisterMode && (
                  <button type="button" className="text-xs font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors">
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-4 pr-12 py-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all shadow-sm group-hover:border-gray-300 dark:group-hover:border-gray-600"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoComplete={isRegisterMode ? "new-password" : "current-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none p-1 rounded-md transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white py-3.5 px-4 rounded-xl font-semibold hover:from-primary-700 hover:to-primary-800 active:scale-[0.98] focus:ring-4 focus:ring-primary-500/20 disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100 transition-all shadow-lg shadow-primary-500/20 hover:shadow-xl hover:shadow-primary-500/30 flex items-center justify-center gap-2 group"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>{isRegisterMode ? 'Create Account' : 'Sign In'}</span>
                  {!isRegisterMode && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                </>
              )}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="text-center pt-2">

            {isRegisterMode ? (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setIsRegisterMode(false); setError(''); setSetupKey(''); }}
                  className="font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors hover:underline"
                >
                  Sign in instead
                </button>
              </p>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Don't have an account?{' '}
                {/* Hidden trigger for setup mode mainly for admins */}
                <span className="text-gray-400 cursor-default">Contact Administrator</span>
              </p>
            )}
          </div>



        </div>

        <div className="mt-12 text-center space-y-2 animate-in fade-in duration-1000 delay-300">
          <button
            onClick={() => navigate('/')}
            className="text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 text-sm font-medium transition-colors flex items-center justify-center gap-2 mx-auto group"
          >
            <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </button>
          <p className="text-gray-400 dark:text-gray-600 text-xs text-center">
            © {new Date().getFullYear()} Broadway Report Card System
          </p>
        </div>
      </div>

      {/* Right Side - Hero */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary-600 via-primary-700 to-indigo-800 items-center justify-center p-12 relative overflow-hidden">
        {/* Abstract Background Shapes */}
        <div className="absolute inset-0">
          <div className="absolute top-0 -right-20 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl animate-blob"></div>
          <div className="absolute -bottom-32 -left-20 w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary-500/10 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
          {/* Grid Pattern */}
          <svg className="absolute inset-0 w-full h-full opacity-[0.15]" width="100%" height="100%">
            <defs>
              <pattern id="dot-pattern" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dot-pattern)" />
          </svg>
        </div>

        <div className="max-w-xl text-center text-white relative z-10 space-y-8 animate-in fade-in slide-in-from-right-8 duration-1000">
          {/* Illustration / Icon */}
          <div className="relative mx-auto w-40 h-40 mb-6">
            <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse blur-xl"></div>
            <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/20 p-8 rounded-3xl shadow-2xl rotate-3 hover:rotate-6 transition-transform duration-500">
              <Logo size="lg" showText={false} className="text-white w-full h-full" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-full px-4 py-1.5 border border-white/10 shadow-sm">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]"></span>
              <span className="text-xs font-semibold text-white/90 tracking-wide uppercase">Secure & Encrypted</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-white to-white/80">
              Simplify Your School Management
            </h1>
            <p className="text-lg text-blue-100/80 leading-relaxed max-w-md mx-auto">
              Comprehensive report card system designed for modern education. Efficient, reliable, and easy to use.
            </p>
          </div>

          {/* Feature Grid */}
          <div className="grid grid-cols-2 gap-4 mt-8">
            {[
              { title: 'Analytics', icon: '📊', desc: 'Real-time academic tracking' },
              { title: 'Reports', icon: '📄', desc: 'Automated PDF generation' },
              { title: 'Secure', icon: '🔒', desc: 'Enterprise-grade security' },
              { title: 'Cloud', icon: '☁️', desc: 'Access from anywhere' },
            ].map((feature, idx) => (
              <div key={idx} className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:bg-white/10 transition-colors text-left group">
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-300 inline-block">{feature.icon}</div>
                <h3 className="font-semibold text-white mb-0.5">{feature.title}</h3>
                <p className="text-xs text-blue-100/60">{feature.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
