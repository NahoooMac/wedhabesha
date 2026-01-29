/**
 * Debug script for chat bubble alignment issues
 * Run this in the browser console to diagnose alignment problems
 */

function debugChatAlignment() {
  console.log('🔍 Chat Alignment Debug Tool');
  console.log('============================');
  
  // Check if SharedMessageThread is rendering
  const messageContainers = document.querySelectorAll('[data-message-id]');
  console.log(`📊 Found ${messageContainers.length} message containers`);
  
  if (messageContainers.length === 0) {
    console.log('❌ No message containers found. Check if messages are loading.');
    return;
  }
  
  // Analyze each message
  messageContainers.forEach((container, index) => {
    const messageId = container.getAttribute('data-message-id');
    const senderId = container.getAttribute('data-sender-id');
    const isOwnMessage = container.getAttribute('data-is-own-message');
    
    // Get computed styles
    const computedStyle = window.getComputedStyle(container);
    const justifyContent = computedStyle.justifyContent;
    const display = computedStyle.display;
    
    // Check alignment
    const expectedAlignment = isOwnMessage === 'true' ? 'flex-end' : 'flex-start';
    const isCorrectlyAligned = justifyContent === expectedAlignment;
    
    console.log(`📝 Message ${index + 1}:`, {
      messageId,
      senderId,
      isOwnMessage: isOwnMessage === 'true',
      expectedAlignment,
      actualAlignment: justifyContent,
      display,
      isCorrectlyAligned: isCorrectlyAligned ? '✅' : '❌',
      element: container
    });
    
    // Visual debugging - add colored borders
    if (isCorrectlyAligned) {
      container.style.border = '2px solid green';
    } else {
      container.style.border = '2px solid red';
    }
    
    // Add alignment labels
    const label = document.createElement('div');
    label.style.position = 'absolute';
    label.style.top = '-25px';
    label.style.left = '0';
    label.style.fontSize = '10px';
    label.style.fontWeight = 'bold';
    label.style.color = isCorrectlyAligned ? 'green' : 'red';
    label.style.backgroundColor = 'white';
    label.style.padding = '2px 6px';
    label.style.borderRadius = '4px';
    label.style.border = `1px solid ${isCorrectlyAligned ? 'green' : 'red'}`;
    label.style.zIndex = '1000';
    label.textContent = `${isOwnMessage === 'true' ? 'SENT' : 'RECEIVED'} - ${isCorrectlyAligned ? 'CORRECT' : 'WRONG'}`;
    
    container.style.position = 'relative';
    container.appendChild(label);
  });
  
  // Check CSS variables
  console.log('\n🎨 CSS Variables Check:');
  const rootStyles = getComputedStyle(document.documentElement);
  const primaryColor = rootStyles.getPropertyValue('--messaging-primary-500');
  const grayColor = rootStyles.getPropertyValue('--messaging-gray-200');
  
  console.log('Primary color:', primaryColor || 'NOT FOUND');
  console.log('Gray color:', grayColor || 'NOT FOUND');
  
  // Check for conflicting CSS
  console.log('\n🔧 CSS Conflicts Check:');
  const allStylesheets = Array.from(document.styleSheets);
  console.log(`Found ${allStylesheets.length} stylesheets`);
  
  // Summary
  const correctCount = Array.from(messageContainers).filter(container => {
    const isOwnMessage = container.getAttribute('data-is-own-message') === 'true';
    const computedStyle = window.getComputedStyle(container);
    const justifyContent = computedStyle.justifyContent;
    const expectedAlignment = isOwnMessage ? 'flex-end' : 'flex-start';
    return justifyContent === expectedAlignment;
  }).length;
  
  console.log('\n📊 Summary:');
  console.log(`Total messages: ${messageContainers.length}`);
  console.log(`Correctly aligned: ${correctCount}`);
  console.log(`Incorrectly aligned: ${messageContainers.length - correctCount}`);
  console.log(`Success rate: ${((correctCount / messageContainers.length) * 100).toFixed(1)}%`);
  
  if (correctCount === messageContainers.length) {
    console.log('🎉 All messages are correctly aligned!');
  } else {
    console.log('❌ Some messages are incorrectly aligned. Check the red-bordered messages above.');
  }
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
  console.log('🚀 Chat Alignment Debug Tool loaded. Run debugChatAlignment() to start debugging.');
  
  // Make function globally available
  window.debugChatAlignment = debugChatAlignment;
  
  // Auto-run after a delay to let components load
  setTimeout(() => {
    console.log('🔄 Auto-running alignment debug...');
    debugChatAlignment();
  }, 2000);
}

export default debugChatAlignment;