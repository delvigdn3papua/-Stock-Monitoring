/*******************************************************
 * =========================================================
 * APPLE COVERAGE DASHBOARD - FRONTEND CONFIG
 * 
 * Production v1.0.1
 * 
 * ⚠️ VERSION INFO: Backend adalah SOURCE OF TRUTH
 *    Frontend hanya mengkonsumsi versi dari backend.
 *    Versi di sini hanya untuk fallback jika backend tidak
 *    dapat diakses.
 * =========================================================
 *******************************************************/

const APP_CONFIG = Object.freeze({
    // ⚠️ VERSION: Gunakan dari backend via ?action=version
    // Nilai di sini hanya FALLBACK jika backend tidak merespon
    FALLBACK_VERSION: "1.0.1",
    
    ENVIRONMENT: "Production",
    DEBUG: false,
    
    // ⚠️ GANTI DENGAN URL WEB APP ANDA
    WEB_APP_URL: "https://script.google.com/macros/s/AKfycbzGnCtAadudtfkPpGVYZTsorXEO1-Wi7-7cByoq5ijylBt3IfpcXwvlL3WQ15Btbdhp/exec",
    
    // API Endpoints
    ENDPOINTS: {
        DASHBOARD: "?action=dashboard",
        DASHBOARD_V1: "?action=v1/dashboard",
        HEALTH: "?action=health",
        VERSION: "?action=version"
    },
    
    // Fetch Configuration
    FETCH: {
        TIMEOUT: 10000,           // 10 detik
        MAX_RETRIES: 2,
        RETRY_DELAY: 1000
    },
    
    // Auto Refresh
    AUTO_REFRESH_INTERVAL: 60000  // 60 detik
});

// ============================================================
// VERSION CACHE - Dari Backend (Source of Truth)
// ============================================================

var _versionCache = null;

function getAppVersion() {
    if (_versionCache) {
        return _versionCache;
    }
    return APP_CONFIG.FALLBACK_VERSION;
}

function updateVersionFromBackend() {
    if (APP_CONFIG.DEBUG) {
        console.log('[Config] Fetching version from backend...');
    }
    
    return ApiHelper.fetchVersion()
        .then(function(data) {
            if (data && data.success && data.version) {
                _versionCache = data.version;
                if (APP_CONFIG.DEBUG) {
                    console.log('[Config] Version updated: ' + _versionCache);
                }
                return _versionCache;
            }
            return APP_CONFIG.FALLBACK_VERSION;
        })
        .catch(function() {
            return APP_CONFIG.FALLBACK_VERSION;
        });
}

// ============================================================
// API HELPER - SINGLE SOURCE OF TRUTH
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
            console.log('[ApiHelper] Fetching dashboard, attempt:', retryCount + 1);
        }
        
        return this._fetchWithTimeout(url, timeout)
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status + ': ' + response.statusText);
                }
                return response.json();
            })
            .then(function(data) {
                if (!data.success) {
                    throw new Error(data.error || 'Unknown error');
                }
                if (APP_CONFIG.DEBUG) {
                    console.log('[ApiHelper] Dashboard fetched successfully');
                }
                return data;
            })
            .catch(function(error) {
                if (APP_CONFIG.DEBUG) {
                    console.error('[ApiHelper] Error:', error.message);
                }
                
                if (retryCount < maxRetries) {
                    if (APP_CONFIG.DEBUG) {
                        console.log('[ApiHelper] Retrying... (' + (retryCount + 1) + '/' + maxRetries + ')');
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
     * Fetch dengan timeout menggunakan AbortController
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
            }
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
    },
    
    /**
     * Health check endpoint
     * @return {Promise} Promise dengan health data
     */
    fetchHealth: function() {
        var url = APP_CONFIG.WEB_APP_URL + APP_CONFIG.ENDPOINTS.HEALTH;
        return this._fetchWithTimeout(url, 5000)
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status);
                }
                return response.json();
            });
    },
    
    /**
     * Version info endpoint - BACKEND SEBAGAI SOURCE OF TRUTH
     * @return {Promise} Promise dengan version data
     */
    fetchVersion: function() {
        var url = APP_CONFIG.WEB_APP_URL + APP_CONFIG.ENDPOINTS.VERSION;
        return this._fetchWithTimeout(url, 5000)
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('HTTP ' + response.status);
                }
                return response.json();
            });
    }
};

// ============================================================
// DEBUG LOGGING WRAPPER
// ============================================================

function debugLog(message) {
    if (APP_CONFIG.DEBUG) {
        console.log('[DEBUG] ' + message);
    }
}

function debugError(message) {
    if (APP_CONFIG.DEBUG) {
        console.error('[DEBUG] ' + message);
    }
}

// ============================================================
// END OF CONFIG.JS
// ============================================================
