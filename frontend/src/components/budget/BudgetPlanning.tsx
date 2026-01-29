import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '../ui/Card';
import { budgetApi } from '../../lib/api';
import BudgetSetupWizard from './BudgetSetupWizard';
import BudgetOverview from './BudgetOverview';
import BudgetEditor from './BudgetEditor';
import ExpenseManagement from './ExpenseManagement';
import BudgetVisualization from './BudgetVisualization';

// Icon Components
const Icons = {
  Dollar: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  ArrowRight: ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
};

interface BudgetPlanningProps {
  weddingId: number;
}

type ViewMode = 'overview' | 'setup' | 'edit' | 'expenses' | 'visualization';

const BudgetPlanning: React.FC<BudgetPlanningProps> = ({ weddingId }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('overview');

  const { data: budget, isLoading, error } = useQuery({
    queryKey: ['budget', weddingId],
    queryFn: () => budgetApi.getBudget(weddingId),
    retry: (failureCount, error: any) => {
      // Don't retry if it's a 404 (no budget found)
      if (error?.message?.includes('404')) {
        return false;
      }
      return failureCount < 3;
    },
  });

  const handleBudgetCreated = () => {
    setViewMode('overview');
  };

  const handleEditComplete = () => {
    setViewMode('overview');
  };

  const handleManageExpenses = () => {
    setViewMode('expenses');
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          {/* KPI Cards Skeleton */}
          <div className="grid md:grid-cols-4 gap-6 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-slate-200 dark:bg-slate-800 rounded-2xl h-32"></div>
            ))}
          </div>
          {/* Main Content Skeleton */}
          <div className="bg-slate-200 dark:bg-slate-800 rounded-2xl h-64"></div>
        </div>
      </div>
    );
  }

  // Show setup wizard if no budget exists
  if (error?.message?.includes('404') || !budget) {
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/40 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
            <Icons.Dollar className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            Set Up Your Wedding Budget
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            Create a comprehensive budget to track your wedding expenses
          </p>
        </div>
        <BudgetSetupWizard weddingId={weddingId} onComplete={handleBudgetCreated} />
      </div>
    );
  }

  // Show different views based on mode
  if (viewMode === 'edit') {
    return (
      <div className="space-y-6">
        <BudgetEditor
          weddingId={weddingId}
          budget={budget}
          onCancel={() => setViewMode('overview')}
          onSave={handleEditComplete}
        />
      </div>
    );
  }

  if (viewMode === 'expenses') {
    return (
      <ExpenseManagement
        weddingId={weddingId}
        onBack={() => setViewMode('overview')}
      />
    );
  }

  if (viewMode === 'visualization') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setViewMode('overview')}
            className="flex items-center text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 font-medium transition-colors"
          >
            <Icons.ArrowRight className="w-4 h-4 mr-2 rotate-180" />
            Back to Overview
          </button>
        </div>
        <BudgetVisualization budget={budget} />
      </div>
    );
  }

  // Default overview mode
  return (
    <div className="space-y-6">
      <BudgetOverview
        weddingId={weddingId}
        onEditBudget={() => setViewMode('edit')}
        onManageExpenses={handleManageExpenses}
        onViewVisualization={() => setViewMode('visualization')}
      />
    </div>
  );
};

export default BudgetPlanning;