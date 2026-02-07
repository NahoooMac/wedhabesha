const jwt = require('jsonwebtoken');
require('dotenv').config();

console.log('=== Profile Authentication Debug ===\n');

// Check if JWT_SECRET is set
console.log('1. JWT_SECRET check:');
if (process.env.JWT_SECRET) {
  console.log('   ✅ JWT_SECRET is set');
  console.log('   Length:', process.env.JWT_SECRET.length, 'characters');
} else {
  console.log('   ❌ JWT_SECRET is NOT set!');
  console.log('   This will cause token verification to fail');
}

// Create a test token
console.log('\n2. Creating test token:');
try {
  const testPayload = {
    userId: 1,
    userType: 'COUPLE'
  };
  
  const testToken = jwt.sign(
    testPayload,
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn: '7d' }
  );
  
  console.log('   ✅ Token created successfully');
  console.log('   Token (first 50 chars):', testToken.substring(0, 50) + '...');
  
  // Verify the token
  console.log('\n3. Verifying test token:');
  const decoded = jwt.verify(testToken, process.env.JWT_SECRET || 'fallback-secret');
  console.log('   ✅ Token verified successfully');
  console.log('   Decoded payload:', JSON.stringify(decoded, null, 2));
  
  // Check what the middleware would extract
  console.log('\n4. Middleware extraction:');
  const userId = decoded.userId || decoded.id;
  console.log('   userId:', userId);
  console.log('   userType:', decoded.userType);
  
  if (userId) {
    console.log('   ✅ userId would be extracted correctly');
  } else {
    console.log('   ❌ userId extraction would fail');
  }
  
} catch (error) {
  console.log('   ❌ Error:', error.message);
}

console.log('\n5. Common issues:');
console.log('   - Make sure backend server is restarted after code changes');
console.log('   - Check that JWT_SECRET in .env matches between sessions');
console.log('   - Verify the token in localStorage is not expired');
console.log('   - Check browser console for actual error messages');

console.log('\n6. To test the endpoint:');
console.log('   1. Start backend: node server.js');
console.log('   2. Login to get a fresh token');
console.log('   3. Try updating profile');
console.log('   4. Check backend console logs for "Decoded token:" message');
