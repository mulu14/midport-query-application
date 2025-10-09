/**
 * Test script to validate credential values match between database and environment
 */

const { CredentialValidator } = require('../lib/utils/credentialValidator');

async function runValidation() {
  console.log('🚀 Starting Credential Validation Test...\n');
  
  try {
    // Run quick validation on first tenant
    const isValid = await CredentialValidator.quickValidation();
    
    if (isValid) {
      console.log('✅ SUCCESS: All credential values match between database and environment!');
    } else {
      console.log('❌ FAILURE: Some credential values do not match!');
      console.log('💡 This could indicate:');
      console.log('   - Environment variables have changed');
      console.log('   - Database encryption/decryption issues');
      console.log('   - Migration problems');
    }
    
  } catch (error) {
    console.error('❌ Validation test failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runValidation();
}

module.exports = { runValidation };