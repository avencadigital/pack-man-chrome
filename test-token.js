// Test script to verify token storage
// Open DevTools Console on any page and paste this

console.log('=== Testing Token Storage ===');

// Test 1: Check if token exists
chrome.storage.local.get('github_token', (data) => {
    console.log('1. Token exists:', !!data.github_token);
    if (data.github_token) {
        console.log('   Token length:', data.github_token.length);
        console.log('   Token preview:', data.github_token.substring(0, 15) + '...' + data.github_token.slice(-4));
        console.log('   Token format:',
            data.github_token.startsWith('ghp_') ? 'Classic PAT' :
                data.github_token.startsWith('github_pat_') ? 'Fine-grained PAT' :
                    'Unknown format'
        );

        // Test 2: Validate token with GitHub API
        console.log('\n2. Testing token with GitHub API...');
        fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `Bearer ${data.github_token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Pack-Man-Test'
            }
        })
            .then(response => {
                console.log('   API Response status:', response.status);
                if (response.status === 200) {
                    return response.json();
                } else if (response.status === 401) {
                    console.error('   ❌ 401 Unauthorized - Token is invalid or expired');
                    return response.json().then(err => {
                        console.error('   Error details:', err);
                        throw new Error('Invalid token');
                    });
                } else {
                    console.error('   ❌ Unexpected status:', response.status);
                    throw new Error(`HTTP ${response.status}`);
                }
            })
            .then(user => {
                console.log('   ✅ Token is valid!');
                console.log('   User:', user.login);
                console.log('   Scopes:', user.scopes || 'Not available');
            })
            .catch(error => {
                console.error('   ❌ Token validation failed:', error.message);
            });
    } else {
        console.log('   ❌ No token found in storage');
    }
});

// Test 3: Check service worker
console.log('\n3. Testing service worker connection...');
chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
    if (chrome.runtime.lastError) {
        console.error('   ❌ Service worker error:', chrome.runtime.lastError.message);
    } else {
        console.log('   ✅ Service worker is alive:', response);
    }
});
