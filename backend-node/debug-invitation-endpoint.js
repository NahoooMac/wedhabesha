const axios = require('axios');
require('dotenv').config();

async function debugInvitationEndpoint() {
  console.log('=== DEBUG INVITATION ENDPOINT ===');
  console.log('');
  
  // Get JWT token from localStorage (you'll need to provide this)
  const token = process.argv[2];
  
  if (!token) {
    console.log('❌ Please provide JWT token as argument');
    console.log('');
    console.log('Usage: node debug-invitation-endpoint.js YOUR_JWT_TOKEN');
    console.log('');
    console.log('To get your token:');
    console.log('1. Open browser DevTools (F12)');
    console.log('2. Go to Console tab');
    console.log('3. Type: localStorage.getItem("jwt_token") || localStorage.getItem("access_token")');
    console.log('4. Copy the token and run: node debug-invitation-endpoint.js "YOUR_TOKEN"');
    return;
  }
  
  console.log('Token provided:', token.substring(0, 20) + '...');
  console.log('');
  
  try {
    // Test 1: Get weddings
    console.log('Test 1: Getting weddings...');
    const weddingsResponse = await axios.get('http://localhost:8000/api/v1/weddings/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const wedding = weddingsResponse.data;
    console.log('✅ Wedding found:');
    console.log('- ID:', wedding.id);
    console.log('- Code:', wedding.wedding_code);
    console.log('');
    
    // Test 2: Get guests
    console.log('Test 2: Getting guests...');
    const guestsResponse = await axios.get(`http://localhost:8000/api/v1/guests/wedding/${wedding.id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const guests = guestsResponse.data;
    console.log(`✅ Found ${guests.length} guests`);
    
    const guestWithPhone = guests.find(g => g.phone);
    if (!guestWithPhone) {
      console.log('❌ No guests with phone numbers found');
      return;
    }
    
    console.log('Guest with phone:');
    console.log('- ID:', guestWithPhone.id);
    console.log('- Name:', guestWithPhone.name);
    console.log('- Phone:', guestWithPhone.phone);
    console.log('');
    
    // Test 3: Send invitation
    console.log('Test 3: Sending invitation SMS...');
    const invitationResponse = await axios.post(
      'http://localhost:8000/api/invitations/send-sms',
      {
        wedding_id: wedding.id,
        guest_id: guestWithPhone.id
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Invitation API Response:');
    console.log(JSON.stringify(invitationResponse.data, null, 2));
    console.log('');
    
    if (invitationResponse.data.success) {
      console.log('✅ Invitation sent successfully!');
      console.log('URL:', invitationResponse.data.url);
      console.log('');
      console.log('⏳ Wait 1-5 minutes to receive SMS');
    } else {
      console.log('❌ Invitation failed');
      console.log('Error:', invitationResponse.data.error);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

debugInvitationEndpoint();
