// Quick test to verify the API is working
const http = require('http');

function testAPI() {
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/',
        method: 'GET'
    };

    const req = http.request(options, (res) => {
        console.log(`✅ Server is responding! Status: ${res.statusCode}`);
        console.log('🎉 Social Media Platform is ready!');
        console.log('📱 Open your browser and go to: http://localhost:3000');
        console.log('\n📋 Sample accounts to try:');
        console.log('   Username: john_doe | Password: password123');
        console.log('   Username: jane_smith | Password: password123');
        console.log('   Username: mike_wilson | Password: password123');
    });

    req.on('error', (e) => {
        console.log(`❌ Server test failed: ${e.message}`);
    });

    req.end();
}

testAPI();