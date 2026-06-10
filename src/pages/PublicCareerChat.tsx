import React from 'react';
import { useParams, Link } from 'react-router-dom';
import CareerChat from '../components/CareerChat';
import { Briefcase, ArrowLeft } from 'lucide-react';

export default function PublicCareerChat() {
  const { token } = useParams<{ token: string }>();

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Invalid Link</h1>
          <p className="text-gray-400 mb-6">This career chat link is not valid.</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-indigo-400 hover:text-indigo-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Go to EverAfter
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
        {/* Minimal Header */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center justify-center space-x-2 mb-2">
            <div className="p-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-white">Career Chat</span>
          </div>
          <p className="text-sm text-gray-400">
            Powered by EverAfter
          </p>
        </div>

        {/* Chat Component */}
        <CareerChat publicToken={token} />

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Want your own AI career assistant?{' '}
            <Link to="/signup" className="text-indigo-400 hover:text-indigo-300">
              Get started with EverAfter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
