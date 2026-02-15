import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { apiClient } from '../lib/api-client';
import { callEdgeFunction } from '../lib/edge-functions';
import { TrendingUp, Calendar, CheckCircle, AlertCircle, Sparkles, Loader, User } from 'lucide-react';

interface Report {
  id: string;
  start_at: string;
  end_at: string;
  period: string;
  kpis: Record<string, any>;
  findings: Array<{ type: string; text: string }>;
  narrative?: string;
  created_at: string;
}

interface Engram {
  id: string;
  name: string;
}

interface RaphaelInsightsPanelProps {
  engramId?: string;
}

export default function RaphaelInsightsPanel({ engramId: initialEngramId }: RaphaelInsightsPanelProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [period, setPeriod] = useState<'7d' | '30d'>('7d');
  const [error, setError] = useState<string | null>(null);
  const [engrams, setEngrams] = useState<Engram[]>([]);
  const [selectedEngramId, setSelectedEngramId] = useState<string>(initialEngramId || '');
  const [engramsLoading, setEngramsLoading] = useState(true);

  async function loadEngrams() {
    setEngramsLoading(true);
    try {
      const data = await apiClient.getEngrams();

      if (data) {
        setEngrams(data as Engram[]);

        // Auto-select St. Raphael if not already selected
        if (!selectedEngramId) {
          const raphael = data.find((e: any) => e.name === 'St. Raphael');
          if (raphael) {
            setSelectedEngramId(raphael.id);
          } else if (data.length > 0) {
            setSelectedEngramId(data[0].id);
          }
        }
      }
    } catch (err: any) {
      console.error('Error loading engrams:', err);
    } finally {
      setEngramsLoading(false);
    }
  }

  async function loadReports() {
    if (!selectedEngramId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('insight_reports')
        .select('*')
        .eq('engram_id', selectedEngramId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (fetchError) throw fetchError;
      if (data) setReports(data as Report[]);
    } catch (err: any) {
      console.error('Error loading reports:', err);
      setError(err.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }

  async function generateReport() {
    if (!selectedEngramId) {
      setError('Please select an engram first');
      return;
    }

    setGenLoading(true);
    setError(null);

    try {
      const response = await callEdgeFunction<{ report: Report }>('insights-report', {
        engramId: selectedEngramId,
        period
      });

      if (response?.report) {
        setReports(prev => [response.report, ...prev]);
      }
    } catch (err: any) {
      console.error('Error generating report:', err);
      setError(err.message || 'Failed to generate report');
    } finally {
      setGenLoading(false);
    }
  }

  useEffect(() => {
    loadEngrams();
  }, []);

  useEffect(() => {
    if (initialEngramId && initialEngramId !== selectedEngramId) {
      setSelectedEngramId(initialEngramId);
    }
  }, [initialEngramId]);

  useEffect(() => {
    if (selectedEngramId) {
      loadReports();
    }
  }, [selectedEngramId]);

  const getFindingIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'win':
      case 'achievement':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'attention':
      case 'risk':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      case 'consistency':
      case 'engagement':
        return <TrendingUp className="w-4 h-4 text-blue-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-purple-400" />;
    }
  };

  const formatKpiKey = (key: string) => {
    return key
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatKpiValue = (value: any) => {
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    return String(value);
  };

  if (engramsLoading) {
    return (
      <div className="text-center py-12 text-gray-400">
        <Loader className="w-8 h-8 animate-spin mx-auto mb-3" />
        <p className="text-sm">Loading engrams...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Engram Selector */}
      <div className="p-4 bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-xl border border-purple-500/20">
        <label className="flex items-center gap-2 text-sm font-medium text-purple-300 mb-2">
          <User className="w-4 h-4" />
          Select Agent
        </label>
        <select
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          value={selectedEngramId}
          onChange={(e) => setSelectedEngramId(e.target.value)}
        >
          {engrams.length === 0 ? (
            <option value="">No engrams found</option>
          ) : (
            engrams.map((engram) => (
              <option key={engram.id} value={engram.id}>
                {engram.name}
              </option>
            ))
          )}
        </select>
      </div>

      {/* Generation Controls */}
      <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-gray-700/50">
        <select
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          value={period}
          onChange={(e) => setPeriod(e.target.value as '7d' | '30d')}
          disabled={genLoading}
        >
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
        </select>
        <button
          onClick={generateReport}
          disabled={genLoading}
          className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-all font-medium flex items-center gap-2 text-sm"
        >
          {genLoading ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate Report
            </>
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-medium">Error</p>
            <p className="text-red-300 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12 text-gray-400">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-3" />
          <p className="text-sm">Loading reports...</p>
        </div>
      )}

      {/* Reports List */}
      {!loading && (
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="text-center py-12 bg-white/5 rounded-xl border border-gray-700/50">
              <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 mb-2">No reports yet</p>
              <p className="text-gray-500 text-sm">Generate your first insight report to get started</p>
            </div>
          ) : (
            reports.map((report) => (
              <div
                key={report.id}
                className="rounded-2xl border border-gray-700/50 bg-gradient-to-br from-gray-800/50 to-gray-900/50 p-5 hover:border-emerald-500/30 transition-all"
              >
                {/* Report Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium text-emerald-400">{report.period.toUpperCase()}</span>
                    <span>•</span>
                    <span>{new Date(report.start_at).toLocaleDateString()} → {new Date(report.end_at).toLocaleDateString()}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(report.created_at).toLocaleString()}
                  </span>
                </div>

                {/* KPIs Grid */}
                {Object.keys(report.kpis).length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                    {Object.entries(report.kpis).map(([key, value]) => (
                      <div key={key} className="rounded-xl border border-gray-700/50 bg-white/5 p-3">
                        <div className="text-xs text-gray-400 mb-1">{formatKpiKey(key)}</div>
                        <div className="text-lg font-semibold text-white">{formatKpiValue(value)}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Findings */}
                {report.findings && report.findings.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {report.findings.map((finding, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 p-3 rounded-lg bg-white/5 border border-gray-700/30"
                      >
                        {getFindingIcon(finding.type)}
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium text-gray-400 uppercase">
                            {finding.type}:
                          </span>
                          <span className="text-sm text-gray-300 ml-2">{finding.text}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* AI Narrative */}
                {report.narrative && (
                  <div className="mt-4 p-4 rounded-xl bg-emerald-900/20 border border-emerald-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs font-medium text-emerald-400">St. Raphael's Insight</span>
                    </div>
                    <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                      {report.narrative}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
