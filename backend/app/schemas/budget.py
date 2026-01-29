"""
Budget Management Schemas

Pydantic schemas for budget planning, categories, and expense tracking.
"""

from datetime import date
from typing import Optional, List
from decimal import Decimal
from pydantic import BaseModel, Field, validator


class BudgetCategoryCreate(BaseModel):
    """Schema for creating a budget category"""
    category: str = Field(..., min_length=1, max_length=100)
    allocated_amount: Decimal = Field(..., gt=0)


class BudgetCategoryUpdate(BaseModel):
    """Schema for updating a budget category"""
    category: Optional[str] = Field(None, min_length=1, max_length=100)
    allocated_amount: Optional[Decimal] = Field(None, gt=0)


class BudgetCategoryResponse(BaseModel):
    """Schema for budget category response"""
    id: int
    category: str
    allocated_amount: Decimal
    spent_amount: Decimal
    remaining_amount: Decimal
    percentage_spent: float
    
    class Config:
        from_attributes = True


class BudgetCreate(BaseModel):
    """Schema for creating a wedding budget"""
    total_budget: Decimal = Field(..., gt=0)
    currency: str = Field(default="ETB", pattern="^[A-Z]{3}$")
    categories: List[BudgetCategoryCreate] = Field(..., min_items=1)
    
    @validator('categories')
    def validate_categories_total(cls, v, values):
        """Validate that category allocations don't exceed total budget"""
        if 'total_budget' in values:
            total_allocated = sum(cat.allocated_amount for cat in v)
            if total_allocated > values['total_budget']:
                raise ValueError('Total category allocations cannot exceed total budget')
        return v


class BudgetUpdate(BaseModel):
    """Schema for updating a wedding budget"""
    total_budget: Optional[Decimal] = Field(None, gt=0)
    currency: Optional[str] = Field(None, pattern="^[A-Z]{3}$")


class BudgetResponse(BaseModel):
    """Schema for budget response"""
    id: int
    wedding_id: int
    total_budget: Decimal
    currency: str
    total_spent: Decimal
    total_remaining: Decimal
    percentage_spent: float
    categories: List[BudgetCategoryResponse]
    created_at: str
    
    class Config:
        from_attributes = True


class ExpenseCreate(BaseModel):
    """Schema for creating an expense"""
    budget_category_id: int
    vendor_id: Optional[int] = None
    description: str = Field(..., min_length=1, max_length=500)
    amount: Decimal = Field(..., gt=0)
    date: date
    receipt_url: Optional[str] = None


class ExpenseUpdate(BaseModel):
    """Schema for updating an expense"""
    description: Optional[str] = Field(None, min_length=1, max_length=500)
    amount: Optional[Decimal] = Field(None, gt=0)
    date: Optional[date] = None
    receipt_url: Optional[str] = None


class ExpenseResponse(BaseModel):
    """Schema for expense response"""
    id: int
    budget_category_id: int
    vendor_id: Optional[int]
    vendor_name: Optional[str]
    description: str
    amount: Decimal
    date: date
    receipt_url: Optional[str]
    created_at: str
    
    class Config:
        from_attributes = True


class BudgetWarning(BaseModel):
    """Schema for budget warnings"""
    category: str
    allocated_amount: Decimal
    spent_amount: Decimal
    percentage_spent: float
    warning_level: str  # "approaching", "exceeded"
    message: str


class BudgetSummary(BaseModel):
    """Schema for budget summary"""
    total_budget: Decimal
    total_spent: Decimal
    total_remaining: Decimal
    percentage_spent: float
    currency: str
    warnings: List[BudgetWarning]
    categories_count: int
    expenses_count: int


def format_etb_currency(amount: Decimal) -> str:
    """Format amount as Ethiopian Birr currency"""
    return f"ETB {amount:,.2f}"


def calculate_percentage(spent: Decimal, total: Decimal) -> float:
    """Calculate percentage spent"""
    if total == 0:
        return 0.0
    return float((spent / total) * 100)