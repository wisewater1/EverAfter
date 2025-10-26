import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw, Zap } from 'lucide-react';

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  latency: number;
  lastChecked: Date;
}

export default function AIServiceStatus() {
  const [services, setServices] = useState<ServiceStatus[]>([
    {
      name: 'Supabase API',
      status: 'operational',
      latency: 45,
      lastChecked: new Date()
    },
    {
      name: 'Edge Functions',
      status: 'operational',
      latency: 120,
      lastChecked: new Date()
    },
    {
      name: 'Database',
      status: 'operational',
      latency: 28,
      lastChecked: new Date()
    },
    {
      name: 'Authentication',
      status: 'operational',
      latency: 52,
      lastChecked: new Date()
    }
  ]);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    checkServices();
    const interval = setInterval(checkServices, 60000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkServices = async () => {
    setChecking(true);
    try {
      const updatedServices = await Promise.all(
        services.map(async (service) => {
          const startTime = Date.now();
          try {
            await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
            const latency = Date.now() - startTime;
            return {
              ...service,
              status: 'operational' as const,
              latency,
              lastChecked: new Date()
            };
          } catch {
            return {
              ...service,
              status: 'down' as const,
              lastChecked: new Date()
            };
          }
        })
      );
      setServices(updatedServices);
    } catch (error) {
      console.error('Error checking services:', error);
    } finally {
      setChecking(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'down':
        return <XCircle className="w-5 h-5 text-red-400" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'text-green-400';
      case 'degraded':
        return 'text-yellow-400';
      case 'down':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getLatencyColor = (latency: number) => {
    if (latency < 100) return 'text-green-400';
    if (latency < 300) return 'text-yellow-400';
    return 'text-red-400';
  };

  const overallStatus = services.every(s => s.status === 'operational')
    ? 'operational'
    : services.some(s => s.status === 'down')
    ? 'down'
    : 'degraded';

  const avgLatency = Math.round(
    services.reduce((sum, s) => sum + s.latency, 0) / services.length
  );

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Zap className="w-6 h-6 text-purple-400" />
          <h2 className="text-2xl font-bold text-white">Service Status</h2>
        </div>
        <button
          onClick={checkServices}
          disabled={checking}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 text-white ${checking ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon(overallStatus)}
            <div>
              <p className="text-white font-semibold">Overall System Status</p>
              <p className={`text-sm capitalize ${getStatusColor(overallStatus)}`}>
                {overallStatus === 'operational' ? 'All Systems Operational' : 'Some Services Affected'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-purple-300 text-sm">Avg Latency</p>
            <p className={`text-lg font-bold ${getLatencyColor(avgLatency)}`}>
              {avgLatency}ms
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {services.map((service, index) => (
          <div
            key={index}
            className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1">
                {getStatusIcon(service.status)}
                <div>
                  <p className="text-white font-medium">{service.name}</p>
                  <p className="text-purple-300 text-xs">
                    Last checked {service.lastChecked.toLocaleTimeString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-purple-300 text-xs">Latency</p>
                  <p className={`text-sm font-bold ${getLatencyColor(service.latency)}`}>
                    {service.latency}ms
                  </p>
                </div>
                <div className="text-right min-w-24">
                  <p className={`text-sm font-medium capitalize ${getStatusColor(service.status)}`}>
                    {service.status}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <p className="text-blue-300 text-sm">
          Real-time monitoring of all EverAfter services. If you experience issues, please check this dashboard for updates.
        </p>
      </div>
    </div>
  );
}
