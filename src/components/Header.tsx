import React from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import WheelOfSamsaraIcon from './WheelOfSamsaraIcon';

interface HeaderProps {
  onLogoClick: () => void;
  showBackButton?: boolean;
  onBackClick?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onLogoClick, showBackButton, onBackClick }) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            {showBackButton && onBackClick && (
              <button
                onClick={onBackClick}
                className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-purple-50 hover:text-purple-600"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}

            <button
              onClick={onLogoClick}
              className="flex items-center gap-3 transition-opacity hover:opacity-80"
              aria-label="Return to dashboard home"
            >
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-blue-600">
                  <WheelOfSamsaraIcon className="h-6 w-6 text-white" size={24} />
                </div>
                <div className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-400">
                  <Sparkles className="h-2 w-2 text-white" />
                </div>
              </div>
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-xl font-bold text-transparent">
                EverAfter
              </span>
            </button>
          </div>

          <div className="hidden items-center gap-2 text-sm text-gray-600 sm:flex">
            <div className="h-2 w-2 rounded-full bg-green-500" aria-hidden />
            <span aria-live="polite">Legacy active</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
