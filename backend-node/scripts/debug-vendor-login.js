const axios = require('axios');

const BASE_URL = 'http://localhost:8000/api/v1';

async function debugVendorLogin() {
    console.log('🔍 Debugging Vendor Login...\n');
    
    try {
        const loginData = {
            email: 'vendor@test.com',
            password: 'password123'
        };
        
        console.log('Attempting login with:', loginData);
        
        const response = await axios.post(`${BASE_URL}/auth/login`, loginData);
        
        console.log('Response status:', response.status);
        console.log('Response data:', JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        if (error.response) {
            console.error(`HTTP Error ${error.response.status}:`);
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.error('Network Error - no response received');
            console.error('Request details:', error.request);
        } else {
            console.error('Error:', error.message);
        }
    }
}

debugVendorLogin();