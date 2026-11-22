'use client';

import { AlertTriangle, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import type { ComponentType } from 'react';

interface Insight {
  id: string;
  category: string;
  categoryColor: string;
  categoryBg: string;
  icon: ComponentType<{ className?: string }>;
  iconColor: string;
  title: string;
  description: string;
}

interface AiInsightsProps {
  receivables: number;
  overdueCount: number;
  netProfit: number;
}

export function AiInsights({ receivables, overdueCount, netProfit }: AiInsightsProps) {
  const insights: Insight[] = [];

  if (overdueCount > 0) {
    insights.push({
      id: 'overdue',
      category: 'Collections',
      categoryColor: 'text-red-700',
      categoryBg: 'bg-red-50',
      icon: AlertTriangle,
      iconColor: 'text-red-500',
      title: `${overdueCount} overdue invoice${overdueCount > 1 ? 's' : ''} need attention`,
      description: 'Follow up with customers to maintain healthy cash flow.',
    });
  }

  if (receivables > 0) {
    insights.push({
      id: 'receivables',
      category: 'Receivables',
      categoryColor: 'text-amber-700',
      categoryBg: 'bg-amber-50',
      icon: Clock,
      iconColor: 'text-amber-500',
      title: `AED ${(receivables / 1000).toFixed(0)}K outstanding receivables`,
      description: 'Send reminders to customers with pending balances.',
    });
  }

  if (netProfit > 0) {
    insights.push({
      id: 'profit',
      category: 'Performance',
      categoryColor: 'text-emerald-700',
      categoryBg: 'bg-emerald-50',
      icon: TrendingUp,
      iconColor: 'text-emerald-500',
      title: 'Profitable this month',
      description: 'Your business is generating positive returns. Keep it up!',
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: 'default',
      category: 'All Clear',
      categoryColor: 'text-blue-700',
      categoryBg: 'bg-blue-50',
      icon: CheckCircle2,
      iconColor: 'text-blue-500',
      title: 'No critical alerts',
      description: 'Your financials look healthy. Add transactions to see insights.',
    });
  }

  return (
    <div className="rounded-2xl bg-white px-6 py-5 shadow-sm ring-1 ring-gray-100">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">AI Copilot</h3>
        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
          {insights.length} insight{insights.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {insights.map((insight) => {
          const Icon = insight.icon;
          return (
            <div key={insight.id} className="flex items-start gap-3 rounded-xl bg-gray-50 p-3 hover:bg-gray-100 transition-colors">
              <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm`}>
                <Icon className={`h-4 w-4 ${insight.iconColor}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${insight.categoryColor} ${insight.categoryBg}`}>
                    {insight.category}
                  </span>
                </div>
                <p className="mt-1 text-sm font-semibold text-gray-800">{insight.title}</p>
                <p className="text-xs text-gray-500">{insight.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
