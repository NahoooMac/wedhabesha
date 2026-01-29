"""
Budget Management Endpoints

Budget planning, expense tracking, and financial analytics.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import get_current_couple
from app.models.user import Couple
from app.services.budget_service import BudgetService
from app.schemas.budget import (
    BudgetCreate, BudgetUpdate, BudgetResponse,
    BudgetCategoryCreate, BudgetCategoryUpdate, BudgetCategoryResponse,
    ExpenseCreate, ExpenseUpdate, ExpenseResponse,
    BudgetSummary
)

router = APIRouter()


@router.post("/{wedding_id}", response_model=BudgetResponse)
async def create_budget(
    wedding_id: int,
    budget_data: BudgetCreate,
    db: Session = Depends(get_db),
    current_couple: Couple = Depends(get_current_couple)
):
    """Create wedding budget with categories"""
    # Verify couple owns this wedding
    from app.models.wedding import Wedding
    wedding = db.query(Wedding).filter(
        Wedding.id == wedding_id,
        Wedding.couple_id == current_couple.id
    ).first()
    
    if not wedding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wedding not found"
        )
    
    budget_service = BudgetService(db)
    
    try:
        budget = budget_service.create_budget(wedding_id, budget_data)
        return budget
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/{wedding_id}", response_model=BudgetResponse)
async def get_budget(
    wedding_id: int,
    db: Session = Depends(get_db),
    current_couple: Couple = Depends(get_current_couple)
):
    """Get wedding budget with categories"""
    # Verify couple owns this wedding
    from app.models.wedding import Wedding
    wedding = db.query(Wedding).filter(
        Wedding.id == wedding_id,
        Wedding.couple_id == current_couple.id
    ).first()
    
    if not wedding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wedding not found"
        )
    
    budget_service = BudgetService(db)
    budget = budget_service.get_budget(wedding_id)
    
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found"
        )
    
    return budget


@router.put("/{wedding_id}", response_model=BudgetResponse)
async def update_budget(
    wedding_id: int,
    budget_data: BudgetUpdate,
    db: Session = Depends(get_db),
    current_couple: Couple = Depends(get_current_couple)
):
    """Update wedding budget"""
    # Verify couple owns this wedding
    from app.models.wedding import Wedding
    wedding = db.query(Wedding).filter(
        Wedding.id == wedding_id,
        Wedding.couple_id == current_couple.id
    ).first()
    
    if not wedding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wedding not found"
        )
    
    budget_service = BudgetService(db)
    budget = budget_service.update_budget(wedding_id, budget_data)
    
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found"
        )
    
    return budget


@router.get("/{wedding_id}/summary", response_model=BudgetSummary)
async def get_budget_summary(
    wedding_id: int,
    db: Session = Depends(get_db),
    current_couple: Couple = Depends(get_current_couple)
):
    """Get budget summary with warnings"""
    # Verify couple owns this wedding
    from app.models.wedding import Wedding
    wedding = db.query(Wedding).filter(
        Wedding.id == wedding_id,
        Wedding.couple_id == current_couple.id
    ).first()
    
    if not wedding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wedding not found"
        )
    
    budget_service = BudgetService(db)
    summary = budget_service.get_budget_summary(wedding_id)
    
    if not summary:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found"
        )
    
    return summary


@router.post("/{wedding_id}/categories", response_model=BudgetCategoryResponse)
async def add_budget_category(
    wedding_id: int,
    category_data: BudgetCategoryCreate,
    db: Session = Depends(get_db),
    current_couple: Couple = Depends(get_current_couple)
):
    """Add a new budget category"""
    # Verify couple owns this wedding
    from app.models.wedding import Wedding
    wedding = db.query(Wedding).filter(
        Wedding.id == wedding_id,
        Wedding.couple_id == current_couple.id
    ).first()
    
    if not wedding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wedding not found"
        )
    
    budget_service = BudgetService(db)
    category = budget_service.add_category(wedding_id, category_data)
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found"
        )
    
    return category


@router.put("/categories/{category_id}", response_model=BudgetCategoryResponse)
async def update_budget_category(
    category_id: int,
    category_data: BudgetCategoryUpdate,
    db: Session = Depends(get_db),
    current_couple: Couple = Depends(get_current_couple)
):
    """Update a budget category"""
    # Verify couple owns the budget category
    from app.models.budget import BudgetCategory, Budget
    from app.models.wedding import Wedding
    
    category = db.query(BudgetCategory).join(Budget).join(Wedding).filter(
        BudgetCategory.id == category_id,
        Wedding.couple_id == current_couple.id
    ).first()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget category not found"
        )
    
    budget_service = BudgetService(db)
    updated_category = budget_service.update_category(category_id, category_data)
    
    return updated_category


@router.post("/expenses", response_model=ExpenseResponse)
async def add_expense(
    expense_data: ExpenseCreate,
    db: Session = Depends(get_db),
    current_couple: Couple = Depends(get_current_couple)
):
    """Add a new expense"""
    # Verify couple owns the budget category
    from app.models.budget import BudgetCategory, Budget
    from app.models.wedding import Wedding
    
    category = db.query(BudgetCategory).join(Budget).join(Wedding).filter(
        BudgetCategory.id == expense_data.budget_category_id,
        Wedding.couple_id == current_couple.id
    ).first()
    
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget category not found"
        )
    
    budget_service = BudgetService(db)
    expense = budget_service.add_expense(expense_data)
    
    return expense


@router.get("/{wedding_id}/expenses", response_model=List[ExpenseResponse])
async def get_expenses(
    wedding_id: int,
    category_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_couple: Couple = Depends(get_current_couple)
):
    """Get expenses for a wedding"""
    # Verify couple owns this wedding
    from app.models.wedding import Wedding
    wedding = db.query(Wedding).filter(
        Wedding.id == wedding_id,
        Wedding.couple_id == current_couple.id
    ).first()
    
    if not wedding:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wedding not found"
        )
    
    budget_service = BudgetService(db)
    expenses = budget_service.get_expenses(wedding_id, category_id)
    
    return expenses


@router.put("/expenses/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    expense_id: int,
    expense_data: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_couple: Couple = Depends(get_current_couple)
):
    """Update an expense"""
    # Verify couple owns the expense
    from app.models.budget import Expense, BudgetCategory, Budget
    from app.models.wedding import Wedding
    
    expense = db.query(Expense).join(BudgetCategory).join(Budget).join(Wedding).filter(
        Expense.id == expense_id,
        Wedding.couple_id == current_couple.id
    ).first()
    
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    
    budget_service = BudgetService(db)
    updated_expense = budget_service.update_expense(expense_id, expense_data)
    
    return updated_expense


@router.delete("/expenses/{expense_id}")
async def delete_expense(
    expense_id: int,
    db: Session = Depends(get_db),
    current_couple: Couple = Depends(get_current_couple)
):
    """Delete an expense"""
    # Verify couple owns the expense
    from app.models.budget import Expense, BudgetCategory, Budget
    from app.models.wedding import Wedding
    
    expense = db.query(Expense).join(BudgetCategory).join(Budget).join(Wedding).filter(
        Expense.id == expense_id,
        Wedding.couple_id == current_couple.id
    ).first()
    
    if not expense:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found"
        )
    
    budget_service = BudgetService(db)
    success = budget_service.delete_expense(expense_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete expense"
        )
    
    return {"message": "Expense deleted successfully"}