# 🍎 Apple Coverage Monitoring Dashboard

Dashboard monitoring operasional untuk memantau Coverage, Stock, Sell Thru, Sell Out, WOS (Week of Supply), Duplicate IMEI, dan kondisi OOS secara real-time menggunakan Google Sheets, Google Apps Script, dan GitHub Pages.

---

## ✨ Features

- 📊 Dashboard Desktop
- 📱 Mobile Dashboard
- 🌙 Dark Mode
- 🔄 Auto Refresh (60 detik)
- 🔔 Data Synchronization Notification
- ⚠️ Duplicate IMEI Detection
- 📦 OOS (Out of Stock) Monitoring
- 🟠 Low Stock Monitoring
- 📈 WOS (Week of Supply) Analysis
- 📋 Top 5 Worst WOS
- 🔍 Search & Filter
- 📱 Responsive Design
- 🚀 Auto Device Detection (Desktop/Mobile)

---

## 🏗️ Project Structure

```
Apple-Coverage-Monitoring
│
├── Dashboard.html      # Desktop Dashboard
├── mobile.html         # Mobile Dashboard
├── index.html          # Auto Redirect
├── code.gs             # Google Apps Script Backend
└── README.md
```

---

## ⚙️ Technology Stack

- HTML5
- CSS3
- JavaScript (ES6)
- Bootstrap 5
- Google Apps Script
- Google Sheets
- GitHub Pages

---

## 🔄 Architecture

```
Google Spreadsheet (MASTER)
            │
            ▼
       Google Apps Script
            │
      CacheService
            │
      loadDashboard()
            │
         JSON Response
            │
     ┌───────────────┐
     ▼               ▼
Dashboard.html   mobile.html
        ▲
        │
   index.html
```

---

## 📊 Business Metrics

Dashboard menghitung:

- Sell Thru
- Sell Out
- Stock C.I
- Sell Out L4W
- Average Sell Out L4W
- WOS (Week of Supply)
- OOS Monitoring
- Low Stock
- Duplicate IMEI
- Aging Stock

---

## 🚀 Deployment

### Backend

Deploy Google Apps Script sebagai Web App.

### Frontend

Deploy repository menggunakan GitHub Pages.

---

## 📱 Device Support

| Device | Status |
|---------|--------|
| Desktop | ✅ |
| Laptop | ✅ |
| Tablet | ✅ |
| Android | ✅ |
| iPhone | ✅ |

---

## 🌙 Supported Features

- Auto Refresh
- Smart Redirect
- Dark Mode
- Duplicate Detection
- Change Detection
- OOS Badge
- Low Stock Badge
- Responsive UI

---

## 📌 Version

Current Version

```
v1.0.0
```

Release Date

```
July 2026
```

---

## 📄 License

Internal Project

Copyright © 2026

---

## 👨‍💻 Developed By

Apple Coverage Monitoring Project

Production Release v1.0
