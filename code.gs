/*******************************************************
 * =========================================================
 * APPLE COVERAGE DASHBOARD
 * 
 * Production Final v1.0
 * Business Rule Locked
 * 
 * Frontend Compatible:
 * - Dashboard.html
 * - mobile.html
 * 
 * Do not change KPI calculation without version upgrade.
 * =========================================================
 *******************************************************/

/*******************************************************
 * APPLE COVERAGE DASHBOARD - BACKEND
 * BUSINESS RULE V1.0 - LOCKED
 * 
 * KPI            | Sumber Data        | Kondisi
 * ---------------|--------------------|------------------
 * Sell Thru      | Tanggal SellThru   | Tanggal valid
 * Sell Out       | Coverage Active    | Tanggal valid
 * Stock C.I      | Coverage Active    | Kosong / bukan tanggal
 * Sell Out L4W   | Coverage Active    | 0-27 hari dari HARI INI
 * AVG SO L4W     | Sell Out L4W       | ÷ 4
 * WOS            | Stock / AVG L4W    | Formula
 * 
 * CATATAN: Apple Charger DIEXCLUDE dari SellOut, Stock, L4W, WOS
 *******************************************************/

// ============================================================
// VERSION INFORMATION - DO NOT MODIFY
// ============================================================
const APP_INFO = Object.freeze({
    VERSION: "1.0.0",
    BUILD_DATE: "2026-07-21",
    ENVIRONMENT: "Production",
    BUSINESS_RULE: "v1.0"
});

// ============================================================
// KONFIGURASI - IMMUTABLE
// ============================================================
const CONFIG = Object.freeze({
  SPREADSHEET_ID: "1IWbT0HpxRdFdcEYvT56MHR0vuZROLUPFg5louZgk-AI",
  SHEET_NAME: "MASTER",
  CACHE_TTL: 45,        // detik
  DEBUG: false          // Ubah ke true untuk debug logging (manual)
});

// Mapping kolom berdasarkan struktur data master
const COL = Object.freeze({
  PERIODE: 0,    // A
  DEPO: 1,       // B
  SERIAL: 2,     // C - Nomor Seri/Produksi
  NOMOR: 3,      // D - Nomor #
  TANGGAL: 4,    // E - Tanggal (SellThru)
  KODE: 5,       // F - Kode #
  BARANG: 6,     // G - Nama Barang (SKU)
  CUSTOMER: 7,   // H - Nama Pelanggan
  SN: 8,         // I - SN
  COVERAGE: 9,   // J - COVERAGE ACTIVE
  STATUS: 10,    // K - Keterangan
  KATEGORI: 11   // L - Kategori Barang
});

// Daftar kategori yang dikecualikan
const EXCLUDED_CATEGORIES = Object.freeze([
  "Apple Charger",
  "APPLE CHARGER",
  "apple charger",
  "charger",
  "Apple Charger 20W"
]);

// Cache dan Lock
const CACHE_KEY = 'DASHBOARD_DATA';
const CACHE = CacheService.getScriptCache();
const LOCK = LockService.getScriptLock();

// Timezone
const TIMEZONE = Session.getScriptTimeZone();

// ============================================================
// DEBUG LOGGING - PRODUCTION MODE (DEBUG=false) NO LOGGING
// ============================================================
function debugLog(message) {
  if (CONFIG.DEBUG) {
    Logger.log(message);
  }
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * ==========================================================
 * IS EXCLUDED CATEGORY
 * Business Rule v1.0
 * Do Not Modify Without Version Increment
 * ==========================================================
 * Cek apakah kategori termasuk excluded
 * @param {string} kategori - Nama kategori
 * @return {boolean} true jika excluded
 */
function isExcludedCategory(kategori) {
  if (!kategori) return false;
  var k = String(kategori).trim().toLowerCase();
  for (var i = 0; i < EXCLUDED_CATEGORIES.length; i++) {
    var excluded = String(EXCLUDED_CATEGORIES[i]).toLowerCase();
    if (k === excluded || k.includes(excluded) || excluded.includes(k)) {
      return true;
    }
  }
  return false;
}

/**
 * ==========================================================
 * PARSE DATE
 * Business Rule v1.0
 * Do Not Modify Without Version Increment
 * ==========================================================
 * Parse tanggal dari berbagai format
 * @param {string|Date} dateStr - Input tanggal
 * @return {Date|null} Date object atau null
 */
function parseDate(dateStr) {
  if (!dateStr) return null;
  if (dateStr instanceof Date) {
    return !isNaN(dateStr.getTime()) ? dateStr : null;
  }
  
  var str = String(dateStr).trim();
  if (str === '' || str === '-' || str === 'N/A' || str === 'undefined' || str === 'null' || str === 'NaN') {
    return null;
  }
  
  // Excel date serial
  var num = parseFloat(str);
  if (!isNaN(num) && num > 1000 && num < 100000) {
    var excelEpoch = new Date(1899, 11, 30);
    var date = new Date(excelEpoch.getTime() + num * 86400000);
    if (!isNaN(date.getTime()) && date.getFullYear() > 2000 && date.getFullYear() < 2100) {
      return date;
    }
  }
  
  // Format: dd-MMM-yyyy (07-Jan-2026) atau dd MMM yyyy
  var months = {
    'jan': 0, 'januari': 0,
    'feb': 1, 'februari': 1,
    'mar': 2, 'maret': 2,
    'apr': 3, 'april': 3,
    'mei': 4, 'may': 4,
    'jun': 5, 'juni': 5,
    'jul': 6, 'juli': 6,
    'agu': 7, 'agustus': 7, 'aug': 7,
    'sep': 8, 'september': 8,
    'okt': 9, 'oktober': 9, 'oct': 9,
    'nov': 10, 'november': 10,
    'des': 11, 'desember': 11, 'dec': 11
  };
  
  var parts = str.trim().split(/[-\s]+/);
  if (parts.length === 3) {
    var day = parseInt(parts[0], 10);
    var monthStr = parts[1].toLowerCase();
    var year = parseInt(parts[2], 10);
    
    var month = null;
    if (months[monthStr] !== undefined) {
      month = months[monthStr];
    } else if (monthStr.length >= 3 && months[monthStr.substring(0, 3)] !== undefined) {
      month = months[monthStr.substring(0, 3)];
    }
    
    if (!isNaN(day) && month !== null && !isNaN(year) && day > 0 && day <= 31) {
      var date = new Date(year, month, day);
      if (!isNaN(date.getTime()) && date.getFullYear() === year) {
        return date;
      }
    }
  }
  
  // Format: DD-MM-YYYY atau DD/MM/YYYY
  parts = str.split(/[-/]/);
  if (parts.length === 3) {
    var day = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10) - 1;
    var year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year) && 
        day > 0 && day <= 31 && month >= 0 && month <= 11 && 
        year >= 2000 && year <= 2100) {
      var date = new Date(year, month, day);
      if (!isNaN(date.getTime()) && date.getFullYear() === year) {
        return date;
      }
    }
  }
  
  // Format: YYYY-MM-DD
  parts = str.split('-');
  if (parts.length === 3) {
    var year = parseInt(parts[0], 10);
    var month = parseInt(parts[1], 10) - 1;
    var day = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year) && 
        day > 0 && day <= 31 && month >= 0 && month <= 11 && 
        year >= 2000 && year <= 2100) {
      var date = new Date(year, month, day);
      if (!isNaN(date.getTime()) && date.getFullYear() === year) {
        return date;
      }
    }
  }
  
  // Last resort
  var date = new Date(str);
  if (!isNaN(date.getTime()) && date.getFullYear() >= 2000 && date.getFullYear() <= 2100) {
    return date;
  }
  
  return null;
}

/**
 * ==========================================================
 * IS COVERAGE VALID
 * Business Rule v1.0
 * Do Not Modify Without Version Increment
 * ==========================================================
 * Cek apakah Coverage Active adalah tanggal valid
 * @param {string} coverageStr - Nilai coverage
 * @return {boolean} true jika tanggal valid
 */
function isCoverageValid(coverageStr) {
  if (!coverageStr) return false;
  var str = String(coverageStr).trim();
  if (str === '' || str === '-' || str === 'N/A' || str === 'undefined' || str === 'null' || str === 'NaN') {
    return false;
  }
  var date = parseDate(str);
  return date !== null;
}

/**
 * ==========================================================
 * FORMAT DATE
 * Business Rule v1.0
 * Do Not Modify Without Version Increment
 * ==========================================================
 * Format tanggal untuk output
 * @param {Date} date - Date object
 * @return {string} Format dd MMM yyyy
 */
function formatDate(date) {
  if (!date) return '-';
  if (typeof date === 'string') return date;
  if (date instanceof Date && !isNaN(date.getTime())) {
    return Utilities.formatDate(date, TIMEZONE, "dd MMM yyyy");
  }
  return '-';
}

/**
 * ==========================================================
 * SANITIZE VALUE
 * Business Rule v1.0
 * Do Not Modify Without Version Increment
 * ==========================================================
 * Sanitize value untuk JSON (mencegah error serialisasi)
 * @param {*} value - Input value
 * @return {*} Sanitized value
 */
function sanitizeValue(value) {
  if (value === undefined) return null;
  if (value === null) return null;
  
  if (value === Infinity || value === -Infinity) {
    return "∞";
  }
  
  if (typeof value === 'number' && isNaN(value)) {
    return null;
  }
  
  if (value instanceof Date) {
    return formatDate(value);
  }
  
  if (typeof value === 'function') {
    return null;
  }
  
  if (typeof value === 'object') {
    if (value instanceof Set) {
      return Array.from(value);
    }
    if (value instanceof Map) {
      var obj = {};
      value.forEach(function(v, k) {
        obj[k] = sanitizeValue(v);
      });
      return obj;
    }
    if (Array.isArray(value)) {
      return value.map(function(item) {
        return sanitizeValue(item);
      });
    }
    var result = {};
    for (var key in value) {
      if (value.hasOwnProperty(key)) {
        result[key] = sanitizeValue(value[key]);
      }
    }
    return result;
  }
  
  return value;
}

/**
 * ==========================================================
 * VALIDATE RESPONSE
 * Business Rule v1.0
 * Do Not Modify Without Version Increment
 * ==========================================================
 * Validasi response sebelum return (DEBUG ONLY)
 * @param {Object} obj - Response object
 * @param {string} label - Label untuk logging
 * @return {boolean} true jika valid
 */
function validateResponse(obj, label) {
  if (!CONFIG.DEBUG) return true;
  debugLog("===== VALIDATE: " + label + " =====");
  try {
    var json = JSON.stringify(obj);
    debugLog("✅ JSON.stringify SUCCESS, length: " + json.length);
    return true;
  } catch (e) {
    debugLog("❌ JSON.stringify FAILED: " + e.toString());
    if (obj && typeof obj === 'object') {
      for (var key in obj) {
        try {
          JSON.stringify(obj[key]);
        } catch (innerError) {
          debugLog("  Problem property: " + key + " (" + typeof obj[key] + ")");
        }
      }
    }
    return false;
  }
}

// ============================================================
// WEB APP ENTRY POINT - PUBLIC
// ============================================================

/**
 * Entry point untuk Web App
 * @return {HtmlOutput} HTML page
 */
function doGet() {
  try {
    return HtmlService
      .createTemplateFromFile("Index")
      .evaluate()
      .setTitle("Apple Coverage Dashboard")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } catch (error) {
    debugLog("[doGet] ERROR: " + error.toString());
    return HtmlService.createHtmlOutput(
      "<h1>Error</h1><p>" + error.toString() + "</p>"
    ).setTitle("Error");
  }
}

/**
 * Include file HTML
 * @param {string} file - Nama file tanpa ekstensi
 * @return {string} Konten file
 */
function include(file) {
  try {
    return HtmlService.createHtmlOutputFromFile(file).getContent();
  } catch (error) {
    debugLog("[include] ERROR: " + error.toString());
    return "";
  }
}

// ============================================================
// LOAD DASHBOARD - PUBLIC
// ============================================================

/**
 * ==========================================================
 * LOAD DASHBOARD
 * Business Rule v1.0
 * Do Not Modify Without Version Increment
 * ==========================================================
 * Load dashboard data dengan cache & lock
 * @return {Object} Response object dengan data dashboard
 */
function loadDashboard() {
  var startTime = Date.now();
  debugLog("[loadDashboard] START");
  
  // Cek cache
  var cached = CACHE.get(CACHE_KEY);
  var cacheStatus = 'MISS';
  if (cached) {
    try {
      var parsed = JSON.parse(cached);
      cacheStatus = 'HIT';
      debugLog("[loadDashboard] ✅ Cache HIT");
      debugLog("[loadDashboard] Execution Time: " + (Date.now() - startTime) + " ms");
      return parsed;
    } catch (e) {
      cacheStatus = 'ERROR';
      debugLog("[loadDashboard] ⚠️ Cache parse error, fetching fresh");
    }
  }
  
  // Lock untuk mencegah proses paralel
  var locked = false;
  try {
    locked = LOCK.tryLock(30000);
    if (!locked) {
      debugLog("[loadDashboard] ⚠️ Lock timeout");
      if (cached) {
        var parsed = JSON.parse(cached);
        debugLog("[loadDashboard] Execution Time: " + (Date.now() - startTime) + " ms");
        return parsed;
      }
      debugLog("[loadDashboard] Execution Time: " + (Date.now() - startTime) + " ms");
      return getEmptyResponse();
    }
    
    debugLog("[loadDashboard] ✅ Lock acquired, fetching fresh");
    
    var result = fetchDashboardData();
    
    // Simpan ke cache
    if (result && result.success) {
      try {
        var jsonString = JSON.stringify(result);
        CACHE.put(CACHE_KEY, jsonString, CONFIG.CACHE_TTL);
        cacheStatus = 'SAVE';
        debugLog("[loadDashboard] ✅ Cache SAVE for " + CONFIG.CACHE_TTL + "s");
      } catch (e) {
        debugLog("[loadDashboard] ⚠️ Cache save error: " + e.toString());
      }
    }
    
    debugLog("[loadDashboard] Cache Status: " + cacheStatus);
    debugLog("[loadDashboard] Execution Time: " + (Date.now() - startTime) + " ms");
    return result;
    
  } catch (error) {
    debugLog("[loadDashboard] ERROR: " + error.toString());
    debugLog("[loadDashboard] Stack: " + error.stack);
    debugLog("[loadDashboard] Execution Time: " + (Date.now() - startTime) + " ms");
    return {
      success: false,
      error: "[loadDashboard] " + error.toString(),
      stack: error.stack
    };
  } finally {
    if (locked) {
      try {
        LOCK.releaseLock();
        debugLog("[loadDashboard] ✅ Lock released");
      } catch (e) {
        debugLog("[loadDashboard] ⚠️ Lock release error: " + e.toString());
      }
    }
  }
}

// ============================================================
// FETCH DASHBOARD DATA - INTERNAL
// ============================================================

/**
 * ==========================================================
 * FETCH DASHBOARD DATA
 * Business Rule v1.0
 * Do Not Modify Without Version Increment
 * ==========================================================
 * Fetch data dari spreadsheet tanpa cache
 * @return {Object} Raw response object
 */
function fetchDashboardData() {
  debugLog("[fetchDashboardData] START");
  
  try {
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sh = ss.getSheetByName(CONFIG.SHEET_NAME);
    
    if (!sh) {
      return { success: false, error: "[fetchDashboardData] Sheet '" + CONFIG.SHEET_NAME + "' tidak ditemukan!" };
    }
    
    var lastRow = sh.getLastRow();
    debugLog("[fetchDashboardData] Last Row: " + lastRow);

    if (lastRow <= 1) {
      return getEmptyResponse();
    }

    var data = sh.getRange(2, 1, lastRow - 1, 12).getValues();
    debugLog("[fetchDashboardData] Data rows: " + data.length);
    
    var result = processDataOptimized(data);
    
    var sanitized = sanitizeValue(result);
    validateResponse(sanitized, "Final Response");
    
    return {
      success: true,
      lastSync: Utilities.formatDate(new Date(), TIMEZONE, "dd MMM yyyy HH:mm:ss"),
      kpi: sanitized.kpi || { sellThru: 0, sellOut: 0, stockCI: 0, avgWOS: 0 },
      filter: sanitized.filter || { depo: [], customer: [], kategori: [] },
      rows: sanitized.rows || [],
      errors: sanitized.errors || { duplicates: [] }
    };

  } catch (error) {
    debugLog("[fetchDashboardData] ERROR: " + error.toString());
    debugLog("[fetchDashboardData] Stack: " + error.stack);
    return {
      success: false,
      error: "[fetchDashboardData] " + error.toString(),
      stack: error.stack
    };
  }
}

// ============================================================
// PROCESS DATA OPTIMIZED - BUSINESS RULE V1.0
// ============================================================

/**
 * ==========================================================
 * PROCESS DATA OPTIMIZED
 * Business Rule v1.0
 * Do Not Modify Without Version Increment
 * ==========================================================
 * Proses data dengan business rule V1.0
 * @param {Array} data - Data dari spreadsheet
 * @return {Object} Result dengan kpi, filter, rows, errors
 */
function processDataOptimized(data) {
  debugLog("[processDataOptimized] START");
  
  try {
    if (!data || data.length === 0) {
      return getEmptyResult();
    }

    // 1. FILTER DATA - Validasi Serial
    var filterResult = filterValidData(data);
    var validData = filterResult.validData;
    var duplicateSerials = filterResult.duplicates;
    
    debugLog("[processDataOptimized] Valid data: " + validData.length);
    debugLog("[processDataOptimized] Duplicates: " + duplicateSerials.length);

    if (validData.length === 0) {
      return getEmptyResult();
    }

    // 2. BUILD GROUP - Kategori & SKU
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    
    var buildResult = buildGroups(validData, today);
    var group = buildResult.group;
    var skuGroup = buildResult.skuGroup;
    var depoSet = buildResult.depoSet;
    var customerSet = buildResult.customerSet;
    var kategoriSet = buildResult.kategoriSet;
    var totals = buildResult.totals;
    
    debugLog("[processDataOptimized] Groups: " + Object.keys(group).length);
    debugLog("[processDataOptimized] SKU Groups: " + Object.keys(skuGroup).length);

    // 3. CALCULATE WOS - Kategori & SKU
    calculateWOS(group);
    calculateWOS(skuGroup);

    // 4. BUILD ROWS
    var rows = buildRows(group, skuGroup);
    
    // 5. CALCULATE AVG WOS DASHBOARD
    var avgWosDashboard = calculateAvgWOS(group);
    debugLog("[processDataOptimized] AVG WOS: " + avgWosDashboard);

    // 6. BUILD FILTER
    var filter = buildFilter(depoSet, customerSet, kategoriSet);

    // 7. BUILD KPI
    var kpi = {
      sellThru: totals.sellThru,
      sellOut: totals.sellOut,
      stockCI: totals.stockCI,
      avgWOS: avgWosDashboard,
      totalDepo: depoSet.size,
      totalCustomer: customerSet.size,
      totalKategori: kategoriSet.size
    };

    // Clear references untuk memory optimization
    var result = {
      kpi: kpi,
      filter: filter,
      rows: rows,
      errors: { duplicates: duplicateSerials }
    };
    
    // Hapus referensi object besar
    group = null;
    skuGroup = null;
    validData = null;
    buildResult = null;
    
    return result;
    
  } catch (error) {
    debugLog("[processDataOptimized] ERROR: " + error.toString());
    throw error;
  }
}

// ============================================================
// HELPER 1: FILTER VALID DATA
// ============================================================

/**
 * ==========================================================
 * FILTER VALID DATA
 * Business Rule v1.0
 * Do Not Modify Without Version Increment
 * ==========================================================
 * Filter data berdasarkan validasi serial
 * @param {Array} data - Raw data dari spreadsheet
 * @return {Object} { validData, duplicates }
 */
function filterValidData(data) {
  var serialMap = {};
  var duplicateSerials = [];
  var validData = [];
  
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    if (!row || row.length === 0) continue;
    
    var serialValue = row[COL.SERIAL] || '';
    var serial = String(serialValue).trim();
    
    if (serial === '' || serial === '-' || serial === 'N/A') {
      continue;
    }
    
    if (serialMap[serial] !== undefined) {
      duplicateSerials.push({ serial: serial, row1: serialMap[serial], row2: i + 2 });
      continue;
    }
    
    serialMap[serial] = i + 2;
    validData.push({ row: row, rowIndex: i + 2 });
  }
  
  serialMap = null;
  
  return {
    validData: validData,
    duplicates: duplicateSerials
  };
}

// ============================================================
// HELPER 2: BUILD GROUPS
// ============================================================

/**
 * ==========================================================
 * BUILD GROUPS
 * Business Rule v1.0
 * Do Not Modify Without Version Increment
 * ==========================================================
 * Build group structure dari valid data
 * @param {Array} validData - Data yang sudah divalidasi
 * @param {Date} today - Tanggal hari ini
 * @return {Object} { group, skuGroup, depoSet, customerSet, kategoriSet, totals }
 */
function buildGroups(validData, today) {
  var group = {};
  var skuGroup = {};
  var depoSet = new Set();
  var customerSet = new Set();
  var kategoriSet = new Set();
  
  var totals = {
    sellThru: 0,
    sellOut: 0,
    stockCI: 0,
    sellOut28: 0
  };
  
  for (var i = 0; i < validData.length; i++) {
    var row = validData[i].row;
    
    var depo = String(row[COL.DEPO] || '').trim();
    var customer = String(row[COL.CUSTOMER] || '').trim();
    var kategori = String(row[COL.KATEGORI] || '').trim();
    var sku = String(row[COL.BARANG] || '').trim();
    var serial = String(row[COL.SERIAL] || '').trim();
    var coverageStr = String(row[COL.COVERAGE] || '').trim();
    var sellThruDate = parseDate(row[COL.TANGGAL]);
    
    if (!depo || !customer || !kategori || !sku) continue;
    if (!sellThruDate) continue;
    
    // SELL THRU
    totals.sellThru++;
    
    var isExcluded = isExcludedCategory(kategori);
    var isValidCoverage = isCoverageValid(coverageStr);
    var coverageDate = isValidCoverage ? parseDate(coverageStr) : null;
    
    // SELL OUT
    if (!isExcluded && isValidCoverage) {
      totals.sellOut++;
    }
    
    // STOCK C.I
    if (!isExcluded && !isValidCoverage) {
      totals.stockCI++;
    }
    
    // SELL OUT L4W (28 hari dari TODAY)
    var isL4W = false;
    if (!isExcluded && isValidCoverage && coverageDate) {
      var diff = (today.getTime() - coverageDate.getTime()) / (1000 * 60 * 60 * 24);
      if (diff >= 0 && diff <= 27) {
        isL4W = true;
        totals.sellOut28++;
      }
    }
    
    depoSet.add(depo);
    customerSet.add(customer);
    kategoriSet.add(kategori);
    
    // GROUP: Depo|Customer|Kategori
    var key = depo + "|" + customer + "|" + kategori;
    
    if (!group[key]) {
      group[key] = {
        depo: depo,
        customer: customer,
        kategori: kategori,
        isExcluded: isExcluded,
        sellThru: 0,
        sellOut: 0,
        stockCI: 0,
        sellOut28: 0,
        avgSellOutL4W: 0,
        wos: 0,
        skuList: {}
      };
    }
    
    var g = group[key];
    g.sellThru++;
    if (!isExcluded && isValidCoverage) g.sellOut++;
    if (!isExcluded && !isValidCoverage) g.stockCI++;
    if (isL4W) g.sellOut28++;
    
    // GROUP: Depo|Customer|Kategori|SKU
    var skuKey = depo + "|" + customer + "|" + kategori + "|" + sku;
    
    if (!skuGroup[skuKey]) {
      skuGroup[skuKey] = {
        depo: depo,
        customer: customer,
        kategori: kategori,
        sku: sku,
        isExcluded: isExcluded,
        sellThru: 0,
        sellOut: 0,
        stockCI: 0,
        sellOut28: 0,
        avgSellOutL4W: 0,
        wos: 0,
        details: []
      };
    }
    
    var sg = skuGroup[skuKey];
    sg.sellThru++;
    if (!isExcluded && isValidCoverage) sg.sellOut++;
    if (!isExcluded && !isValidCoverage) sg.stockCI++;
    if (isL4W) sg.sellOut28++;
    
    sg.details.push({
      imei: serial || '-',
      tanggalSellThru: formatDate(sellThruDate),
      coverage: coverageStr || '-',
      isValidCoverage: isValidCoverage,
      isL4W: isL4W
    });
    
    // SKU List dalam Kategori
    if (!g.skuList[sku]) {
      g.skuList[sku] = {
        nama: sku,
        sellThru: 0,
        sellOut: 0,
        stockCI: 0,
        sellOut28: 0,
        avgSellOutL4W: 0,
        wos: 0
      };
    }
    var gs = g.skuList[sku];
    gs.sellThru++;
    if (!isExcluded && isValidCoverage) gs.sellOut++;
    if (!isExcluded && !isValidCoverage) gs.stockCI++;
    if (isL4W) gs.sellOut28++;
  }
  
  return {
    group: group,
    skuGroup: skuGroup,
    depoSet: depoSet,
    customerSet: customerSet,
    kategoriSet: kategoriSet,
    totals: totals
  };
}

// ============================================================
// HELPER 3: CALCULATE WOS
// ============================================================

/**
 * ==========================================================
 * CALCULATE WOS
 * Business Rule v1.0
 * Do Not Modify Without Version Increment
 * ==========================================================
 * Hitung AVG SellOut L4W dan WOS untuk group
 * @param {Object} group - Group object (kategori atau sku)
 */
function calculateWOS(group) {
  var keys = Object.keys(group);
  for (var i = 0; i < keys.length; i++) {
    var item = group[keys[i]];
    item.avgSellOutL4W = item.sellOut28 > 0 ? Number((item.sellOut28 / 4).toFixed(2)) : 0;
    
    if (!item.isExcluded) {
      if (item.avgSellOutL4W > 0 && item.stockCI > 0) {
        item.wos = Number((item.stockCI / item.avgSellOutL4W).toFixed(2));
      } else if (item.stockCI > 0 && item.sellOut28 === 0) {
        item.wos = "∞";
      } else {
        item.wos = 0;
      }
    } else {
      item.wos = 0;
    }
  }
}

// ============================================================
// HELPER 4: CALCULATE AVG WOS DASHBOARD
// ============================================================

/**
 * ==========================================================
 * CALCULATE AVG WOS
 * Business Rule v1.0
 * Do Not Modify Without Version Increment
 * ==========================================================
 * Hitung AVG WOS untuk dashboard
 * @param {Object} group - Group object
 * @return {number|string} AVG WOS
 */
function calculateAvgWOS(group) {
  var keys = Object.keys(group);
  var totalStockAll = 0;
  var totalSellOut28All = 0;
  
  for (var i = 0; i < keys.length; i++) {
    var g = group[keys[i]];
    if (!g.isExcluded) {
      totalStockAll += g.stockCI;
      totalSellOut28All += g.sellOut28;
    }
  }
  
  if (totalStockAll > 0) {
    if (totalSellOut28All > 0) {
      var avgL4W = totalSellOut28All / 4;
      return Number((totalStockAll / avgL4W).toFixed(2));
    } else {
      return "∞";
    }
  } else {
    return 0;
  }
}

// ============================================================
// HELPER 5: BUILD ROWS
// ============================================================

/**
 * ==========================================================
 * BUILD ROWS
 * Business Rule v1.0
 * Do Not Modify Without Version Increment
 * ==========================================================
 * Build rows untuk response
 * @param {Object} group - Group object
 * @param {Object} skuGroup - SKU Group object
 * @return {Array} Rows array
 */
function buildRows(group, skuGroup) {
  var keys = Object.keys(group);
  var rows = [];
  
  for (var i = 0; i < keys.length; i++) {
    var g = group[keys[i]];
    
    var skuArray = [];
    var skuNames = Object.keys(g.skuList).sort();
    
    for (var j = 0; j < skuNames.length; j++) {
      var skuData = g.skuList[skuNames[j]];
      var avgL4W = skuData.sellOut28 > 0 ? Number((skuData.sellOut28 / 4).toFixed(2)) : 0;
      var wos = 0;
      
      if (!g.isExcluded) {
        if (avgL4W > 0 && skuData.stockCI > 0) {
          wos = Number((skuData.stockCI / avgL4W).toFixed(2));
        } else if (skuData.stockCI > 0 && skuData.sellOut28 === 0) {
          wos = "∞";
        }
      }
      
      var skuKey = g.depo + "|" + g.customer + "|" + g.kategori + "|" + skuNames[j];
      var details = skuGroup[skuKey] ? skuGroup[skuKey].details : [];
      
      skuArray.push({
        nama: skuNames[j],
        sellThru: skuData.sellThru,
        sellOut: skuData.sellOut,
        stockCI: skuData.stockCI,
        sellOut28: skuData.sellOut28 || 0,
        avgSellOutL4W: avgL4W,
        wos: wos,
        details: details
      });
    }
    
    rows.push({
      depo: g.depo,
      customer: g.customer,
      kategori: g.kategori,
      sellThru: g.sellThru,
      sellOut: g.sellOut,
      stockCI: g.stockCI,
      sellOut28: g.sellOut28,
      avgSellOutL4W: g.avgSellOutL4W,
      wos: g.wos,
      isExcluded: g.isExcluded,
      barang: skuArray
    });
  }
  
  // Sort rows - only once
  rows.sort(function(a, b) {
    if (a.depo !== b.depo) return a.depo.localeCompare(b.depo);
    if (a.customer !== b.customer) return a.customer.localeCompare(b.customer);
    return a.kategori.localeCompare(b.kategori);
  });
  
  return rows;
}

// ============================================================
// HELPER 6: BUILD FILTER
// ============================================================

/**
 * ==========================================================
 * BUILD FILTER
 * Business Rule v1.0
 * Do Not Modify Without Version Increment
 * ==========================================================
 * Build filter object untuk frontend
 * @param {Set} depoSet - Set depo
 * @param {Set} customerSet - Set customer
 * @param {Set} kategoriSet - Set kategori
 * @return {Object} Filter object
 */
function buildFilter(depoSet, customerSet, kategoriSet) {
  return {
    depo: Array.from(depoSet).sort(),
    customer: Array.from(customerSet).sort(),
    kategori: Array.from(kategoriSet).sort()
  };
}

// ============================================================
// EMPTY RESPONSE FUNCTIONS
// ============================================================

/**
 * ==========================================================
 * EMPTY RESULT
 * Business Rule v1.0
 * Do Not Modify Without Version Increment
 * ==========================================================
 * Return empty result untuk processData
 * @return {Object} Empty result
 */
function getEmptyResult() {
  return {
    kpi: { sellThru: 0, sellOut: 0, stockCI: 0, avgWOS: 0, totalDepo: 0, totalCustomer: 0, totalKategori: 0 },
    filter: { depo: [], customer: [], kategori: [] },
    rows: [],
    errors: { duplicates: [] }
  };
}

/**
 * ==========================================================
 * EMPTY RESPONSE
 * Business Rule v1.0
 * Do Not Modify Without Version Increment
 * ==========================================================
 * Return empty response untuk loadDashboard
 * @return {Object} Empty response with success true
 */
function getEmptyResponse() {
  return {
    success: true,
    lastSync: Utilities.formatDate(new Date(), TIMEZONE, "dd MMM yyyy HH:mm:ss"),
    kpi: { sellThru: 0, sellOut: 0, stockCI: 0, avgWOS: 0, totalDepo: 0, totalCustomer: 0, totalKategori: 0 },
    filter: { depo: [], customer: [], kategori: [] },
    rows: [],
    errors: { duplicates: [] }
  };
}

// ============================================================
// DEVELOPMENT ONLY - TEST FUNCTIONS
// ============================================================

/**
 * ==========================================================
 * TEST DASHBOARD - DEVELOPMENT ONLY
 * Business Rule v1.0
 * Do Not Modify Without Version Increment
 * ==========================================================
 * Test dashboard - DEVELOPMENT ONLY
 * @return {Object} Dashboard response
 */
function testDashboard() {
  var result = loadDashboard();
  if (!result.success) {
    debugLog("[testDashboard] ERROR: " + result.error);
  } else {
    debugLog("[testDashboard] SUCCESS - Rows: " + result.rows.length);
    debugLog("[testDashboard] KPI: " + JSON.stringify(result.kpi));
  }
  return result;
}

/**
 * ==========================================================
 * FORCE RUN - DEVELOPMENT ONLY
 * Business Rule v1.0
 * Do Not Modify Without Version Increment
 * ==========================================================
 * Force run - DEVELOPMENT ONLY
 * @return {Object} Dashboard response
 */
function forceRun() {
  debugLog("[forceRun] === START ===");
  var result = testDashboard();
  debugLog("[forceRun] === DONE ===");
  return result;
}

/**
 * ==========================================================
 * CLEAR CACHE - DEVELOPMENT ONLY
 * Business Rule v1.0
 * Do Not Modify Without Version Increment
 * ==========================================================
 * Clear cache - DEVELOPMENT ONLY
 */
function clearCache() {
  CACHE.remove(CACHE_KEY);
  debugLog("[clearCache] ✅ Cache cleared");
}

// ============================================================
// END OF FILE - APPLE COVERAGE DASHBOARD v1.0
// ============================================================
