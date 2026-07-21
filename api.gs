/*******************************************************
 * =========================================================
 * APPLE COVERAGE DASHBOARD - REST API LAYER
 * 
 * Production v1.0.1
 * Business Rule Locked
 * 
 * Endpoints:
 * - ?action=dashboard      → JSON dashboard data
 * - ?action=v1/dashboard   → JSON dashboard data (versioned)
 * - ?action=health         → JSON health check
 * - ?action=version        → JSON version info
 * - ?v=1&action=dashboard  → JSON dashboard data (versioned)
 * - (no param)             → HTML Index page (fallback)
 * 
 * ARCHITECTURE:
 * GitHub Pages → fetch(API.gs) → Code.gs → Spreadsheet
 * 
 * SECURITY:
 * - error.stack TIDAK dikirim ke frontend
 * - cache-clear endpoint TIDAK tersedia di production
 * - version info hanya dari backend (source of truth)
 * =========================================================
 *******************************************************/

// ============================================================
// ENTRY POINT
// ============================================================

/**
 * ==========================================================
 * DO GET - REST API ENTRY POINT
 * Business Rule v1.0
 * Do Not Modify Without Version Increment
 * ==========================================================
 * @param {Object} e - Event parameter
 * @return {HtmlOutput|TextOutput} HTML atau JSON response
 */
function doGet(e) {
    try {
        var action = (e && e.parameter && e.parameter.action) ? e.parameter.action.toLowerCase() : '';
        var version = (e && e.parameter && e.parameter.v) ? e.parameter.v : '';
        
        // Versioned endpoint support
        // ?v=1&action=dashboard
        if (version && action === 'dashboard') {
            action = 'v' + version + '/dashboard';
        }
        
        switch (action) {
            case 'dashboard':
                return outputJson(loadDashboard());
            
            case 'v1/dashboard':
                // Version 1 - same as current
                return outputJson(loadDashboard());
            
            case 'version':
                return outputJson({
                    success: true,
                    name: APP_INFO.NAME,
                    version: APP_INFO.VERSION,
                    buildDate: APP_INFO.BUILD_DATE,
                    environment: APP_INFO.ENVIRONMENT,
                    businessRule: APP_INFO.BUSINESS_RULE,
                    timestamp: new Date().toISOString()
                });
            
            case 'health':
                return outputJson(getHealthStatus());
            
            default:
                // Fallback: render HTML (untuk kompatibilitas mode lama)
                return HtmlService
                    .createTemplateFromFile('Index')
                    .evaluate()
                    .setTitle('Apple Coverage Dashboard')
                    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
                    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
        }
    } catch (error) {
        debugLog('[doGet] ERROR: ' + error.toString());
        if (CONFIG.DEBUG) {
            debugLog('[doGet] Stack: ' + error.stack);
        }
        // ⚠️ SECURITY: Stack trace TIDAK dikirim ke frontend
        return outputJson({
            success: false,
            error: '[doGet] ' + error.toString()
        });
    }
}

// ============================================================
// HEALTH ENDPOINT
// ============================================================

/**
 * ==========================================================
 * GET HEALTH STATUS
 * Business Rule v1.0
 * Do Not Modify Without Version Increment
 * ==========================================================
 * @return {Object} Health status object
 */
function getHealthStatus() {
    var startTime = Date.now();
    var cacheStatus = 'UNKNOWN';
    var spreadsheetStatus = 'UNKNOWN';
    var rowsCount = 0;
    
    try {
        // Check cache
        var cached = CACHE.get(CACHE_KEY);
        cacheStatus = cached ? 'HIT' : 'MISS';
        
        // Check spreadsheet
        var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
        var sh = ss.getSheetByName(CONFIG.SHEET_NAME);
        if (sh) {
            var lastRow = sh.getLastRow();
            rowsCount = lastRow - 1;
            spreadsheetStatus = 'OK (' + rowsCount + ' rows)';
        } else {
            spreadsheetStatus = 'ERROR: Sheet not found';
        }
        
        var executionTime = Date.now() - startTime;
        
        return {
            success: true,
            status: 'OK',
            version: APP_INFO.VERSION,
            environment: APP_INFO.ENVIRONMENT,
            cache: cacheStatus,
            spreadsheet: spreadsheetStatus,
            rows: rowsCount,
            executionTime: executionTime + ' ms',
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        debugLog('[getHealthStatus] ERROR: ' + error.toString());
        if (CONFIG.DEBUG) {
            debugLog('[getHealthStatus] Stack: ' + error.stack);
        }
        // ⚠️ SECURITY: Stack trace TIDAK dikirim ke frontend
        return {
            success: false,
            status: 'ERROR',
            version: APP_INFO.VERSION,
            environment: APP_INFO.ENVIRONMENT,
            cache: cacheStatus,
            spreadsheet: 'ERROR: ' + error.toString(),
            rows: rowsCount,
            executionTime: (Date.now() - startTime) + ' ms',
            timestamp: new Date().toISOString()
        };
    }
}

// ============================================================
// RESPONSE HELPERS
// ============================================================

/**
 * ==========================================================
 * OUTPUT JSON - RESPONSE HELPER
 * Business Rule v1.0
 * Do Not Modify Without Version Increment
 * ==========================================================
 * @param {Object} data - Data to be returned as JSON
 * @return {TextOutput} JSON response
 */
function outputJson(data) {
    try {
        var json = JSON.stringify(data);
        return ContentService
            .createTextOutput(json)
            .setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
        debugLog('[outputJson] ERROR: ' + error.toString());
        if (CONFIG.DEBUG) {
            debugLog('[outputJson] Stack: ' + error.stack);
        }
        // ⚠️ SECURITY: Stack trace TIDAK dikirim ke frontend
        return ContentService
            .createTextOutput(JSON.stringify({
                success: false,
                error: 'Failed to serialize response'
            }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

// ============================================================
// INCLUDE HELPER (UNTUK HTML RENDER - MODE LAMA)
// ============================================================

/**
 * ==========================================================
 * INCLUDE - HTML HELPER
 * Business Rule v1.0
 * Do Not Modify Without Version Increment
 * ==========================================================
 * @param {string} file - Nama file tanpa ekstensi
 * @return {string} Konten file
 */
function include(file) {
    try {
        return HtmlService.createHtmlOutputFromFile(file).getContent();
    } catch (error) {
        debugLog('[include] ERROR: ' + error.toString());
        if (CONFIG.DEBUG) {
            debugLog('[include] Stack: ' + error.stack);
        }
        return '';
    }
}

// ============================================================
// CACHE CLEAR - DEVELOPMENT ONLY (TIDAK TEREXPOSED VIA API)
// ============================================================

/**
 * ==========================================================
 * CLEAR CACHE - DEVELOPMENT ONLY
 * Business Rule v1.0
 * Do Not Modify Without Version Increment
 * ==========================================================
 * Fungsi ini HANYA bisa dipanggil dari dalam script (internal),
 * TIDAK terexpose melalui API endpoint.
 * 
 * Untuk menghapus cache, jalankan dari editor Apps Script:
 * clearCache()
 * ==========================================================
 */
function clearCache() {
    CACHE.remove(CACHE_KEY);
    debugLog('[clearCache] ✅ Cache cleared');
}

// ============================================================
// END OF API.GS
// ============================================================
