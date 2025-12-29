'use client';

import type { OverallSessionStats } from '@/types/adminSession';

interface SessionStatsProps {
  stats: OverallSessionStats | null;
  isLoading: boolean;
}

export default function SessionStats({ stats, isLoading }: SessionStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="p-4 bg-gray-800/50 border border-gray-700 rounded-xl animate-pulse"
          >
            <div className="h-4 w-20 bg-gray-700 rounded mb-2" />
            <div className="h-8 w-16 bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      label: 'Active Sessions',
      value: stats.activeSessions,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
        </svg>
      ),
    },
    {
      label: 'Idle Sessions',
      value: stats.idleSessions,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Total Sessions',
      value: stats.totalSessions,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      label: 'Sessions Today',
      value: stats.sessionsToday,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
  ];

  const detailStats = [
    {
      label: 'Total Tokens Used',
      value: stats.totalTokensUsed.toLocaleString(),
    },
    {
      label: 'Total Commands',
      value: stats.totalCommandsExecuted.toLocaleString(),
    },
    {
      label: 'Avg. Duration',
      value: `${Math.round(stats.averageSessionDuration)} min`,
    },
    {
      label: 'Sessions This Week',
      value: stats.sessionsThisWeek.toLocaleString(),
    },
  ];

  return (
    <div className="space-y-4 mb-6">
      {/* Main stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className={`p-4 ${stat.bgColor} border border-gray-700 rounded-xl`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={stat.color}>{stat.icon}</span>
              <span className="text-sm text-gray-400">{stat.label}</span>
            </div>
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Detail stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {detailStats.map((stat) => (
          <div
            key={stat.label}
            className="p-3 bg-gray-800/30 border border-gray-700/50 rounded-lg"
          >
            <div className="text-xs text-gray-500 mb-1">{stat.label}</div>
            <div className="text-lg font-semibold text-gray-300">{stat.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
