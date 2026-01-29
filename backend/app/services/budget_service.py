"""
Budget Management Service

Business logic for budget planning, expense tracking, and financial calculations.
"""

from datetime import datetime
from typing import List, Optional
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.budget import Budget, BudgetCategory, Expense
from app.models.user import Vendor
from app.schemas.budget import (
    BudgetCreate, BudgetUpdate, BudgetResponse,
    BudgetCategoryCreate, BudgetCategoryUpdate, BudgetCategoryResponse,
    ExpenseCreate, ExpenseUpdate, ExpenseResponse,
    BudgetWarning, BudgetSummary,
    format_etb_currency, calculate_percentage
)


class BudgetService:
    """Service for budget management operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_budget(self, wedding_id: int, budget_data: BudgetCreate) -> BudgetResponse:
        """Create a new wedding budget with categories"""
        # Check if budget already exists for this wedding
        existing_budget = self.db.query(Budget).filter(Budget.wedding_id == wedding_id).first()
        if existing_budget:
            raise ValueError("Budget already exists for this wedding")
        
        # Create budget
        budget = Budget(
            wedding_id=wedding_id,
            total_budget=budget_data.total_budget,
            currency=budget_data.currency
        )
        self.db.add(budget)
        self.db.flush()  # Get the budget ID
        
        # Create categories
        categories = []
        for cat_data in budget_data.categories:
            category = BudgetCategory(
                budget_id=budget.id,
                category=cat_data.category,
                allocated_amount=cat_data.allocated_amount
            )
            self.db.add(category)
            categories.append(category)
        
        self.db.commit()
        self.db.refresh(budget)
        
        return self._build_budget_response(budget)
    
    def get_budget(self, wedding_id: int) -> Optional[BudgetResponse]:
        """Get wedding budget with categories"""
        budget = self.db.query(Budget).filter(Budget.wedding_id == wedding_id).first()
        if not budget:
            return None
        
        return self._build_budget_response(budget)
    
    def update_budget(self, wedding_id: int, budget_data: BudgetUpdate) -> Optional[BudgetResponse]:
        """Update wedding budget"""
        budget = self.db.query(Budget).filter(Budget.wedding_id == wedding_id).first()
        if not budget:
            return None
        
        if budget_data.total_budget is not None:
            budget.total_budget = budget_data.total_budget
        if budget_data.currency is not None:
            budget.currency = budget_data.currency
        
        self.db.commit()
        self.db.refresh(budget)
        
        return self._build_budget_response(budget)
    
    def add_category(self, wedding_id: int, category_data: BudgetCategoryCreate) -> Optional[BudgetCategoryResponse]:
        """Add a new budget category"""
        budget = self.db.query(Budget).filter(Budget.wedding_id == wedding_id).first()
        if not budget:
            return None
        
        category = BudgetCategory(
            budget_id=budget.id,
            category=category_data.category,
            allocated_amount=category_data.allocated_amount
        )
        self.db.add(category)
        self.db.commit()
        self.db.refresh(category)
        
        return self._build_category_response(category)
    
    def update_category(self, category_id: int, category_data: BudgetCategoryUpdate) -> Optional[BudgetCategoryResponse]:
        """Update a budget category"""
        category = self.db.query(BudgetCategory).filter(BudgetCategory.id == category_id).first()
        if not category:
            return None
        
        if category_data.category is not None:
            category.category = category_data.category
        if category_data.allocated_amount is not None:
            category.allocated_amount = category_data.allocated_amount
        
        self.db.commit()
        self.db.refresh(category)
        
        return self._build_category_response(category)
    
    def add_expense(self, expense_data: ExpenseCreate) -> Optional[ExpenseResponse]:
        """Add a new expense"""
        # Verify category exists
        category = self.db.query(BudgetCategory).filter(
            BudgetCategory.id == expense_data.budget_category_id
        ).first()
        if not category:
            return None
        
        expense = Expense(
            budget_category_id=expense_data.budget_category_id,
            vendor_id=expense_data.vendor_id,
            description=expense_data.description,
            amount=expense_data.amount,
            date=expense_data.date,
            receipt_url=expense_data.receipt_url
        )
        self.db.add(expense)
        
        # Update category spent amount
        category.spent_amount += expense_data.amount
        
        self.db.commit()
        self.db.refresh(expense)
        
        return self._build_expense_response(expense)
    
    def get_expenses(self, wedding_id: int, category_id: Optional[int] = None) -> List[ExpenseResponse]:
        """Get expenses for a wedding, optionally filtered by category"""
        query = self.db.query(Expense).join(BudgetCategory).join(Budget).filter(
            Budget.wedding_id == wedding_id
        )
        
        if category_id:
            query = query.filter(BudgetCategory.id == category_id)
        
        expenses = query.order_by(Expense.date.desc()).all()
        return [self._build_expense_response(expense) for expense in expenses]
    
    def update_expense(self, expense_id: int, expense_data: ExpenseUpdate) -> Optional[ExpenseResponse]:
        """Update an expense"""
        expense = self.db.query(Expense).filter(Expense.id == expense_id).first()
        if not expense:
            return None
        
        # Get the category to update spent amount
        category = self.db.query(BudgetCategory).filter(
            BudgetCategory.id == expense.budget_category_id
        ).first()
        
        # Adjust category spent amount if expense amount changes
        if expense_data.amount is not None and expense_data.amount != expense.amount:
            old_amount = expense.amount
            new_amount = expense_data.amount
            category.spent_amount = category.spent_amount - old_amount + new_amount
            expense.amount = new_amount
        
        if expense_data.description is not None:
            expense.description = expense_data.description
        if expense_data.date is not None:
            expense.date = expense_data.date
        if expense_data.receipt_url is not None:
            expense.receipt_url = expense_data.receipt_url
        
        self.db.commit()
        self.db.refresh(expense)
        
        return self._build_expense_response(expense)
    
    def delete_expense(self, expense_id: int) -> bool:
        """Delete an expense"""
        expense = self.db.query(Expense).filter(Expense.id == expense_id).first()
        if not expense:
            return False
        
        # Update category spent amount
        category = self.db.query(BudgetCategory).filter(
            BudgetCategory.id == expense.budget_category_id
        ).first()
        if category:
            category.spent_amount -= expense.amount
        
        self.db.delete(expense)
        self.db.commit()
        return True
    
    def get_budget_summary(self, wedding_id: int) -> Optional[BudgetSummary]:
        """Get budget summary with warnings"""
        budget = self.db.query(Budget).filter(Budget.wedding_id == wedding_id).first()
        if not budget:
            return None
        
        # Calculate totals
        total_spent = sum(cat.spent_amount for cat in budget.categories)
        total_remaining = budget.total_budget - total_spent
        percentage_spent = calculate_percentage(total_spent, budget.total_budget)
        
        # Generate warnings
        warnings = self._generate_budget_warnings(budget.categories)
        
        # Count expenses
        expenses_count = self.db.query(func.count(Expense.id)).join(BudgetCategory).filter(
            BudgetCategory.budget_id == budget.id
        ).scalar()
        
        return BudgetSummary(
            total_budget=budget.total_budget,
            total_spent=total_spent,
            total_remaining=total_remaining,
            percentage_spent=percentage_spent,
            currency=budget.currency,
            warnings=warnings,
            categories_count=len(budget.categories),
            expenses_count=expenses_count
        )
    
    def _build_budget_response(self, budget: Budget) -> BudgetResponse:
        """Build budget response with calculated fields"""
        categories = [self._build_category_response(cat) for cat in budget.categories]
        total_spent = sum(cat.spent_amount for cat in budget.categories)
        total_remaining = budget.total_budget - total_spent
        percentage_spent = calculate_percentage(total_spent, budget.total_budget)
        
        return BudgetResponse(
            id=budget.id,
            wedding_id=budget.wedding_id,
            total_budget=budget.total_budget,
            currency=budget.currency,
            total_spent=total_spent,
            total_remaining=total_remaining,
            percentage_spent=percentage_spent,
            categories=categories,
            created_at=budget.created_at.isoformat()
        )
    
    def _build_category_response(self, category: BudgetCategory) -> BudgetCategoryResponse:
        """Build category response with calculated fields"""
        remaining_amount = category.allocated_amount - category.spent_amount
        percentage_spent = calculate_percentage(category.spent_amount, category.allocated_amount)
        
        return BudgetCategoryResponse(
            id=category.id,
            category=category.category,
            allocated_amount=category.allocated_amount,
            spent_amount=category.spent_amount,
            remaining_amount=remaining_amount,
            percentage_spent=percentage_spent
        )
    
    def _build_expense_response(self, expense: Expense) -> ExpenseResponse:
        """Build expense response with vendor name"""
        vendor_name = None
        if expense.vendor_id:
            vendor = self.db.query(Vendor).filter(Vendor.id == expense.vendor_id).first()
            if vendor:
                vendor_name = vendor.business_name
        
        return ExpenseResponse(
            id=expense.id,
            budget_category_id=expense.budget_category_id,
            vendor_id=expense.vendor_id,
            vendor_name=vendor_name,
            description=expense.description,
            amount=expense.amount,
            date=expense.date,
            receipt_url=expense.receipt_url,
            created_at=expense.created_at.isoformat()
        )
    
    def _generate_budget_warnings(self, categories: List[BudgetCategory]) -> List[BudgetWarning]:
        """Generate budget warnings for categories approaching or exceeding limits"""
        warnings = []
        
        for category in categories:
            percentage_spent = calculate_percentage(category.spent_amount, category.allocated_amount)
            
            if percentage_spent >= 100:
                warnings.append(BudgetWarning(
                    category=category.category,
                    allocated_amount=category.allocated_amount,
                    spent_amount=category.spent_amount,
                    percentage_spent=percentage_spent,
                    warning_level="exceeded",
                    message=f"Budget exceeded for {category.category} by {format_etb_currency(category.spent_amount - category.allocated_amount)}"
                ))
            elif percentage_spent >= 90:
                warnings.append(BudgetWarning(
                    category=category.category,
                    allocated_amount=category.allocated_amount,
                    spent_amount=category.spent_amount,
                    percentage_spent=percentage_spent,
                    warning_level="approaching",
                    message=f"Budget for {category.category} is {percentage_spent:.1f}% spent"
                ))
        
        return warnings