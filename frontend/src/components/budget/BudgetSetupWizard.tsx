import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { budgetApi, BudgetCreateRequest, BudgetCategoryCreateRequest } from '../../lib/api';
import { formatCurrency, parseETBAmount, validateETBAmount } from '../../lib/utils';

interface BudgetSetupWizardProps {
  weddingId: number;
  onComplete: () => void;
}

const DEFAULT_CATEGORIES = [
  { name: 'Venue', percentage: 40 },
  { name: 'Catering', percentage: 25 },
  { name: 'Photography', percentage: 10 },
  { name: 'Flowers & Decoration', percentage: 8 },
  { name: 'Music & Entertainment', percentage: 8 },
  { name: 'Transportation', percentage: 5 },
  { name: 'Miscellaneous', percentage: 4 },
];

const BudgetSetupWizard: React.FC<BudgetSetupWizardProps> = ({ weddingId, onComplete }) => {
  const [step, setStep] = useState<'total' | 'categories' | 'review'>('total');
  const [totalBudget, setTotalBudget] = useState<string>('');
  const [categories, setCategories] = useState<Array<{ name: string; amount: string }>>([]);
  const [customCategory, setCustomCategory] = useState<{ name: string; amount: string }>({ name: '', amount: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const queryClient = useQueryClient();

  const createBudgetMutation = useMutation({
    mutationFn: (data: BudgetCreateRequest) => budgetApi.createBudget(weddingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget', weddingId] });
      onComplete();
    },
    onError: (error: any) => {
      console.error('Failed to create budget:', error);
      setErrors({ submit: 'Failed to create budget. Please try again.' });
    },
  });

  const handleTotalBudgetNext = () => {
    const newErrors: Record<string, string> = {};
    
    if (!totalBudget.trim()) {
      newErrors.totalBudget = 'Total budget is required';
    } else if (!validateETBAmount(totalBudget)) {
      newErrors.totalBudget = 'Please enter a valid amount';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Initialize categories with default percentages
    const budgetAmount = parseETBAmount(totalBudget);
    const initialCategories = DEFAULT_CATEGORIES.map(cat => ({
      name: cat.name,
      amount: (budgetAmount * cat.percentage / 100).toFixed(2),
    }));
    
    setCategories(initialCategories);
    setErrors({});
    setStep('categories');
  };

  const handleCategoryAmountChange = (index: number, value: string) => {
    const newCategories = [...categories];
    newCategories[index].amount = value;
    setCategories(newCategories);
  };

  const handleAddCustomCategory = () => {
    const newErrors: Record<string, string> = {};
    
    if (!customCategory.name.trim()) {
      newErrors.customCategoryName = 'Category name is required';
    }
    if (!customCategory.amount.trim()) {
      newErrors.customCategoryAmount = 'Amount is required';
    } else if (!validateETBAmount(customCategory.amount)) {
      newErrors.customCategoryAmount = 'Please enter a valid amount';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setCategories([...categories, { ...customCategory }]);
    setCustomCategory({ name: '', amount: '' });
    setErrors({});
  };

  const handleRemoveCategory = (index: number) => {
    const newCategories = categories.filter((_, i) => i !== index);
    setCategories(newCategories);
  };

  const handleCategoriesNext = () => {
    const newErrors: Record<string, string> = {};
    
    if (categories.length === 0) {
      newErrors.categories = 'At least one category is required';
    }

    // Validate each category
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

    setErrors({});
    setStep('review');
  };

  const handleSubmit = () => {
    const budgetData: BudgetCreateRequest = {
      total_budget: parseETBAmount(totalBudget),
      currency: 'ETB',
      categories: categories.map(cat => ({
        category: cat.name,
        allocated_amount: parseETBAmount(cat.amount),
      })),
    };

    createBudgetMutation.mutate(budgetData);
  };

  const totalAllocated = categories.reduce((sum, cat) => sum + parseETBAmount(cat.amount), 0);
  const budgetAmount = parseETBAmount(totalBudget);
  const remaining = budgetAmount - totalAllocated;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className={`flex items-center ${step === 'total' ? 'text-primary-600' : 'text-secondary-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === 'total' ? 'bg-primary-600 text-white' : 'bg-secondary-200 text-secondary-600'
            }`}>
              1
            </div>
            <span className="ml-2 text-sm font-medium">Total Budget</span>
          </div>
          <div className={`flex items-center ${step === 'categories' ? 'text-primary-600' : 'text-secondary-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === 'categories' ? 'bg-primary-600 text-white' : 'bg-secondary-200 text-secondary-600'
            }`}>
              2
            </div>
            <span className="ml-2 text-sm font-medium">Categories</span>
          </div>
          <div className={`flex items-center ${step === 'review' ? 'text-primary-600' : 'text-secondary-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step === 'review' ? 'bg-primary-600 text-white' : 'bg-secondary-200 text-secondary-600'
            }`}>
              3
            </div>
            <span className="ml-2 text-sm font-medium">Review</span>
          </div>
        </div>
      </div>

      {/* Step 1: Total Budget */}
      {step === 'total' && (
        <Card>
          <CardHeader>
            <CardTitle>Set Your Total Wedding Budget</CardTitle>
            <CardDescription>
              Enter the total amount you plan to spend on your wedding in Ethiopian Birr (ETB)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
                  placeholder="100,000.00"
                  className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                    errors.totalBudget ? 'border-red-500' : 'border-secondary-300'
                  }`}
                />
              </div>
              {errors.totalBudget && (
                <p className="mt-1 text-sm text-red-600">{errors.totalBudget}</p>
              )}
            </div>

            <div className="bg-secondary-50 p-4 rounded-lg">
              <h4 className="font-medium text-secondary-900 mb-2">Budget Planning Tips</h4>
              <ul className="text-sm text-secondary-600 space-y-1">
                <li>• Consider all wedding expenses including venue, catering, photography, and decorations</li>
                <li>• Add a 10-15% buffer for unexpected costs</li>
                <li>• You can adjust category allocations in the next step</li>
              </ul>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleTotalBudgetNext} className="px-8">
                Next: Set Categories
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Categories */}
      {step === 'categories' && (
        <Card>
          <CardHeader>
            <CardTitle>Allocate Budget by Category</CardTitle>
            <CardDescription>
              Distribute your {formatCurrency(budgetAmount)} budget across different wedding categories
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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

            {/* Category list */}
            <div className="space-y-4">
              {categories.map((category, index) => (
                <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={category.name}
                      onChange={(e) => {
                        const newCategories = [...categories];
                        newCategories[index].name = e.target.value;
                        setCategories(newCategories);
                      }}
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
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>

            {/* Add custom category */}
            <div className="border-t pt-4">
              <h4 className="font-medium text-secondary-900 mb-3">Add Custom Category</h4>
              <div className="flex items-start space-x-4">
                <div className="flex-1">
                  <input
                    type="text"
                    value={customCategory.name}
                    onChange={(e) => setCustomCategory({ ...customCategory, name: e.target.value })}
                    placeholder="Category name"
                    className={`w-full px-3 py-2 border rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                      errors.customCategoryName ? 'border-red-500' : 'border-secondary-300'
                    }`}
                  />
                  {errors.customCategoryName && (
                    <p className="mt-1 text-xs text-red-600">{errors.customCategoryName}</p>
                  )}
                </div>
                <div className="w-32">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs text-secondary-500">
                      ETB
                    </span>
                    <input
                      type="text"
                      value={customCategory.amount}
                      onChange={(e) => setCustomCategory({ ...customCategory, amount: e.target.value })}
                      placeholder="0.00"
                      className={`w-full pl-8 pr-2 py-2 border rounded text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                        errors.customCategoryAmount ? 'border-red-500' : 'border-secondary-300'
                      }`}
                    />
                  </div>
                  {errors.customCategoryAmount && (
                    <p className="mt-1 text-xs text-red-600">{errors.customCategoryAmount}</p>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={handleAddCustomCategory}
                  disabled={!customCategory.name.trim() || !customCategory.amount.trim()}
                >
                  Add
                </Button>
              </div>
            </div>

            {errors.categories && (
              <p className="text-sm text-red-600">{errors.categories}</p>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('total')}>
                Back
              </Button>
              <Button onClick={handleCategoriesNext} className="px-8">
                Next: Review
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Review */}
      {step === 'review' && (
        <Card>
          <CardHeader>
            <CardTitle>Review Your Budget</CardTitle>
            <CardDescription>
              Review your budget allocation before creating your wedding budget
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-secondary-50 p-4 rounded-lg">
              <h4 className="font-medium text-secondary-900 mb-3">Budget Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Budget:</span>
                  <span className="font-medium">{formatCurrency(budgetAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Allocated:</span>
                  <span className="font-medium">{formatCurrency(totalAllocated)}</span>
                </div>
                <div className={`flex justify-between font-medium ${
                  remaining < 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  <span>Remaining:</span>
                  <span>{formatCurrency(remaining)}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-secondary-900 mb-3">Category Breakdown</h4>
              <div className="space-y-3">
                {categories.map((category, index) => {
                  const percentage = budgetAmount > 0 ? (parseETBAmount(category.amount) / budgetAmount * 100) : 0;
                  return (
                    <div key={index} className="flex items-center justify-between p-3 bg-white border rounded">
                      <span className="font-medium">{category.name}</span>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(parseETBAmount(category.amount))}</div>
                        <div className="text-sm text-secondary-500">{percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('categories')}>
                Back
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={createBudgetMutation.isPending}
                className="px-8"
              >
                {createBudgetMutation.isPending ? 'Creating Budget...' : 'Create Budget'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BudgetSetupWizard;