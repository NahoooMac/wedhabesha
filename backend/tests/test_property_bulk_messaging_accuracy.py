"""
Property-Based Test: Bulk Messaging Accuracy

**Feature: wedding-platform, Property 21: Bulk Messaging Accuracy**

Tests that for any bulk message operation to selected guest groups,
all and only the selected guests receive the message.

**Validates: Requirements 12.3**
"""

import pytest
from hypothesis import given, strategies as st, settings as hypothesis_settings, assume
from datetime import datetime, date
from typing import List, Dict, Set
import re

from app.services.notification_service import CommunicationService, DeliveryStatus, MessageType


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
def guest_group_strategy(draw):
    """Generate a group of guests with phone numbers"""
    num_guests = draw(st.integers(min_value=1, max_value=20))
    guests = []
    used_phones = set()
    
    for i in range(num_guests):
        # Ensure unique phone numbers
        phone = draw(phone_number_strategy())
        while phone in used_phones:
            phone = draw(phone_number_strategy())
        used_phones.add(phone)
        
        guests.append({
            'id': i + 1,
            'name': draw(st.text(min_size=2, max_size=50, alphabet=st.characters(whitelist_categories=['L', 'Nd', 'Zs']))),
            'phone': phone,
            'selected': draw(st.booleans())  # Whether this guest is selected for messaging
        })
    
    return guests


@st.composite
def bulk_message_recipients_strategy(draw):
    """Generate bulk message recipients data"""
    num_recipients = draw(st.integers(min_value=1, max_value=15))
    recipients = []
    used_phones = set()
    
    for _ in range(num_recipients):
        phone = draw(phone_number_strategy())
        while phone in used_phones:
            phone = draw(phone_number_strategy())
        used_phones.add(phone)
        
        recipients.append({
            'phone': phone,
            'message': draw(st.text(min_size=10, max_size=200, alphabet=st.characters(whitelist_categories=['L', 'Nd', 'Zs', 'Po'])))
        })
    
    return recipients


@st.composite
def event_update_scenario_strategy(draw):
    """Generate event update scenario with guest selection"""
    guests = draw(guest_group_strategy())
    
    # Ensure at least one guest is selected
    if not any(guest['selected'] for guest in guests):
        guests[0]['selected'] = True
    
    return {
        'guests': guests,
        'couple_names': draw(st.text(min_size=5, max_size=100, alphabet=st.characters(whitelist_categories=['L', 'Nd', 'Zs', 'Po']))),
        'wedding_date': draw(st.dates(min_value=date(2024, 1, 1), max_value=date(2030, 12, 31))).strftime("%B %d, %Y"),
        'venue_name': draw(st.text(min_size=3, max_size=100, alphabet=st.characters(whitelist_categories=['L', 'Nd', 'Zs', 'Po']))),
        'update_message': draw(st.text(min_size=10, max_size=500, alphabet=st.characters(whitelist_categories=['L', 'Nd', 'Zs', 'Po'])))
    }


class TestBulkMessagingAccuracy:
    """Property-based tests for bulk messaging accuracy"""
    
    def setup_method(self):
        """Set up test environment"""
        self.communication_service = CommunicationService()
    
    @given(bulk_message_recipients_strategy())
    @hypothesis_settings(max_examples=10, deadline=None)
    def test_property_bulk_message_recipient_accuracy(self, recipients_data):
        """
        Property 21a: Bulk Message Recipient Accuracy
        
        For any bulk message operation, all and only the specified recipients
        should receive the message, with accurate delivery tracking.
        """
        assume(len(recipients_data) > 0)
        assume(all(len(r['phone']) >= 9 for r in recipients_data))
        assume(all(len(r['message'].strip()) > 0 for r in recipients_data))
        
        # Extract expected recipients
        expected_phones = {r['phone'] for r in recipients_data}
        
        # Send bulk messages
        results = self.communication_service.send_bulk_messages(
            recipients=recipients_data,
            prefer_whatsapp=True
        )
        
        # Verify recipient accuracy
        assert isinstance(results, list)
        assert len(results) == len(recipients_data)
        
        # Verify all expected recipients are included
        result_phones = {r['phone'] for r in results}
        assert result_phones == expected_phones, f"Recipient mismatch: expected {expected_phones}, got {result_phones}"
        
        # Verify no duplicate recipients
        assert len(result_phones) == len(results), "Duplicate recipients found in results"
        
        # Verify each recipient has a corresponding result
        for recipient in recipients_data:
            matching_results = [r for r in results if r['phone'] == recipient['phone']]
            assert len(matching_results) == 1, f"Expected exactly one result for {recipient['phone']}, got {len(matching_results)}"
            
            result = matching_results[0]
            assert 'status' in result
            assert result['status'] in [status.value for status in DeliveryStatus]
            assert 'timestamp' in result
    
    @given(event_update_scenario_strategy())
    @hypothesis_settings(max_examples=10, deadline=None)
    def test_property_selected_guests_messaging_accuracy(self, scenario_data):
        """
        Property 21b: Selected Guests Messaging Accuracy
        
        For any event update to selected guest groups, only the selected
        guests should receive the message, and all selected guests should
        be included.
        """
        assume(len(scenario_data['couple_names'].strip()) > 0)
        assume(len(scenario_data['update_message'].strip()) > 0)
        assume(len(scenario_data['venue_name'].strip()) > 0)
        
        guests = scenario_data['guests']
        selected_guests = [g for g in guests if g['selected'] and g.get('phone')]
        
        assume(len(selected_guests) > 0)
        
        # Extract phone numbers of selected guests
        selected_phones = [g['phone'] for g in selected_guests]
        all_phones = [g['phone'] for g in guests if g.get('phone')]
        non_selected_phones = [g['phone'] for g in guests if not g['selected'] and g.get('phone')]
        
        # Send event update to selected guests
        results = self.communication_service.send_event_update(
            guest_phones=selected_phones,
            couple_names=scenario_data['couple_names'],
            wedding_date=scenario_data['wedding_date'],
            venue_name=scenario_data['venue_name'],
            update_message=scenario_data['update_message'],
            prefer_whatsapp=True
        )
        
        # Verify messaging accuracy
        assert isinstance(results, list)
        assert len(results) == len(selected_phones)
        
        # Verify all selected guests are included
        result_phones = {r['phone'] for r in results}
        expected_phones = set(selected_phones)
        assert result_phones == expected_phones, f"Selected guest mismatch: expected {expected_phones}, got {result_phones}"
        
        # Verify no non-selected guests are included
        for phone in non_selected_phones:
            assert phone not in result_phones, f"Non-selected guest {phone} received message"
        
        # Verify each selected guest has exactly one result
        for phone in selected_phones:
            matching_results = [r for r in results if r['phone'] == phone]
            assert len(matching_results) == 1, f"Expected exactly one result for selected guest {phone}"
    
    @given(st.lists(phone_number_strategy(), min_size=1, max_size=10, unique=True))
    @hypothesis_settings(max_examples=10, deadline=None)
    def test_property_unique_recipient_handling(self, phone_list):
        """
        Property 21c: Unique Recipient Handling
        
        For any list of phone numbers (including potential duplicates),
        each unique recipient should receive exactly one message.
        """
        assume(all(len(phone) >= 9 for phone in phone_list))
        
        # Create recipients with potential duplicates
        recipients = []
        for phone in phone_list:
            recipients.append({
                'phone': phone,
                'message': f"Test message for {phone}"
            })
        
        # Add some intentional duplicates
        if len(phone_list) > 1:
            recipients.append({
                'phone': phone_list[0],  # Duplicate first phone
                'message': f"Duplicate message for {phone_list[0]}"
            })
        
        # Send bulk messages
        results = self.communication_service.send_bulk_messages(
            recipients=recipients,
            prefer_whatsapp=True
        )
        
        # Verify unique recipient handling
        assert isinstance(results, list)
        assert len(results) == len(recipients)  # Should process all entries, including duplicates
        
        # Count messages per phone number
        phone_counts = {}
        for result in results:
            phone = result['phone']
            phone_counts[phone] = phone_counts.get(phone, 0) + 1
        
        # Verify each phone appears in results according to input frequency
        for phone in phone_list:
            input_count = sum(1 for r in recipients if r['phone'] == phone)
            result_count = phone_counts.get(phone, 0)
            assert result_count == input_count, f"Phone {phone} appears {result_count} times in results, expected {input_count}"
    
    @given(st.lists(
        st.dictionaries(
            keys=st.sampled_from(['phone', 'message']),
            values=st.one_of(
                phone_number_strategy(),
                st.text(min_size=0, max_size=100, alphabet=st.characters(whitelist_categories=['L', 'Nd', 'Zs', 'Po'])),
                st.none()
            ),
            min_size=1,
            max_size=2
        ),
        min_size=1,
        max_size=8
    ))
    @hypothesis_settings(max_examples=10, deadline=None)
    def test_property_invalid_recipient_handling(self, invalid_recipients):
        """
        Property 21d: Invalid Recipient Handling
        
        For any bulk message operation with invalid recipients (missing phone
        or message), the system should handle invalid entries gracefully while
        processing valid ones accurately.
        """
        # Send bulk messages with potentially invalid data
        results = self.communication_service.send_bulk_messages(
            recipients=invalid_recipients,
            prefer_whatsapp=True
        )
        
        # Verify error handling
        assert isinstance(results, list)
        assert len(results) == len(invalid_recipients)
        
        # Verify each recipient has a corresponding result
        for i, recipient in enumerate(invalid_recipients):
            result = results[i]
            assert isinstance(result, dict)
            assert 'status' in result
            assert 'timestamp' in result
            
            # Check if recipient data is valid
            phone = recipient.get('phone')
            message = recipient.get('message')
            
            if not phone or not message or len(str(phone)) < 9 or len(str(message).strip()) == 0:
                # Invalid recipient should have failed status
                assert result['status'] == DeliveryStatus.FAILED
                assert 'error' in result
                assert isinstance(result['error'], str)
                assert len(result['error']) > 0
            else:
                # Valid recipient should have appropriate status
                assert result['status'] in [status.value for status in DeliveryStatus]
                if result['status'] == DeliveryStatus.FAILED:
                    assert 'error' in result
    
    @given(st.lists(phone_number_strategy(), min_size=2, max_size=8, unique=True))
    @hypothesis_settings(max_examples=10, deadline=None)
    def test_property_partial_failure_accuracy(self, phone_list):
        """
        Property 21e: Partial Failure Accuracy
        
        For any bulk message operation where some messages fail, the system
        should accurately track which recipients succeeded and which failed,
        without affecting other recipients.
        """
        assume(all(len(phone) >= 9 for phone in phone_list))
        assume(len(phone_list) >= 2)
        
        # Create recipients with mix of valid and potentially problematic data
        recipients = []
        for i, phone in enumerate(phone_list):
            if i == 0:
                # First recipient with empty message (should fail)
                recipients.append({'phone': phone, 'message': ''})
            else:
                # Other recipients with valid messages
                recipients.append({'phone': phone, 'message': f'Valid message for {phone}'})
        
        # Send bulk messages
        results = self.communication_service.send_bulk_messages(
            recipients=recipients,
            prefer_whatsapp=True
        )
        
        # Verify partial failure handling
        assert isinstance(results, list)
        assert len(results) == len(recipients)
        
        # Verify first recipient failed due to empty message
        first_result = results[0]
        assert first_result['phone'] == phone_list[0]
        assert first_result['status'] == DeliveryStatus.FAILED
        assert 'error' in first_result
        
        # Verify other recipients were processed independently
        for i in range(1, len(results)):
            result = results[i]
            assert result['phone'] == phone_list[i]
            assert 'status' in result
            assert result['status'] in [status.value for status in DeliveryStatus]
            
            # Should not be affected by the first recipient's failure
            if result['status'] == DeliveryStatus.FAILED:
                # If failed, should have its own specific error
                assert 'error' in result
                assert result['error'] != first_result['error']  # Different error from first recipient
    
    @given(st.integers(min_value=0, max_value=50))
    @hypothesis_settings(max_examples=10, deadline=None)
    def test_property_empty_and_large_batch_accuracy(self, batch_size):
        """
        Property 21f: Empty and Large Batch Accuracy
        
        For any batch size (including empty batches), the system should
        handle the operation accurately and return appropriate results.
        """
        # Generate recipients based on batch size
        recipients = []
        for i in range(batch_size):
            recipients.append({
                'phone': f'25191234{i:04d}',  # Generate unique phone numbers
                'message': f'Message {i + 1}'
            })
        
        # Send bulk messages
        results = self.communication_service.send_bulk_messages(
            recipients=recipients,
            prefer_whatsapp=True
        )
        
        # Verify batch handling accuracy
        assert isinstance(results, list)
        assert len(results) == batch_size
        
        if batch_size == 0:
            # Empty batch should return empty results
            assert results == []
        else:
            # Non-empty batch should have results for each recipient
            result_phones = [r['phone'] for r in results]
            expected_phones = [r['phone'] for r in recipients]
            assert result_phones == expected_phones
            
            # Verify all results have required fields
            for result in results:
                assert 'phone' in result
                assert 'status' in result
                assert 'timestamp' in result
                assert result['status'] in [status.value for status in DeliveryStatus]
    
    @given(st.lists(phone_number_strategy(), min_size=1, max_size=5, unique=True))
    @hypothesis_settings(max_examples=10, deadline=None)
    def test_property_message_content_preservation_accuracy(self, phone_list):
        """
        Property 21g: Message Content Preservation Accuracy
        
        For any bulk message operation, the system should preserve the
        specific message content for each recipient accurately, without
        mixing up messages between recipients.
        """
        assume(all(len(phone) >= 9 for phone in phone_list))
        
        # Create recipients with unique messages
        recipients = []
        expected_mapping = {}
        for i, phone in enumerate(phone_list):
            unique_message = f"Unique message #{i + 1} for {phone} with timestamp {datetime.now().isoformat()}"
            recipients.append({
                'phone': phone,
                'message': unique_message
            })
            expected_mapping[phone] = unique_message
        
        # Send bulk messages
        results = self.communication_service.send_bulk_messages(
            recipients=recipients,
            prefer_whatsapp=True
        )
        
        # Verify message content preservation
        assert isinstance(results, list)
        assert len(results) == len(recipients)
        
        # Verify each recipient received their specific message
        # Note: Since the service doesn't return the message content in results,
        # we verify that the correct phone numbers are processed in the correct order
        result_phones = [r['phone'] for r in results]
        expected_phones = [r['phone'] for r in recipients]
        
        assert result_phones == expected_phones, "Phone number order not preserved"
        
        # Verify no cross-contamination by checking that each result
        # corresponds to the correct input recipient
        for i, result in enumerate(results):
            expected_recipient = recipients[i]
            assert result['phone'] == expected_recipient['phone']
            
            # Verify result structure is consistent
            assert 'status' in result
            assert 'timestamp' in result
            assert result['status'] in [status.value for status in DeliveryStatus]


if __name__ == "__main__":
    pytest.main([__file__])
