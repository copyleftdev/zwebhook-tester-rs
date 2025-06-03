/**
 * ZWebHook-Tester WebSocket Handler
 * Manages real-time updates from the server
 */

// WebSocket connection
let socket;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 2000; // 2 seconds

/**
 * Connect to the WebSocket server
 */
function connectWebSocket() {
    // Close existing connection if any
    if (socket) {
        socket.close();
    }
    
    // Get the appropriate WebSocket URL based on current location
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    // Log connection protocol for debugging
    console.log(`Using ${protocol} protocol based on current page protocol: ${window.location.protocol}`);
    
    // If we're on the ondigitalocean.app domain, always force wss protocol
    if (window.location.host.includes('ondigitalocean.app')) {
        const forcedWsUrl = `wss://${window.location.host}/ws`;
        console.log(`Deployment on DigitalOcean detected, forcing secure WebSocket: ${forcedWsUrl}`);
        return new WebSocket(forcedWsUrl);
    }
    
    console.log(`Connecting to WebSocket at ${wsUrl}`);
    socket = new WebSocket(wsUrl);
    
    // Connection opened
    socket.addEventListener('open', (event) => {
        console.log('WebSocket connection established');
        document.getElementById('connection-status').textContent = 'Connected';
        document.getElementById('connection-status').classList.remove('text-red-500');
        document.getElementById('connection-status').classList.add('text-green-500');
        reconnectAttempts = 0;
    });
    
    // Listen for messages
    socket.addEventListener('message', (event) => {
        const webhook = JSON.parse(event.data);
        displayWebhook(webhook);
    });
    
    // Connection closed
    socket.addEventListener('close', (event) => {
        console.log('WebSocket connection closed');
        document.getElementById('connection-status').textContent = 'Disconnected';
        document.getElementById('connection-status').classList.remove('text-green-500');
        document.getElementById('connection-status').classList.add('text-red-500');
        
        // Attempt to reconnect
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            console.log(`Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
            setTimeout(connectWebSocket, RECONNECT_DELAY);
        } else {
            console.error('Max reconnect attempts reached. Please refresh the page.');
        }
    });
    
    // Connection error
    socket.addEventListener('error', (event) => {
        console.error('WebSocket error:', event);
    });
}

/**
 * Display a webhook in the UI and add it to the search index
 * @param {Object} webhook - The webhook data to display
 */
function displayWebhook(webhook) {
    const webhooksContainer = document.getElementById('webhooks-container');
    
    // Initialize webhookEntries if not already defined
    if (!window.webhookEntries) {
        window.webhookEntries = [];
    }
    
    const entryId = window.webhookEntries.length;
    
    // Add to data store
    window.webhookEntries.push(webhook);
    
    // Index the new entry for searching
    if (window.webhookSearch && typeof window.webhookSearch.indexEntry === 'function') {
        window.webhookSearch.indexEntry(entryId, webhook);
    }
    
    // Create HTML for the webhook entry
    const webhookEntry = document.createElement('div');
    webhookEntry.className = 'webhook-entry bg-white dark:bg-gray-800 p-4 mb-4 rounded shadow';
    webhookEntry.dataset.id = entryId;
    
    // Format the timestamp
    const timestamp = formatTimestamp(webhook.timestamp);
    
    // Determine method color
    let methodColor = 'bg-gray-500';
    switch (webhook.method.toUpperCase()) {
        case 'GET': methodColor = 'bg-blue-500'; break;
        case 'POST': methodColor = 'bg-green-500'; break;
        case 'PUT': methodColor = 'bg-yellow-500'; break;
        case 'DELETE': methodColor = 'bg-red-500'; break;
        case 'PATCH': methodColor = 'bg-purple-500'; break;
    }
    
    // Create webhook header
    webhookEntry.innerHTML = `
        <div class="flex flex-wrap items-center justify-between mb-2">
            <div class="flex items-center">
                <span class="${methodColor} text-white px-3 py-1 rounded mr-2 font-bold">${webhook.method}</span>
                <span class="font-mono text-sm break-all">${webhook.path}</span>
            </div>
            <div class="flex items-center space-x-2 mt-2 sm:mt-0">
                <span class="text-xs text-gray-500 dark:text-gray-400">${webhook.client_ip}</span>
                <span class="text-xs text-gray-500 dark:text-gray-400">${timestamp}</span>
                <button class="text-blue-500 hover:text-blue-700 dark:hover:text-blue-300" onclick="window.webhookUI.copyPayload(${entryId})">
                    <i class="fas fa-copy"></i>
                </button>
                <button class="text-blue-500 hover:text-blue-700 dark:hover:text-blue-300" onclick="window.webhookUI.copyCurlCommand(${entryId})">
                    <i class="fas fa-terminal"></i>
                </button>
                <button class="text-blue-500 hover:text-blue-700 dark:hover:text-blue-300" onclick="window.webhookUI.loadIntoReplayer(${entryId})">
                    <i class="fas fa-redo"></i>
                </button>
                <button class="text-blue-500 hover:text-blue-700 dark:hover:text-blue-300" onclick="window.webhookUI.addToTestSuite(${entryId})">
                    <i class="fas fa-vial"></i>
                </button>
            </div>
        </div>
        <div class="webhook-details">
            <div class="mb-2">
                <h4 class="text-sm font-bold mb-1 dark:text-gray-300">Headers</h4>
                <pre class="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto">${formatHeaders(webhook.headers)}</pre>
            </div>
            <div>
                <h4 class="text-sm font-bold mb-1 dark:text-gray-300">Payload</h4>
                <pre class="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto language-json">${formatPayload(webhook.payload)}</pre>
            </div>
        </div>
    `;
    
    // Add to the DOM (prepend to show newest first)
    if (webhooksContainer.firstChild) {
        webhooksContainer.insertBefore(webhookEntry, webhooksContainer.firstChild);
    } else {
        webhooksContainer.appendChild(webhookEntry);
    }
    
    // Update entry count
    const entryCount = document.getElementById('entry-count');
    const visibleCount = document.getElementById('visible-count');
    
    if (entryCount) entryCount.textContent = window.webhookEntries.length;
    if (visibleCount) visibleCount.textContent = window.webhookEntries.length;
    
    // Initialize syntax highlighting
    if (typeof Prism !== 'undefined') {
        Prism.highlightAllUnder(webhookEntry);
    }
    
    // Update analytics
    if (window.webhookAnalytics && typeof window.webhookAnalytics.update === 'function') {
        window.webhookAnalytics.update(webhook);
    }
    
    // Apply current filters
    if (window.webhookSearch && typeof window.webhookSearch.debouncedSearch === 'function') {
        window.webhookSearch.debouncedSearch();
    }
    
    // Update timeline if enabled
    const showTimeline = document.getElementById('show-timeline');
    if (showTimeline && showTimeline.checked && window.webhookAnalytics && 
        typeof window.webhookAnalytics.updateTimeline === 'function') {
        window.webhookAnalytics.updateTimeline();
    }
}

/**
 * Format headers for display
 * @param {Object} headers - HTTP headers
 * @returns {string} Formatted headers string
 */
function formatHeaders(headers) {
    return Object.entries(headers)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
}

/**
 * Format payload for display with syntax highlighting
 * @param {Object} payload - Webhook payload
 * @returns {string} Formatted payload string
 */
function formatPayload(payload) {
    try {
        return JSON.stringify(payload, null, 2) || '(empty)';
    } catch (e) {
        return '(invalid JSON)';
    }
}

/**
 * Format timestamp for display
 * @param {string} timestamp - ISO timestamp
 * @returns {string} Formatted timestamp
 */
function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    
    // Use relative time if setting is enabled
    if (document.getElementById('relative-time').checked) {
        const now = new Date();
        const diffMs = now - date;
        
        if (diffMs < 1000) return 'just now';
        if (diffMs < 60000) return `${Math.floor(diffMs / 1000)}s ago`;
        if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
        if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h ago`;
        return `${Math.floor(diffMs / 86400000)}d ago`;
    }
    
    // Otherwise return formatted date
    return date.toLocaleString();
}

// Export the public API
window.webhookSocket = {
    connect: connectWebSocket,
    displayWebhook: displayWebhook
};
