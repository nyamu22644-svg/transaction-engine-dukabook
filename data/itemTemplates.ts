import { BusinessType } from '../types';

export interface ItemTemplate {
  item_name: string;
  barcode: string;
  buying_price: number;
  unit_price: number;
  current_stock: number;
  low_stock_threshold: number;
  category?: string;
}

// EAN-13 format barcodes (common in Kenya)
// Starting with 690-699 for demonstration purposes

export const HARDWARE_ITEMS: ItemTemplate[] = [
  { item_name: 'Cement Bamburi 50kg', barcode: '6901234567001', buying_price: 680, unit_price: 750, current_stock: 50, low_stock_threshold: 10, category: 'Building' },
  { item_name: 'Cement Simba 50kg', barcode: '6901234567002', buying_price: 700, unit_price: 780, current_stock: 40, low_stock_threshold: 10, category: 'Building' },
  { item_name: 'Nails 4 inch (1kg)', barcode: '6901234567003', buying_price: 180, unit_price: 220, current_stock: 100, low_stock_threshold: 20, category: 'Fasteners' },
  { item_name: 'Nails 3 inch (1kg)', barcode: '6901234567004', buying_price: 170, unit_price: 210, current_stock: 100, low_stock_threshold: 20, category: 'Fasteners' },
  { item_name: 'Nails 2 inch (1kg)', barcode: '6901234567005', buying_price: 160, unit_price: 200, current_stock: 100, low_stock_threshold: 20, category: 'Fasteners' },
  { item_name: 'Paint Crown White 20L', barcode: '6901234567006', buying_price: 3200, unit_price: 3800, current_stock: 20, low_stock_threshold: 5, category: 'Paints' },
  { item_name: 'Paint Crown White 4L', barcode: '6901234567007', buying_price: 850, unit_price: 1000, current_stock: 30, low_stock_threshold: 8, category: 'Paints' },
  { item_name: 'Paint Sadolin Varnish 4L', barcode: '6901234567008', buying_price: 2800, unit_price: 3200, current_stock: 15, low_stock_threshold: 5, category: 'Paints' },
  { item_name: 'PVC Pipe 4inch (3m)', barcode: '6901234567009', buying_price: 450, unit_price: 550, current_stock: 40, low_stock_threshold: 10, category: 'Plumbing' },
  { item_name: 'PVC Pipe 3inch (3m)', barcode: '6901234567010', buying_price: 350, unit_price: 420, current_stock: 40, low_stock_threshold: 10, category: 'Plumbing' },
  { item_name: 'PVC Pipe 2inch (3m)', barcode: '6901234567011', buying_price: 220, unit_price: 280, current_stock: 50, low_stock_threshold: 10, category: 'Plumbing' },
  { item_name: 'PVC Elbow 4inch', barcode: '6901234567012', buying_price: 85, unit_price: 120, current_stock: 60, low_stock_threshold: 15, category: 'Plumbing' },
  { item_name: 'PVC Tee 4inch', barcode: '6901234567013', buying_price: 120, unit_price: 160, current_stock: 40, low_stock_threshold: 10, category: 'Plumbing' },
  { item_name: 'Iron Sheet 30 Gauge', barcode: '6901234567014', buying_price: 650, unit_price: 780, current_stock: 100, low_stock_threshold: 20, category: 'Roofing' },
  { item_name: 'Iron Sheet 28 Gauge', barcode: '6901234567015', buying_price: 750, unit_price: 880, current_stock: 80, low_stock_threshold: 15, category: 'Roofing' },
  { item_name: 'Roofing Nails (1kg)', barcode: '6901234567016', buying_price: 250, unit_price: 320, current_stock: 50, low_stock_threshold: 10, category: 'Roofing' },
  { item_name: 'Timber 2x4 (12ft)', barcode: '6901234567017', buying_price: 380, unit_price: 450, current_stock: 60, low_stock_threshold: 15, category: 'Timber' },
  { item_name: 'Timber 2x6 (12ft)', barcode: '6901234567018', buying_price: 520, unit_price: 620, current_stock: 40, low_stock_threshold: 10, category: 'Timber' },
  { item_name: 'Plywood 8x4 (9mm)', barcode: '6901234567019', buying_price: 1800, unit_price: 2100, current_stock: 25, low_stock_threshold: 5, category: 'Timber' },
  { item_name: 'Binding Wire (1kg)', barcode: '6901234567020', buying_price: 180, unit_price: 240, current_stock: 40, low_stock_threshold: 10, category: 'Building' },
  { item_name: 'Wheelbarrow', barcode: '6901234567021', buying_price: 4500, unit_price: 5500, current_stock: 8, low_stock_threshold: 2, category: 'Tools' },
  { item_name: 'Jembe (Hoe)', barcode: '6901234567022', buying_price: 450, unit_price: 600, current_stock: 20, low_stock_threshold: 5, category: 'Tools' },
  { item_name: 'Spade', barcode: '6901234567023', buying_price: 380, unit_price: 500, current_stock: 20, low_stock_threshold: 5, category: 'Tools' },
  { item_name: 'Padlock 50mm', barcode: '6901234567024', buying_price: 350, unit_price: 450, current_stock: 30, low_stock_threshold: 8, category: 'Security' },
  { item_name: 'Door Lock Set', barcode: '6901234567025', buying_price: 800, unit_price: 1100, current_stock: 15, low_stock_threshold: 5, category: 'Security' },
  { item_name: 'Hinges 4inch (pair)', barcode: '6901234567026', buying_price: 120, unit_price: 180, current_stock: 40, low_stock_threshold: 10, category: 'Doors' },
  { item_name: 'Door Handle Set', barcode: '6901234567027', buying_price: 450, unit_price: 600, current_stock: 20, low_stock_threshold: 5, category: 'Doors' },
  { item_name: 'Electric Cable 2.5mm (100m)', barcode: '6901234567028', buying_price: 4800, unit_price: 5600, current_stock: 10, low_stock_threshold: 3, category: 'Electrical' },
  { item_name: 'Switch Socket', barcode: '6901234567029', buying_price: 150, unit_price: 220, current_stock: 50, low_stock_threshold: 15, category: 'Electrical' },
  { item_name: 'Bulb LED 9W', barcode: '6901234567030', buying_price: 120, unit_price: 180, current_stock: 60, low_stock_threshold: 15, category: 'Electrical' },
];

export const COSMETICS_ITEMS: ItemTemplate[] = [
  { item_name: 'Nivea Body Lotion 400ml', barcode: '6902345678001', buying_price: 450, unit_price: 580, current_stock: 30, low_stock_threshold: 8, category: 'Body Care' },
  { item_name: 'Vaseline Petroleum Jelly 250ml', barcode: '6902345678002', buying_price: 280, unit_price: 350, current_stock: 40, low_stock_threshold: 10, category: 'Body Care' },
  { item_name: 'Arimis Petroleum Jelly 200g', barcode: '6902345678003', buying_price: 150, unit_price: 200, current_stock: 50, low_stock_threshold: 15, category: 'Body Care' },
  { item_name: 'Nice & Lovely Lotion 400ml', barcode: '6902345678004', buying_price: 320, unit_price: 420, current_stock: 35, low_stock_threshold: 10, category: 'Body Care' },
  { item_name: 'Dark & Lovely Relaxer Kit', barcode: '6902345678005', buying_price: 450, unit_price: 600, current_stock: 25, low_stock_threshold: 8, category: 'Hair Care' },
  { item_name: 'Olive Oil Hair Food 250ml', barcode: '6902345678006', buying_price: 180, unit_price: 250, current_stock: 40, low_stock_threshold: 10, category: 'Hair Care' },
  { item_name: 'Dax Hair Wax 100g', barcode: '6902345678007', buying_price: 220, unit_price: 300, current_stock: 30, low_stock_threshold: 8, category: 'Hair Care' },
  { item_name: 'Shampoo Head & Shoulders 400ml', barcode: '6902345678008', buying_price: 520, unit_price: 650, current_stock: 25, low_stock_threshold: 6, category: 'Hair Care' },
  { item_name: 'Lipstick Maybelline Red', barcode: '6902345678009', buying_price: 380, unit_price: 500, current_stock: 20, low_stock_threshold: 5, category: 'Makeup' },
  { item_name: 'Lip Gloss Pink', barcode: '6902345678010', buying_price: 150, unit_price: 220, current_stock: 30, low_stock_threshold: 8, category: 'Makeup' },
  { item_name: 'Foundation Cream Medium', barcode: '6902345678011', buying_price: 450, unit_price: 600, current_stock: 20, low_stock_threshold: 5, category: 'Makeup' },
  { item_name: 'Mascara Black', barcode: '6902345678012', buying_price: 280, unit_price: 380, current_stock: 25, low_stock_threshold: 6, category: 'Makeup' },
  { item_name: 'Nail Polish Red', barcode: '6902345678013', buying_price: 80, unit_price: 120, current_stock: 40, low_stock_threshold: 10, category: 'Nails' },
  { item_name: 'Nail Polish Remover 100ml', barcode: '6902345678014', buying_price: 120, unit_price: 180, current_stock: 30, low_stock_threshold: 8, category: 'Nails' },
  { item_name: 'Artificial Nails Set', barcode: '6902345678015', buying_price: 250, unit_price: 350, current_stock: 20, low_stock_threshold: 5, category: 'Nails' },
  { item_name: 'Perfume Body Spray 150ml', barcode: '6902345678016', buying_price: 320, unit_price: 450, current_stock: 30, low_stock_threshold: 8, category: 'Fragrance' },
  { item_name: 'Roll-On Deodorant 50ml', barcode: '6902345678017', buying_price: 180, unit_price: 250, current_stock: 40, low_stock_threshold: 10, category: 'Fragrance' },
  { item_name: 'Shower Gel 500ml', barcode: '6902345678018', buying_price: 380, unit_price: 500, current_stock: 25, low_stock_threshold: 6, category: 'Body Care' },
  { item_name: 'Face Cream Fair & Lovely', barcode: '6902345678019', buying_price: 220, unit_price: 300, current_stock: 35, low_stock_threshold: 10, category: 'Skin Care' },
  { item_name: 'Sunscreen SPF30 100ml', barcode: '6902345678020', buying_price: 450, unit_price: 600, current_stock: 20, low_stock_threshold: 5, category: 'Skin Care' },
  { item_name: 'Hair Extensions 18inch', barcode: '6902345678021', buying_price: 800, unit_price: 1200, current_stock: 15, low_stock_threshold: 4, category: 'Hair' },
  { item_name: 'Braiding Hair Black', barcode: '6902345678022', buying_price: 150, unit_price: 220, current_stock: 50, low_stock_threshold: 15, category: 'Hair' },
  { item_name: 'Weave Brazilian 12inch', barcode: '6902345678023', buying_price: 1500, unit_price: 2200, current_stock: 10, low_stock_threshold: 3, category: 'Hair' },
  { item_name: 'Cotton Wool 100g', barcode: '6902345678024', buying_price: 80, unit_price: 120, current_stock: 40, low_stock_threshold: 10, category: 'Accessories' },
  { item_name: 'Eyeliner Pencil Black', barcode: '6902345678025', buying_price: 120, unit_price: 180, current_stock: 30, low_stock_threshold: 8, category: 'Makeup' },
];

export const BROKERAGE_ITEMS: ItemTemplate[] = [
  { item_name: 'House Rental Commission', barcode: '6903456789001', buying_price: 0, unit_price: 5000, current_stock: 999, low_stock_threshold: 1, category: 'Rental' },
  { item_name: 'Land Sale Commission', barcode: '6903456789002', buying_price: 0, unit_price: 50000, current_stock: 999, low_stock_threshold: 1, category: 'Sales' },
  { item_name: 'House Sale Commission', barcode: '6903456789003', buying_price: 0, unit_price: 100000, current_stock: 999, low_stock_threshold: 1, category: 'Sales' },
  { item_name: 'Valuation Fee - Residential', barcode: '6903456789004', buying_price: 0, unit_price: 15000, current_stock: 999, low_stock_threshold: 1, category: 'Services' },
  { item_name: 'Valuation Fee - Commercial', barcode: '6903456789005', buying_price: 0, unit_price: 25000, current_stock: 999, low_stock_threshold: 1, category: 'Services' },
  { item_name: 'Property Management Fee', barcode: '6903456789006', buying_price: 0, unit_price: 3000, current_stock: 999, low_stock_threshold: 1, category: 'Management' },
  { item_name: 'Tenant Finding Fee', barcode: '6903456789007', buying_price: 0, unit_price: 8000, current_stock: 999, low_stock_threshold: 1, category: 'Rental' },
  { item_name: 'Lease Agreement Preparation', barcode: '6903456789008', buying_price: 0, unit_price: 5000, current_stock: 999, low_stock_threshold: 1, category: 'Legal' },
  { item_name: 'Title Search Fee', barcode: '6903456789009', buying_price: 0, unit_price: 3000, current_stock: 999, low_stock_threshold: 1, category: 'Legal' },
  { item_name: 'Consultation Fee (1hr)', barcode: '6903456789010', buying_price: 0, unit_price: 2000, current_stock: 999, low_stock_threshold: 1, category: 'Services' },
  { item_name: 'Property Inspection Fee', barcode: '6903456789011', buying_price: 0, unit_price: 5000, current_stock: 999, low_stock_threshold: 1, category: 'Services' },
  { item_name: 'Marketing Package Basic', barcode: '6903456789012', buying_price: 0, unit_price: 10000, current_stock: 999, low_stock_threshold: 1, category: 'Marketing' },
  { item_name: 'Marketing Package Premium', barcode: '6903456789013', buying_price: 0, unit_price: 25000, current_stock: 999, low_stock_threshold: 1, category: 'Marketing' },
  { item_name: 'Photography Package', barcode: '6903456789014', buying_price: 0, unit_price: 8000, current_stock: 999, low_stock_threshold: 1, category: 'Marketing' },
  { item_name: 'Virtual Tour Package', barcode: '6903456789015', buying_price: 0, unit_price: 15000, current_stock: 999, low_stock_threshold: 1, category: 'Marketing' },
];

export const OTHER_ITEMS: ItemTemplate[] = [
  { item_name: 'Service Fee - Basic', barcode: '6904567890001', buying_price: 0, unit_price: 500, current_stock: 999, low_stock_threshold: 1, category: 'Services' },
  { item_name: 'Service Fee - Standard', barcode: '6904567890002', buying_price: 0, unit_price: 1000, current_stock: 999, low_stock_threshold: 1, category: 'Services' },
  { item_name: 'Service Fee - Premium', barcode: '6904567890003', buying_price: 0, unit_price: 2000, current_stock: 999, low_stock_threshold: 1, category: 'Services' },
  { item_name: 'Consultation (30min)', barcode: '6904567890004', buying_price: 0, unit_price: 1000, current_stock: 999, low_stock_threshold: 1, category: 'Services' },
  { item_name: 'Consultation (1hr)', barcode: '6904567890005', buying_price: 0, unit_price: 2000, current_stock: 999, low_stock_threshold: 1, category: 'Services' },
  { item_name: 'Product A - Small', barcode: '6904567890006', buying_price: 100, unit_price: 150, current_stock: 50, low_stock_threshold: 10, category: 'Products' },
  { item_name: 'Product A - Medium', barcode: '6904567890007', buying_price: 200, unit_price: 300, current_stock: 40, low_stock_threshold: 10, category: 'Products' },
  { item_name: 'Product A - Large', barcode: '6904567890008', buying_price: 350, unit_price: 500, current_stock: 30, low_stock_threshold: 8, category: 'Products' },
  { item_name: 'Product B - Small', barcode: '6904567890009', buying_price: 150, unit_price: 220, current_stock: 50, low_stock_threshold: 10, category: 'Products' },
  { item_name: 'Product B - Large', barcode: '6904567890010', buying_price: 400, unit_price: 580, current_stock: 25, low_stock_threshold: 6, category: 'Products' },
];

// Master catalog combining all items
export const MASTER_CATALOG: ItemTemplate[] = [
  ...HARDWARE_ITEMS,
  ...COSMETICS_ITEMS,
  ...BROKERAGE_ITEMS,
  ...OTHER_ITEMS,
];

// Get templates by business type
export const getTemplatesByBusinessType = (businessType: BusinessType): ItemTemplate[] => {
  switch (businessType) {
    case 'HARDWARE':
      return HARDWARE_ITEMS;
    case 'COSMETICS':
    case 'BOUTIQUE':
      return COSMETICS_ITEMS;
    case 'BROKERAGE':
    case 'WHOLESALER':
      return BROKERAGE_ITEMS;
    case 'PHARMACY':
    case 'GENERAL':
    case 'OTHER':
    default:
      return OTHER_ITEMS;
  }
};

// Search catalog by name or barcode
export const searchCatalog = (query: string): ItemTemplate[] => {
  const lowerQuery = query.toLowerCase();
  return MASTER_CATALOG.filter(item => 
    item.item_name.toLowerCase().includes(lowerQuery) ||
    item.barcode.includes(query) ||
    item.category?.toLowerCase().includes(lowerQuery)
  );
};
