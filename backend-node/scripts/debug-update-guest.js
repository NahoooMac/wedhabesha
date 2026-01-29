const jwt = require('jsonwebtoken');
const http = require('http');
const { query } = require('../config/database');
require('dotenv').config();

function makeRequest(path, method = 'GET', data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: responseData
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function debugUpdateGuest() {
  try {
    console.log('🔍 Debugging guest update issue...');
    
    const userId = 2;
    const weddingId = 1;
    const token = jwt.sign(
      { 
        userId: userId,
        id: userId,
        user_type: 'COUPLE'
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1h' }
    );

    // First, get existing guests
    console.log('\n1. Getting existing guests...');
    const guestsResponse = await makeRequest(`/api/v1/guests/wedding/${weddingId}`, 'GET', null, token);
    console.log('Status:', guestsResponse.statusCode);
    
    if (guestsResponse.statusCode === 200) {
      const guests = JSON.parse(guestsResponse.body);
      console.log('Found guests:', guests.length);
      
      if (guests.length > 0) {
        const guestToUpdate = guests[0];
        console.log('Guest to update:', JSON.stringify(guestToUpdate, null, 2));
        
        // Try to update this guest
        console.log('\n2. Attempting to update guest...');
        const updateData = {
          name: 'Updated Guest Name',
          email: 'updated@example.com',
          phone: '+9999999999',
          table_number: 10,
          dietary_restrictions: 'Updated restrictions'
        };
        
        console.log('Update data:', JSON.stringify(updateData, null, 2));
        
        const updateResponse = await makeRequest(`/api/v1/guests/${guestToUpdate.id}`, 'PUT', updateData, token);
        console.log('Update status:', updateResponse.statusCode);
        console.log('Update response:', updateResponse.body);
        
        if (updateResponse.statusCode !== 200) {
          try {
            const errorBody = JSON.parse(updateResponse.body);
            console.log('Error details:', JSON.stringify(errorBody, null, 2));
          } catch (e) {
            console.log('Raw error response:', updateResponse.body);
          }
        }
      } else {
        console.log('No guests found to update');
      }
    } else {
      console.log('Failed to get guests:', guestsResponse.body);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugUpdateGuest()
  .then(() => {
    console.log('✅ Debug completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  });