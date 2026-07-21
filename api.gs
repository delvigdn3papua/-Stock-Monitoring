/*******************************************************
 * =========================================================
 * APPLE COVERAGE DASHBOARD - REST API LAYER
 * 
 * Production Final v1.0.0
 * Business Rule Locked
 * 
 * Endpoints:
 * - ?action=dashboard      → JSON dashboard data
 * - ?action=v1/dashboard   → JSON dashboard data (versioned)
 * - ?action=health         → JSON health check
 * - ?action=version        → JSON version info
 * - ?v=1&action=dashboard  → JSON dashboard data (versioned)
 * - (no param)             → HTML API Landing page
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
                // API Landing Page (HTML)
                return getApiLandingPage();
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
// API LANDING PAGE - HTML
// ============================================================

/**
 * ==========================================================
 * GET API LANDING PAGE
 * Business Rule v1.0
 * Do Not Modify Without Version Increment
 * ==========================================================
 * @return {HtmlOutput} HTML landing page
 */
function getApiLandingPage() {
    var html = `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Apple Coverage API</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0e14;
            color: #e8edf4;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            width: 100%;
            background: #141b24;
            border-radius: 16px;
            padding: 40px 32px;
            border: 1px solid #2a3a4a;
            box-shadow: 0 24px 80px rgba(0,0,0,0.4);
        }
        .logo {
            font-size: 48px;
            color: #007aff;
            text-align: center;
            margin-bottom: 8px;
        }
        h1 {
            text-align: center;
            font-size: 24px;
            font-weight: 700;
            color: #e8edf4;
            margin-bottom: 4px;
        }
        .subtitle {
            text-align: center;
            color: #6a7f9a;
            font-size: 14px;
            margin-bottom: 24px;
        }
        .status-badge {
            display: inline-block;
            background: #1a3a2a;
            color: #22c55e;
            padding: 4px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 24px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 24px;
        }
        .info-item {
            background: #1a2330;
            padding: 12px 16px;
            border-radius: 10px;
            border: 1px solid #2a3a4a;
        }
        .info-item .label {
            font-size: 10px;
            text-transform: uppercase;
            color: #6a7f9a;
            letter-spacing: 0.5px;
            font-weight: 600;
        }
        .info-item .value {
            font-size: 14px;
            font-weight: 600;
            color: #e8edf4;
            margin-top: 2px;
        }
        .info-item .value .highlight {
            color: #60a5fa;
        }
        .endpoint-section {
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid #2a3a4a;
        }
        .endpoint-section h3 {
            font-size: 13px;
            color: #94a3b8;
            margin-bottom: 10px;
            font-weight: 600;
        }
        .endpoint {
            background: #0a0e14;
            padding: 8px 12px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            color: #a0b8d0;
            margin-bottom: 6px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border: 1px solid #1a2330;
        }
        .endpoint .method {
            background: #1a3a2a;
            color: #22c55e;
            padding: 2px 10px;
            border-radius: 4px;
            font-size: 10px;
            font-weight: 700;
        }
        .endpoint .method.get {
            background: #1a2a3a;
            color: #60a5fa;
        }
        .endpoint .path {
            font-size: 11px;
            color: #c8d2e0;
        }
        .status-ok {
            display: inline-block;
            width: 8px;
            height: 8px;
            background: #22c55e;
            border-radius: 50%;
            margin-right: 8px;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
        }
        .footer {
            text-align: center;
            color: #4a5f7a;
            font-size: 11px;
            margin-top: 20px;
            padding-top: 16px;
            border-top: 1px solid #1a2330;
        }
        @media (max-width: 480px) {
            .container { padding: 28px 20px; }
            .info-grid { grid-template-columns: 1fr; }
            .endpoint { flex-wrap: wrap; gap: 4px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🍎</div>
        <h1>Apple Coverage API</h1>
        <div class="subtitle">Monitoring Dashboard Backend</div>
        <div style="text-align: center;">
            <span class="status-badge"><span class="status-ok"></span>Online</span>
        </div>
        <div class="info-grid">
            <div class="info-item">
                <div class="label">Version</div>
                <div class="value"><span class="highlight">${APP_INFO.VERSION}</span></div>
            </div>
            <div class="info-item">
                <div class="label">Environment</div>
                <div class="value"><span class="highlight">${APP_INFO.ENVIRONMENT}</span></div>
            </div>
            <div class="info-item">
                <div class="label">Business Rule</div>
                <div class="value"><span class="highlight">${APP_INFO.BUSINESS_RULE}</span></div>
            </div>
            <div class="info-item">
                <div class="label">Build Date</div>
                <div class="value"><span class="highlight">${APP_INFO.BUILD_DATE}</span></div>
            </div>
        </div>
        <div class="endpoint-section">
            <h3>📡 Available Endpoints</h3>
            <div class="endpoint">
                <span class="path">?action=dashboard</span>
                <span class="method get">GET</span>
                <span style="font-size:10px;color:#6a7f9a;">→ JSON</span>
            </div>
            <div class="endpoint">
                <span class="path">?action=health</span>
                <span class="method get">GET</span>
                <span style="font-size:10px;color:#6a7f9a;">→ JSON</span>
            </div>
            <div class="endpoint">
                <span class="path">?action=version</span>
                <span class="method get">GET</span>
                <span style="font-size:10px;color:#6a7f9a;">→ JSON</span>
            </div>
            <div class="endpoint" style="opacity:0.5;">
                <span class="path">(no param)</span>
                <span class="method">HTML</span>
                <span style="font-size:10px;color:#4a5f7a;">← You are here</span>
            </div>
        </div>
        <div class="footer">
            Apple Coverage Monitoring • ${APP_INFO.VERSION} • ${APP_INFO.ENVIRONMENT}
        </div>
    </div>
</body>
</html>
    `;

    return HtmlService
        .createHtmlOutput(html)
        .setTitle('Apple Coverage API')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
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
