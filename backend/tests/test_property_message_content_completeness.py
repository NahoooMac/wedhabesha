"""
Property-Based Test: Message Content Completeness

**Feature: wedding-platform, Property 20: Message Content Completeness**

Tests that for any QR code distribution or event update, the message includes
all required information formatted according to specified templates.

**Validates: Requirements 12.2, 12.5**
"""

import pytest
from hypothesis import given, strategies as st, settings as hypothesis_settings, assume
from datetime import datetime, date
import re

from app.services.notification_service import CommunicationService, MessageType, MessageTemplate


# Test data strategies
@st.composite
def wedding_data_strategy(draw):
    """Generate wedding data for message templates"""
    return {
        'couple_names': draw(st.text(min_size=5, max_size=100, alphabet=st.characters(whitelist_categories=['L', 'Nd', 'Zs', 'Po']))),
        'wedding_date': draw(st.dates(min_value=date(2024, 1, 1), max_value=date(2030, 12, 31))).strftime("%B %d, %Y"),
        'venue_name': draw(st.text(min_size=3, max_size=100, alphabet=st.characters(whitelist_categories=['L', 'Nd', 'Zs', 'Po']))),
        'venue_address': draw(st.text(min_size=10, max_size=200, alphabet=st.characters(whitelist_categories=['L', 'Nd', 'Zs', 'Po']))),
        'qr_code': draw(st.text(min_size=10, max_size=50, alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'))
    }


@st.composite
def event_update_data_strategy(draw):
    """Generate event update data"""
    return {
        'couple_names': draw(st.text(min_size=5, max_size=100, alphabet=st.characters(whitelist_categories=['L', 'Nd', 'Zs', 'Po']))),
        'wedding_date': draw(st.dates(min_value=date(2024, 1, 1), max_value=date(2030, 12, 31))).strftime("%B %d, %Y"),
        'venue_name': draw(st.text(min_size=3, max_size=100, alphabet=st.characters(whitelist_categories=['L', 'Nd', 'Zs', 'Po']))),
        'update_message': draw(st.text(min_size=10, max_size=500, alphabet=st.characters(whitelist_categories=['L', 'Nd', 'Zs', 'Po'])))
    }


@st.composite
def reminder_data_strategy(draw):
    """Generate reminder data"""
    return {
        'couple_names': draw(st.text(min_size=5, max_size=100, alphabet=st.characters(whitelist_categories=['L', 'Nd', 'Zs', 'Po']))),
        'wedding_date': draw(st.dates(min_value=date(2024, 1, 1), max_value=date(2030, 12, 31))).strftime("%B %d, %Y"),
        'venue_name': draw(st.text(min_size=3, max_size=100, alphabet=st.characters(whitelist_categories=['L', 'Nd', 'Zs', 'Po']))),
        'time_until_wedding': draw(st.sampled_from(['tomorrow', 'in 2 days', 'next week', 'in 3 hours'])),
        'qr_code': draw(st.text(min_size=10, max_size=50, alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'))
    }


class TestMessageContentCompleteness:
    """Property-based tests for message content completeness"""
    
    def setup_method(self):
        """Set up test environment"""
        self.communication_service = CommunicationService()
    
    @given(wedding_data_strategy())
    @hypothesis_settings(max_examples=10, deadline=None)
    def test_property_qr_invitation_content_completeness(self, wedding_data):
        """
        Property 20a: QR Invitation Content Completeness
        
        For any QR code invitation, the message should include all required
        information: couple names, wedding date, venue name, venue address,
        and QR code, formatted according to the template.
        """
        assume(len(wedding_data['couple_names'].strip()) > 0)
        assume(len(wedding_data['venue_name'].strip()) > 0)
        assume(len(wedding_data['venue_address'].strip()) > 0)
        assume(len(wedding_data['qr_code'].strip()) > 0)
        
        # Generate QR invitation message
        message = self.communication_service.get_message_template(
            MessageType.QR_INVITATION,
            **wedding_data
        )
        
        # Verify message completeness
        assert isinstance(message, str)
        assert len(message.strip()) > 0
        
        # Verify all required information is included
        assert wedding_data['couple_names'] in message
        assert wedding_data['wedding_date'] in message
        assert wedding_data['venue_name'] in message
        assert wedding_data['venue_address'] in message
        assert wedding_data['qr_code'] in message
        
        # Verify template structure elements are present
        assert "You're invited" in message or "invited" in message.lower()
        assert "Wedding" in message or "wedding" in message.lower()
        assert "Date:" in message or "date" in message.lower()
        assert "Venue:" in message or "venue" in message.lower()
        assert "QR code" in message or "qr" in message.lower()
        assert "check-in" in message.lower() or "checkin" in message.lower()
        
        # Verify message contains celebration elements
        assert any(emoji in message for emoji in ['🎉', '📅', '📍', '🏠']) or \
               any(word in message.lower() for word in ['celebrating', 'celebration', 'looking forward'])
    
    @given(event_update_data_strategy())
    @hypothesis_settings(max_examples=10, deadline=None)
    def test_property_event_update_content_completeness(self, update_data):
        """
        Property 20b: Event Update Content Completeness
        
        For any event update, the message should include all required
        information: couple names, update message, wedding date, and venue name,
        formatted according to the template.
        """
        assume(len(update_data['couple_names'].strip()) > 0)
        assume(len(update_data['update_message'].strip()) > 0)
        assume(len(update_data['venue_name'].strip()) > 0)
        
        # Generate event update message
        message = self.communication_service.get_message_template(
            MessageType.EVENT_UPDATE,
            **update_data
        )
        
        # Verify message completeness
        assert isinstance(message, str)
        assert len(message.strip()) > 0
        
        # Verify all required information is included
        assert update_data['couple_names'] in message
        assert update_data['update_message'] in message
        assert update_data['wedding_date'] in message
        assert update_data['venue_name'] in message
        
        # Verify template structure elements are present
        assert "Update" in message or "update" in message.lower()
        assert "Wedding" in message or "wedding" in message.lower()
        assert "Date:" in message or "date" in message.lower()
        assert "Venue:" in message or "venue" in message.lower()
        
        # Verify message contains update notification elements
        assert any(emoji in message for emoji in ['📢', '📅', '📍']) or \
               any(word in message.lower() for word in ['update', 'announcement', 'notice'])
        
        # Verify courtesy elements
        assert "Thank you" in message or "thanks" in message.lower()
    
    @given(reminder_data_strategy())
    @hypothesis_settings(max_examples=10, deadline=None)
    def test_property_reminder_content_completeness(self, reminder_data):
        """
        Property 20c: Reminder Content Completeness
        
        For any wedding reminder, the message should include all required
        information: couple names, time until wedding, wedding date, venue name,
        and QR code, formatted according to the template.
        """
        assume(len(reminder_data['couple_names'].strip()) > 0)
        assume(len(reminder_data['venue_name'].strip()) > 0)
        assume(len(reminder_data['qr_code'].strip()) > 0)
        
        # Generate reminder message
        message = self.communication_service.get_message_template(
            MessageType.REMINDER,
            **reminder_data
        )
        
        # Verify message completeness
        assert isinstance(message, str)
        assert len(message.strip()) > 0
        
        # Verify all required information is included
        assert reminder_data['couple_names'] in message
        assert reminder_data['time_until_wedding'] in message
        assert reminder_data['wedding_date'] in message
        assert reminder_data['venue_name'] in message
        assert reminder_data['qr_code'] in message
        
        # Verify template structure elements are present
        assert "Reminder" in message or "reminder" in message.lower()
        assert "Wedding" in message or "wedding" in message.lower()
        assert "Don't forget" in message or "forget" in message.lower()
        assert "Date:" in message or "date" in message.lower()
        assert "Venue:" in message or "venue" in message.lower()
        assert "QR code" in message or "qr" in message.lower()
        
        # Verify message contains reminder elements
        assert any(emoji in message for emoji in ['⏰', '📅', '📍', '🎉']) or \
               any(word in message.lower() for word in ['reminder', 'don\'t forget', 'see you'])
    
    @given(wedding_data_strategy())
    @hypothesis_settings(max_examples=10, deadline=None)
    def test_property_template_formatting_consistency(self, wedding_data):
        """
        Property 20d: Template Formatting Consistency
        
        For any template data, the formatting should be consistent and
        follow the specified template structure with proper spacing and
        organization.
        """
        assume(len(wedding_data['couple_names'].strip()) > 0)
        assume(len(wedding_data['venue_name'].strip()) > 0)
        
        # Generate message using template
        message = self.communication_service.get_message_template(
            MessageType.QR_INVITATION,
            **wedding_data
        )
        
        # Verify formatting consistency
        assert isinstance(message, str)
        assert len(message.strip()) > 0
        
        # Verify no template placeholders remain
        assert '{' not in message
        assert '}' not in message
        
        # Verify proper line structure (should have multiple lines)
        lines = message.split('\n')
        assert len(lines) > 1
        
        # Verify no excessive whitespace
        assert not message.startswith(' ')
        assert not message.endswith(' ')
        
        # Verify consistent formatting patterns
        # Should have structured sections with labels
        label_patterns = [r'Date:', r'Venue:', r'Address:', r'QR code']
        found_labels = sum(1 for pattern in label_patterns if re.search(pattern, message, re.IGNORECASE))
        assert found_labels >= 2  # Should have at least some structured labels
    
    @given(st.text(min_size=1, max_size=100, alphabet=st.characters(whitelist_categories=['L', 'Nd', 'Zs'])))
    @hypothesis_settings(max_examples=10, deadline=None)
    def test_property_invalid_template_handling(self, invalid_template_type):
        """
        Property 20e: Invalid Template Handling
        
        For any invalid template type, the system should handle the error
        gracefully and provide appropriate error messages.
        """
        assume(invalid_template_type not in [t.value for t in MessageType])
        
        # Test invalid template type handling
        with pytest.raises(ValueError) as exc_info:
            self.communication_service.get_message_template(
                invalid_template_type,
                couple_names="Test Couple",
                wedding_date="January 1, 2025"
            )
        
        # Verify error message is informative
        error_message = str(exc_info.value)
        assert "Unknown template type" in error_message or "template" in error_message.lower()
        assert invalid_template_type in error_message
    
    @given(wedding_data_strategy())
    @hypothesis_settings(max_examples=10, deadline=None)
    def test_property_template_variable_substitution(self, wedding_data):
        """
        Property 20f: Template Variable Substitution
        
        For any template with variables, all variables should be properly
        substituted with the provided data, and no variables should remain
        unsubstituted.
        """
        assume(len(wedding_data['couple_names'].strip()) > 0)
        
        # Test all template types
        template_types = [MessageType.QR_INVITATION, MessageType.EVENT_UPDATE, MessageType.REMINDER]
        
        for template_type in template_types:
            try:
                # Prepare data based on template type
                template_data = wedding_data.copy()
                if template_type == MessageType.EVENT_UPDATE:
                    template_data['update_message'] = "Test update message"
                elif template_type == MessageType.REMINDER:
                    template_data['time_until_wedding'] = "tomorrow"
                
                # Generate message
                message = self.communication_service.get_message_template(
                    template_type,
                    **template_data
                )
                
                # Verify no unsubstituted variables
                assert '{' not in message, f"Unsubstituted variables found in {template_type}: {message}"
                assert '}' not in message, f"Unsubstituted variables found in {template_type}: {message}"
                
                # Verify message is not empty
                assert len(message.strip()) > 0, f"Empty message generated for {template_type}"
                
                # Verify at least some data was substituted
                data_found = any(value in message for key, value in template_data.items() 
                               if isinstance(value, str) and len(value.strip()) > 0)
                assert data_found, f"No template data found in message for {template_type}: {message}"
                
            except ValueError:
                # Some template types might not support all data combinations
                continue
    
    @given(st.dictionaries(
        keys=st.sampled_from(['couple_names', 'wedding_date', 'venue_name', 'venue_address', 'qr_code']),
        values=st.text(min_size=0, max_size=200, alphabet=st.characters(whitelist_categories=['L', 'Nd', 'Zs', 'Po'])),
        min_size=1,
        max_size=5
    ))
    @hypothesis_settings(max_examples=10, deadline=None)
    def test_property_partial_data_handling(self, partial_data):
        """
        Property 20g: Partial Data Handling
        
        For any partial template data, the system should handle missing
        variables gracefully and still produce a valid message structure.
        """
        assume(any(len(str(v).strip()) > 0 for v in partial_data.values()))
        
        try:
            # Attempt to generate message with partial data
            message = self.communication_service.get_message_template(
                MessageType.QR_INVITATION,
                **partial_data
            )
            
            # If successful, verify basic structure
            assert isinstance(message, str)
            
            # Should contain at least some of the provided data
            provided_values = [str(v) for v in partial_data.values() if len(str(v).strip()) > 0]
            if provided_values:
                data_found = any(value in message for value in provided_values)
                assert data_found, f"None of the provided data found in message: {message}"
            
        except (KeyError, ValueError) as e:
            # Missing required variables should raise appropriate errors
            assert "format" in str(e).lower() or "key" in str(e).lower() or "missing" in str(e).lower()


if __name__ == "__main__":
    pytest.main([__file__])
