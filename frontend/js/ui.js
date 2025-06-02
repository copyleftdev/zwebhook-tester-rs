/**
 * ZWebHook-Tester UI Manager
 * Handles UI interactions, settings, and theme management
 */

// UI settings with defaults
const DEFAULT_UI_SETTINGS = {
    darkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
    autoExpand: true,
    showTimeline: true,
    relativeTime: true,
    filterPresets: []
};

// DOM elements
const darkModeCheckbox = document.getElementById('dark-mode');
const autoExpandCheckbox = document.getElementById('auto-expand');
const showTimelineCheckbox = document.getElementById('show-timeline');
const relativeTimeCheckbox = document.getElementById('relative-time');
const saveFilterButton = document.getElementById('save-filter');
const presetContainer = document.getElementById('preset-container');

/**
 * Enable dark mode
 */
function enableDarkMode() {
    document.documentElement.classList.add('dark');
    const settings = getUISettings();
    settings.darkMode = true;
    saveUISettings(settings);
}

/**
 * Disable dark mode
 */
function disableDarkMode() {
    document.documentElement.classList.remove('dark');
    const settings = getUISettings();
    settings.darkMode = false;
    saveUISettings(settings);
}

/**
 * Initialize UI settings from localStorage or defaults
 */
function initUISettings() {
    const settings = getUISettings();
    
    // Apply theme
    darkModeCheckbox.checked = settings.darkMode;
    document.documentElement.classList.toggle('dark', settings.darkMode);
    
    // Apply other settings
    autoExpandCheckbox.checked = settings.autoExpand;
    showTimelineCheckbox.checked = settings.showTimeline;
    relativeTimeCheckbox.checked = settings.relativeTime;
    
    // Load filter presets
    loadFilterPresets();
}

/**
 * Get UI settings from localStorage or defaults
 * @returns {Object} UI settings
 */
function getUISettings() {
    try {
        const settings = JSON.parse(localStorage.getItem('ui-settings'));
        return settings ? { ...DEFAULT_UI_SETTINGS, ...settings } : DEFAULT_UI_SETTINGS;
    } catch (e) {
        console.error('Error loading UI settings:', e);
        return DEFAULT_UI_SETTINGS;
    }
}

/**
 * Save UI settings to localStorage
 * @param {Object} settings - UI settings to save
 */
function saveUISettings(settings) {
    try {
        localStorage.setItem('ui-settings', JSON.stringify(settings));
    } catch (e) {
        console.error('Error saving UI settings:', e);
    }
}

/**
 * Toggle dark mode based on checkbox
 */
function toggleDarkMode() {
    if (darkModeCheckbox.checked) {
        enableDarkMode();
    } else {
        disableDarkMode();
    }
}

/**
 * Save current filter as a preset
 */
function saveFilterPreset() {
    const presetName = prompt('Enter a name for this filter preset:');
    if (!presetName) return;
    
    const filters = {
        name: presetName,
        searchText: document.getElementById('search-text').value,
        method: document.getElementById('filter-method').value,
        path: document.getElementById('filter-path').value,
        ip: document.getElementById('filter-ip').value,
        timeFrom: document.getElementById('time-from').value,
        timeTo: document.getElementById('time-to').value,
        jsonPath: document.getElementById('json-path').value
    };
    
    const settings = getUISettings();
    if (!settings.filterPresets) {
        settings.filterPresets = [];
    }
    
    // Add new preset
    settings.filterPresets.push(filters);
    saveUISettings(settings);
    
    // Reload presets UI
    loadFilterPresets();
}

/**
 * Load saved filter presets into UI
 */
function loadFilterPresets() {
    const settings = getUISettings();
    const presets = settings.filterPresets || [];
    
    // Clear container
    presetContainer.innerHTML = '';
    
    // Add presets
    presets.forEach((preset, index) => {
        const presetElement = document.createElement('div');
        presetElement.className = 'filter-preset p-2 bg-gray-100 dark:bg-gray-700 rounded flex justify-between items-center mb-2';
        presetElement.innerHTML = `
            <span class="text-sm font-medium">${preset.name}</span>
            <div>
                <button class="text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 mr-2" 
                        onclick="applyFilterPreset(${index})">
                    <i class="fas fa-check"></i>
                </button>
                <button class="text-red-500 hover:text-red-700 dark:hover:text-red-300" 
                        onclick="deleteFilterPreset(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        presetContainer.appendChild(presetElement);
    });
}

/**
 * Apply a filter preset
 * @param {number} index - Index of the preset to apply
 */
function applyFilterPreset(index) {
    const settings = getUISettings();
    const preset = settings.filterPresets[index];
    if (!preset) return;
    
    // Apply filter values
    document.getElementById('search-text').value = preset.searchText || '';
    document.getElementById('filter-method').value = preset.method || 'all';
    document.getElementById('filter-path').value = preset.path || '';
    document.getElementById('filter-ip').value = preset.ip || '';
    document.getElementById('time-from').value = preset.timeFrom || '';
    document.getElementById('time-to').value = preset.timeTo || '';
    document.getElementById('json-path').value = preset.jsonPath || '';
    
    // Apply filters
    window.webhookSearch.applyFilters();
}

/**
 * Delete a filter preset
 * @param {number} index - Index of the preset to delete
 */
function deleteFilterPreset(index) {
    if (!confirm('Are you sure you want to delete this preset?')) return;
    
    const settings = getUISettings();
    if (settings.filterPresets && settings.filterPresets.length > index) {
        settings.filterPresets.splice(index, 1);
        saveUISettings(settings);
        loadFilterPresets();
    }
}

/**
 * Copy webhook payload to clipboard
 * @param {number} entryId - ID of the webhook entry
 */
function copyPayload(entryId) {
    const webhook = window.webhookSearch.getEntries()[entryId];
    if (!webhook) return;
    
    const payload = JSON.stringify(webhook.payload, null, 2);
    navigator.clipboard.writeText(payload)
        .then(() => showNotification('Payload copied to clipboard'))
        .catch(err => console.error('Failed to copy:', err));
}

/**
 * Generate and copy cURL command for a webhook
 * @param {number} entryId - ID of the webhook entry
 */
function copyCurlCommand(entryId) {
    const webhook = window.webhookSearch.getEntries()[entryId];
    if (!webhook) return;
    
    // Build curl command
    let curl = `curl -X ${webhook.method} '${window.location.origin}${webhook.path}'`;
    
    // Add headers
    Object.entries(webhook.headers).forEach(([key, value]) => {
        if (key.toLowerCase() !== 'content-length') {
            curl += ` \\\n  -H '${key}: ${value.replace(/'/g, "\\'")}'`;
        }
    });
    
    // Add payload for appropriate methods
    if (['POST', 'PUT', 'PATCH'].includes(webhook.method.toUpperCase()) && webhook.payload) {
        const payloadStr = JSON.stringify(webhook.payload).replace(/'/g, "\\'");
        curl += ` \\\n  -d '${payloadStr}'`;
    }
    
    navigator.clipboard.writeText(curl)
        .then(() => showNotification('cURL command copied to clipboard'))
        .catch(err => console.error('Failed to copy:', err));
}

/**
 * Load webhook into replayer section
 * @param {number} entryId - ID of the webhook entry
 */
function loadIntoReplayer(entryId) {
    const webhook = window.webhookSearch.getEntries()[entryId];
    if (!webhook) return;
    
    // Switch to replayer tab
    document.getElementById('replayer-tab').click();
    
    // Fill form fields
    document.getElementById('replayer-url').value = webhook.path;
    document.getElementById('replayer-method').value = webhook.method.toUpperCase();
    
    // Set headers
    let headerText = '';
    Object.entries(webhook.headers).forEach(([key, value]) => {
        if (!['content-length', 'host'].includes(key.toLowerCase())) {
            headerText += `${key}: ${value}\n`;
        }
    });
    document.getElementById('replayer-headers').value = headerText.trim();
    
    // Set payload
    document.getElementById('replayer-payload').value = JSON.stringify(webhook.payload, null, 2);
    
    // Update syntax highlighting
    Prism.highlightAllUnder(document.getElementById('replayer-form'));
    
    showNotification('Webhook loaded into replayer');
}

/**
 * Show notification
 * @param {string} message - Message to display
 */
function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.remove('hidden');
    
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

/**
 * Initialize UI event listeners
 */
function initUIEvents() {
    // Theme toggle
    darkModeCheckbox.addEventListener('change', toggleDarkMode);
    
    // Auto expand setting
    autoExpandCheckbox.addEventListener('change', () => {
        const settings = getUISettings();
        settings.autoExpand = autoExpandCheckbox.checked;
        saveUISettings(settings);
    });
    
    // Show timeline setting
    showTimelineCheckbox.addEventListener('change', () => {
        const settings = getUISettings();
        settings.showTimeline = showTimelineCheckbox.checked;
        saveUISettings(settings);
        
        if (settings.showTimeline) {
            updateTimeline();
        }
    });
    
    // Relative time setting
    relativeTimeCheckbox.addEventListener('change', () => {
        const settings = getUISettings();
        settings.relativeTime = relativeTimeCheckbox.checked;
        saveUISettings(settings);
        
        // Force update all timestamps
        const timestamps = document.querySelectorAll('.webhook-entry .text-gray-500.text-xs');
        timestamps.forEach((el, index) => {
            const webhook = window.webhookSearch.getEntries()[index];
            if (webhook) {
                el.textContent = formatTimestamp(webhook.timestamp);
            }
        });
    });
    
    // Save filter preset
    saveFilterButton.addEventListener('click', saveFilterPreset);
    
    // Initialize settings
    initUISettings();
}

// Export the public API
window.webhookUI = {
    init: initUIEvents,
    enableDarkMode,
    disableDarkMode,
    copyPayload,
    copyCurlCommand,
    loadIntoReplayer,
    applyFilterPreset,
    deleteFilterPreset,
    saveFilterPreset
};
