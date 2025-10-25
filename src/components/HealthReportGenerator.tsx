import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Download, Calendar, Activity, Heart, Moon, Pill, Save, Loader } from 'lucide-react';
import { uploadFile } from '../lib/file-storage';

export default function HealthReportGenerator() {
  const { user } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [reportType, setReportType] = useState<'weekly' | 'monthly' | 'custom'>('weekly');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [saveToCloud, setSaveToCloud] = useState(true);

  const generateReport = async () => {
    if (!user) return;

    setGenerating(true);
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const [metricsRes, appointmentsRes, prescriptionsRes, goalsRes, logsRes] = await Promise.all([
        supabase
          .from('health_metrics')
          .select('*')
          .gte('recorded_at', start.toISOString())
          .lte('recorded_at', end.toISOString())
          .order('recorded_at', { ascending: true }),
        supabase
          .from('appointments')
          .select('*')
          .gte('scheduled_at', start.toISOString())
          .lte('scheduled_at', end.toISOString()),
        supabase
          .from('prescriptions')
          .select('*')
          .eq('is_active', true),
        supabase
          .from('health_goals')
          .select('*')
          .eq('status', 'active'),
        supabase
          .from('medication_logs')
          .select('*')
          .gte('taken_at', start.toISOString())
          .lte('taken_at', end.toISOString())
      ]);

      const report = generateReportHTML({
        metrics: metricsRes.data || [],
        appointments: appointmentsRes.data || [],
        prescriptions: prescriptionsRes.data || [],
        goals: goalsRes.data || [],
        logs: logsRes.data || [],
        startDate: start,
        endDate: end
      });

      const fileName = `health-report-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.html`;
      const blob = new Blob([report], { type: 'text/html' });

      // Save to cloud storage if enabled
      if (saveToCloud) {
        const file = new File([blob], fileName, { type: 'text/html' });
        await uploadFile(file, {
          category: 'health_report',
          description: `Health report from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`,
          metadata: {
            reportType,
            startDate: start.toISOString(),
            endDate: end.toISOString(),
            generatedAt: new Date().toISOString(),
          },
        });
      }

      // Download to device
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert(saveToCloud ? 'Report generated and saved to cloud!' : 'Report downloaded successfully!');
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report');
    } finally {
      setGenerating(false);
    }
  };

  const generateReportHTML = (data: any) => {
    const { metrics, appointments, prescriptions, goals, logs, startDate, endDate } = data;

    const steps = metrics.filter((m: any) => m.metric_type === 'steps');
    const heartRates = metrics.filter((m: any) => m.metric_type === 'heart_rate');
    const sleep = metrics.filter((m: any) => m.metric_type === 'sleep');

    const avgSteps = steps.length > 0 ? Math.round(steps.reduce((sum: number, m: any) => sum + m.metric_value, 0) / steps.length) : 0;
    const avgHeartRate = heartRates.length > 0 ? Math.round(heartRates.reduce((sum: number, m: any) => sum + m.metric_value, 0) / heartRates.length) : 0;
    const avgSleep = sleep.length > 0 ? Math.round((sleep.reduce((sum: number, m: any) => sum + m.metric_value, 0) / sleep.length) * 10) / 10 : 0;

    const adherence = logs.length > 0 ? Math.round((logs.filter((l: any) => l.status === 'taken').length / logs.length) * 100) : 0;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Health Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
        }
        .container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            padding: 40px;
        }
        h1 { color: #667eea; margin-bottom: 10px; }
        .date-range { color: #666; font-size: 14px; margin-bottom: 30px; }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }
        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }
        .stat-label { font-size: 14px; opacity: 0.9; margin-bottom: 8px; }
        .stat-value { font-size: 36px; font-weight: bold; margin-bottom: 4px; }
        .stat-unit { font-size: 14px; opacity: 0.8; }
        .section {
            margin: 40px 0;
            padding: 25px;
            background: #f8f9fa;
            border-radius: 12px;
        }
        .section-title {
            font-size: 20px;
            font-weight: bold;
            color: #667eea;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .list-item {
            background: white;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 10px;
            border-left: 4px solid #667eea;
        }
        .list-item-title { font-weight: 600; margin-bottom: 5px; }
        .list-item-detail { font-size: 14px; color: #666; }
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
            margin-left: 10px;
        }
        .badge-success { background: #10b981; color: white; }
        .badge-warning { background: #f59e0b; color: white; }
        .badge-info { background: #3b82f6; color: white; }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Health Report</h1>
        <div class="date-range">
            ${startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} -
            ${endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-label">Average Daily Steps</div>
                <div class="stat-value">${avgSteps.toLocaleString()}</div>
                <div class="stat-unit">steps per day</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Average Heart Rate</div>
                <div class="stat-value">${avgHeartRate}</div>
                <div class="stat-unit">bpm</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Average Sleep</div>
                <div class="stat-value">${avgSleep}</div>
                <div class="stat-unit">hours per night</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Medication Adherence</div>
                <div class="stat-value">${adherence}%</div>
                <div class="stat-unit">of doses taken</div>
            </div>
        </div>

        ${prescriptions.length > 0 ? `
        <div class="section">
            <div class="section-title">💊 Active Medications (${prescriptions.length})</div>
            ${prescriptions.map((p: any) => `
                <div class="list-item">
                    <div class="list-item-title">
                        ${p.medication_name}
                        ${p.refills_remaining <= 1 ? '<span class="badge badge-warning">Low Refills</span>' : ''}
                    </div>
                    <div class="list-item-detail">${p.dosage} - ${p.frequency}</div>
                </div>
            `).join('')}
        </div>
        ` : ''}

        ${appointments.length > 0 ? `
        <div class="section">
            <div class="section-title">📅 Appointments (${appointments.length})</div>
            ${appointments.map((a: any) => `
                <div class="list-item">
                    <div class="list-item-title">
                        ${a.title}
                        <span class="badge badge-info">${a.status}</span>
                    </div>
                    <div class="list-item-detail">
                        ${new Date(a.scheduled_at).toLocaleString('en-US')}${a.provider_name ? ` • ${a.provider_name}` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
        ` : ''}

        ${goals.length > 0 ? `
        <div class="section">
            <div class="section-title">🎯 Active Health Goals (${goals.length})</div>
            ${goals.map((g: any) => {
                const progress = Math.round((g.current_value / g.target_value) * 100);
                return `
                <div class="list-item">
                    <div class="list-item-title">
                        ${g.goal_title}
                        <span class="badge badge-${progress >= 75 ? 'success' : progress >= 50 ? 'info' : 'warning'}">
                            ${progress}% Complete
                        </span>
                    </div>
                    <div class="list-item-detail">
                        ${g.current_value} / ${g.target_value} ${g.target_unit} •
                        Target: ${new Date(g.target_date).toLocaleDateString('en-US')}
                    </div>
                </div>
            `}).join('')}
        </div>
        ` : ''}

        <div class="footer">
            <p><strong>Generated by EverAfter Health Monitor</strong></p>
            <p>Powered by St. Raphael AI • ${new Date().toLocaleString('en-US')}</p>
            <p style="margin-top: 10px; font-size: 12px;">
                This report is for personal health tracking purposes only and should not replace professional medical advice.
            </p>
        </div>
    </div>
</body>
</html>`;
  };

  return (
    <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-xl rounded-2xl p-8 border border-gray-700/50 shadow-2xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white">Health Report Generator</h2>
          </div>
          <p className="text-gray-400 ml-15">Generate comprehensive health reports with all your data</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button
          onClick={() => {
            setReportType('weekly');
            setStartDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
            setEndDate(new Date().toISOString().split('T')[0]);
          }}
          className={`p-6 rounded-xl border-2 transition-all group hover:scale-[1.02] ${
            reportType === 'weekly'
              ? 'bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border-blue-500 shadow-lg shadow-blue-500/20'
              : 'bg-gray-800/30 border-gray-700 hover:border-blue-500/50'
          }`}
        >
          <div className={`w-12 h-12 rounded-lg mx-auto mb-3 flex items-center justify-center transition-all ${
            reportType === 'weekly' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400 group-hover:bg-gray-600'
          }`}>
            <Calendar className="w-6 h-6" />
          </div>
          <p className={`font-semibold text-center text-lg ${
            reportType === 'weekly' ? 'text-white' : 'text-gray-300'
          }`}>Weekly Report</p>
          <p className="text-sm text-center text-gray-400 mt-1">Last 7 days</p>
        </button>

        <button
          onClick={() => {
            setReportType('monthly');
            setStartDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
            setEndDate(new Date().toISOString().split('T')[0]);
          }}
          className={`p-6 rounded-xl border-2 transition-all group hover:scale-[1.02] ${
            reportType === 'monthly'
              ? 'bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border-blue-500 shadow-lg shadow-blue-500/20'
              : 'bg-gray-800/30 border-gray-700 hover:border-blue-500/50'
          }`}
        >
          <div className={`w-12 h-12 rounded-lg mx-auto mb-3 flex items-center justify-center transition-all ${
            reportType === 'monthly' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400 group-hover:bg-gray-600'
          }`}>
            <Calendar className="w-6 h-6" />
          </div>
          <p className={`font-semibold text-center text-lg ${
            reportType === 'monthly' ? 'text-white' : 'text-gray-300'
          }`}>Monthly Report</p>
          <p className="text-sm text-center text-gray-400 mt-1">Last 30 days</p>
        </button>

        <button
          onClick={() => setReportType('custom')}
          className={`p-6 rounded-xl border-2 transition-all group hover:scale-[1.02] ${
            reportType === 'custom'
              ? 'bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border-blue-500 shadow-lg shadow-blue-500/20'
              : 'bg-gray-800/30 border-gray-700 hover:border-blue-500/50'
          }`}
        >
          <div className={`w-12 h-12 rounded-lg mx-auto mb-3 flex items-center justify-center transition-all ${
            reportType === 'custom' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400 group-hover:bg-gray-600'
          }`}>
            <Calendar className="w-6 h-6" />
          </div>
          <p className={`font-semibold text-center text-lg ${
            reportType === 'custom' ? 'text-white' : 'text-gray-300'
          }`}>Custom Range</p>
          <p className="text-sm text-center text-gray-400 mt-1">Select dates</p>
        </button>
      </div>

      {reportType === 'custom' && (
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-xl p-6 mb-6 border border-gray-700/50">
        <p className="text-white font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" />
          Your report will include:
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 text-gray-200">
            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-green-400" />
            </div>
            <span className="text-sm font-medium">Health Metrics & Analytics</span>
          </div>
          <div className="flex items-center gap-3 text-gray-200">
            <div className="w-8 h-8 bg-pink-500/20 rounded-lg flex items-center justify-center">
              <Pill className="w-5 h-5 text-pink-400" />
            </div>
            <span className="text-sm font-medium">Medication Adherence</span>
          </div>
          <div className="flex items-center gap-3 text-gray-200">
            <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-red-400" />
            </div>
            <span className="text-sm font-medium">Appointments Summary</span>
          </div>
          <div className="flex items-center gap-3 text-gray-200">
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Moon className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-sm font-medium">Health Goals Progress</span>
          </div>
        </div>
      </div>

      {/* Save to Cloud Toggle */}
      <div className="bg-gray-800/30 rounded-xl p-4 mb-6 border border-gray-700/50">
        <label className="flex items-center justify-between cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Save className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-white font-medium">Save to Cloud Storage</p>
              <p className="text-sm text-gray-400">Automatically save report to your account</p>
            </div>
          </div>
          <div
            onClick={() => setSaveToCloud(!saveToCloud)}
            className={`relative w-14 h-7 rounded-full transition-all ${
              saveToCloud ? 'bg-blue-600' : 'bg-gray-700'
            }`}
          >
            <div
              className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-transform ${
                saveToCloud ? 'translate-x-7' : 'translate-x-0'
              }`}
            />
          </div>
        </label>
      </div>

      <button
        onClick={generateReport}
        disabled={generating}
        className="w-full px-8 py-5 bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 text-white rounded-xl hover:shadow-xl hover:shadow-blue-500/30 transition-all font-semibold text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
      >
        {generating ? (
          <>
            <Loader className="w-6 h-6 animate-spin" />
            Generating Report...
          </>
        ) : (
          <>
            <Download className="w-6 h-6 group-hover:animate-bounce" />
            Generate & {saveToCloud ? 'Save' : 'Download'} Report
          </>
        )}
      </button>
    </div>
  );
}
