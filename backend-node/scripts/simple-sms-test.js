const smsService = require('../services/smsService');
require('dotenv').config();

async function testSMS() {
  console.log('📱 SIMPLE SMS TEST');
  console.log('='.repeat(30));

  try {
    // Check if SMS service is configured
    console.log('\n🔧 SMS Service Configuration:');
    console.log('Configured:', smsService.isConfigured());
    console.log('Test phone numbers:', smsService.getTestPhoneNumbers().length);
    
    // Test with the specific phone number 0901959439
    const testPhone = '0901959439';
    const testMessage = `Hello! This is a test SMS from WedHabesha platform. Sent at ${new Date().toLocaleString()}. SMS functionality is working! 🎉`;
    
    console.log('\n📤 Sending SMS...');
    console.log('To:', testPhone);
    console.log('Message:', testMessage);
    
    const result = await smsService.sendSMS(testPhone, testMessage);
    
    console.log('\n📊 RESULT:');
    console.log('Success:', result.success ? '✅ YES' : '❌ NO');
    console.log('Phone:', result.phone);
    console.log('Status:', result.status);
    
    if (result.success) {
      console.log('Message ID:', result.messageId);
      console.log('✅ SMS sent successfully!');
      
      if (result.response?.testMode) {
        console.log('🧪 Note: This was sent in TEST MODE');
      } else {
        console.log('📱 Real SMS sent via AfroMessage API');
      }
    } else {
      console.log('❌ SMS failed');
      console.log('Error:', result.error);
      if (result.response) {
        console.log('API Response:', JSON.stringify(result.response, null, 2));
      }
    }

    // Test with different phone formats
    console.log('\n📞 Testing different phone formats:');
    const phoneFormats = [
      '0901959439',
      '+251901959439', 
      '251901959439',
      '901959439'
    ];

    for (const phone of phoneFormats) {
      console.log(`\nTesting: ${phone}`);
      const formatResult = await smsService.sendSMS(phone, `Format test: ${phone}`);
      console.log(`Result: ${formatResult.success ? '✅' : '❌'} - ${formatResult.phone}`);
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n' + '='.repeat(30));
    console.log('📱 SMS TEST COMPLETED!');
    console.log('📞 Check phone 0901959439 for messages');

  } catch (error) {
    console.error('❌ SMS test failed:', error);
    console.error('Stack:', error.stack);
  }
}

testSMS()
  .then(() => {
    console.log('✅ Test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });