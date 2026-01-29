"""
Property Test: Currency Formatting Consistency

**Feature: wedding-platform, Property 13: Currency Formatting Consistency**
**Validates: Requirements 6.4**

*For any* monetary amount in ETB, the system should format and display it consistently 
across all interfaces using proper Ethiopian Birr formatting.
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
from app.schemas.budget import BudgetCreate, BudgetCategoryCreate, ExpenseCreate, format_etb_currency


# Strategy for generating valid decimal amounts (2 decimal places)
decimal_amounts = st.decimals(
    min_value=Decimal("0.00"),
    max_value=Decimal("999999.99"),
    places=2
)

# Strategy for generating various currency amounts including edge cases
currency_amounts = st.one_of([
    st.just(Decimal("0.00")),  # Zero amount
    st.just(Decimal("0.01")),  # Minimum amount
    st.just(Decimal("1.00")),  # Single unit
    st.just(Decimal("10.50")), # Decimal amount
    st.just(Decimal("100.00")), # Round hundred
    st.just(Decimal("1000.00")), # Thousand
    st.just(Decimal("10000.99")), # Large amount with cents
    decimal_amounts  # Random amounts
])


@given(amount=currency_amounts)
def test_etb_currency_formatting_consistency(amount: Decimal):
    """
    Property Test: ETB currency formatting consistency
    
    For any monetary amount, verify that:
    1. Format follows "ETB X,XXX.XX" pattern
    2. Always shows 2 decimal places
    3. Uses comma as thousands separator
    4. Handles zero and negative amounts correctly
    5. Consistent formatting across all contexts
    """
    formatted = format_etb_currency(amount)
    
    # Should always start with "ETB "
    assert formatted.startswith("ETB "), f"Currency format should start with 'ETB ', got: {formatted}"
    
    # Extract the numeric part
    numeric_part = formatted[4:]  # Remove "ETB " prefix
    
    # Should always have 2 decimal places
    assert "." in numeric_part, f"Currency should have decimal point, got: {formatted}"
    decimal_part = numeric_part.split(".")[-1]
    assert len(decimal_part) == 2, f"Currency should have exactly 2 decimal places, got: {formatted}"
    
    # Should use comma as thousands separator for amounts >= 1000
    if amount >= 1000:
        assert "," in numeric_part, f"Large amounts should use comma separator, got: {formatted}"
    
    # Verify the numeric value is preserved
    # Remove commas and convert back to decimal
    clean_numeric = numeric_part.replace(",", "")
    parsed_amount = Decimal(clean_numeric)
    assert parsed_amount == amount, f"Formatted amount {parsed_amount} doesn't match original {amount}"
    
    # Test specific formatting patterns
    if amount == Decimal("0.00"):
        assert formatted == "ETB 0.00"
    elif amount == Decimal("1.00"):
        assert formatted == "ETB 1.00"
    elif amount == Decimal("1000.00"):
        assert formatted == "ETB 1,000.00"
    elif amount == Decimal("10000.50"):
        assert formatted == "ETB 10,000.50"


@given(
    budget_amount=decimal_amounts,
    category_amounts=st.lists(decimal_amounts, min_size=1, max_size=3),
    expense_amounts=st.lists(decimal_amounts, min_size=0, max_size=5)
)
@settings(suppress_health_check=[HealthCheck.function_scoped_fixture])
def test_budget_system_currency_consistency(db_session: Session, budget_amount: Decimal, category_amounts: list, expense_amounts: list):
    """
    Property Test: Currency formatting consistency across budget system
    
    For any budget with categories and expenses, verify that all monetary amounts
    are formatted consistently throughout the system.
    """
    # Ensure category amounts don't exceed budget
    total_categories = sum(category_amounts)
    assume(total_categories <= budget_amount)
    
    # Ensure expense amounts are reasonable
    total_expenses = sum(expense_amounts)
    assume(total_expenses <= budget_amount)
    
    # Create test user and couple with unique email
    import uuid
    unique_email = f"test-currency-{uuid.uuid4()}@example.com"
    
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
    wedding_code = f"CURR{uuid.uuid4().hex[:6].upper()}"
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
    categories = []
    for i, amount in enumerate(category_amounts):
        categories.append(BudgetCategoryCreate(
            category=f"Category {i}",
            allocated_amount=amount
        ))
    
    budget_data = BudgetCreate(
        total_budget=budget_amount,
        currency="ETB",
        categories=categories
    )
    
    budget_response = budget_service.create_budget(wedding.id, budget_data)
    
    # Add expenses
    for i, expense_amount in enumerate(expense_amounts):
        if expense_amount > 0 and budget_response.categories:
            # Add to first category that has remaining budget
            for category in budget_response.categories:
                remaining = category.allocated_amount - category.spent_amount
                if expense_amount <= remaining:
                    expense_create = ExpenseCreate(
                        budget_category_id=category.id,
                        description=f"Test Expense {i}",
                        amount=expense_amount,
                        date=date(2024, 6, 1)
                    )
                    budget_service.add_expense(expense_create)
                    break
    
    # Get updated budget and verify currency formatting consistency
    updated_budget = budget_service.get_budget(wedding.id)
    budget_summary = budget_service.get_budget_summary(wedding.id)
    
    # Test all monetary amounts in budget response
    amounts_to_test = [
        updated_budget.total_budget,
        updated_budget.total_spent,
        updated_budget.total_remaining,
        budget_summary.total_budget,
        budget_summary.total_spent,
        budget_summary.total_remaining
    ]
    
    # Add category amounts
    for category in updated_budget.categories:
        amounts_to_test.extend([
            category.allocated_amount,
            category.spent_amount,
            category.remaining_amount
        ])
    
    # Add warning amounts
    for warning in budget_summary.warnings:
        amounts_to_test.extend([
            warning.allocated_amount,
            warning.spent_amount
        ])
    
    # Test currency formatting consistency for all amounts
    for amount in amounts_to_test:
        if amount is not None:
            formatted = format_etb_currency(amount)
            
            # Verify consistent formatting
            assert formatted.startswith("ETB "), f"All amounts should start with 'ETB ', got: {formatted}"
            
            numeric_part = formatted[4:]
            assert "." in numeric_part, f"All amounts should have decimal point, got: {formatted}"
            
            decimal_part = numeric_part.split(".")[-1]
            assert len(decimal_part) == 2, f"All amounts should have 2 decimal places, got: {formatted}"
            
            # Verify thousands separator for large amounts
            if amount >= 1000:
                assert "," in numeric_part, f"Large amounts should use comma separator, got: {formatted} for amount {amount}"
    
    # Verify currency field is consistently "ETB"
    assert updated_budget.currency == "ETB"
    assert budget_summary.currency == "ETB"


def test_currency_formatting_edge_cases():
    """
    Test currency formatting for edge cases and boundary values
    """
    test_cases = [
        (Decimal("0.00"), "ETB 0.00"),
        (Decimal("0.01"), "ETB 0.01"),
        (Decimal("0.99"), "ETB 0.99"),
        (Decimal("1.00"), "ETB 1.00"),
        (Decimal("9.99"), "ETB 9.99"),
        (Decimal("10.00"), "ETB 10.00"),
        (Decimal("99.99"), "ETB 99.99"),
        (Decimal("100.00"), "ETB 100.00"),
        (Decimal("999.99"), "ETB 999.99"),
        (Decimal("1000.00"), "ETB 1,000.00"),
        (Decimal("1000.01"), "ETB 1,000.01"),
        (Decimal("9999.99"), "ETB 9,999.99"),
        (Decimal("10000.00"), "ETB 10,000.00"),
        (Decimal("99999.99"), "ETB 99,999.99"),
        (Decimal("100000.00"), "ETB 100,000.00"),
        (Decimal("999999.99"), "ETB 999,999.99"),
    ]
    
    for amount, expected in test_cases:
        formatted = format_etb_currency(amount)
        assert formatted == expected, f"Expected {expected}, got {formatted} for amount {amount}"


def test_currency_formatting_precision():
    """
    Test that currency formatting maintains precision and doesn't introduce rounding errors
    """
    # Test various decimal amounts
    test_amounts = [
        Decimal("123.45"),
        Decimal("1234.56"),
        Decimal("12345.67"),
        Decimal("123456.78"),
        Decimal("1.23"),
        Decimal("12.34"),
        Decimal("123.40"),  # Trailing zero
        Decimal("1000.05"),  # Small decimal with thousands
    ]
    
    for amount in test_amounts:
        formatted = format_etb_currency(amount)
        
        # Extract numeric part and verify precision
        numeric_part = formatted[4:].replace(",", "")
        parsed_back = Decimal(numeric_part)
        
        assert parsed_back == amount, f"Precision lost: {amount} -> {formatted} -> {parsed_back}"
        
        # Verify decimal places are always shown
        assert numeric_part.count(".") == 1, f"Should have exactly one decimal point: {formatted}"
        decimal_part = numeric_part.split(".")[1]
        assert len(decimal_part) == 2, f"Should have exactly 2 decimal places: {formatted}"


@given(amounts=st.lists(currency_amounts, min_size=2, max_size=10))
def test_currency_formatting_consistency_across_operations(amounts: list):
    """
    Property Test: Currency formatting consistency across mathematical operations
    
    Verify that currency formatting remains consistent when performing
    calculations like addition, subtraction, etc.
    """
    # Test that formatting is consistent for calculated values
    total = sum(amounts)
    average = total / len(amounts) if amounts else Decimal("0.00")
    
    # Format all amounts
    formatted_amounts = [format_etb_currency(amount) for amount in amounts]
    formatted_total = format_etb_currency(total)
    formatted_average = format_etb_currency(average.quantize(Decimal("0.01")))
    
    # Verify all follow the same pattern
    all_formatted = formatted_amounts + [formatted_total, formatted_average]
    
    for formatted in all_formatted:
        assert formatted.startswith("ETB "), f"All formatted amounts should start with 'ETB ': {formatted}"
        
        numeric_part = formatted[4:]
        assert "." in numeric_part, f"All amounts should have decimal point: {formatted}"
        
        decimal_part = numeric_part.split(".")[-1]
        assert len(decimal_part) == 2, f"All amounts should have 2 decimal places: {formatted}"
    
    # Verify that the sum of individual amounts equals the formatted total
    # (accounting for potential rounding in average)
    calculated_total = sum(amounts)
    total_numeric = formatted_total[4:].replace(",", "")
    assert Decimal(total_numeric) == calculated_total, f"Total calculation mismatch: {calculated_total} vs {total_numeric}"
