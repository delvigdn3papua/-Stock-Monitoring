/*******************************************************
 * =========================================================
 * APPLE COVERAGE DASHBOARD - CONFIG
 * 
 * Production Final v1.0.0
 * Business Rule Locked
 * 
 * Do not change configuration without version upgrade.
 * =========================================================
 *******************************************************/

// ============================================================
// VERSION INFORMATION - DO NOT MODIFY
// ============================================================
const APP_INFO = Object.freeze({
    NAME: "Apple Coverage Monitoring",
    VERSION: "1.0.0",
    BUILD_DATE: "2026-07-21",
    ENVIRONMENT: "Production",
    BUSINESS_RULE: "v1.0"
});

// ============================================================
// APPLICATION CONFIGURATION - DO NOT MODIFY
// ============================================================
const CONFIG = Object.freeze({
    SPREADSHEET_ID: "1IWbT0HpxRdFdcEYvT56MHR0vuZROLUPFg5louZgk-AI",
    SHEET_NAME: "MASTER",
    CACHE_TTL: 45,        // detik
    DEBUG: false          // Ubah ke true untuk debug logging (manual)
});

// ============================================================
// COLUMN MAPPING - DO NOT MODIFY
// ============================================================
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

// ============================================================
// EXCLUDED CATEGORIES - DO NOT MODIFY
// ============================================================
const EXCLUDED_CATEGORIES = Object.freeze([
    "Apple Charger",
    "APPLE CHARGER",
    "apple charger",
    "charger",
    "Apple Charger 20W"
]);

// ============================================================
// CACHE & LOCK KEYS - DO NOT MODIFY
// ============================================================
const CACHE_KEY = 'DASHBOARD_DATA';
const CACHE = CacheService.getScriptCache();
const LOCK = LockService.getScriptLock();

// ============================================================
// TIMEZONE - DO NOT MODIFY
// ============================================================
const TIMEZONE = Session.getScriptTimeZone();

// ============================================================
// END OF CONFIG.GS
// ============================================================
