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

const CONFIG = {
  SPREADSHEET_ID: "1IWbT0HpxRdFdcEYvT56MHR0vuZROLUPFg5louZgk-AI",
  SHEET_NAME: "MASTER"
};

// Mapping kolom berdasarkan struktur data master
const COL = {
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
};

// Daftar kategori yang dikecualikan
const EXCLUDED_CATEGORIES = [
  "Apple Charger",
  "APPLE CHARGER",
  "apple charger",
  "charger",
  "Apple Charger 20W"
];

/*******************************************************
 * UTILITY FUNCTIONS
 *******************************************************/

// Cek apakah kategori termasuk excluded
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

// Parse tanggal dari berbagai format
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

// Cek apakah Coverage Active adalah tanggal valid
function isCoverageValid(coverageStr) {
  if (!coverageStr) return false;
  var str = String(coverageStr).trim();
  if (str === '' || str === '-' || str === 'N/A' || str === 'undefined' || str === 'null' || str === 'NaN') {
    return false;
  }
  var date = parseDate(str);
  return date !== null;
}

// Sanitize value untuk JSON
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
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
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

function validateResponse(obj, label) {
  Logger.log("===== VALIDATE: " + label + " =====");
  try {
    var json = JSON.stringify(obj);
    Logger.log("✅ JSON.stringify SUCCESS, length: " + json.length);
    return true;
  } catch (e) {
    Logger.log("❌ JSON.stringify FAILED: " + e.toString());
    if (obj && typeof obj === 'object') {
      for (var key in obj) {
        try {
          JSON.stringify(obj[key]);
        } catch (innerError) {
          Logger.log("  Problem property: " + key + " (" + typeof obj[key] + ")");
        }
      }
    }
    return false;
  }
}

/*******************************************************
 * WEB APP ENTRY POINT
 *******************************************************/

function doGet() {
  try {
    return HtmlService
      .createTemplateFromFile("Index")
      .evaluate()
      .setTitle("Apple Coverage Dashboard")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  } catch (error) {
    Logger.log("doGet ERROR: " + error.toString());
    return HtmlService.createHtmlOutput(
      "<h1>Error</h1><p>" + error.toString() + "</p>"
    ).setTitle("Error");
  }
}

function include(file) {
  try {
    return HtmlService.createHtmlOutputFromFile(file).getContent();
  } catch (error) {
    Logger.log("include ERROR: " + error.toString());
    return "";
  }
}

/*******************************************************
 * LOAD DASHBOARD
 *******************************************************/

function loadDashboard() {
  Logger.log("=== loadDashboard START ===");
  
  try {
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sh = ss.getSheetByName(CONFIG.SHEET_NAME);
    
    if (!sh) {
      return { success: false, error: "Sheet '" + CONFIG.SHEET_NAME + "' tidak ditemukan!" };
    }
    
    var lastRow = sh.getLastRow();
    Logger.log("Last Row: " + lastRow);

    if (lastRow <= 1) {
      return getEmptyResponse();
    }

    var data = sh.getRange(2, 1, lastRow - 1, 12).getValues();
    Logger.log("Data rows: " + data.length);
    
    var result = processData(data);
    
    var sanitized = sanitizeValue(result);
    validateResponse(sanitized, "Final Response");
    
    return {
      success: true,
      lastSync: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd MMM yyyy HH:mm:ss"),
      kpi: sanitized.kpi || { sellThru: 0, sellOut: 0, stockCI: 0, avgWOS: 0 },
      filter: sanitized.filter || { depo: [], customer: [], kategori: [] },
      rows: sanitized.rows || [],
      errors: sanitized.errors || { duplicates: [] }
    };

  } catch (error) {
    Logger.log("loadDashboard ERROR: " + error.toString());
    Logger.log("Stack: " + error.stack);
    return {
      success: false,
      error: error.toString(),
      stack: error.stack
    };
  }
}

/*******************************************************
 * PROCESS DATA - BUSINESS RULE V1.0
 *******************************************************/

function processData(data) {
  Logger.log("=== processData START ===");
  
  try {
    if (!data || data.length === 0) {
      return getEmptyResult();
    }

    // Validasi Serial - pakai COL.SERIAL (Nomor Seri/Produksi)
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

    Logger.log("Valid data: " + validData.length);
    Logger.log("Duplicates: " + duplicateSerials.length);

    if (validData.length === 0) {
      return getEmptyResult();
    }

    var today = new Date();
    today.setHours(0, 0, 0, 0);
    
    var group = {};
    var skuGroup = {};
    var depoSet = new Set();
    var customerSet = new Set();
    var kategoriSet = new Set();
    
    var totalSellThru = 0;
    var totalSellOut = 0;
    var totalStockCI = 0;
    var totalSellOut28 = 0;
    var processedCount = 0;
    
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
      
      processedCount++;
      
      // SELL THRU
      totalSellThru++;
      
      var isExcluded = isExcludedCategory(kategori);
      var isValidCoverage = isCoverageValid(coverageStr);
      var coverageDate = isValidCoverage ? parseDate(coverageStr) : null;
      
      // SELL OUT
      if (!isExcluded && isValidCoverage) {
        totalSellOut++;
      }
      
      // STOCK C.I
      if (!isExcluded && !isValidCoverage) {
        totalStockCI++;
      }
      
      // SELL OUT L4W (28 hari dari TODAY)
      var isL4W = false;
      if (!isExcluded && isValidCoverage && coverageDate) {
        var diff = (today.getTime() - coverageDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diff >= 0 && diff <= 27) {
          isL4W = true;
          totalSellOut28++;
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
        tanggalSellThru: Utilities.formatDate(sellThruDate, Session.getScriptTimeZone(), "dd MMM yyyy"),
        coverage: coverageStr || '-',
        isValidCoverage: isValidCoverage,
        isL4W: isL4W
      });
      
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
    
    Logger.log("Processed: " + processedCount);
    Logger.log("Stock CI: " + totalStockCI);
    Logger.log("Sell Out: " + totalSellOut);
    Logger.log("Sell Out 28: " + totalSellOut28);
    
    // HITUNG L4W & WOS - KATEGORI
    var groupKeys = Object.keys(group);
    for (var i = 0; i < groupKeys.length; i++) {
      var g = group[groupKeys[i]];
      g.avgSellOutL4W = g.sellOut28 > 0 ? Number((g.sellOut28 / 4).toFixed(2)) : 0;
      
      if (!g.isExcluded) {
        if (g.avgSellOutL4W > 0 && g.stockCI > 0) {
          g.wos = Number((g.stockCI / g.avgSellOutL4W).toFixed(2));
        } else if (g.stockCI > 0 && g.sellOut28 === 0) {
          g.wos = "∞";
        } else {
          g.wos = 0;
        }
      } else {
        g.wos = 0;
      }
    }
    
    // HITUNG L4W & WOS - SKU
    var skuKeys = Object.keys(skuGroup);
    for (var i = 0; i < skuKeys.length; i++) {
      var sg = skuGroup[skuKeys[i]];
      sg.avgSellOutL4W = sg.sellOut28 > 0 ? Number((sg.sellOut28 / 4).toFixed(2)) : 0;
      
      if (!sg.isExcluded) {
        if (sg.avgSellOutL4W > 0 && sg.stockCI > 0) {
          sg.wos = Number((sg.stockCI / sg.avgSellOutL4W).toFixed(2));
        } else if (sg.stockCI > 0 && sg.sellOut28 === 0) {
          sg.wos = "∞";
        } else {
          sg.wos = 0;
        }
      } else {
        sg.wos = 0;
      }
    }
    
    // ============================================================
    // AVG WOS DASHBOARD - BUSINESS RULE LOCKED
    // WOS = Total Stock / (Total SellOut L4W / 4)
    // 
    // LOGIKA:
    // - Jika ada Stock dan ada SellOut L4W → WOS = Stock / (SellOut28 / 4)
    // - Jika ada Stock dan TIDAK ada SellOut L4W → WOS = ∞ (stok tidak bergerak)
    // - Jika tidak ada Stock → WOS = 0
    // ============================================================
    var avgWosDashboard = 0;
    var totalStockAll = 0;
    var totalSellOut28All = 0;

    for (var i = 0; i < groupKeys.length; i++) {
      var g = group[groupKeys[i]];
      if (!g.isExcluded) {
        totalStockAll += g.stockCI;
        totalSellOut28All += g.sellOut28;
      }
    }

    if (totalStockAll > 0) {
      // Ada stock
      if (totalSellOut28All > 0) {
        // Ada penjualan dalam 28 hari terakhir
        var avgL4W = totalSellOut28All / 4;
        avgWosDashboard = Number((totalStockAll / avgL4W).toFixed(2));
      } else {
        // Ada stock tapi TIDAK ADA penjualan dalam 28 hari terakhir
        avgWosDashboard = "∞";
      }
    } else {
      // Tidak ada stock
      avgWosDashboard = 0;
    }

    Logger.log("AVG WOS Dashboard:");
    Logger.log("  Total Stock: " + totalStockAll);
    Logger.log("  Total SellOut28: " + totalSellOut28All);
    Logger.log("  Avg L4W: " + (totalSellOut28All > 0 ? (totalSellOut28All / 4) : 0));
    Logger.log("  Avg WOS: " + avgWosDashboard);
    
    // BUILD RESPONSE
    var rows = [];
    for (var i = 0; i < groupKeys.length; i++) {
      var g = group[groupKeys[i]];
      
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
    
    rows.sort(function(a, b) {
      if (a.depo !== b.depo) return a.depo.localeCompare(b.depo);
      if (a.customer !== b.customer) return a.customer.localeCompare(b.customer);
      return a.kategori.localeCompare(b.kategori);
    });
    
    return {
      kpi: {
        sellThru: totalSellThru,
        sellOut: totalSellOut,
        stockCI: totalStockCI,
        avgWOS: avgWosDashboard,
        totalDepo: depoSet.size,
        totalCustomer: customerSet.size,
        totalKategori: kategoriSet.size
      },
      filter: {
        depo: Array.from(depoSet).sort(),
        customer: Array.from(customerSet).sort(),
        kategori: Array.from(kategoriSet).sort()
      },
      rows: rows,
      errors: { duplicates: duplicateSerials }
    };
    
  } catch (error) {
    Logger.log("processData ERROR: " + error.toString());
    throw error;
  }
}

function getEmptyResult() {
  return {
    kpi: { sellThru: 0, sellOut: 0, stockCI: 0, avgWOS: 0, totalDepo: 0, totalCustomer: 0, totalKategori: 0 },
    filter: { depo: [], customer: [], kategori: [] },
    rows: [],
    errors: { duplicates: [] }
  };
}

function getEmptyResponse() {
  return {
    success: true,
    lastSync: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd MMM yyyy HH:mm:ss"),
    kpi: { sellThru: 0, sellOut: 0, stockCI: 0, avgWOS: 0, totalDepo: 0, totalCustomer: 0, totalKategori: 0 },
    filter: { depo: [], customer: [], kategori: [] },
    rows: [],
    errors: { duplicates: [] }
  };
}

/*******************************************************
 * TEST FUNCTIONS
 *******************************************************/

function testDashboard() {
  var result = loadDashboard();
  if (!result.success) {
    Logger.log("ERROR: " + result.error);
  } else {
    Logger.log("SUCCESS - Rows: " + result.rows.length);
    Logger.log("KPI: " + JSON.stringify(result.kpi));
  }
  return result;
}

function forceRun() {
  Logger.log("=== FORCE RUN ===");
  var result = testDashboard();
  Logger.log("=== DONE ===");
  return result;
}
