/*******************************************************
 * =========================================================
 * APPLE COVERAGE DASHBOARD - FRONTEND CONFIG
 * 
 * Production Final v1.0.1
 * 
 * ⚠️ VERSION INFO: Backend adalah SOURCE OF TRUTH
 *    Frontend hanya mengkonsumsi versi dari backend.
 *    Versi di sini hanya untuk fallback jika backend tidak
 *    dapat diakses.
 * 
 * ARCHITECTURE:
 * GitHub Pages → config.js → API.gs → Code.gs → Spreadsheet
 * =========================================================
 *******************************************************/

// ============================================================
// APP CONFIGURATION - IMMUTABLE
// ============================================================

const APP_CONFIG = Object.freeze({
    // ⚠️ VERSION: Gunakan dari backend via ?action=version
    // Nilai di sini hanya FALLBACK jika backend tidak merespon
    FALLBACK_VERSION: "1.0.1",
    
    ENVIRONMENT: "Production",
    DEBUG: false,
    
    // ⚠️ WEB APP URL - Google Apps Script Endpoint
    WEB_APP_URL: "https://script.google.com/macros/s/AKfycbzGnCtAadudtfkPpGVYZTsorXEO1-Wi7-7cByoq5ijylBt3IfpcXwvlL3WQ15Btbdhp/exec",
    
    // API Endpoints - Simplified (versioned endpoint removed)
    ENDPOINTS: Object.freeze({
        DASHBOARD: "?action=dashboard",
        HEALTH: "?action=health",
        VERSION: "?action=version"
    }),
    
    // Fetch Configuration
    FETCH: Object.freeze({
        TIMEOUT: 10000,           // 10 detik
        MAX_RETRIES: 2,
        RETRY_DELAY: 1000         // 1 detik antar retry
    }),
    
    // Auto Refresh Interval (ms)
    AUTO_REFRESH_INTERVAL: 60000  // 60 detik
});

// ============================================================
// VERSION CACHE - Dari Backend (Source of Truth)
// ============================================================

var _versionCache = null;

/**
 * Get application version from cache or fallback
 * @return {string} Version string
 */
function getAppVersion() {
    if (_versionCache) {
        return _versionCache;
    }
    return APP_CONFIG.FALLBACK_VERSION;
}

/**
 * Update version from backend - SOURCE OF TRUTH
 * @return {Promise<string>} Version string
 */
function updateVersionFromBackend() {
    if (APP_CONFIG.DEBUG) {
        debugLog('[Config] Fetching version from backend...');
    }
    
    return ApiHelper.fetchVersion()
        .then(function(data) {
            if (data && data.success && data.version) {
                _versionCache = data.version;
                if (APP_CONFIG.DEBUG) {
                    debugLog('[Config] Version updated: ' + _versionCache);
                }
                return _versionCache;
            }
            return APP_CONFIG.FALLBACK_VERSION;
        })
        .catch(function() {
            if (APP_CONFIG.DEBUG) {
                debugError('[Config] Failed to fetch version, using fallback');
            }
            return APP_CONFIG.FALLBACK_VERSION;
        });
}

// ============================================================
// DEBUG LOGGING WRAPPER - PRODUCTION MODE (DEBUG=false) NO LOGGING
// ============================================================

/**
 * Debug log wrapper - only logs when DEBUG is true
 * @param {string} message - Message to log
 */
function debugLog(message) {
    if (APP_CONFIG.DEBUG) {
        console.log('[DEBUG] ' + message);
    }
}

/**
 * Debug error wrapper - only logs when DEBUG is true
 * @param {string} message - Error message to log
 */
function debugError(message) {
    if (APP_CONFIG.DEBUG) {
        console.error('[DEBUG] ' + message);
    }
}

// ============================================================
// API HELPER - SINGLE SOURCE OF TRUTH FOR API CALLS
// ============================================================

var ApiHelper = {
    /**
     * Fetch dashboard data dengan retry & timeout
     * @param {number} retryCount - Jumlah retry saat ini
     * @return {Promise} Promise dengan data dashboard
     */
    fetchDashboard: function(retryCount) {
        retryCount = retryCount || 0;
        var maxRetries = APP_CONFIG.FETCH.MAX_RETRIES;
        var timeout = APP_CONFIG.FETCH.TIMEOUT;
        var url = APP_CONFIG.WEB_APP_URL + APP_CONFIG.ENDPOINTS.DASHBOARD;
        
        if (APP_CONFIG.DEBUG) {
            debugLog('[ApiHelper] Fetching dashboard, attempt: ' + (retryCount + 1) + '/' + (maxRetries + 1));
        }
        
        return this._fetchWithTimeout(url, timeout)
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status + ': ' + response.statusText);
                }
                return response.json();
            })
            .then(function(data) {
                if (!data || !data.success) {
                    throw new Error(data && data.error ? data.error : 'Unknown error');
                }
                if (APP_CONFIG.DEBUG) {
                    debugLog('[ApiHelper] Dashboard fetched successfully, rows: ' + (data.rows ? data.rows.length : 0));
                }
                return data;
            })
            .catch(function(error) {
                if (APP_CONFIG.DEBUG) {
                    debugError('[ApiHelper] Error: ' + error.message);
                }
                
                // Retry logic
                if (retryCount < maxRetries) {
                    if (APP_CONFIG.DEBUG) {
                        debugLog('[ApiHelper] Retrying... (' + (retryCount + 1) + '/' + maxRetries + ')');
                    }
                    return new Promise(function(resolve) {
                        setTimeout(function() {
                            resolve(ApiHelper.fetchDashboard(retryCount + 1));
                        }, APP_CONFIG.FETCH.RETRY_DELAY);
                    });
                }
                
                throw error;
            });
    },
    
    /**
     * Fetch health check data
     * @return {Promise} Promise dengan health data
     */
    fetchHealth: function() {
        var url = APP_CONFIG.WEB_APP_URL + APP_CONFIG.ENDPOINTS.HEALTH;
        
        if (APP_CONFIG.DEBUG) {
            debugLog('[ApiHelper] Fetching health...');
        }
        
        return this._fetchWithTimeout(url, 5000)
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status);
                }
                return response.json();
            })
            .then(function(data) {
                if (APP_CONFIG.DEBUG) {
                    debugLog('[ApiHelper] Health fetched: ' + (data && data.status ? data.status : 'unknown'));
                }
                return data;
            });
    },
    
    /**
     * Fetch version info - BACKEND SEBAGAI SOURCE OF TRUTH
     * @return {Promise} Promise dengan version data
     */
    fetchVersion: function() {
        var url = APP_CONFIG.WEB_APP_URL + APP_CONFIG.ENDPOINTS.VERSION;
        
        if (APP_CONFIG.DEBUG) {
            debugLog('[ApiHelper] Fetching version...');
        }
        
        return this._fetchWithTimeout(url, 5000)
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status);
                }
                return response.json();
            })
            .then(function(data) {
                if (APP_CONFIG.DEBUG) {
                    debugLog('[ApiHelper] Version fetched: ' + (data && data.version ? data.version : 'unknown'));
                }
                return data;
            });
    },
    
    /**
     * Fetch dengan timeout menggunakan AbortController
     * - Target: Chrome, Edge, Safari, Samsung Internet (modern browsers)
     * @param {string} url - URL yang akan di-fetch
     * @param {number} timeout - Timeout dalam milidetik
     * @return {Promise} Promise dengan response
     */
    _fetchWithTimeout: function(url, timeout) {
        var controller = new AbortController();
        var signal = controller.signal;
        
        var timeoutId = setTimeout(function() {
            controller.abort();
        }, timeout);
        
        return fetch(url, {
            signal: signal,
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            cache: 'no-cache'
        })
        .then(function(response) {
            clearTimeout(timeoutId);
            return response;
        })
        .catch(function(error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('Request timeout after ' + timeout + 'ms');
            }
            throw error;
        });
    }
};

// ============================================================
// AUTO REFRESH HELPER - SINGLE SOURCE OF TRUTH
// ============================================================

var _refreshTimeout = null;

/**
 * Schedule auto refresh dengan chain timeout
 * @param {Function} callback - Fungsi yang akan dipanggil saat refresh
 * @param {number} interval - Interval dalam milidetik
 * @return {number} Timeout ID
 */
function scheduleAutoRefresh(callback, interval) {
    if (_refreshTimeout) {
        clearTimeout(_refreshTimeout);
        _refreshTimeout = null;
    }
    
    interval = interval || APP_CONFIG.AUTO_REFRESH_INTERVAL;
    
    _refreshTimeout = setTimeout(function() {
        if (callback && typeof callback === 'function') {
            callback();
        }
    }, interval);
    
    return _refreshTimeout;
}

/**
 * Clear auto refresh timeout
 */
function clearAutoRefresh() {
    if (_refreshTimeout) {
        clearTimeout(_refreshTimeout);
        _refreshTimeout = null;
        if (APP_CONFIG.DEBUG) {
            debugLog('[Config] Auto refresh cleared');
        }
    }
}

/**
 * Get current auto refresh timeout
 * @return {number|null} Timeout ID or null
 */
function getAutoRefreshTimeout() {
    return _refreshTimeout;
}

// ============================================================
// END OF CONFIG.JS
// ============================================================
