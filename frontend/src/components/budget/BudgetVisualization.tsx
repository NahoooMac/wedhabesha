import React from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { BudgetResponse } from '../../lib/api';
import { formatCurrency } from '../../lib/utils';

interface BudgetVisualizationProps {
  budget: BudgetResponse;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];

const BudgetVisualization: React.FC<BudgetVisualizationProps> = ({ budget }) => {
  // Prepare data for pie chart (allocation)
  const allocationData = budget.categories.map((category, index) => ({
    name: category.category,
    value: category.allocated_amount,
    color: COLORS[index % COLORS.length],
  }));

  // Prepare data for spending comparison
  const spendingData = budget.categories.map((category, index) => ({
    name: category.category.length > 15 ? category.category.substring(0, 15) + '...' : category.category,
    allocated: category.allocated_amount,
    spent: category.spent_amount,
    remaining: category.remaining_amount,
    color: COLORS[index % COLORS.length],
  }));

  // Custom tooltip for pie chart
  const renderPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / budget.total_budget) * 100).toFixed(1);
      return (
        <div className="bg-white p-3 border border-secondary-200 rounded-lg shadow-lg">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm text-secondary-600">
            {formatCurrency(data.value, budget.currency)} ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for bar chart
  const renderBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-secondary-200 rounded-lg shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey === 'allocated' ? 'Allocated' : 
               entry.dataKey === 'spent' ? 'Spent' : 'Remaining'}: {formatCurrency(entry.value, budget.currency)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Budget Allocation Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Allocation</CardTitle>
          <CardDescription>
            How your total budget is allocated across categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {allocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={renderPieTooltip} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Spending vs Allocation Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Spending vs Allocation</CardTitle>
          <CardDescription>
            Compare actual spending against allocated amounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={spendingData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 60,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis 
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                  fontSize={12}
                />
                <Tooltip content={renderBarTooltip} />
                <Legend />
                <Bar dataKey="allocated" fill="#3B82F6" name="Allocated" />
                <Bar dataKey="spent" fill="#EF4444" name="Spent" />
                <Bar dataKey="remaining" fill="#10B981" name="Remaining" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Category Progress Cards */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Category Progress</CardTitle>
          <CardDescription>
            Detailed progress for each budget category
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {budget.categories.map((category, index) => {
              const progressColor = category.percentage_spent >= 100 ? 'bg-red-500' :
                                   category.percentage_spent >= 90 ? 'bg-yellow-500' : 'bg-green-500';
              
              return (
                <div key={category.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-secondary-900">{category.category}</h4>
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-secondary-600">Allocated:</span>
                      <span className="font-medium">{formatCurrency(category.allocated_amount, budget.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary-600">Spent:</span>
                      <span className="font-medium">{formatCurrency(category.spent_amount, budget.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary-600">Remaining:</span>
                      <span className={`font-medium ${category.remaining_amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                        {formatCurrency(category.remaining_amount, budget.currency)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-secondary-600 mb-1">
                      <span>Progress</span>
                      <span>{category.percentage_spent.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-secondary-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${progressColor}`}
                        style={{ width: `${Math.min(category.percentage_spent, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BudgetVisualization;