"""
Property Test: Budget Warning Thresholds

**Feature: wedding-platform, Property 12: Budget Warning Thresholds**
**Validates: Requirements 6.3**

*For any* budget category approaching its limit (e.g., >90% spent), the system should 
display appropriate warnings to the couple.
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
    min_value=Decimal("100.00"),
    max_value=Decimal("10000.00"),
    places=2
)

# Strategy for generating spending percentages
spending_percentages = st.floats(min_value=0.0, max_value=1.2)  # Allow over-spending


@given(
    allocated_amount=decimal_amounts,
    spending_percentage=spending_percentages
)
@settings(suppress_health_check=[HealthCheck.function_scoped_fixture])
def test_budget_warning_thresholds(db_session: Session, allocated_amount: Decimal, spending_percentage: float):
    """
    Property Test: Budget warning thresholds
    
    For any budget category with spending, verify that:
    1. Categories with >90% spending generate "approaching" warnings
    2. Categories with >=100% spending generate "exceeded" warnings
    3. Categories with <90% spending generate no warnings
    4. Warning messages contain accurate information
    """
    # Calculate spent amount based on percentage
    spent_amount = Decimal(str(allocated_amount * Decimal(str(spending_percentage))))
    
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
    
    # Add expenses to reach the target spending amount
    if spent_amount > 0:
        # Split into multiple expenses to be more realistic
        num_expenses = min(5, max(1, int(spent_amount / Decimal("100"))))
        expense_amount = spent_amount / num_expenses
        
        for i in range(num_expenses):
            # Use the exact amount for the last expense to avoid rounding issues
            if i == num_expenses - 1:
                final_amount = spent_amount - (expense_amount * (num_expenses - 1))
                if final_amount > 0:
                    expense_create = ExpenseCreate(
                        budget_category_id=category_id,
                        description=f"Test Expense {i+1}",
                        amount=final_amount,
                        date=date(2024, 6, 1)
                    )
                    budget_service.add_expense(expense_create)
            else:
                expense_create = ExpenseCreate(
                    budget_category_id=category_id,
                    description=f"Test Expense {i+1}",
                    amount=expense_amount,
                    date=date(2024, 6, 1)
                )
                budget_service.add_expense(expense_create)
    
    # Get budget summary with warnings
    budget_summary = budget_service.get_budget_summary(wedding.id)
    
    # Calculate expected percentage
    actual_percentage = float((spent_amount / allocated_amount) * 100) if allocated_amount > 0 else 0.0
    
    # Verify warning behavior based on spending percentage
    if actual_percentage >= 100:
        # Should have "exceeded" warning
        exceeded_warnings = [w for w in budget_summary.warnings if w.warning_level == "exceeded"]
        assert len(exceeded_warnings) > 0, f"Expected 'exceeded' warning for {actual_percentage:.1f}% spending"
        
        warning = exceeded_warnings[0]
        assert warning.category == "Test Category"
        assert warning.allocated_amount == allocated_amount
        assert abs(warning.percentage_spent - actual_percentage) < 0.1
        assert "exceeded" in warning.message.lower()
        
    elif actual_percentage >= 90:
        # Should have "approaching" warning
        approaching_warnings = [w for w in budget_summary.warnings if w.warning_level == "approaching"]
        assert len(approaching_warnings) > 0, f"Expected 'approaching' warning for {actual_percentage:.1f}% spending"
        
        warning = approaching_warnings[0]
        assert warning.category == "Test Category"
        assert warning.allocated_amount == allocated_amount
        assert abs(warning.percentage_spent - actual_percentage) < 0.1
        assert f"{actual_percentage:.1f}%" in warning.message
        
    else:
        # Should have no warnings
        assert len(budget_summary.warnings) == 0, f"Expected no warnings for {actual_percentage:.1f}% spending, but got: {[w.message for w in budget_summary.warnings]}"


@given(
    categories_data=st.lists(
        st.tuples(
            st.text(min_size=1, max_size=20, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Pc', 'Pd', 'Zs'))),
            decimal_amounts,
            spending_percentages
        ),
        min_size=1,
        max_size=3
    )
)
@settings(suppress_health_check=[HealthCheck.function_scoped_fixture])
def test_multiple_category_warnings(db_session: Session, categories_data: list):
    """
    Property Test: Multiple category warnings
    
    For any budget with multiple categories, verify that warnings are generated
    correctly for each category independently.
    """
    # Calculate total budget
    total_budget = sum(Decimal(str(allocated)) for _, allocated, _ in categories_data)
    
    # Create test user and couple with unique email
    import uuid
    unique_email = f"test-multi-{uuid.uuid4()}@example.com"
    
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
    wedding_code = f"MULTI{uuid.uuid4().hex[:6].upper()}"
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
    
    # Create budget with multiple categories
    budget_service = BudgetService(db_session)
    categories = []
    for i, (name, allocated, _) in enumerate(categories_data):
        categories.append(BudgetCategoryCreate(
            category=f"{name}_{i}",  # Make category names unique
            allocated_amount=allocated
        ))
    
    budget_data = BudgetCreate(
        total_budget=total_budget,
        currency="ETB",
        categories=categories
    )
    
    budget_response = budget_service.create_budget(wedding.id, budget_data)
    
    # Add expenses to each category
    expected_warnings = []
    for i, (name, allocated, spending_percentage) in enumerate(categories_data):
        category = budget_response.categories[i]
        spent_amount = Decimal(str(allocated * Decimal(str(spending_percentage))))
        
        if spent_amount > 0:
            expense_create = ExpenseCreate(
                budget_category_id=category.id,
                description=f"Test Expense for {name}",
                amount=spent_amount,
                date=date(2024, 6, 1)
            )
            budget_service.add_expense(expense_create)
        
        # Calculate expected warnings
        actual_percentage = float((spent_amount / allocated) * 100) if allocated > 0 else 0.0
        if actual_percentage >= 100:
            expected_warnings.append(("exceeded", f"{name}_{i}"))
        elif actual_percentage >= 90:
            expected_warnings.append(("approaching", f"{name}_{i}"))
    
    # Get budget summary with warnings
    budget_summary = budget_service.get_budget_summary(wedding.id)
    
    # Verify warnings match expectations
    actual_warnings = [(w.warning_level, w.category) for w in budget_summary.warnings]
    
    # Check that all expected warnings are present
    for expected_level, expected_category in expected_warnings:
        matching_warnings = [w for w in actual_warnings if w[0] == expected_level and w[1] == expected_category]
        assert len(matching_warnings) > 0, f"Expected {expected_level} warning for category {expected_category}, but got warnings: {actual_warnings}"
    
    # Check that no unexpected warnings are present
    for actual_level, actual_category in actual_warnings:
        matching_expected = [w for w in expected_warnings if w[0] == actual_level and w[1] == actual_category]
        assert len(matching_expected) > 0, f"Unexpected {actual_level} warning for category {actual_category}"


def test_warning_threshold_boundaries(db_session: Session):
    """
    Test exact boundary conditions for warning thresholds
    """
    import uuid
    unique_email = f"test-boundary-{uuid.uuid4()}@example.com"
    
    # Create test data
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
    
    wedding_code = f"BOUND{uuid.uuid4().hex[:6].upper()}"
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
    
    budget_service = BudgetService(db_session)
    
    # Test cases for different spending levels
    test_cases = [
        (Decimal("1000.00"), Decimal("890.00"), 0),  # 89% - no warning
        (Decimal("1000.00"), Decimal("900.00"), 1),  # 90% - approaching warning
        (Decimal("1000.00"), Decimal("950.00"), 1),  # 95% - approaching warning
        (Decimal("1000.00"), Decimal("1000.00"), 1), # 100% - exceeded warning
        (Decimal("1000.00"), Decimal("1100.00"), 1), # 110% - exceeded warning
    ]
    
    for i, (allocated, spent, expected_warning_count) in enumerate(test_cases):
        # Create budget for this test case
        budget_data = BudgetCreate(
            total_budget=allocated,
            currency="ETB",
            categories=[BudgetCategoryCreate(
                category=f"Test Category {i}",
                allocated_amount=allocated
            )]
        )
        
        # Create a new wedding for each test case to avoid conflicts
        test_wedding_code = f"BOUND{i}{uuid.uuid4().hex[:4].upper()}"
        test_wedding = Wedding(
            couple_id=couple.id,
            wedding_code=test_wedding_code,
            staff_pin="hashed_pin",
            wedding_date=date(2024, 6, 15),
            venue_name="Test Venue",
            venue_address="Test Address",
            expected_guests=100
        )
        db_session.add(test_wedding)
        db_session.flush()
        
        budget_response = budget_service.create_budget(test_wedding.id, budget_data)
        category_id = budget_response.categories[0].id
        
        # Add expense
        if spent > 0:
            expense_create = ExpenseCreate(
                budget_category_id=category_id,
                description=f"Test Expense {i}",
                amount=spent,
                date=date(2024, 6, 1)
            )
            budget_service.add_expense(expense_create)
        
        # Check warnings
        budget_summary = budget_service.get_budget_summary(test_wedding.id)
        percentage = float((spent / allocated) * 100)
        
        assert len(budget_summary.warnings) == expected_warning_count, \
            f"Test case {i}: Expected {expected_warning_count} warnings for {percentage:.1f}% spending, got {len(budget_summary.warnings)}"
        
        if expected_warning_count > 0:
            warning = budget_summary.warnings[0]
            if percentage >= 100:
                assert warning.warning_level == "exceeded", f"Expected 'exceeded' warning for {percentage:.1f}%"
            else:
                assert warning.warning_level == "approaching", f"Expected 'approaching' warning for {percentage:.1f}%"
