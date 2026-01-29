import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { budgetApi, ExpenseResponse } from '../../lib/api';
import { formatCurrency, formatDate } from '../../lib/utils';

interface ExpenseListProps {
  weddingId: number;
  categoryId?: number;
  onEditExpense: (expense: ExpenseResponse) => void;
}

const ExpenseList: React.FC<ExpenseListProps> = ({ weddingId, categoryId, onEditExpense }) => {
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'category'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterCategory, setFilterCategory] = useState<number | undefined>(categoryId);

  const queryClient = useQueryClient();

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['expenses', weddingId, filterCategory],
    queryFn: () => budgetApi.getExpenses(weddingId, filterCategory),
  });

  const { data: budget } = useQuery({
    queryKey: ['budget', weddingId],
    queryFn: () => budgetApi.getBudget(weddingId),
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (expenseId: number) => budgetApi.deleteExpense(expenseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget', weddingId] });
      queryClient.invalidateQueries({ queryKey: ['budget-summary', weddingId] });
      queryClient.invalidateQueries({ queryKey: ['expenses', weddingId] });
    },
    onError: (error: any) => {
      console.error('Failed to delete expense:', error);
    },
  });

  const handleSort = (field: 'date' | 'amount' | 'category') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const handleDeleteExpense = (expense: ExpenseResponse) => {
    if (window.confirm(`Are you sure you want to delete the expense "${expense.description}"?`)) {
      deleteExpenseMutation.mutate(expense.id);
    }
  };

  const getCategoryName = (categoryId: number): string => {
    const category = budget?.categories.find(c => c.id === categoryId);
    return category?.category || 'Unknown Category';
  };

  const sortedExpenses = expenses ? [...expenses].sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortBy) {
      case 'date':
        aValue = new Date(a.date);
        bValue = new Date(b.date);
        break;
      case 'amount':
        aValue = a.amount;
        bValue = b.amount;
        break;
      case 'category':
        aValue = getCategoryName(a.budget_category_id);
        bValue = getCategoryName(b.budget_category_id);
        break;
      default:
        return 0;
    }
    
    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  }) : [];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-secondary-600">Loading expenses...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense History</CardTitle>
        <CardDescription>
          Track and manage all your wedding expenses
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters and sorting */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <label htmlFor="categoryFilter" className="block text-sm font-medium text-secondary-700 mb-1">
              Filter by Category
            </label>
            <select
              id="categoryFilter"
              value={filterCategory || ''}
              onChange={(e) => setFilterCategory(e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Categories</option>
              {budget?.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.category}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSort('date')}
              className={sortBy === 'date' ? 'bg-primary-50 text-primary-700' : ''}
            >
              Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSort('amount')}
              className={sortBy === 'amount' ? 'bg-primary-50 text-primary-700' : ''}
            >
              Amount {sortBy === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSort('category')}
              className={sortBy === 'category' ? 'bg-primary-50 text-primary-700' : ''}
            >
              Category {sortBy === 'category' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
          </div>
        </div>

        {/* Expense list */}
        {sortedExpenses.length === 0 ? (
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-secondary-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <h3 className="text-lg font-medium text-secondary-900 mb-2">No Expenses Found</h3>
            <p className="text-secondary-600">
              {filterCategory ? 'No expenses found for the selected category.' : 'Start tracking your wedding expenses by adding your first expense.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedExpenses.map((expense) => (
              <div key={expense.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-secondary-900">{expense.description}</h4>
                      {expense.receipt_url && (
                        <a
                          href={expense.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:text-primary-700"
                          title="View Receipt"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                        </a>
                      )}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm text-secondary-600">
                      <span className="font-medium">{getCategoryName(expense.budget_category_id)}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>{formatDate(expense.date)}</span>
                      {expense.vendor_name && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span>Vendor: {expense.vendor_name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-lg font-semibold text-secondary-900">
                        {formatCurrency(expense.amount)}
                      </div>
                      <div className="text-xs text-secondary-500">
                        Added {formatDate(expense.created_at)}
                      </div>
                    </div>
                    
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEditExpense(expense)}
                        className="text-primary-600 hover:text-primary-700"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteExpense(expense)}
                        disabled={deleteExpenseMutation.isPending}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        {sortedExpenses.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <div className="flex justify-between items-center text-sm">
              <span className="text-secondary-600">
                Total: {sortedExpenses.length} expense{sortedExpenses.length !== 1 ? 's' : ''}
              </span>
              <span className="font-medium text-secondary-900">
                Total Amount: {formatCurrency(sortedExpenses.reduce((sum, expense) => sum + expense.amount, 0))}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExpenseList;