import React from 'react';
import { FileText, Calendar } from 'lucide-react';
import type { ReportStub } from '../../lib/raphael/monitors';

interface TodayReportsCardProps {
  reports: ReportStub[];
}

export default function TodayReportsCard({ reports }: TodayReportsCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="glass-card neon-border group cursor-pointer">
      <div className="p-5">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Reports</h3>

        {reports.length === 0 ? (
          <div className="text-center py-6">
            <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No recent reports</p>
            <p className="text-xs text-slate-500 mt-1">Reports will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {reports.map((report) => (
              <div
                key={report.id}
                className="p-3 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 hover:border-cyan-500/30 transition-all duration-200 hover:scale-[1.01]"
              >
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {report.title}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {report.summary}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                        {report.type}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(report.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
