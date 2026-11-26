# Por Inventariar Feature - Inventory Implementation Guide

## Overview

New "Por Inventariar" (Pending Inventory) feature added to the Conteo de Inventario system. Shows products that have NOT been inventoried in the current month for each store branch.

## Components Added

### 1. Frontend Changes - InventarioContent.tsx

#### New View Type

- Added `"pending-inventory"` to the View type union

#### New State Variables

```typescript
// Pending inventory state
const [pendingProducts, setPendingProducts] = useState<any[]>([]);
const [pendingLoading, setPendingLoading] = useState(false);
const [pendingFilters, setPendingFilters] = useState({
  mainCategory: "",
  subCategory: "",
  brand: "",
  attributes: [] as string[],
});
const [pendingSearchQuery, setPendingSearchQuery] = useState("");
const [showPendingFilterModal, setShowPendingFilterModal] = useState(false);
const pendingFilterDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
  null,
);
```

#### New Functions

**fetchPendingProducts()**

- Fetches products not inventoried in the current month
- Supports filtering by: mainCategory, subCategory, brand, attributes
- Supports search query

**handleViewPendingInventory(store)**

- Navigates to the pending-inventory view
- Initializes filters and categories

**handleExportPendingPDF()**

- Exports pending inventory list as CSV
- Organized by category
- Includes: Product title, SKU, Variation, Category

#### UI Components

**Store Card Button**

- Added orange "Por inventariar" button next to Reportes button
- Disabled state respects save operations
- Leads to pending-inventory view

**Pending Inventory View**

- Shows products organized by category
- Product cards display: image, title, variation, SKU, subcategory
- Includes filter modal (category, subcategory, brand, attributes)
- Search functionality with debounce
- CSV export button

**Filter Modal**

- Same structure as the scanning filter modal
- Supports: mainCategory, subCategory, brand, attributes
- Clear and Apply buttons

#### Debounce Effect

- Added debounce for pending inventory search queries
- Triggers fetchPendingProducts with current filters

### 2. Backend API - /api/admin/inventory-check/pending-inventory

#### Endpoint Details

- **Method**: GET
- **Route**: `/api/admin/inventory-check/pending-inventory`
- **Query Parameters**:
  - `storeId` (required): Store ID to filter by
  - `mainCategory` (optional): Main category ID
  - `subCategory` (optional): Sub category ID
  - `brand` (optional): Brand ID
  - `attributes` (optional): Comma-separated attribute IDs
  - `search` (optional): Search query for product title/SKU/ASIN

#### Authorization

- Requires authentication via NextAuth
- Allowed roles: manager, super_admin, director, organizer

#### Logic Flow

1. Gets current month date range (Mexico timezone)
2. Finds all finalized inventory sessions for the store this month
3. Collects all variation IDs that were inventoried
4. Queries products matching filters
5. Filters out variations that were already inventoried
6. Groups results by category
7. Returns products with variations and grouped data

#### Response Format

```typescript
{
  products: Product[],           // Array of products with pending variations
  groupedByCategory: Object,     // Products grouped by category name
  totalProducts: number,         // Count of products
  totalVariations: number        // Count of pending variations
}
```

## User Flow

### To Access Pending Inventory

1. Navigate to "Conteo de Inventario"
2. Select a store from the store-select view
3. Click the orange "Por inventariar" button
4. View shows all products not inventoried in the current month

### To Filter

1. Click "Filtros" button
2. Select from:
   - Category (Main)
   - Subcategory
   - Brand
   - Attributes
   - Search query
3. Click "Aplicar" to filter
4. Click "Limpiar" to reset filters

### To Export

1. Click "Descargar CSV" button
2. CSV file downloads with current filtered products
3. File organized by category with: Product, SKU, Variation columns

## Data Model

### StoreInventory

- Used to track what's been inventoried in finalized sessions
- Required for checking what hasn't been counted

### InventoryCheckSession

- Finalized sessions store scanned items with variation IDs
- Monthly finalized sessions used to determine what's been inventoried

### Product & Variation

- Product documents contain variations
- Each variation has: title, sku, asin, price, etc.

## Performance Considerations

- Fetches all products matching filters (may need pagination for large catalogs)
- Uses `.lean()` for efficient queries
- Groups results in-memory on backend
- Debounce on frontend search prevents excessive requests

## Future Enhancements

- Add pagination for large product lists
- Add ability to quickly add pending items to a new inventory session
- Display low-stock warnings
- Add print functionality for pending inventory
- Track inventory gaps/trends over time
