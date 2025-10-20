import React from 'react';

interface CustomEngramsDashboardProps {
  userId: string;
}

export default function CustomEngramsDashboard({ userId }: CustomEngramsDashboardProps) {
  return (
    <div className="bg-gradient-to-br from-gray-800 via-gray-800 to-blue-900/20 rounded-2xl shadow-2xl border border-gray-700/50 p-8 backdrop-blur-sm">
      <h2 className="text-2xl font-light text-white mb-4">Custom Engrams</h2>
      <p className="text-gray-400">Custom Engrams functionality coming soon...</p>
    </div>
  );
}
