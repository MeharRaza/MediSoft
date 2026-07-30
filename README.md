# MediSoft Pro - Pharmacy Management System

**Version:** 1.3.8  
**Built with:** Electron + React + Vite + SQLite

A comprehensive pharmacy management system designed for medical stores in Pakistan.

---

## 🚀 Features

### Sales Management
- **Fast Billing (POS)** - Lightning-fast point of sale with keyboard shortcuts
- Sales History & Returns
- Customer Management
- Quotations
- Auto-hold bills system

### Purchase Management
- Quick Purchase Entry with auto-fill
- Purchase History & Returns
- Supplier Management
- Purchase Orders
- Company-based product filtering

### Inventory Management
- Product Management with batch tracking
- Stock Adjustment & Transfer
- Expiry Date Tracking & Alerts
- Low Stock Alerts
- Barcode Support

### Accounts & Reports
- Dashboard Overview
- Ledger Management
- Vouchers (Payment/Receipt)
- Recovery Management
- Sales, Purchase, Stock Reports
- Profit & Loss Reports

### Additional Features
- Multi-user with role-based access
- Automatic database backup
- 80mm thermal receipt printing
- Complete keyboard navigation
- Alt-based menu system

---

## ⌨️ Keyboard Shortcuts

### Fast Billing
- `Ctrl+S` - Quick save (no invoice)
- `Ctrl+P` - Save + print invoice
- `Ctrl+I` - Jump to search bar
- `Ctrl+F` - Jump to flat discount
- `Ctrl+T` - Jump to percent discount
- `Ctrl+←/→` - Navigate held bills
- `Enter` - Move to next field
- `Arrow Keys` - Navigate cart table

### Global Navigation
- `Alt` - Activate sidebar navigation
- `Alt + [Letter]` - Jump to menu section
- `Ctrl+K` - Show keyboard shortcuts help
- `Ctrl+Tab` - Cycle through visited pages

---

## 🛠️ Tech Stack

- **Frontend:** React 19, React Router, Zustand
- **UI:** TailwindCSS 4, Lucide Icons
- **Backend:** Electron 42, Node.js
- **Database:** SQLite (better-sqlite3)
- **Build:** Vite 8, electron-builder
- **Charts:** Recharts

---

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Windows 10/11 (primary target)

### Development Setup

```bash
# Install dependencies
npm install

# Rebuild native modules
npm run rebuild

# Run in development mode
npm run electron:dev

# Build for production
npm run dist
```

### Production Build

```bash
# Build installer
npm run dist

# Output: release/MediSoft Pro Setup 1.3.8.exe
```

---

## 📁 Project Structure

```
medisoft-pro/
├── electron/              # Electron main process
│   ├── main.js           # Main entry point
│   ├── preload.js        # Preload script
│   ├── database.js       # SQLite database setup
│   └── ipc/              # IPC handlers
│       ├── sales.js
│       ├── purchase.js
│       ├── inventory.js
│       ├── accounts.js
│       ├── hrm.js
│       ├── reports.js
│       └── settings.js
├── src/                  # React application
│   ├── components/       # Reusable components
│   ├── pages/            # Page components
│   ├── store/            # Zustand stores
│   ├── lib/              # Utilities
│   └── App.jsx           # Root component
├── data/                 # SQLite database
│   ├── medisoft.db       # Main database
│   └── backups/          # Automatic backups
├── public/               # Static assets
└── release/              # Build output
```

---

## 🗄️ Database Schema

### Main Tables
- `products` - Medicine inventory
- `categories` - Product categories
- `purchase_items` - Purchase entry items with batches
- `purchases` - Purchase invoices
- `sale_items` - Sales transaction items
- `sales` - Sales invoices
- `customers` - Customer records
- `suppliers` - Supplier records
- `users` - System users
- `branches` - Store branches

---

## 🔒 Security Features

- User authentication
- Role-based access control
- Automatic session management
- Secure database storage
- Input validation and sanitization

---

## 📊 Reports Available

1. **Sales Reports** - Daily, monthly, custom date range
2. **Purchase Reports** - Supplier-wise, date-wise
3. **Stock Reports** - Current stock, low stock alerts
4. **Profit & Loss** - Period-wise profit analysis
5. **Expiry Reports** - Items expiring soon
6. **Customer Ledger** - Outstanding balances
7. **Supplier Ledger** - Payment tracking

---

## 🖨️ Printing

- 80mm thermal receipt support
- Customizable invoice format
- Store information included
- Return policy footer

**Store Details:**
- Harmain Medical Store
- Opposite Nadra Kiosik Main Bazar Raiwind
- Phone: 03228684603

---

## 📝 Version History

### v1.3.8 (Current)
- Auto-select on focus for input fields
- Purchase price visible in Fast Billing dropdown
- Pcs/box badge in product search
- Ctrl+S quick save & Ctrl+P print save
- Ctrl+I search jump shortcut
- 80mm thermal invoice format
- Auto-fill company name in purchase entry
- Fixed duplicate held bills bug
- Removed OCR features (temporary)

### v1.3.7
- F-key shortcuts replaced with Alt-based navigation
- Ctrl+Tab page cycling
- Payment method removed from purchase entry
- Keyboard navigation enhancements

[See CHANGELOG-v1.3.8.md for detailed changes]

---

## 🐛 Known Issues

None - All major bugs fixed in v1.3.8

---

## 🔮 Roadmap

- [ ] OCR invoice scanner (reimplementation)
- [ ] Multi-branch sync
- [ ] Mobile app (React Native)
- [ ] Cloud backup option
- [ ] WhatsApp invoice sharing
- [ ] SMS notifications
- [ ] Analytics dashboard

---

## 📄 License

Proprietary - All rights reserved

---

## 👥 Support

For support, contact the development team.

**Developed for:** Harmain Medical Store, Raiwind  
**Version:** 1.3.8  
**Last Updated:** July 29, 2026
