import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { BudgetWarning } from '../../lib/api';

interface BudgetWarningsProps {
  warnings: BudgetWarning[];
}

const BudgetWarnings: React.FC<BudgetWarningsProps> = ({ warnings }) => {
  if (warnings.length === 0) {
    return null;
  }

  const getWarningIcon = (level: string) => {
    if (level === 'exceeded') {
      return (
        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    );
  };

  const getWarningColor = (level: string) => {
    return level === 'exceeded' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50';
  };

  const getWarningTextColor = (level: string) => {
    return level === 'exceeded' ? 'text-red-800' : 'text-yellow-800';
  };

  const getWarningMessageColor = (level: string) => {
    return level === 'exceeded' ? 'text-red-700' : 'text-yellow-700';
  };

  return (
    <Card className={`${getWarningColor(warnings[0].warning_level)}`}>
      <CardHeader>
        <CardTitle className={`${getWarningTextColor(warnings[0].warning_level)} flex items-center`}>
          {getWarningIcon(warnings[0].warning_level)}
          <span className="ml-2">Budget Warnings</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {warnings.map((warning, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-0.5">
                {getWarningIcon(warning.warning_level)}
              </div>
              <div className="flex-1">
                <div className={`font-medium ${getWarningTextColor(warning.warning_level)}`}>
                  {warning.category}
                </div>
                <div className={`text-sm ${getWarningMessageColor(warning.warning_level)}`}>
                  {warning.message}
                </div>
                <div className="text-xs text-secondary-600 mt-1">
                  {warning.percentage_spent.toFixed(1)}% of allocated budget spent
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {warnings.some(w => w.warning_level === 'exceeded') && (
          <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              <strong>Action Required:</strong> Some categories have exceeded their allocated budget. 
              Consider reallocating funds from other categories or adjusting your total budget.
            </p>
          </div>
        )}
        
        {warnings.some(w => w.warning_level === 'approaching') && !warnings.some(w => w.warning_level === 'exceeded') && (
          <div className="mt-4 p-3 bg-yellow-100 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Heads Up:</strong> Some categories are approaching their budget limits. 
              Monitor your spending carefully to stay within budget.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BudgetWarnings;