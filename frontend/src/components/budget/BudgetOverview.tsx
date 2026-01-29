import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { budgetApi, BudgetResponse, BudgetSummary } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';

interface BudgetOverviewProps {
  weddingId: number;
  onEditBudget: () => void;
  onManageExpenses: () => void;
  onViewVisualization?: () => void;
}

const BudgetOverview: React.FC<BudgetOverviewProps> = ({ 
  weddingId, 
  onEditBudget, 
  onManageExpenses,
  onViewVisualization 
}) => {
  const { data: budget, isLoading: budgetLoading } = useQuery({
    queryKey: ['budget', weddingId],
    queryFn: () => budgetApi.getBudget(weddingId),
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['budget-summary', weddingId],
    queryFn: () => budgetApi.getBudgetSummary(weddingId),
    enabled: !!budget,
  });

  if (budgetLoading || summaryLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          {/* KPI Cards Skeleton */}
          <div className="grid md:grid-cols-4 gap-6 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-slate-200 dark:bg-slate-800 rounded-2xl h-32"></div>
            ))}
          </div>
          {/* Category Cards Skeleton */}
          <div className="bg-slate-200 dark:bg-slate-800 rounded-2xl h-64"></div>
        </div>
      </div>
    );
  }

  if (!budget || !summary) {
    return null;
  }

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-gradient-to-r from-red-500 to-red-600';
    if (percentage >= 90) return 'bg-gradient-to-r from-amber-500 to-amber-600';
    return 'bg-gradient-to-r from-emerald-500 to-emerald-600';
  };

  const getWarningColor = (level: string) => {
    return level === 'exceeded' ? 'text-red-600' : 'text-yellow-600';
  };

  return (
    <div className="space-y-6">
      {/* Budget Summary Cards */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Total Budget</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {formatCurrency(summary.total_budget, summary.currency)}
              </p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <svg className="w-7 h-7 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Total Spent</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {formatCurrency(summary.total_spent, summary.currency)}
              </p>
              <div className="mt-3">
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(summary.percentage_spent)}`}
                    style={{ width: `${Math.min(summary.percentage_spent, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {summary.percentage_spent.toFixed(1)}% of budget
                </p>
              </div>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/40 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <svg className="w-7 h-7 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Remaining</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {formatCurrency(summary.total_remaining, summary.currency)}
              </p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <svg className="w-7 h-7 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md hover:scale-105 transition-all duration-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">Total Expenses</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">
                {summary.expenses_count}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Across {summary.categories_count} categories
              </p>
            </div>
            <div className="w-14 h-14 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800/40 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
              <svg className="w-7 h-7 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {summary.warnings.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40 rounded-xl flex items-center justify-center mr-3 shadow-lg shadow-amber-500/20">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-amber-800 dark:text-amber-200">Budget Warnings</h3>
          </div>
          <div className="space-y-2">
            {summary.warnings.map((warning, index) => (
              <div key={index} className={`text-sm ${getWarningColor(warning.warning_level)} dark:text-amber-200`}>
                <strong>{warning.category}:</strong> {warning.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Budget Categories</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Track spending across different wedding categories
          </p>
        </div>
        <div className="space-y-4">
          {budget.categories.map((category) => (
            <div key={category.id} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-medium text-slate-900 dark:text-white">{category.category}</h4>
                <div className="text-right">
                  <div className="text-sm font-medium text-slate-900 dark:text-white">
                    {formatCurrency(category.spent_amount, budget.currency)} / {formatCurrency(category.allocated_amount, budget.currency)}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {category.percentage_spent.toFixed(1)}% spent
                  </div>
                </div>
              </div>
              
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 mb-3 overflow-hidden">
                <div 
                  className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(category.percentage_spent)}`}
                  style={{ width: `${Math.min(category.percentage_spent, 100)}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600 dark:text-slate-400">
                  Remaining: {formatCurrency(category.remaining_amount, budget.currency)}
                </span>
                <button
                  onClick={() => onManageExpenses()}
                  className="px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
                >
                  View Expenses
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          onClick={onEditBudget}
          className="px-6 py-3 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 hover:scale-105 transition-all duration-200 font-medium shadow-sm"
        >
          Edit Budget
        </button>
        <div className="flex gap-3">
          {onViewVisualization && (
            <button
              onClick={onViewVisualization}
              className="px-6 py-3 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 hover:scale-105 transition-all duration-200 font-medium shadow-sm"
            >
              View Charts
            </button>
          )}
          <button
            onClick={onManageExpenses}
            className="px-6 py-3 text-white bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 rounded-xl hover:scale-105 transition-all duration-200 font-medium shadow-lg shadow-rose-500/30"
          >
            Manage Expenses
          </button>
        </div>
      </div>
    </div>
  );
};

export default BudgetOverview;