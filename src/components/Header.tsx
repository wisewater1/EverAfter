import React from 'react';
import { Settings, Bell } from 'lucide-react';

// Dharma Wheel SVG Component
const DharmaWheel = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="12" cy="12" r="2" fill="currentColor"/>
    <line x1="12" y1="2" x2="12" y2="6" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="12" y1="18" x2="12" y2="22" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="22" y1="12" x2="18" y2="12" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="6" y1="12" x2="2" y2="12" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="19.07" y1="4.93" x2="16.24" y2="7.76" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="7.76" y1="16.24" x2="4.93" y2="19.07" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="19.07" y1="19.07" x2="16.24" y2="16.24" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="7.76" y1="7.76" x2="4.93" y2="4.93" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

interface HeaderProps {
  currentUser?: {
    name: string;
    role: 'contributor' | 'family';
  };
}

export function Header({ currentUser }: HeaderProps) {
  return (
    <header className="bg-gray-800/95 backdrop-blur-md border-b border-gray-700/80 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <DharmaWheel className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-xl font-light bg-gradient-to-r from-blue-600 to-teal-600 bg-clip-text text-transparent">
                EverAfter
              </h1>
              <p className="text-xs text-gray-400 -mt-0.5">Digital Legacy Platform</p>
            </div>
          </div>
          
          {currentUser && (
            <div className="flex items-center gap-4">
              <button className="relative p-2 text-gray-400 hover:text-gray-200 transition-all duration-200 hover:bg-gray-700 rounded-xl">
                <Bell className="w-5 h-5" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
              </button>
              
              <div className="flex items-center gap-3 pl-4 border-l border-gray-600">
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{currentUser.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{currentUser.role}</p>
                </div>
                <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-teal-600 rounded-xl flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {currentUser.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <button className="p-2 text-gray-400 hover:text-gray-200 transition-all duration-200 hover:bg-gray-700 rounded-xl">
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}