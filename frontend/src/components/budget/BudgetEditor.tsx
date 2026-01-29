import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { budgetApi, BudgetResponse, BudgetUpdateRequest, BudgetCategoryCreateRequest, BudgetCategoryUpdateRequest } from '../../lib/api';
import { formatCurrency, parseETBAmount, validateETBAmount } from '../../lib/utils';

interface BudgetEditorProps {
  weddingId: number;
  budget: BudgetResponse;
  onCancel: () => void;
  onSave: () => void;
}

const BudgetEditor: React.FC<BudgetEditorProps> = ({ weddingId, budget, onCancel, onSave }) => {
  const [totalBudget, setTotalBudget] = useState<string>(budget.total_budget.toString());
  const [categories, setCategories] = useState(
    budget.categories.map(cat => ({
      id: cat.id,
      name: cat.category,
      amount: cat.allocated_amount.toString(),
      isNew: false,
    }))
  );
  const [newCategory, setNewCategory] = useState<{ name: string; amount: string }>({ name: '', amount: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const queryClient = useQueryClient();

  const updateBudgetMutation = useMutation({
    mutationFn: (data: BudgetUpdateRequest) => budgetApi.updateBudget(weddingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget', weddingId] });
      queryClient.invalidateQueries({ queryKey: ['budget-summary', weddingId] });
    },
  });

  const addCategoryMutation = useMutation({
    mutationFn: (data: BudgetCategoryCreateRequest) => budgetApi.addCategory(weddingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget', weddingId] });
      queryClient.invalidateQueries({ queryKey: ['budget-summary', weddingId] });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ categoryId, data }: { categoryId: number; data: BudgetCategoryUpdateRequest }) => 
      budgetApi.updateCategory(categoryId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget', weddingId] });
      queryClient.invalidateQueries({ queryKey: ['budget-summary', weddingId] });
    },
  });

  const handleCategoryAmountChange = (index: number, value: string) => {
    const newCategories = [...categories];
    newCategories[index].amount = value;
    setCategories(newCategories);
  };

  const handleCategoryNameChange = (index: number, value: string) => {
    const newCategories = [...categories];
    newCategories[index].name = value;
    setCategories(newCategories);
  };

  const handleAddCategory = () => {
    const newErrors: Record<string, string> = {};
    
    if (!newCategory.name.trim()) {
      newErrors.newCategoryName = 'Category name is required';
    }
    if (!newCategory.amount.trim()) {
      newErrors.newCategoryAmount = 'Amount is required';
    } else if (!validateETBAmount(newCategory.amount)) {
      newErrors.newCategoryAmount = 'Please enter a valid amount';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setCategories([...categories, {
      id: -1, // Temporary ID for new categories
      name: newCategory.name,
      amount: newCategory.amount,
      isNew: true,
    }]);
    setNewCategory({ name: '', amount: '' });
    setErrors({});
  };

  const handleRemoveCategory = (index: number) => {
    const newCategories = categories.filter((_, i) => i !== index);
    setCategories(newCategories);
  };

  const handleSave = async () => {
    const newErrors: Record<string, string> = {};
    
    // Validate total budget
    if (!totalBudget.trim()) {
      newErrors.totalBudget = 'Total budget is required';
    } else if (!validateETBAmount(totalBudget)) {
      newErrors.totalBudget = 'Please enter a valid amount';
    }

    // Validate categories
    if (categories.length === 0) {
      newErrors.categories = 'At least one category is required';
    }

    categories.forEach((cat, index) => {
      if (!cat.name.trim()) {
        newErrors[`category_${index}_name`] = 'Category name is required';
      }
      if (!cat.amount.trim()) {
        newErrors[`category_${index}_amount`] = 'Amount is required';
      } else if (!validateETBAmount(cat.amount)) {
        newErrors[`category_${index}_amount`] = 'Please enter a valid amount';
      }
    });

    // Check if total allocation exceeds budget
    const totalAllocated = categories.reduce((sum, cat) => sum + parseETBAmount(cat.amount), 0);
    const budgetAmount = parseETBAmount(totalBudget);
    
    if (totalAllocated > budgetAmount) {
      newErrors.totalAllocation = `Total allocation (${formatCurrency(totalAllocated)}) exceeds budget (${formatCurrency(budgetAmount)})`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      // Update total budget if changed
      const budgetAmount = parseETBAmount(totalBudget);
      if (budgetAmount !== budget.total_budget) {
        await updateBudgetMutation.mutateAsync({
          total_budget: budgetAmount,
        });
      }

      // Update existing categories and add new ones
      for (const category of categories) {
        if (category.isNew) {
          // Add new category
          await addCategoryMutation.mutateAsync({
            category: category.name,
            allocated_amount: parseETBAmount(category.amount),
          });
        } else {
          // Update existing category
          const originalCategory = budget.categories.find(c => c.id === category.id);
          if (originalCategory && 
              (originalCategory.category !== category.name || 
               originalCategory.allocated_amount !== parseETBAmount(category.amount))) {
            await updateCategoryMutation.mutateAsync({
              categoryId: category.id,
              data: {
                category: category.name,
                allocated_amount: parseETBAmount(category.amount),
              },
            });
          }
        }
      }

      onSave();
    } catch (error) {
      console.error('Failed to update budget:', error);
      setErrors({ submit: 'Failed to update budget. Please try again.' });
    }
  };

  const totalAllocated = categories.reduce((sum, cat) => sum + parseETBAmount(cat.amount), 0);
  const budgetAmount = parseETBAmount(totalBudget);
  const remaining = budgetAmount - totalAllocated;

  const isLoading = updateBudgetMutation.isPending || addCategoryMutation.isPending || updateCategoryMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Budget</CardTitle>
        <CardDescription>
          Update your wedding budget and category allocations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Budget */}
        <div>
          <label htmlFor="totalBudget" className="block text-sm font-medium text-secondary-700 mb-2">
            Total Budget (ETB)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-500">
              ETB
            </span>
            <input
              type="text"
              id="totalBudget"
              value={totalBudget}
              onChange={(e) => setTotalBudget(e.target.value)}
              className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                errors.totalBudget ? 'border-red-500' : 'border-secondary-300'
              }`}
            />
          </div>
          {errors.totalBudget && (
            <p className="mt-1 text-sm text-red-600">{errors.totalBudget}</p>
          )}
        </div>

        {/* Budget summary */}
        <div className="bg-secondary-50 p-4 rounded-lg">
          <div className="flex justify-between items-center text-sm">
            <span>Total Budget:</span>
            <span className="font-medium">{formatCurrency(budgetAmount)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span>Allocated:</span>
            <span className="font-medium">{formatCurrency(totalAllocated)}</span>
          </div>
          <div className={`flex justify-between items-center text-sm font-medium ${
            remaining < 0 ? 'text-red-600' : 'text-green-600'
          }`}>
            <span>Remaining:</span>
            <span>{formatCurrency(remaining)}</span>
          </div>
        </div>

        {errors.totalAllocation && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{errors.totalAllocation}</p>
          </div>
        )}

        {/* Categories */}
        <div>
          <h4 className="font-medium text-secondary-900 mb-3">Budget Categories</h4>
          <div className="space-y-4">
            {categories.map((category, index) => (
              <div key={`${category.id}-${index}`} className="flex items-center space-x-4 p-4 border rounded-lg">
                <div className="flex-1">
                  <input
                    type="text"
                    value={category.name}
                    onChange={(e) => handleCategoryNameChange(index, e.target.value)}
                    className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                      errors[`category_${index}_name`] ? 'border-red-500' : 'border-secondary-300'
                    }`}
                    placeholder="Category name"
                  />
                  {errors[`category_${index}_name`] && (
                    <p className="mt-1 text-xs text-red-600">{errors[`category_${index}_name`]}</p>
                  )}
                </div>
                <div className="w-32">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs text-secondary-500">
                      ETB
                    </span>
                    <input
                      type="text"
                      value={category.amount}
                      onChange={(e) => handleCategoryAmountChange(index, e.target.value)}
                      className={`w-full pl-8 pr-2 py-2 border rounded text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                        errors[`category_${index}_amount`] ? 'border-red-500' : 'border-secondary-300'
                      }`}
                      placeholder="0.00"
                    />
                  </div>
                  {errors[`category_${index}_amount`] && (
                    <p className="mt-1 text-xs text-red-600">{errors[`category_${index}_amount`]}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveCategory(index)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  disabled={categories.length === 1}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Add new category */}
        <div className="border-t pt-4">
          <h4 className="font-medium text-secondary-900 mb-3">Add New Category</h4>
          <div className="flex items-start space-x-4">
            <div className="flex-1">
              <input
                type="text"
                value={newCategory.name}
                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                placeholder="Category name"
                className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.newCategoryName ? 'border-red-500' : 'border-secondary-300'
                }`}
              />
              {errors.newCategoryName && (
                <p className="mt-1 text-xs text-red-600">{errors.newCategoryName}</p>
              )}
            </div>
            <div className="w-32">
              <div className="relative">
                <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs text-secondary-500">
                  ETB
                </span>
                <input
                  type="text"
                  value={newCategory.amount}
                  onChange={(e) => setNewCategory({ ...newCategory, amount: e.target.value })}
                  placeholder="0.00"
                  className={`w-full pl-8 pr-2 py-2 border rounded text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                    errors.newCategoryAmount ? 'border-red-500' : 'border-secondary-300'
                  }`}
                />
              </div>
              {errors.newCategoryAmount && (
                <p className="mt-1 text-xs text-red-600">{errors.newCategoryAmount}</p>
              )}
            </div>
            <Button
              variant="outline"
              onClick={handleAddCategory}
              disabled={!newCategory.name.trim() || !newCategory.amount.trim()}
            >
              Add
            </Button>
          </div>
        </div>

        {errors.categories && (
          <p className="text-sm text-red-600">{errors.categories}</p>
        )}

        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default BudgetEditor;