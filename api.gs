/*******************************************************
 * =========================================================
 * APPLE COVERAGE DASHBOARD - REST API LAYER
 * 
 * Production Final v1.0.2
 * Business Rule Locked
 * 
 * Endpoints:
 * - ?action=dashboard        → JSON agregasi (tanpa details)
 * - ?action=detail           → JSON detail IMEI (lazy loading)
 * - ?action=health           → JSON health check
 * - ?action=version          → JSON version info
 * - (no param)               → HTML API Landing page
 * 
 * OPTIMIZATION:
 * - Dashboard payload dikurangi (lazy loading details)
 * - Detail endpoint untuk mengambil IMEI secara on-demand
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

        if (version && action === 'dashboard') {
            action = 'v' + version + '/dashboard';
        }

        switch (action) {
            case 'dashboard':
                return outputJson(loadDashboardOptimized());

            case 'v1/dashboard':
                return outputJson(loadDashboardOptimized());

            case 'detail':
                return outputJson(getDetailData(e.parameter));

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
                return getApiLandingPage();
        }
    } catch (error) {
        debugLog('[doGet] ERROR: ' + error.toString());
        if (CONFIG.DEBUG) {
            debugLog('[doGet] Stack: ' + error.stack);
        }
        return outputJson({
            success: false,
            error: '[doGet] ' + error.toString()
        });
    }
}

// ============================================================
// LOAD DASHBOARD OPTIMIZED
// ============================================================

/**
 * ==========================================================
 * LOAD DASHBOARD OPTIMIZED
 * Business Rule v1.0
 * Do Not Modify Without Version Increment
 * ==========================================================
 * Memanggil loadDashboard() dari Code.gs dan menghapus details
 * untuk mengurangi payload.
 * @return {Object} Response object dengan data dashboard (tanpa details)
 */
function loadDashboardOptimized() {
    debugLog("[loadDashboardOptimized] START");

    try {
        // Cek cache
        var cached = CACHE.get(CACHE_KEY);
        if (cached) {
            try {
                var parsed = JSON.parse(cached);
                debugLog("[loadDashboardOptimized] ✅ Cache HIT");
                
                if (parsed.rows && Array.isArray(parsed.rows)) {
                    parsed.rows = removeDetailsFromRows(parsed.rows);
                }
                
                return parsed;
            } catch (e) {
                debugLog("[loadDashboardOptimized] ⚠️ Cache parse error");
                if (CONFIG.DEBUG) {
                    debugLog("[loadDashboardOptimized] Cache error: " + e.toString());
                }
            }
        }

        // Panggil loadDashboard() dari Code.gs
        debugLog("[loadDashboardOptimized] Calling loadDashboard() from Code.gs...");
        var result = loadDashboard();

        // Log hasil
        if (result) {
            debugLog("[loadDashboardOptimized] loadDashboard() success: " + result.success);
            if (result.kpi) {
                debugLog("[loadDashboardOptimized] KPI: " + JSON.stringify(result.kpi));
            }
            if (result.rows) {
                debugLog("[loadDashboardOptimized] Rows: " + result.rows.length);
            }
        }

        // Hanya hapus details jika rows ada
        if (result && result.success && result.rows && Array.isArray(result.rows)) {
            result.rows = removeDetailsFromRows(result.rows);
            
            // Simpan ke cache
            try {
                var jsonString = JSON.stringify(result);
                CACHE.put(CACHE_KEY, jsonString, CONFIG.CACHE_TTL);
                debugLog("[loadDashboardOptimized] ✅ Cache SAVE for " + CONFIG.CACHE_TTL + "s");
            } catch (e) {
                debugLog("[loadDashboardOptimized] ⚠️ Cache save error: " + e.toString());
            }
        }

        return result;

    } catch (error) {
        debugLog("[loadDashboardOptimized] ERROR: " + error.toString());
        if (CONFIG.DEBUG) {
            debugLog("[loadDashboardOptimized] Stack: " + error.stack);
        }
        return {
            success: false,
            error: "[loadDashboardOptimized] " + error.toString()
        };
    }
}

// ============================================================
// REMOVE DETAILS FROM ROWS - AMAN
// ============================================================

/**
 * ==========================================================
 * REMOVE DETAILS FROM ROWS
 * Business Rule v1.0
 * Do Not Modify Without Version Increment
 * ==========================================================
 * HANYA menghapus properti details dari setiap SKU.
 * TIDAK menghapus rows, barang, atau data agregasi lainnya.
 * 
 * @param {Array} rows - Data rows
 * @return {Array} Rows tanpa details
 */
function removeDetailsFromRows(rows) {
    if (!rows || !Array.isArray(rows)) {
        debugLog("[removeDetailsFromRows] rows is not an array, returning as-is");
        return rows;
    }

    debugLog("[removeDetailsFromRows] Processing " + rows.length + " rows");

    for (var i = 0; i < rows.length; i++) {
        var row = rows[i];
        if (!row) continue;

        if (row.barang && Array.isArray(row.barang)) {
            for (var j = 0; j < row.barang.length; j++) {
                var sku = row.barang[j];
                if (!sku) continue;

                if (sku.details !== undefined) {
                    var detailCount = Array.isArray(sku.details) ? sku.details.length : 0;
                    delete sku.details;
                    sku.imeiCount = detailCount;
                }
            }
        }
    }

    debugLog("[removeDetailsFromRows] Completed processing " + rows.length + " rows");
    return rows;
}

// ============================================================
// DETAIL ENDPOINT - LAZY LOADING IMEI
// ============================================================

/**
 * ==========================================================
 * GET DETAIL DATA
 * Business Rule v1.0
 * Do Not Modify Without Version Increment
 * ==========================================================
 * Ambil detail IMEI untuk customer + sku tertentu
 * @param {Object} params - Parameter dari request
 * @return {Object} Detail IMEI
 */
function getDetailData(params) {
    debugLog("[getDetailData] START");

    try {
        var customer = params && params.customer ? decodeURIComponent(params.customer) : '';
        var depo = params && params.depo ? decodeURIComponent(params.depo) : '';
        var sku = params && params.sku ? decodeURIComponent(params.sku) : '';
        var kategori = params && params.kategori ? decodeURIComponent(params.kategori) : '';

        if (!customer || !depo || !sku) {
            return {
                success: false,
                error: 'Missing required parameters: customer, depo, sku'
            };
        }

        debugLog("[getDetailData] Customer: " + customer + ", Depo: " + depo + ", SKU: " + sku);

        var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
        var sh = ss.getSheetByName(CONFIG.SHEET_NAME);

        if (!sh) {
            return { success: false, error: "Sheet tidak ditemukan" };
        }

        var lastRow = sh.getLastRow();
        if (lastRow <= 1) {
            return { success: false, error: "Tidak ada data" };
        }

        var data = sh.getRange(2, 1, lastRow - 1, 12).getValues();
        var details = [];

        var today = new Date();
        today.setHours(0, 0, 0, 0);

        for (var i = 0; i < data.length; i++) {
            var row = data[i];
            var rowDepo = String(row[COL.DEPO] || '').trim();
            var rowCustomer = String(row[COL.CUSTOMER] || '').trim();
            var rowSku = String(row[COL.BARANG] || '').trim();
            var rowKategori = String(row[COL.KATEGORI] || '').trim();

            if (rowDepo === depo && rowCustomer === customer && rowSku === sku) {
                if (kategori && rowKategori !== kategori) continue;

                var serial = String(row[COL.SERIAL] || '').trim();
                var coverageStr = String(row[COL.COVERAGE] || '').trim();
                var sellThruDate = parseDate(row[COL.TANGGAL]);
                var isValidCoverage = isCoverageValid(coverageStr);
                var coverageDate = isValidCoverage ? parseDate(coverageStr) : null;

                var isL4W = false;
                if (isValidCoverage && coverageDate) {
                    var diff = (today.getTime() - coverageDate.getTime()) / (1000 * 60 * 60 * 24);
                    if (diff >= 0 && diff <= 27) {
                        isL4W = true;
                    }
                }

                details.push({
                    imei: serial || '-',
                    tanggalSellThru: formatDate(sellThruDate),
                    coverage: coverageStr || '-',
                    isValidCoverage: isValidCoverage,
                    isL4W: isL4W,
                    status: isValidCoverage ? 'Terjual' : 'Stock'
                });
            }
        }

        debugLog("[getDetailData] Found " + details.length + " IMEI details");

        return {
            success: true,
            customer: customer,
            depo: depo,
            sku: sku,
            kategori: kategori || '-',
            details: details,
            total: details.length
        };

    } catch (error) {
        debugLog("[getDetailData] ERROR: " + error.toString());
        if (CONFIG.DEBUG) {
            debugLog("[getDetailData] Stack: " + error.stack);
        }
        return {
            success: false,
            error: "[getDetailData] " + error.toString()
        };
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
        var cached = CACHE.get(CACHE_KEY);
        cacheStatus = cached ? 'HIT' : 'MISS';

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
                <span style="font-size:10px;color:#6a7f9a;">→ JSON (tanpa details)</span>
            </div>
            <div class="endpoint">
                <span class="path">?action=detail&customer=X&depo=Y&sku=Z</span>
                <span class="method get">GET</span>
                <span style="font-size:10px;color:#6a7f9a;">→ JSON (IMEI details)</span>
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
        return ContentService
            .createTextOutput(JSON.stringify({
                success: false,
                error: 'Failed to serialize response'
            }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

// ============================================================
// INCLUDE HELPER - UNTUK HTML FALLBACK
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
// CACHE CLEAR - DEVELOPMENT ONLY
// ============================================================

/**
 * ==========================================================
 * CLEAR CACHE - DEVELOPMENT ONLY
 * Business Rule v1.0
 * Do Not Modify Without Version Increment
 * ==========================================================
 */
function clearCache() {
    CACHE.remove(CACHE_KEY);
    debugLog('[clearCache] ✅ Cache cleared');
}

// ============================================================
// END OF API.GS
// ============================================================
