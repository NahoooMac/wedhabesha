import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import DashboardPage from '../../pages/DashboardPage';
import { budgetApi, weddingApi } from '../../lib/api';

// Mock the APIs
jest.mock('../../lib/api');
const mockBudgetApi = budgetApi as jest.Mocked<typeof budgetApi>;
const mockWeddingApi = weddingApi as jest.Mocked<typeof weddingApi>;

// Mock Firebase
jest.mock('../../config/firebase', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: jest.fn(),
  },
  googleProvider: {},
}));

// Mock chart components
jest.mock('recharts', () => ({
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      gcTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
});

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = createTestQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {children}
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Budget Management Flow', () => {
  let user: ReturnType<typeof userEvent.setup>;

  const mockWedding = {
    id: 1,
    wedding_code: 'AB12',
    wedding_date: '2024-12-25',
    venue_name: 'Grand Ballroom',
    venue_address: '123 Wedding St, City, State',
    expected_guests: 150,
    created_at: '2024-01-01T00:00:00Z',
  };

  const mockBudget = {
    id: 1,
    wedding_id: 1,
    total_budget: 50000,
    currency: 'ETB',
    total_spent: 15000,
    total_remaining: 35000,
    percentage_spent: 30,
    categories: [
      {
        id: 1,
        category: 'Venue',
        allocated_amount: 20000,
        spent_amount: 15000,
        remaining_amount: 5000,
        percentage_spent: 75,
      },
      {
        id: 2,
        category: 'Catering',
        allocated_amount: 15000,
        spent_amount: 0,
        remaining_amount: 15000,
        percentage_spent: 0,
      },
      {
        id: 3,
        category: 'Photography',
        allocated_amount: 10000,
        spent_amount: 0,
        remaining_amount: 10000,
        percentage_spent: 0,
      },
    ],
    created_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    user = userEvent.setup();
    jest.clearAllMocks();

    // Mock successful auth state
    const mockUser = {
      id: 1,
      email: 'couple@example.com',
      user_type: 'COUPLE' as const,
      auth_provider: 'EMAIL' as const,
      is_active: true,
      created_at: '2024-01-01T00:00:00Z',
    };

    jest.spyOn(require('../../contexts/AuthContext'), 'useAuth').mockReturnValue({
      user: mockUser,
      firebaseUser: null,
      loading: false,
      signInWithGoogle: jest.fn(),
      signInWithEmail: jest.fn(),
      signUpWithEmail: jest.fn(),
      logout: jest.fn(),
    });

    // Mock wedding exists
    mockWeddingApi.getMyWedding.mockResolvedValue(mockWedding);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('Complete budget creation flow', async () => {
    // Mock no existing budget
    mockBudgetApi.getBudget.mockRejectedValue({ status: 404 });

    // Mock budget creation
    mockBudgetApi.createBudget.mockResolvedValue(mockBudget);

    render(
      <TestWrapper>
        <DashboardPage />
      </TestWrapper>
    );

    // Wait for wedding to load
    await waitFor(() => {
      expect(screen.getByText('Grand Ballroom')).toBeInTheDocument();
    });

    // Navigate to budget tab
    const budgetTab = screen.getByRole('tab', { name: /budget/i });
    await user.click(budgetTab);

    // Should show budget setup wizard when no budget exists
    await waitFor(() => {
      expect(screen.getByText(/set up your budget/i)).toBeInTheDocument();
    });

    // Fill out total budget
    const totalBudgetInput = screen.getByLabelText(/total budget/i);
    await user.type(totalBudgetInput, '50000');

    // Add budget categories
    const addCategoryButton = screen.getByRole('button', { name: /add category/i });
    
    // Add Venue category
    await user.click(addCategoryButton);
    const categoryInputs = screen.getAllByLabelText(/category name/i);
    const amountInputs = screen.getAllByLabelText(/allocated amount/i);
    
    await user.type(categoryInputs[0], 'Venue');
    await user.type(amountInputs[0], '20000');

    // Add Catering category
    await user.click(addCategoryButton);
    await user.type(categoryInputs[1], 'Catering');
    await user.type(amountInputs[1], '15000');

    // Add Photography category
    await user.click(addCategoryButton);
    await user.type(categoryInputs[2], 'Photography');
    await user.type(amountInputs[2], '10000');

    // Submit budget
    const createBudgetButton = screen.getByRole('button', { name: /create budget/i });
    await user.click(createBudgetButton);

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText(/budget created successfully/i)).toBeInTheDocument();
    });

    expect(mockBudgetApi.createBudget).toHaveBeenCalledWith(1, {
      total_budget: 50000,
      currency: 'ETB',
      categories: [
        { category: 'Venue', allocated_amount: 20000 },
        { category: 'Catering', allocated_amount: 15000 },
        { category: 'Photography', allocated_amount: 10000 },
      ],
    });
  });

  test('Budget overview and visualization', async () => {
    // Mock existing budget
    mockBudgetApi.getBudget.mockResolvedValue(mockBudget);
    mockBudgetApi.getBudgetSummary.mockResolvedValue({
      total_budget: 50000,
      total_spent: 15000,
      total_remaining: 35000,
      percentage_spent: 30,
      currency: 'ETB',
      warnings: [
        {
          category: 'Venue',
          allocated_amount: 20000,
          spent_amount: 15000,
          percentage_spent: 75,
          warning_level: 'approaching',
          message: 'Venue budget is 75% spent',
        },
      ],
      categories_count: 3,
      expenses_count: 1,
    });

    render(
      <TestWrapper>
        <DashboardPage />
      </TestWrapper>
    );

    // Wait for wedding to load
    await waitFor(() => {
      expect(screen.getByText('Grand Ballroom')).toBeInTheDocument();
    });

    // Navigate to budget tab
    const budgetTab = screen.getByRole('tab', { name: /budget/i });
    await user.click(budgetTab);

    // Should show budget overview
    await waitFor(() => {
      expect(screen.getByText(/budget overview/i)).toBeInTheDocument();
    });

    // Should show total budget information
    expect(screen.getByText('ETB 50,000')).toBeInTheDocument(); // Total budget
    expect(screen.getByText('ETB 15,000')).toBeInTheDocument(); // Total spent
    expect(screen.getByText('ETB 35,000')).toBeInTheDocument(); // Remaining
    expect(screen.getByText('30%')).toBeInTheDocument(); // Percentage spent

    // Should show category breakdown
    expect(screen.getByText('Venue')).toBeInTheDocument();
    expect(screen.getByText('Catering')).toBeInTheDocument();
    expect(screen.getByText('Photography')).toBeInTheDocument();

    // Should show budget warning
    expect(screen.getByText(/venue budget is 75% spent/i)).toBeInTheDocument();

    // Should show charts
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  test('Expense tracking flow', async () => {
    // Mock existing budget
    mockBudgetApi.getBudget.mockResolvedValue(mockBudget);
    mockBudgetApi.getBudgetSummary.mockResolvedValue({
      total_budget: 50000,
      total_spent: 15000,
      total_remaining: 35000,
      percentage_spent: 30,
      currency: 'ETB',
      warnings: [],
      categories_count: 3,
      expenses_count: 1,
    });

    // Mock expenses
    const mockExpenses = [
      {
        id: 1,
        budget_category_id: 1,
        vendor_id: 1,
        vendor_name: 'Grand Venues',
        description: 'Venue deposit',
        amount: 15000,
        date: '2024-01-15',
        receipt_url: null,
        created_at: '2024-01-15T00:00:00Z',
      },
    ];

    mockBudgetApi.getExpenses.mockResolvedValue(mockExpenses);

    // Mock expense creation
    mockBudgetApi.addExpense.mockResolvedValue({
      id: 2,
      budget_category_id: 2,
      vendor_id: null,
      vendor_name: null,
      description: 'Catering consultation',
      amount: 500,
      date: '2024-01-20',
      receipt_url: null,
      created_at: '2024-01-20T00:00:00Z',
    });

    render(
      <TestWrapper>
        <DashboardPage />
      </TestWrapper>
    );

    // Wait for wedding to load
    await waitFor(() => {
      expect(screen.getByText('Grand Ballroom')).toBeInTheDocument();
    });

    // Navigate to budget tab
    const budgetTab = screen.getByRole('tab', { name: /budget/i });
    await user.click(budgetTab);

    // Wait for budget to load
    await waitFor(() => {
      expect(screen.getByText(/budget overview/i)).toBeInTheDocument();
    });

    // Navigate to expenses section
    const expensesTab = screen.getByRole('tab', { name: /expenses/i });
    await user.click(expensesTab);

    // Should show existing expenses
    await waitFor(() => {
      expect(screen.getByText('Venue deposit')).toBeInTheDocument();
      expect(screen.getByText('ETB 15,000')).toBeInTheDocument();
    });

    // Add new expense
    const addExpenseButton = screen.getByRole('button', { name: /add expense/i });
    await user.click(addExpenseButton);

    // Should show expense form
    await waitFor(() => {
      expect(screen.getByText(/add expense/i)).toBeInTheDocument();
    });

    // Fill out expense form
    const categorySelect = screen.getByLabelText(/category/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    const amountInput = screen.getByLabelText(/amount/i);
    const dateInput = screen.getByLabelText(/date/i);

    await user.selectOptions(categorySelect, '2'); // Catering category
    await user.type(descriptionInput, 'Catering consultation');
    await user.type(amountInput, '500');
    await user.type(dateInput, '2024-01-20');

    // Submit expense
    const saveExpenseButton = screen.getByRole('button', { name: /save expense/i });
    await user.click(saveExpenseButton);

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText(/expense added successfully/i)).toBeInTheDocument();
    });

    expect(mockBudgetApi.addExpense).toHaveBeenCalledWith({
      budget_category_id: 2,
      description: 'Catering consultation',
      amount: 500,
      date: '2024-01-20',
    });
  });

  test('Budget category management', async () => {
    // Mock existing budget
    mockBudgetApi.getBudget.mockResolvedValue(mockBudget);
    mockBudgetApi.getBudgetSummary.mockResolvedValue({
      total_budget: 50000,
      total_spent: 15000,
      total_remaining: 35000,
      percentage_spent: 30,
      currency: 'ETB',
      warnings: [],
      categories_count: 3,
      expenses_count: 1,
    });

    // Mock category update
    mockBudgetApi.updateCategory.mockResolvedValue({
      id: 1,
      category: 'Venue & Reception',
      allocated_amount: 25000,
      spent_amount: 15000,
      remaining_amount: 10000,
      percentage_spent: 60,
    });

    // Mock category addition
    mockBudgetApi.addCategory.mockResolvedValue({
      id: 4,
      category: 'Music & Entertainment',
      allocated_amount: 5000,
      spent_amount: 0,
      remaining_amount: 5000,
      percentage_spent: 0,
    });

    render(
      <TestWrapper>
        <DashboardPage />
      </TestWrapper>
    );

    // Wait for wedding to load
    await waitFor(() => {
      expect(screen.getByText('Grand Ballroom')).toBeInTheDocument();
    });

    // Navigate to budget tab
    const budgetTab = screen.getByRole('tab', { name: /budget/i });
    await user.click(budgetTab);

    // Wait for budget to load
    await waitFor(() => {
      expect(screen.getByText(/budget overview/i)).toBeInTheDocument();
    });

    // Edit existing category
    const editCategoryButtons = screen.getAllByRole('button', { name: /edit category/i });
    await user.click(editCategoryButtons[0]);

    // Should show edit form
    await waitFor(() => {
      expect(screen.getByDisplayValue('Venue')).toBeInTheDocument();
    });

    // Update category name and amount
    const categoryNameInput = screen.getByDisplayValue('Venue');
    const categoryAmountInput = screen.getByDisplayValue('20000');

    await user.clear(categoryNameInput);
    await user.type(categoryNameInput, 'Venue & Reception');

    await user.clear(categoryAmountInput);
    await user.type(categoryAmountInput, '25000');

    // Save changes
    const saveCategoryButton = screen.getByRole('button', { name: /save category/i });
    await user.click(saveCategoryButton);

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText(/category updated successfully/i)).toBeInTheDocument();
    });

    expect(mockBudgetApi.updateCategory).toHaveBeenCalledWith(1, {
      category: 'Venue & Reception',
      allocated_amount: 25000,
    });

    // Add new category
    const addCategoryButton = screen.getByRole('button', { name: /add category/i });
    await user.click(addCategoryButton);

    // Fill out new category form
    const newCategoryNameInput = screen.getByLabelText(/category name/i);
    const newCategoryAmountInput = screen.getByLabelText(/allocated amount/i);

    await user.type(newCategoryNameInput, 'Music & Entertainment');
    await user.type(newCategoryAmountInput, '5000');

    // Save new category
    const saveNewCategoryButton = screen.getByRole('button', { name: /add category/i });
    await user.click(saveNewCategoryButton);

    // Should show success message
    await waitFor(() => {
      expect(screen.getByText(/category added successfully/i)).toBeInTheDocument();
    });

    expect(mockBudgetApi.addCategory).toHaveBeenCalledWith(1, {
      category: 'Music & Entertainment',
      allocated_amount: 5000,
    });
  });

  test('Budget warnings and alerts', async () => {
    // Mock budget with warnings
    const budgetWithWarnings = {
      ...mockBudget,
      categories: [
        {
          id: 1,
          category: 'Venue',
          allocated_amount: 20000,
          spent_amount: 19000,
          remaining_amount: 1000,
          percentage_spent: 95,
        },
        {
          id: 2,
          category: 'Catering',
          allocated_amount: 15000,
          spent_amount: 16000,
          remaining_amount: -1000,
          percentage_spent: 107,
        },
      ],
    };

    mockBudgetApi.getBudget.mockResolvedValue(budgetWithWarnings);
    mockBudgetApi.getBudgetSummary.mockResolvedValue({
      total_budget: 50000,
      total_spent: 35000,
      total_remaining: 15000,
      percentage_spent: 70,
      currency: 'ETB',
      warnings: [
        {
          category: 'Venue',
          allocated_amount: 20000,
          spent_amount: 19000,
          percentage_spent: 95,
          warning_level: 'approaching',
          message: 'Venue budget is 95% spent - approaching limit',
        },
        {
          category: 'Catering',
          allocated_amount: 15000,
          spent_amount: 16000,
          percentage_spent: 107,
          warning_level: 'exceeded',
          message: 'Catering budget exceeded by ETB 1,000',
        },
      ],
      categories_count: 2,
      expenses_count: 2,
    });

    render(
      <TestWrapper>
        <DashboardPage />
      </TestWrapper>
    );

    // Wait for wedding to load
    await waitFor(() => {
      expect(screen.getByText('Grand Ballroom')).toBeInTheDocument();
    });

    // Navigate to budget tab
    const budgetTab = screen.getByRole('tab', { name: /budget/i });
    await user.click(budgetTab);

    // Should show budget warnings
    await waitFor(() => {
      expect(screen.getByText(/venue budget is 95% spent/i)).toBeInTheDocument();
      expect(screen.getByText(/catering budget exceeded/i)).toBeInTheDocument();
    });

    // Should show visual indicators for over-budget categories
    expect(screen.getByText('107%')).toBeInTheDocument(); // Exceeded percentage
    expect(screen.getByText('-ETB 1,000')).toBeInTheDocument(); // Negative remaining
  });

  test('Error handling in budget creation', async () => {
    // Mock no existing budget
    mockBudgetApi.getBudget.mockRejectedValue({ status: 404 });

    // Mock budget creation error
    mockBudgetApi.createBudget.mockRejectedValue({
      status: 400,
      message: 'Total category allocations exceed total budget',
    });

    render(
      <TestWrapper>
        <DashboardPage />
      </TestWrapper>
    );

    // Wait for wedding to load
    await waitFor(() => {
      expect(screen.getByText('Grand Ballroom')).toBeInTheDocument();
    });

    // Navigate to budget tab
    const budgetTab = screen.getByRole('tab', { name: /budget/i });
    await user.click(budgetTab);

    // Should show budget setup wizard
    await waitFor(() => {
      expect(screen.getByText(/set up your budget/i)).toBeInTheDocument();
    });

    // Fill out budget with invalid data (categories exceed total)
    const totalBudgetInput = screen.getByLabelText(/total budget/i);
    await user.type(totalBudgetInput, '30000');

    // Add categories that exceed total
    const addCategoryButton = screen.getByRole('button', { name: /add category/i });
    
    await user.click(addCategoryButton);
    const categoryInputs = screen.getAllByLabelText(/category name/i);
    const amountInputs = screen.getAllByLabelText(/allocated amount/i);
    
    await user.type(categoryInputs[0], 'Venue');
    await user.type(amountInputs[0], '25000');

    await user.click(addCategoryButton);
    await user.type(categoryInputs[1], 'Catering');
    await user.type(amountInputs[1], '20000');

    // Submit budget
    const createBudgetButton = screen.getByRole('button', { name: /create budget/i });
    await user.click(createBudgetButton);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/total category allocations exceed total budget/i)).toBeInTheDocument();
    });

    // Form should still be visible for correction
    expect(screen.getByLabelText(/total budget/i)).toBeInTheDocument();
  });
});