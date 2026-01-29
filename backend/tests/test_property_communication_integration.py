"""
Property-Based Test: Communication Integration

**Feature: wedding-platform, Property 19: Communication Integration**

Tests that the system successfully integrates with WhatsApp and SMS services,
including proper error handling for delivery failures.

**Validates: Requirements 12.1, 12.4**
"""

import pytest
from hypothesis import given, strategies as st, settings as hypothesis_settings, assume
from datetime import datetime, date
from unittest.mock import Mock, patch
import re

from app.services.notification_service import CommunicationService, DeliveryStatus, MessageType
from app.core.config import settings


# Test data strategies
@st.composite
def phone_number_strategy(draw):
    """Generate valid Ethiopian phone numbers"""
    # Ethiopian phone numbers: +251 9XX XXX XXX or 09XX XXX XXX
    prefix = draw(st.sampled_from(['251', '0']))
    if prefix == '251':
        # International format
        first_digit = draw(st.sampled_from(['9']))  # Ethiopian mobile starts with 9
        remaining = draw(st.text(min_size=8, max_size=8, alphabet='0123456789'))
        return f"{prefix}{first_digit}{remaining}"
    else:
        # Local format
        first_digit = draw(st.sampled_from(['9']))
        remaining = draw(st.text(min_size=8, max_size=8, alphabet='0123456789'))
        return f"{prefix}{first_digit}{remaining}"


@st.composite
def guest_invitation_data_strategy(draw):
    """Generate guest invitation data"""
    return {
        'guest_phone': draw(phone_number_strategy()),
        'guest_name': draw(st.text(min_size=2, max_size=50, alphabet=st.characters(whitelist_categories=['L', 'Nd', 'Zs']))),
        'couple_names': draw(st.text(min_size=5, max_size=100, alphabet=st.characters(whitelist_categories=['L', 'Nd', 'Zs', 'Po']))),
        'wedding_date': draw(st.dates(min_value=date(2024, 1, 1), max_value=date(2030, 12, 31))).strftime("%B %d, %Y"),
        'venue_name': draw(st.text(min_size=3, max_size=100, alphabet=st.characters(whitelist_categories=['L', 'Nd', 'Zs', 'Po']))),
        'venue_address': draw(st.text(min_size=10, max_size=200, alphabet=st.characters(whitelist_categories=['L', 'Nd', 'Zs', 'Po']))),
        'qr_code': draw(st.text(min_size=10, max_size=50, alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'))
    }


@st.composite
def bulk_message_data_strategy(draw):
    """Generate bulk message data"""
    num_recipients = draw(st.integers(min_value=1, max_value=10))
    recipients = []
    for _ in range(num_recipients):
        recipients.append({
            'phone': draw(phone_number_strategy()),
            'message': draw(st.text(min_size=10, max_size=500, alphabet=st.characters(whitelist_categories=['L', 'Nd', 'Zs', 'Po'])))
        })
    return recipients


class TestCommunicationIntegration:
    """Property-based tests for communication integration"""
    
    def setup_method(self):
        """Set up test environment"""
        self.communication_service = CommunicationService()
    
    @given(guest_invitation_data_strategy())
    @hypothesis_settings(max_examples=10, deadline=None)
    def test_property_qr_invitation_integration(self, invitation_data):
        """
        Property 19a: QR Invitation Integration
        
        For any valid guest invitation data, the system should successfully
        integrate with WhatsApp and SMS services, returning appropriate
        delivery status and handling failures gracefully.
        """
        assume(len(invitation_data['guest_phone']) >= 9)
        assume(len(invitation_data['guest_name'].strip()) > 0)
        assume(len(invitation_data['couple_names'].strip()) > 0)
        
        # Test with WhatsApp preference
        result_whatsapp = self.communication_service.send_qr_invitation(
            guest_phone=invitation_data['guest_phone'],
            guest_name=invitation_data['guest_name'],
            couple_names=invitation_data['couple_names'],
            wedding_date=invitation_data['wedding_date'],
            venue_name=invitation_data['venue_name'],
            venue_address=invitation_data['venue_address'],
            qr_code=invitation_data['qr_code'],
            prefer_whatsapp=True
        )
        
        # Verify integration response structure
        assert isinstance(result_whatsapp, dict)
        assert 'phone' in result_whatsapp
        assert 'status' in result_whatsapp
        assert 'timestamp' in result_whatsapp
        
        # Verify status is valid
        assert result_whatsapp['status'] in [status.value for status in DeliveryStatus]
        
        # Verify phone number is preserved
        assert result_whatsapp['phone'] == invitation_data['guest_phone']
        
        # If sent successfully, should have method and message_id
        if result_whatsapp['status'] == DeliveryStatus.SENT:
            assert 'method' in result_whatsapp
            assert 'message_id' in result_whatsapp
            assert result_whatsapp['method'] in ['whatsapp', 'sms', 'sms_simulated']
        
        # If failed, should have error message
        if result_whatsapp['status'] == DeliveryStatus.FAILED:
            assert 'error' in result_whatsapp
            assert isinstance(result_whatsapp['error'], str)
            assert len(result_whatsapp['error']) > 0
        
        # Test with SMS preference
        result_sms = self.communication_service.send_qr_invitation(
            guest_phone=invitation_data['guest_phone'],
            guest_name=invitation_data['guest_name'],
            couple_names=invitation_data['couple_names'],
            wedding_date=invitation_data['wedding_date'],
            venue_name=invitation_data['venue_name'],
            venue_address=invitation_data['venue_address'],
            qr_code=invitation_data['qr_code'],
            prefer_whatsapp=False
        )
        
        # Verify SMS integration
        assert isinstance(result_sms, dict)
        assert result_sms['status'] in [status.value for status in DeliveryStatus]
        
        # Both attempts should handle the same phone number consistently
        assert result_whatsapp['phone'] == result_sms['phone']
    
    @given(bulk_message_data_strategy())
    @hypothesis_settings(max_examples=10, deadline=None)
    def test_property_bulk_messaging_integration(self, recipients_data):
        """
        Property 19b: Bulk Messaging Integration
        
        For any bulk message operation, the system should integrate with
        communication services for all recipients and handle partial
        failures gracefully.
        """
        assume(len(recipients_data) > 0)
        assume(all(len(r['phone']) >= 9 for r in recipients_data))
        assume(all(len(r['message'].strip()) > 0 for r in recipients_data))
        
        # Send bulk messages
        results = self.communication_service.send_bulk_messages(
            recipients=recipients_data,
            prefer_whatsapp=True
        )
        
        # Verify integration response
        assert isinstance(results, list)
        assert len(results) == len(recipients_data)
        
        # Verify each result
        for i, result in enumerate(results):
            assert isinstance(result, dict)
            assert 'phone' in result
            assert 'status' in result
            assert 'timestamp' in result
            
            # Verify status is valid
            assert result['status'] in [status.value for status in DeliveryStatus]
            
            # Verify phone number matches input
            assert result['phone'] == recipients_data[i]['phone']
            
            # Verify appropriate fields based on status
            if result['status'] == DeliveryStatus.SENT:
                assert 'method' in result
                # Should have either message_id or be simulated
                if 'message_id' in result:
                    assert isinstance(result['message_id'], str)
                    assert len(result['message_id']) > 0
            
            if result['status'] == DeliveryStatus.FAILED:
                assert 'error' in result
                assert isinstance(result['error'], str)
                assert len(result['error']) > 0
        
        # Verify statistics consistency
        sent_count = len([r for r in results if r['status'] == DeliveryStatus.SENT])
        failed_count = len([r for r in results if r['status'] == DeliveryStatus.FAILED])
        
        assert sent_count + failed_count == len(recipients_data)
        assert sent_count >= 0
        assert failed_count >= 0
    
    @given(st.lists(phone_number_strategy(), min_size=1, max_size=5))
    @hypothesis_settings(max_examples=10, deadline=None)
    def test_property_event_update_integration(self, guest_phones):
        """
        Property 19c: Event Update Integration
        
        For any event update to multiple guests, the system should
        integrate with communication services and handle delivery
        failures appropriately.
        """
        assume(all(len(phone) >= 9 for phone in guest_phones))
        
        # Test data
        couple_names = "John & Jane Doe"
        wedding_date = "December 25, 2024"
        venue_name = "Grand Hotel"
        update_message = "Important update: Wedding time changed to 3 PM"
        
        # Send event update
        results = self.communication_service.send_event_update(
            guest_phones=guest_phones,
            couple_names=couple_names,
            wedding_date=wedding_date,
            venue_name=venue_name,
            update_message=update_message,
            prefer_whatsapp=True
        )
        
        # Verify integration response
        assert isinstance(results, list)
        assert len(results) == len(guest_phones)
        
        # Verify each result
        for i, result in enumerate(results):
            assert isinstance(result, dict)
            assert 'phone' in result
            assert 'status' in result
            assert 'timestamp' in result
            
            # Verify status is valid
            assert result['status'] in [status.value for status in DeliveryStatus]
            
            # Verify phone number matches input
            assert result['phone'] == guest_phones[i]
            
            # Verify error handling
            if result['status'] == DeliveryStatus.FAILED:
                assert 'error' in result
                assert isinstance(result['error'], str)
    
    @given(st.text(min_size=5, max_size=100, alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'))
    @hypothesis_settings(max_examples=10, deadline=None)
    def test_property_delivery_tracking_integration(self, message_id):
        """
        Property 19d: Delivery Tracking Integration
        
        For any message ID, the system should integrate with external
        services to track delivery status and return consistent results.
        """
        assume(len(message_id.strip()) > 0)
        
        # Track delivery status
        status_result = self.communication_service.track_delivery_status(message_id)
        
        # Verify tracking response
        assert isinstance(status_result, dict)
        assert 'message_id' in status_result
        assert 'status' in status_result
        assert 'timestamp' in status_result
        
        # Verify message ID is preserved
        assert status_result['message_id'] == message_id
        
        # Verify status is valid
        assert status_result['status'] in [status.value for status in DeliveryStatus]
        
        # Verify timestamp format
        timestamp_str = status_result['timestamp']
        assert isinstance(timestamp_str, str)
        # Should be ISO format timestamp
        try:
            datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
        except ValueError:
            pytest.fail(f"Invalid timestamp format: {timestamp_str}")
    
    @given(phone_number_strategy())
    @hypothesis_settings(max_examples=10, deadline=None)
    def test_property_phone_number_formatting_integration(self, phone_number):
        """
        Property 19e: Phone Number Formatting Integration
        
        For any phone number format, the system should consistently
        format it for integration with external services.
        """
        assume(len(phone_number) >= 9)
        
        # Test phone number formatting through service
        formatted = self.communication_service._format_phone_number(phone_number)
        
        # Verify formatting consistency
        assert isinstance(formatted, str)
        assert formatted.isdigit()  # Should contain only digits
        
        # Should start with country code (251 for Ethiopia)
        if len(phone_number.replace('0', '').replace('+', '')) == 9:
            # 9-digit number should get 251 prefix
            assert formatted.startswith('251')
            assert len(formatted) == 12  # 251 + 9 digits
        elif phone_number.startswith('0') and len(phone_number) == 10:
            # 10-digit number starting with 0 should become 251 + 9 digits
            assert formatted.startswith('251')
            assert len(formatted) == 12
        
        # Verify no invalid characters
        assert re.match(r'^\d+$', formatted), f"Formatted number contains non-digits: {formatted}"
    
    @given(st.sampled_from([True, False]))
    @hypothesis_settings(max_examples=10, deadline=None)
    def test_property_fallback_mechanism_integration(self, prefer_whatsapp):
        """
        Property 19f: Fallback Mechanism Integration
        
        For any communication preference, the system should implement
        proper fallback mechanisms when primary service fails.
        """
        # Test data
        test_phone = "251912345678"
        test_message = "Test message for fallback mechanism"
        
        # Mock WhatsApp failure to test fallback
        with patch.object(self.communication_service, '_send_whatsapp_message') as mock_whatsapp:
            mock_whatsapp.return_value = {
                "phone": test_phone,
                "status": DeliveryStatus.FAILED,
                "error": "WhatsApp API unavailable",
                "method": "whatsapp",
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Send message with fallback
            result = self.communication_service._send_message_with_tracking(
                phone=test_phone,
                message=test_message,
                message_type=MessageType.CUSTOM,
                prefer_whatsapp=prefer_whatsapp
            )
            
            # Verify fallback behavior
            assert isinstance(result, dict)
            assert 'status' in result
            assert result['status'] in [status.value for status in DeliveryStatus]
            
            # If WhatsApp was preferred and failed, should fallback to SMS
            if prefer_whatsapp:
                # WhatsApp should have been attempted
                mock_whatsapp.assert_called_once()
                # Result should be from SMS fallback
                if result['status'] == DeliveryStatus.SENT:
                    assert result.get('method') in ['sms', 'sms_simulated']
            
            # Verify error handling consistency
            if result['status'] == DeliveryStatus.FAILED:
                assert 'error' in result
                assert isinstance(result['error'], str)


if __name__ == "__main__":
    pytest.main([__file__])
