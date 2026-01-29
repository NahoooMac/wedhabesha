import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { budgetApi, ExpenseResponse } from '../../lib/api';
import ExpenseForm from './ExpenseForm';
import ExpenseList from './ExpenseList';
import BudgetWarnings from './BudgetWarnings';

interface ExpenseManagementProps {
  weddingId: number;
  onBack: () => void;
}

type ViewMode = 'list' | 'add' | 'edit';

const ExpenseManagement: React.FC<ExpenseManagementProps> = ({ weddingId, onBack }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingExpense, setEditingExpense] = useState<ExpenseResponse | undefined>();

  const { data: budget } = useQuery({
    queryKey: ['budget', weddingId],
    queryFn: () => budgetApi.getBudget(weddingId),
  });

  const { data: summary } = useQuery({
    queryKey: ['budget-summary', weddingId],
    queryFn: () => budgetApi.getBudgetSummary(weddingId),
  });

  const handleAddExpense = () => {
    setEditingExpense(undefined);
    setViewMode('add');
  };

  const handleEditExpense = (expense: ExpenseResponse) => {
    setEditingExpense(expense);
    setViewMode('edit');
  };

  const handleFormComplete = () => {
    setEditingExpense(undefined);
    setViewMode('list');
  };

  const handleFormCancel = () => {
    setEditingExpense(undefined);
    setViewMode('list');
  };

  if (!budget) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-end">
          <Button variant="outline" onClick={onBack}>
            ← Back to Budget
          </Button>
        </div>
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-secondary-600">Loading budget information...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end">
        <div className="flex gap-3">
          {viewMode === 'list' && (
            <Button onClick={handleAddExpense}>
              Add Expense
            </Button>
          )}
          <Button variant="outline" onClick={onBack}>
            ← Back to Budget
          </Button>
        </div>
      </div>

      {/* Budget Warnings */}
      {summary && summary.warnings.length > 0 && (
        <BudgetWarnings warnings={summary.warnings} />
      )}

      {/* Content based on view mode */}
      {viewMode === 'list' && (
        <ExpenseList
          weddingId={weddingId}
          onEditExpense={handleEditExpense}
        />
      )}

      {(viewMode === 'add' || viewMode === 'edit') && (
        <ExpenseForm
          weddingId={weddingId}
          expense={editingExpense}
          onCancel={handleFormCancel}
          onSave={handleFormComplete}
        />
      )}
    </div>
  );
};

export default ExpenseManagement;