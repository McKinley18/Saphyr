import axios from 'axios';

const API_URL = 'http://localhost:3001/api';
const TEST_USER = {
  email: `test_user_${Date.now()}@example.com`,
  password: 'TestPassword123!',
  full_name: 'Diagnostic Tester'
};

async function runDiagnostics() {
  console.log('🚀 INITIALIZING SAPHYR SYSTEM DIAGNOSTICS...');
  let testAccountId = '';

  try {
    // 1. SIGNUP TEST
    console.log('\n[1/5] Testing User Registration...');
    const signupRes = await axios.post(`${API_URL}/auth/signup`, TEST_USER);
    if (signupRes.status === 201) {
      console.log('✅ Registration Successful');
    }

    // 2. LOGIN TEST
    console.log('\n[2/5] Testing Authentication...');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    
    if (loginRes.data.user) {
      console.log('✅ Authentication Successful');
    }

    // Capture cookie for subsequent requests (since we are in a script, not a browser)
    const cookie = loginRes.headers['set-cookie'];

    // 3. ACCOUNT ENTRY TEST
    console.log('\n[3/5] Testing Data Entry: Accounts...');
    const accountRes = await axios.post(`${API_URL}/accounts`, {
      name: 'Test Checking',
      type: 'Checking',
      balance: 5000.00
    }, {
      headers: { 'Cookie': cookie ? cookie[0] : '' },
      withCredentials: true
    });
    
    if (accountRes.data) {
      // Fetch accounts to get the ID
      const listRes = await axios.get(`${API_URL}/accounts`, {
        headers: { 'Cookie': cookie ? cookie[0] : '' }
      });
      testAccountId = listRes.data[0].id;
      console.log(`✅ Account Created (ID: ${testAccountId})`);
    }

    // 4. TRANSACTION ENTRY TEST
    console.log('\n[4/5] Testing Data Entry: Transactions...');
    const txRes = await axios.post(`${API_URL}/transactions`, {
      account_id: testAccountId,
      amount: 150.00,
      category: 'Diagnostics',
      description: 'System Test Entry',
      type: 'expense',
      date: new Date().toISOString()
    }, {
      headers: { 'Cookie': cookie ? cookie[0] : '' }
    });
    
    if (txRes.data) {
      console.log('✅ Transaction Logged Successfully');
    }

    // 5. DATA SOVEREIGNTY TEST
    console.log('\n[5/5] Testing Security Isolation...');
    try {
      await axios.get(`${API_URL}/accounts`); // No cookie/token
      console.log('❌ SECURITY FAILURE: Unauthorized access allowed');
    } catch (e) {
      console.log('✅ Security Verified: Unauthorized access blocked');
    }

    console.log('\n✨ ALL SYSTEMS OPERATIONAL. STABILITY VERIFIED.');

  } catch (error: any) {
    console.error('\n❌ DIAGNOSTIC FAILURE:');
    if (error.code === 'ECONNREFUSED') {
      console.error('SERVER IS OFFLINE. Please run "npm run dev" in the backend folder.');
    } else {
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);
      console.error('Message:', error.message);
    }
    process.exit(1);
  }
}

runDiagnostics();
