const fs = require('fs');

const testFiles = [
  'test-rsvp-flow.js',
  'check-database-state.js',
  'test-rsvp-fix.js',
  'verify-rsvp-complete-flow.js',
  'cleanup-test-files.js'
];

console.log('🧹 Cleaning up test files...\n');

testFiles.forEach(file => {
  try {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log(`✓ Deleted: ${file}`);
    } else {
      console.log(`⊘ Not found: ${file}`);
    }
  } catch (error) {
    console.error(`❌ Failed to delete ${file}:`, error.message);
  }
});

console.log('\n✅ Cleanup complete!');
