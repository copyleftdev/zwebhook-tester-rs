/**
 * ZWebHook-Tester Analytics Module
 * Handles data visualization and analytics for webhook traffic
 */

// Track method counts for analytics
const methodCounts = {
    GET: 0,
    POST: 0,
    PUT: 0,
    DELETE: 0,
    PATCH: 0,
    OTHER: 0
};

// Track timeline data
const timelineData = [];

/**
 * Update analytics based on incoming webhook
 * @param {Object} webhook - The webhook data
 */
function updateAnalytics(webhook) {
    // Update method counts
    const method = webhook.method.toUpperCase();
    if (methodCounts.hasOwnProperty(method)) {
        methodCounts[method]++;
    } else {
        methodCounts.OTHER++;
    }
    
    // Update method chart
    updateMethodChart();
    
    // Add to timeline data
    timelineData.push({
        time: new Date(webhook.timestamp).getTime(),
        method: method
    });
    
    // Limit timeline data size
    if (timelineData.length > 500) {
        timelineData.shift();
    }
    
    // Update payload size stats
    const payloadSize = JSON.stringify(webhook.payload).length;
    updateAverageSize(payloadSize);
}

/**
 * Update the method distribution chart
 */
function updateMethodChart() {
    const ctx = document.getElementById('method-chart').getContext('2d');
    
    // If chart already exists, update data
    if (window.methodChart) {
        window.methodChart.data.datasets[0].data = [
            methodCounts.GET,
            methodCounts.POST,
            methodCounts.PUT,
            methodCounts.DELETE,
            methodCounts.PATCH,
            methodCounts.OTHER
        ];
        window.methodChart.update();
        return;
    }
    
    // Create new chart
    window.methodChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OTHER'],
            datasets: [{
                data: [
                    methodCounts.GET,
                    methodCounts.POST,
                    methodCounts.PUT,
                    methodCounts.DELETE,
                    methodCounts.PATCH,
                    methodCounts.OTHER
                ],
                backgroundColor: [
                    '#3B82F6', // blue
                    '#10B981', // green
                    '#F59E0B', // yellow
                    '#EF4444', // red
                    '#8B5CF6', // purple
                    '#6B7280'  // gray
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        color: 'rgb(156, 163, 175)'
                    }
                }
            }
        }
    });
}

/**
 * Update the timeline visualization
 */
function updateTimeline() {
    const ctx = document.getElementById('timeline-chart').getContext('2d');
    
    // Prepare data
    const labels = [];
    const datasets = {
        GET: [],
        POST: [],
        PUT: [],
        DELETE: [],
        PATCH: [],
        OTHER: []
    };
    
    // Group by minute buckets
    const buckets = {};
    timelineData.forEach(point => {
        const minuteBucket = Math.floor(point.time / 60000) * 60000;
        if (!buckets[minuteBucket]) {
            buckets[minuteBucket] = {
                GET: 0, POST: 0, PUT: 0, DELETE: 0, PATCH: 0, OTHER: 0
            };
        }
        
        buckets[minuteBucket][point.method]++;
    });
    
    // Sort buckets by time
    const sortedBuckets = Object.keys(buckets).sort().map(time => ({
        time: parseInt(time),
        counts: buckets[time]
    }));
    
    // Create data points
    sortedBuckets.forEach(bucket => {
        const date = new Date(bucket.time);
        labels.push(date.toLocaleTimeString());
        
        datasets.GET.push(bucket.counts.GET);
        datasets.POST.push(bucket.counts.POST);
        datasets.PUT.push(bucket.counts.PUT);
        datasets.DELETE.push(bucket.counts.DELETE);
        datasets.PATCH.push(bucket.counts.PATCH);
        datasets.OTHER.push(bucket.counts.OTHER);
    });
    
    // If chart already exists, update data
    if (window.timelineChart) {
        window.timelineChart.data.labels = labels;
        window.timelineChart.data.datasets[0].data = datasets.GET;
        window.timelineChart.data.datasets[1].data = datasets.POST;
        window.timelineChart.data.datasets[2].data = datasets.PUT;
        window.timelineChart.data.datasets[3].data = datasets.DELETE;
        window.timelineChart.data.datasets[4].data = datasets.PATCH;
        window.timelineChart.data.datasets[5].data = datasets.OTHER;
        window.timelineChart.update();
        return;
    }
    
    // Create new chart
    window.timelineChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'GET',
                    data: datasets.GET,
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    tension: 0.4
                },
                {
                    label: 'POST',
                    data: datasets.POST,
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    tension: 0.4
                },
                {
                    label: 'PUT',
                    data: datasets.PUT,
                    borderColor: '#F59E0B',
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    tension: 0.4
                },
                {
                    label: 'DELETE',
                    data: datasets.DELETE,
                    borderColor: '#EF4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    tension: 0.4
                },
                {
                    label: 'PATCH',
                    data: datasets.PATCH,
                    borderColor: '#8B5CF6',
                    backgroundColor: 'rgba(139, 92, 246, 0.2)',
                    tension: 0.4
                },
                {
                    label: 'OTHER',
                    data: datasets.OTHER,
                    borderColor: '#6B7280',
                    backgroundColor: 'rgba(107, 114, 128, 0.2)',
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: {
                        color: 'rgba(156, 163, 175, 0.1)'
                    },
                    ticks: {
                        color: 'rgb(156, 163, 175)'
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(156, 163, 175, 0.1)'
                    },
                    ticks: {
                        color: 'rgb(156, 163, 175)'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: 'rgb(156, 163, 175)'
                    }
                }
            }
        }
    });
}

/**
 * Update average payload size calculation
 * @param {number} payloadSize - Size of the payload in bytes
 */
function updateAverageSize(payloadSize) {
    const avgSizeEl = document.getElementById('avg-size');
    const currentAvg = parseFloat(avgSizeEl.dataset.avg || '0');
    const currentCount = parseInt(avgSizeEl.dataset.count || '0');
    
    const newAvg = (currentAvg * currentCount + payloadSize) / (currentCount + 1);
    avgSizeEl.textContent = Math.round(newAvg) + ' bytes';
    avgSizeEl.dataset.avg = newAvg;
    avgSizeEl.dataset.count = currentCount + 1;
}

// Initialize charts
function initAnalytics() {
    // Create initial empty charts
    updateMethodChart();
    
    if (document.getElementById('show-timeline').checked) {
        updateTimeline();
    }
}

// Export the public API
window.webhookAnalytics = {
    init: initAnalytics,
    update: updateAnalytics,
    updateTimeline: updateTimeline
};
