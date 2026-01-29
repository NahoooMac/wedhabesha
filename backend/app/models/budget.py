"""
Budget Management Models

Models for budget planning, categories, and expense tracking.
"""

from datetime import datetime, date
from typing import Optional
from decimal import Decimal
from sqlmodel import SQLModel, Field, Relationship


class Budget(SQLModel, table=True):
    """Wedding budget model"""
    id: Optional[int] = Field(default=None, primary_key=True)
    wedding_id: int = Field(foreign_key="wedding.id", unique=True)
    total_budget: Decimal = Field(decimal_places=2)
    currency: str = "ETB"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    wedding: "Wedding" = Relationship(back_populates="budget")
    categories: list["BudgetCategory"] = Relationship(back_populates="budget")


class BudgetCategory(SQLModel, table=True):
    """Budget category model"""
    id: Optional[int] = Field(default=None, primary_key=True)
    budget_id: int = Field(foreign_key="budget.id")
    category: str  # venue, catering, photography, etc.
    allocated_amount: Decimal = Field(decimal_places=2)
    spent_amount: Decimal = Field(default=0, decimal_places=2)
    
    # Relationships
    budget: Budget = Relationship(back_populates="categories")
    expenses: list["Expense"] = Relationship(back_populates="budget_category")


class Expense(SQLModel, table=True):
    """Expense record model"""
    id: Optional[int] = Field(default=None, primary_key=True)
    budget_category_id: int = Field(foreign_key="budgetcategory.id")
    vendor_id: Optional[int] = Field(default=None, foreign_key="vendor.id")
    description: str
    amount: Decimal = Field(decimal_places=2)
    date: date
    receipt_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    budget_category: BudgetCategory = Relationship(back_populates="expenses")
    vendor: Optional["Vendor"] = Relationship()