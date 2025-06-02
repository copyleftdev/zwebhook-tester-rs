/**
 * ZWebHook-Tester Main Application
 * Initializes and coordinates all application modules
 */

// Main application entry point
document.addEventListener('DOMContentLoaded', () => {
    console.log('ZWebHook-Tester initializing...');
    
    // Initialize search functionality
    window.webhookSearch.init();
    console.log('Search module initialized');
    
    // Initialize UI components
    window.webhookUI.init();
    console.log('UI module initialized');
    
    // Initialize analytics
    window.webhookAnalytics.init();
    console.log('Analytics module initialized');
    
    // Connect to WebSocket for real-time updates
    window.webhookSocket.connect();
    console.log('WebSocket connection initiated');
    
    // Set up tab navigation
    setupTabNavigation();
    
    // Setup replayer functionality
    setupReplayer();
    
    console.log('ZWebHook-Tester initialized successfully');
});

/**
 * Set up tab navigation
 */
function setupTabNavigation() {
    const tabs = document.querySelectorAll('[data-tab]');
    const tabContents = document.querySelectorAll('[data-tab-content]');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Deactivate all tabs
            tabs.forEach(t => t.classList.remove('active-tab'));
            
            // Hide all tab contents
            tabContents.forEach(content => {
                content.classList.add('hidden');
            });
            
            // Activate clicked tab
            tab.classList.add('active-tab');
            
            // Show corresponding content
            const target = tab.dataset.tab;
            document.querySelector(`[data-tab-content="${target}"]`).classList.remove('hidden');
        });
    });
}

/**
 * Set up webhook replayer functionality
 */
function setupReplayer() {
    const replayerForm = document.getElementById('replayer-form');
    const envVarsTextarea = document.getElementById('env-vars');
    
    replayerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const url = parseEnvVars(document.getElementById('replayer-url').value);
        const method = document.getElementById('replayer-method').value;
        const headersText = parseEnvVars(document.getElementById('replayer-headers').value);
        const payload = parseEnvVars(document.getElementById('replayer-payload').value);
        
        // Parse headers
        const headers = {};
        headersText.split('\n').forEach(line => {
            const [key, ...valueParts] = line.split(':');
            if (key && valueParts.length) {
                headers[key.trim()] = valueParts.join(':').trim();
            }
        });
        
        // Add content-type if not specified
        if (!headers['Content-Type'] && !headers['content-type']) {
            headers['Content-Type'] = 'application/json';
        }
        
        try {
            // Prepare fetch options
            const options = {
                method: method,
                headers: headers,
                redirect: 'follow'
            };
            
            // Add body for appropriate methods
            if (['POST', 'PUT', 'PATCH'].includes(method)) {
                options.body = payload;
            }
            
            // Send request
            const response = await fetch(url, options);
            const responseData = await response.text();
            
            // Display response
            document.getElementById('response-status').textContent = response.status;
            
            // Try to parse as JSON for pretty display
            try {
                const jsonResponse = JSON.parse(responseData);
                document.getElementById('response-body').textContent = JSON.stringify(jsonResponse, null, 2);
            } catch (e) {
                // Not JSON, display as is
                document.getElementById('response-body').textContent = responseData;
            }
            
            // Highlight syntax
            Prism.highlightElement(document.getElementById('response-body'));
            
        } catch (error) {
            document.getElementById('response-status').textContent = 'Error';
            document.getElementById('response-body').textContent = error.toString();
        }
    });
}

/**
 * Parse environment variables in text
 * @param {string} text - Text containing environment variables
 * @returns {string} Text with environment variables replaced
 */
function parseEnvVars(text) {
    if (!text) return text;
    
    const envVarsText = document.getElementById('env-vars').value;
    const envVars = {};
    
    // Parse environment variables
    envVarsText.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length) {
            envVars[key.trim()] = valueParts.join('=').trim();
        }
    });
    
    // Replace variables in text
    return text.replace(/\${([^}]+)}/g, (match, varName) => {
        return envVars[varName] || match;
    });
}
