/**
 * ZWebHook-Tester Search and Filtering System
 * High-performance search implementation with indexing and caching
 */

// Global search index and webhook entries
let webhookEntries = [];
const searchIndex = {
    methods: new Map(),    // Map of HTTP methods to entry IDs
    paths: new Map(),      // Map of path segments to entry IDs
    ips: new Map(),        // Map of client IPs to entry IDs
    terms: new Map(),      // Map of search terms to entry IDs
    timestamps: []         // Array of {id, timestamp} objects for time-based filtering
};

// Fast JSONPath evaluation with memoization
const jsonPathCache = new Map();

// Initialize search cache for better performance
const searchCache = new Map();

// DOM Elements for filters
const filters = {
    searchInput: document.getElementById('search-text'),
    methodFilter: document.getElementById('filter-method'),
    pathFilter: document.getElementById('filter-path'),
    ipFilter: document.getElementById('filter-ip'),
    timeFrom: document.getElementById('time-from'),
    timeTo: document.getElementById('time-to'),
    jsonPathInput: document.getElementById('json-path'),
    clearFilterBtn: document.getElementById('clear-filters')
};

/**
 * Index a webhook entry for faster searching
 * @param {Object} entry - The webhook entry to index
 * @param {number} entryId - The unique ID of the entry
 */
function indexWebhookEntry(entry, entryId) {
    // Index by method
    const method = entry.method.toUpperCase();
    if (!searchIndex.methods.has(method)) {
        searchIndex.methods.set(method, new Set());
    }
    searchIndex.methods.get(method).add(entryId);
    
    // Index by path segments
    const pathSegments = entry.path.toLowerCase().split('/');
    pathSegments.forEach(segment => {
        if (!segment) return;
        
        if (!searchIndex.paths.has(segment)) {
            searchIndex.paths.set(segment, new Set());
        }
        searchIndex.paths.get(segment).add(entryId);
    });
    
    // Index by client IP
    const ip = entry.ip.toLowerCase();
    if (!searchIndex.ips.has(ip)) {
        searchIndex.ips.set(ip, new Set());
    }
    searchIndex.ips.get(ip).add(entryId);
    
    // Index by searchable text (headers and payload)
    const searchableText = JSON.stringify(entry).toLowerCase();
    const terms = searchableText.split(/[\s,.:\-_\/\[\]{}()]+/).filter(term => term.length > 2);
    
    terms.forEach(term => {
        if (!searchIndex.terms.has(term)) {
            searchIndex.terms.set(term, new Set());
        }
        searchIndex.terms.get(term).add(entryId);
    });
    
    // Add to timestamps array (keep it sorted)
    const timestamp = new Date(entry.timestamp).getTime();
    const tsObj = {id: entryId, timestamp};
    const insertIdx = searchIndex.timestamps.findIndex(t => t.timestamp > timestamp);
    if (insertIdx === -1) {
        searchIndex.timestamps.push(tsObj);
    } else {
        searchIndex.timestamps.splice(insertIdx, 0, tsObj);
    }
}

/**
 * Update visibility of webhook entries based on filtering
 * @param {Set} visibleIds - Set of IDs for entries that should be visible
 */
function updateVisibility(visibleIds) {
    const entryElements = document.querySelectorAll('.webhook-entry');
    entryElements.forEach(el => {
        const entryId = parseInt(el.dataset.id);
        el.style.display = visibleIds.has(entryId) ? 'block' : 'none';
    });
    
    // Update visible count
    const visibleCount = document.getElementById('visible-count');
    visibleCount.textContent = visibleIds.size;
}

/**
 * Evaluate JSONPath expression on an object with caching
 * @param {Object} obj - The object to evaluate against
 * @param {string} path - JSONPath expression
 * @returns {*} The result of the evaluation
 */
function evaluateJsonPath(obj, path) {
    if (!path) return null;
    
    // Create cache key
    const cacheKey = path + '::' + JSON.stringify(obj).slice(0, 100);
    
    // Check cache
    if (jsonPathCache.has(cacheKey)) {
        return jsonPathCache.get(cacheKey);
    }
    
    // Simple JSONPath implementation
    let result = null;
    try {
        // Handle root object
        if (path === '$') {
            result = obj;
        }
        // Handle dot notation
        else if (path.startsWith('$.')) {
            const parts = path.substring(2).split('.');
            let current = obj;
            
            for (const part of parts) {
                if (!current) break;
                current = current[part];
            }
            
            result = current;
        }
    } catch (e) {
        console.error('JSONPath error:', e);
    }
    
    // Store in cache (limited size)
    jsonPathCache.set(cacheKey, result);
    if (jsonPathCache.size > 500) {
        const oldestKey = jsonPathCache.keys().next().value;
        jsonPathCache.delete(oldestKey);
    }
    
    return result;
}

/**
 * Debounce function for performance
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

/**
 * High-performance search implementation using indexes
 */
function applyFilters() {
    console.time('filter-performance');
    
    // Get filter values
    const searchText = filters.searchInput.value.toLowerCase();
    const methodValue = filters.methodFilter.value;
    const pathValue = filters.pathFilter.value.toLowerCase();
    const ipValue = filters.ipFilter.value.toLowerCase();
    const fromTime = filters.timeFrom.value ? new Date(filters.timeFrom.value).getTime() : null;
    const toTime = filters.timeTo.value ? new Date(filters.timeTo.value).getTime() : null;
    const jsonPathExpr = filters.jsonPathInput.value.trim();
    
    // Create cache key
    const cacheKey = `${searchText}|${methodValue}|${pathValue}|${ipValue}|${fromTime}|${toTime}|${jsonPathExpr}`;
    
    // Check cache first for better performance
    if (searchCache.has(cacheKey)) {
        console.log('Using cached search results');
        updateVisibility(searchCache.get(cacheKey));
        console.timeEnd('filter-performance');
        return;
    }
    
    // Start with all IDs
    let matches = new Set(Array.from({ length: webhookEntries.length }, (_, i) => i));
    
    // Filter by method
    if (methodValue && methodValue !== 'all') {
        const methodMatches = searchIndex.methods.get(methodValue.toUpperCase()) || new Set();
        matches = new Set([...matches].filter(id => methodMatches.has(id)));
    }
    
    // Filter by path
    if (pathValue) {
        const pathMatches = new Set();
        searchIndex.paths.forEach((ids, segment) => {
            if (segment.includes(pathValue)) {
                ids.forEach(id => pathMatches.add(id));
            }
        });
        matches = new Set([...matches].filter(id => pathMatches.has(id)));
    }
    
    // Filter by IP
    if (ipValue) {
        const ipMatches = new Set();
        searchIndex.ips.forEach((ids, ip) => {
            if (ip.includes(ipValue)) {
                ids.forEach(id => ipMatches.add(id));
            }
        });
        matches = new Set([...matches].filter(id => ipMatches.has(id)));
    }
    
    // Filter by search text
    if (searchText) {
        const terms = searchText.split(/\s+/);
        const termMatches = new Set();
        
        terms.forEach(term => {
            searchIndex.terms.forEach((ids, indexedTerm) => {
                if (indexedTerm.includes(term)) {
                    ids.forEach(id => termMatches.add(id));
                }
            });
        });
        
        matches = new Set([...matches].filter(id => termMatches.has(id)));
    }
    
    // Filter by time range
    if (fromTime || toTime) {
        const timeMatches = searchIndex.timestamps.filter(item => {
            if (fromTime && item.timestamp < fromTime) return false;
            if (toTime && item.timestamp > toTime) return false;
            return true;
        }).map(item => item.id);
        
        matches = new Set([...matches].filter(id => timeMatches.includes(id)));
    }
    
    // Filter by JSONPath expression
    if (jsonPathExpr) {
        const jsonPathMatches = new Set();
        
        [...matches].forEach(id => {
            const entry = webhookEntries[id];
            if (!entry) return;
            
            const result = evaluateJsonPath(entry.payload, jsonPathExpr);
            if (result) {
                jsonPathMatches.add(id);
            }
        });
        
        matches = jsonPathMatches;
    }
    
    // Store in cache (limited size)
    searchCache.set(cacheKey, matches);
    if (searchCache.size > 100) {
        const oldestKey = searchCache.keys().next().value;
        searchCache.delete(oldestKey);
    }
    
    // Update UI
    updateVisibility(matches);
    console.timeEnd('filter-performance');
}

// Create a debounced version of applyFilters
const debouncedSearch = debounce(applyFilters, 250);

// Initialize event listeners
function initSearchEvents() {
    // Hook up filter events with debouncing for better performance
    Object.values(filters).forEach(el => {
        if (el && el !== filters.clearFilterBtn) {
            el.addEventListener('input', debouncedSearch);
        }
    });
    
    // Clear filters button
    filters.clearFilterBtn.addEventListener('click', () => {
        filters.searchInput.value = '';
        filters.methodFilter.value = 'all';
        filters.pathFilter.value = '';
        filters.ipFilter.value = '';
        filters.timeFrom.value = '';
        filters.timeTo.value = '';
        filters.jsonPathInput.value = '';
        applyFilters();
    });
}

// Export the public API
window.webhookSearch = {
    init: initSearchEvents,
    indexEntry: indexWebhookEntry,
    applyFilters: applyFilters,
    debouncedSearch: debouncedSearch,
    getEntries: () => webhookEntries
};
