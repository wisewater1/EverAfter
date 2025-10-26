import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, Lock, AlertCircle, Loader, CheckCircle, Brain } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ModalManager } from '../lib/keyboard-navigation';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'signin' | 'signup';
  contextMessage?: string;
  onSuccess?: () => void;
}

export default function AuthModal({ isOpen, onClose, defaultTab = 'signin', contextMessage, onSuccess }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>(defaultTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const modalRef = useRef<HTMLDivElement>(null);
  const modalManagerRef = useRef(new ModalManager());

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    if (user && onSuccess) {
      onSuccess();
      onClose();
    }
  }, [user, onSuccess, onClose]);

  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalManagerRef.current.open(modalRef.current, onClose);
    } else if (!isOpen) {
      modalManagerRef.current.close();
    }

    return () => {
      if (isOpen) {
        modalManagerRef.current.close();
      }
    };
  }, [isOpen, onClose]);

  const passwordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++;
    if (/\d/.test(pwd)) strength++;
    if (/[^a-zA-Z\d]/.test(pwd)) strength++;
    return strength;
  };

  const strength = passwordStrength(password);
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please check your credentials and try again.');
        } else if (error.message.includes('Email not confirmed')) {
          setError('Please confirm your email address before logging in.');
        } else {
          setError(error.message);
        }
        setSubmitting(false);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await signUp(email, password);

      if (error) {
        if (error.message.includes('User already registered') || error.message.includes('already been registered')) {
          setError('This email is already registered. Please sign in instead.');
        } else {
          setError(error.message);
        }
        setSubmitting(false);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-50 p-4 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-gray-700/50 w-full max-w-md max-h-[90vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900"
      >
        {/* Header */}
        <div className="sticky top-0 bg-gray-900/95 backdrop-blur-xl border-b border-gray-700/50 p-4 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-teal-600 rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 id="auth-modal-title" className="text-lg sm:text-xl font-medium text-white">
                {activeTab === 'signin' ? 'Welcome Back' : 'Create Account'}
              </h2>
              {contextMessage && (
                <p className="text-xs text-gray-400 mt-0.5">{contextMessage}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-700/50">
          <button
            onClick={() => {
              setActiveTab('signin');
              setError('');
            }}
            className={`flex-1 px-4 sm:px-6 py-4 text-sm font-medium transition-all min-h-[44px] ${
              activeTab === 'signin'
                ? 'text-white border-b-2 border-blue-500 bg-gray-800/30'
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/20'
            }`}
            role="tab"
            aria-selected={activeTab === 'signin'}
            aria-controls="signin-panel"
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setActiveTab('signup');
              setError('');
            }}
            className={`flex-1 px-4 sm:px-6 py-4 text-sm font-medium transition-all min-h-[44px] ${
              activeTab === 'signup'
                ? 'text-white border-b-2 border-blue-500 bg-gray-800/30'
                : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/20'
            }`}
            role="tab"
            aria-selected={activeTab === 'signup'}
            aria-controls="signup-panel"
          >
            Sign Up
          </button>
        </div>

        {/* Forms */}
        <div className="p-4 sm:p-6">
          {error && (
            <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3 mb-4 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-400 font-medium">
                  {activeTab === 'signin' ? 'Authentication Error' : 'Signup Error'}
                </p>
                <p className="text-sm text-red-300 mt-1">{error}</p>
              </div>
            </div>
          )}

          {activeTab === 'signin' ? (
            <form
              id="signin-panel"
              onSubmit={handleSignIn}
              className="space-y-4"
              role="tabpanel"
              aria-labelledby="auth-modal-title"
            >
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all min-h-[44px]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 bg-gray-900 border-gray-700 rounded text-blue-600 focus:ring-blue-500/50"
                  />
                  <span className="ml-2 text-sm text-gray-400">Remember me</span>
                </label>
                <button
                  type="button"
                  className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-blue-500/25 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                {submitting ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          ) : (
            <form
              id="signup-panel"
              onSubmit={handleSignUp}
              className="space-y-4"
              role="tabpanel"
              aria-labelledby="auth-modal-title"
            >
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all min-h-[44px]"
                  />
                </div>
                {password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all ${
                            i <= strength ? strengthColors[strength - 1] : 'bg-gray-700'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-400">
                      Password strength: <span className={strength >= 4 ? 'text-green-400' : strength >= 3 ? 'text-blue-400' : strength >= 2 ? 'text-yellow-400' : 'text-red-400'}>{strengthLabels[Math.max(0, strength - 1)]}</span>
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all min-h-[44px]"
                  />
                  {confirmPassword && password === confirmPassword && (
                    <CheckCircle className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-400" />
                  )}
                </div>
              </div>

              <div className="flex items-start">
                <input
                  type="checkbox"
                  required
                  className="w-4 h-4 mt-1 bg-gray-900 border-gray-700 rounded text-blue-600 focus:ring-blue-500/50"
                />
                <label className="ml-2 text-sm text-gray-400">
                  I agree to the{' '}
                  <button type="button" className="text-blue-400 hover:text-blue-300">
                    Terms of Service
                  </button>{' '}
                  and{' '}
                  <button type="button" className="text-blue-400 hover:text-blue-300">
                    Privacy Policy
                  </button>
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-blue-500/25 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                {submitting ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Free access • No credit card required</p>
          </div>
        </div>
      </div>
    </div>
  );
}
