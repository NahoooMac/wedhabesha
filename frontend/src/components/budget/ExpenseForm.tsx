import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { budgetApi, ExpenseCreateRequest, ExpenseUpdateRequest, ExpenseResponse, BudgetCategoryResponse } from '../../lib/api';
import { formatCurrency, parseETBAmount, validateETBAmount } from '../../lib/utils';

interface ExpenseFormProps {
  weddingId: number;
  expense?: ExpenseResponse;
  onCancel: () => void;
  onSave: () => void;
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ weddingId, expense, onCancel, onSave }) => {
  const isEditing = !!expense;
  
  const [formData, setFormData] = useState({
    budget_category_id: expense?.budget_category_id || 0,
    vendor_id: expense?.vendor_id || undefined,
    description: expense?.description || '',
    amount: expense?.amount.toString() || '',
    date: expense?.date || new Date().toISOString().split('T')[0],
    receipt_url: expense?.receipt_url || '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const queryClient = useQueryClient();

  // Get budget categories
  const { data: budget } = useQuery({
    queryKey: ['budget', weddingId],
    queryFn: () => budgetApi.getBudget(weddingId),
  });

  const createExpenseMutation = useMutation({
    mutationFn: (data: ExpenseCreateRequest) => budgetApi.addExpense(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget', weddingId] });
      queryClient.invalidateQueries({ queryKey: ['budget-summary', weddingId] });
      queryClient.invalidateQueries({ queryKey: ['expenses', weddingId] });
      onSave();
    },
    onError: (error: any) => {
      console.error('Failed to create expense:', error);
      setErrors({ submit: 'Failed to create expense. Please try again.' });
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: (data: ExpenseUpdateRequest) => budgetApi.updateExpense(expense!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget', weddingId] });
      queryClient.invalidateQueries({ queryKey: ['budget-summary', weddingId] });
      queryClient.invalidateQueries({ queryKey: ['expenses', weddingId] });
      onSave();
    },
    onError: (error: any) => {
      console.error('Failed to update expense:', error);
      setErrors({ submit: 'Failed to update expense. Please try again.' });
    },
  });

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.budget_category_id || formData.budget_category_id === 0) {
      newErrors.budget_category_id = 'Please select a category';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    if (!formData.amount.trim()) {
      newErrors.amount = 'Amount is required';
    } else if (!validateETBAmount(formData.amount)) {
      newErrors.amount = 'Please enter a valid amount';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const expenseData = {
      budget_category_id: formData.budget_category_id,
      vendor_id: formData.vendor_id || undefined,
      description: formData.description,
      amount: parseETBAmount(formData.amount),
      date: formData.date,
      receipt_url: formData.receipt_url || undefined,
    };

    if (isEditing) {
      updateExpenseMutation.mutate(expenseData);
    } else {
      createExpenseMutation.mutate(expenseData);
    }
  };

  const isLoading = createExpenseMutation.isPending || updateExpenseMutation.isPending;

  if (!budget) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-secondary-600">Loading budget categories...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? 'Edit Expense' : 'Add New Expense'}</CardTitle>
        <CardDescription>
          {isEditing ? 'Update expense details' : 'Record a new wedding expense'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category Selection */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-secondary-700 mb-2">
              Category *
            </label>
            <select
              id="category"
              value={formData.budget_category_id}
              onChange={(e) => handleInputChange('budget_category_id', parseInt(e.target.value))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                errors.budget_category_id ? 'border-red-500' : 'border-secondary-300'
              }`}
            >
              <option value={0}>Select a category</option>
              {budget.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.category} - {formatCurrency(category.remaining_amount)} remaining
                </option>
              ))}
            </select>
            {errors.budget_category_id && (
              <p className="mt-1 text-sm text-red-600">{errors.budget_category_id}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-secondary-700 mb-2">
              Description *
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              placeholder="Describe the expense (e.g., Wedding venue deposit, Photographer booking fee)"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                errors.description ? 'border-red-500' : 'border-secondary-300'
              }`}
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
            <p className="mt-1 text-sm text-secondary-500">
              {formData.description.length}/500 characters
            </p>
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-secondary-700 mb-2">
              Amount (ETB) *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-500">
                ETB
              </span>
              <input
                type="text"
                id="amount"
                value={formData.amount}
                onChange={(e) => handleInputChange('amount', e.target.value)}
                placeholder="0.00"
                className={`w-full pl-12 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.amount ? 'border-red-500' : 'border-secondary-300'
                }`}
              />
            </div>
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
            )}
          </div>

          {/* Date */}
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-secondary-700 mb-2">
              Date *
            </label>
            <input
              type="date"
              id="date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                errors.date ? 'border-red-500' : 'border-secondary-300'
              }`}
            />
            {errors.date && (
              <p className="mt-1 text-sm text-red-600">{errors.date}</p>
            )}
          </div>

          {/* Receipt URL */}
          <div>
            <label htmlFor="receipt_url" className="block text-sm font-medium text-secondary-700 mb-2">
              Receipt URL (Optional)
            </label>
            <input
              type="url"
              id="receipt_url"
              value={formData.receipt_url}
              onChange={(e) => handleInputChange('receipt_url', e.target.value)}
              placeholder="https://example.com/receipt.pdf"
              className="w-full px-3 py-2 border border-secondary-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <p className="mt-1 text-sm text-secondary-500">
              Link to receipt image or document (optional)
            </p>
          </div>

          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (isEditing ? 'Updating...' : 'Adding...') : (isEditing ? 'Update Expense' : 'Add Expense')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ExpenseForm;