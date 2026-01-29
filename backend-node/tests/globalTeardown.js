// Global teardown that runs after all test files complete
module.exports = async () => {
  // Give any lingering async operations time to complete
  await new Promise(resolve => setTimeout(resolve, 500));
  
  console.log('✅ Global teardown complete');
};
