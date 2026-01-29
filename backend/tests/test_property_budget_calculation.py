"""
Property Test: Budget Calculation Accuracy

**Feature: wedding-platform, Property 11: Budget Calculation Accuracy**
**Validates: Requirements 6.2**

*For any* budget with expenses, the system should accurately calculate remaining amounts 
and spending percentages across all categories.
"""

import pytest
from decimal import Decimal
from datetime import date
from hypothesis import given, strategies as st, assume, settings, HealthCheck
from sqlalchemy.orm import Session

from app.models.budget import Budget, BudgetCategory, Expense
from app.models.wedding import Wedding
from app.models.user import User, Couple, UserType, AuthProvider
from app.services.budget_service import BudgetService
from app.schemas.budget import BudgetCreate, BudgetCategoryCreate, ExpenseCreate


# Strategy for generating valid decimal amounts (2 decimal places)
decimal_amounts = st.decimals(
    min_value=Decimal("0.01"),
    max_value=Decimal("999999.99"),
    places=2
)

# Strategy for generating budget categories
budget_categories = st.lists(
    st.builds(
        BudgetCategoryCreate,
        category=st.text(min_size=1, max_size=50, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Pc', 'Pd', 'Zs'))),
        allocated_amount=decimal_amounts
    ),
    min_size=1,
    max_size=5
)

# Strategy for generating expenses
expenses_strategy = st.lists(
    st.builds(
        dict,
        description=st.text(min_size=1, max_size=100, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Pc', 'Pd', 'Zs'))),
        amount=decimal_amounts,
        date=st.dates(min_value=date(2020, 1, 1), max_value=date(2030, 12, 31))
    ),
    min_size=0,
    max_size=10
)


@given(
    total_budget=decimal_amounts,
    categories=budget_categories,
    expenses=expenses_strategy
)
@settings(suppress_health_check=[HealthCheck.function_scoped_fixture])
def test_budget_calculation_accuracy(db_session: Session, total_budget: Decimal, categories: list, expenses: list):
    """
    Property Test: Budget calculation accuracy
    
    For any budget with expenses, verify that:
    1. Total spent equals sum of all expenses
    2. Remaining amount equals allocated minus spent for each category
    3. Percentage spent is calculated correctly
    4. Category totals are consistent with individual expenses
    """
    # Ensure categories don't exceed total budget
    total_allocated = sum(cat.allocated_amount for cat in categories)
    assume(total_allocated <= total_budget)
    
    # Create test user and couple with unique email
    import uuid
    unique_email = f"test-{uuid.uuid4()}@example.com"
    
    user = User(
        email=unique_email,
        user_type=UserType.COUPLE,
        auth_provider=AuthProvider.EMAIL,
        password_hash="hashed_password"
    )
    db_session.add(user)
    db_session.flush()
    
    couple = Couple(
        user_id=user.id,
        partner1_name="Partner 1",
        partner2_name="Partner 2"
    )
    db_session.add(couple)
    db_session.flush()
    
    # Create test wedding with unique code
    wedding_code = f"TEST{uuid.uuid4().hex[:6].upper()}"
    wedding = Wedding(
        couple_id=couple.id,
        wedding_code=wedding_code,
        staff_pin="hashed_pin",
        wedding_date=date(2024, 6, 15),
        venue_name="Test Venue",
        venue_address="Test Address",
        expected_guests=100
    )
    db_session.add(wedding)
    db_session.flush()
    
    # Create budget with categories
    budget_service = BudgetService(db_session)
    budget_data = BudgetCreate(
        total_budget=total_budget,
        currency="ETB",
        categories=categories
    )
    
    budget_response = budget_service.create_budget(wedding.id, budget_data)
    
    # Add expenses to categories
    category_expenses = {}  # Track expenses per category
    for expense_data in expenses:
        # Randomly assign to a category
        if budget_response.categories:
            import random
            category = random.choice(budget_response.categories)
            
            # Ensure expense doesn't exceed remaining budget for category
            remaining = category.allocated_amount - category.spent_amount
            if expense_data["amount"] <= remaining:
                expense_create = ExpenseCreate(
                    budget_category_id=category.id,
                    description=expense_data["description"],
                    amount=expense_data["amount"],
                    date=expense_data["date"]
                )
                
                budget_service.add_expense(expense_create)
                
                # Track expenses for verification
                if category.id not in category_expenses:
                    category_expenses[category.id] = []
                category_expenses[category.id].append(expense_data["amount"])
    
    # Get updated budget
    updated_budget = budget_service.get_budget(wedding.id)
    
    # Verify budget calculation accuracy
    
    # 1. Total spent should equal sum of all category spent amounts
    calculated_total_spent = sum(cat.spent_amount for cat in updated_budget.categories)
    assert updated_budget.total_spent == calculated_total_spent, \
        f"Total spent mismatch: {updated_budget.total_spent} != {calculated_total_spent}"
    
    # 2. For each category, verify calculations
    for category in updated_budget.categories:
        # Remaining amount should be allocated minus spent
        expected_remaining = category.allocated_amount - category.spent_amount
        assert category.remaining_amount == expected_remaining, \
            f"Category {category.category} remaining amount mismatch: {category.remaining_amount} != {expected_remaining}"
        
        # Percentage spent should be calculated correctly
        if category.allocated_amount > 0:
            expected_percentage = float((category.spent_amount / category.allocated_amount) * 100)
            assert abs(category.percentage_spent - expected_percentage) < 0.01, \
                f"Category {category.category} percentage mismatch: {category.percentage_spent} != {expected_percentage}"
        else:
            assert category.percentage_spent == 0.0
        
        # Spent amount should equal sum of expenses for this category
        if category.id in category_expenses:
            expected_spent = sum(category_expenses[category.id])
            assert category.spent_amount == expected_spent, \
                f"Category {category.category} spent amount mismatch: {category.spent_amount} != {expected_spent}"
    
    # 3. Total remaining should be total budget minus total spent
    expected_total_remaining = updated_budget.total_budget - updated_budget.total_spent
    assert updated_budget.total_remaining == expected_total_remaining, \
        f"Total remaining mismatch: {updated_budget.total_remaining} != {expected_total_remaining}"
    
    # 4. Overall percentage should be calculated correctly
    if updated_budget.total_budget > 0:
        expected_overall_percentage = float((updated_budget.total_spent / updated_budget.total_budget) * 100)
        assert abs(updated_budget.percentage_spent - expected_overall_percentage) < 0.01, \
            f"Overall percentage mismatch: {updated_budget.percentage_spent} != {expected_overall_percentage}"
    else:
        assert updated_budget.percentage_spent == 0.0
    
    # 5. Currency should be preserved
    assert updated_budget.currency == "ETB"


@given(
    allocated_amount=decimal_amounts,
    expenses=st.lists(decimal_amounts, min_size=1, max_size=5)
)
@settings(suppress_health_check=[HealthCheck.function_scoped_fixture])
def test_category_calculation_consistency(db_session: Session, allocated_amount: Decimal, expenses: list):
    """
    Property Test: Category calculation consistency
    
    For any category with expenses, verify that spent amount equals sum of expenses
    and remaining amount is calculated correctly.
    """
    # Ensure expenses don't exceed allocated amount
    total_expenses = sum(expenses)
    assume(total_expenses <= allocated_amount)
    
    # Create test data with unique identifiers
    import uuid
    unique_email = f"test2-{uuid.uuid4()}@example.com"
    
    user = User(
        email=unique_email,
        user_type=UserType.COUPLE,
        auth_provider=AuthProvider.EMAIL,
        password_hash="hashed_password"
    )
    db_session.add(user)
    db_session.flush()
    
    couple = Couple(
        user_id=user.id,
        partner1_name="Partner 1",
        partner2_name="Partner 2"
    )
    db_session.add(couple)
    db_session.flush()
    
    wedding_code = f"TEST{uuid.uuid4().hex[:6].upper()}"
    wedding = Wedding(
        couple_id=couple.id,
        wedding_code=wedding_code,
        staff_pin="hashed_pin",
        wedding_date=date(2024, 6, 15),
        venue_name="Test Venue",
        venue_address="Test Address",
        expected_guests=100
    )
    db_session.add(wedding)
    db_session.flush()
    
    # Create budget with single category
    budget_service = BudgetService(db_session)
    budget_data = BudgetCreate(
        total_budget=allocated_amount,
        currency="ETB",
        categories=[BudgetCategoryCreate(
            category="Test Category",
            allocated_amount=allocated_amount
        )]
    )
    
    budget_response = budget_service.create_budget(wedding.id, budget_data)
    category_id = budget_response.categories[0].id
    
    # Add expenses
    for expense_amount in expenses:
        expense_create = ExpenseCreate(
            budget_category_id=category_id,
            description="Test Expense",
            amount=expense_amount,
            date=date(2024, 6, 1)
        )
        budget_service.add_expense(expense_create)
    
    # Get updated budget
    updated_budget = budget_service.get_budget(wedding.id)
    category = updated_budget.categories[0]
    
    # Verify calculations
    expected_spent = sum(expenses)
    expected_remaining = allocated_amount - expected_spent
    expected_percentage = float((expected_spent / allocated_amount) * 100) if allocated_amount > 0 else 0.0
    
    assert category.spent_amount == expected_spent, \
        f"Spent amount mismatch: {category.spent_amount} != {expected_spent}"
    
    assert category.remaining_amount == expected_remaining, \
        f"Remaining amount mismatch: {category.remaining_amount} != {expected_remaining}"
    
    assert abs(category.percentage_spent - expected_percentage) < 0.01, \
        f"Percentage mismatch: {category.percentage_spent} != {expected_percentage}"


def test_empty_budget_calculations(db_session: Session):
    """
    Test budget calculations with no expenses
    """
    # Create test data with unique identifiers
    import uuid
    unique_email = f"test3-{uuid.uuid4()}@example.com"
    
    user = User(
        email=unique_email,
        user_type=UserType.COUPLE,
        auth_provider=AuthProvider.EMAIL,
        password_hash="hashed_password"
    )
    db_session.add(user)
    db_session.flush()
    
    couple = Couple(
        user_id=user.id,
        partner1_name="Partner 1",
        partner2_name="Partner 2"
    )
    db_session.add(couple)
    db_session.flush()
    
    wedding_code = f"TEST{uuid.uuid4().hex[:6].upper()}"
    wedding = Wedding(
        couple_id=couple.id,
        wedding_code=wedding_code,
        staff_pin="hashed_pin",
        wedding_date=date(2024, 6, 15),
        venue_name="Test Venue",
        venue_address="Test Address",
        expected_guests=100
    )
    db_session.add(wedding)
    db_session.flush()
    
    # Create budget with no expenses
    budget_service = BudgetService(db_session)
    budget_data = BudgetCreate(
        total_budget=Decimal("10000.00"),
        currency="ETB",
        categories=[
            BudgetCategoryCreate(category="Venue", allocated_amount=Decimal("5000.00")),
            BudgetCategoryCreate(category="Catering", allocated_amount=Decimal("3000.00")),
            BudgetCategoryCreate(category="Photography", allocated_amount=Decimal("2000.00"))
        ]
    )
    
    budget_response = budget_service.create_budget(wedding.id, budget_data)
    
    # Verify all calculations are correct for empty budget
    assert budget_response.total_spent == Decimal("0.00")
    assert budget_response.total_remaining == Decimal("10000.00")
    assert budget_response.percentage_spent == 0.0
    
    for category in budget_response.categories:
        assert category.spent_amount == Decimal("0.00")
        assert category.remaining_amount == category.allocated_amount
        assert category.percentage_spent == 0.0
