// Single source of truth for the product category/subcategory taxonomy,
// shared by onboarding step 2 (shop's primary category), the Add Product
// form, and the Products list's edit-category dropdown — previously each
// of those three files kept its own manually-synced copy of this list.
//
// `value` slugs are stored as-is on `sx_shops.category` and
// `sx_products.category` — NEVER rename or remove an existing slug once
// shops/products may have been saved with it, only add new ones, or
// existing rows will silently point at a category that no longer exists
// in the dropdown (it'll still display fine as free text, but won't be
// selectable/editable back to itself in the UI).
//
// IMPORTANT: these values/labels must stay in sync with the category and
// subcategory names used by the separate Oshodi Market Online storefront
// codebase (its `category-products-data.js`), so a subcategory picked
// here lines up with the storefront's category pages without needing
// translation on either side. See sx-categories-update.md at the repo
// root for what to change on that side when this list changes.
export type CategoryOption = { value: string; label: string };

export const CATEGORY_OPTIONS: CategoryOption[] = [
  { value: 'fabrics', label: 'Fabrics & Textiles' },
  { value: 'fashion', label: 'Clothing & Fashion' },
  { value: 'electronics', label: 'Electronics & Gadgets' },
  { value: 'foodstuff', label: 'Foodstuffs & Oils' },
  { value: 'accessories', label: 'Clothing Accessories' },
  { value: 'shoes-bags', label: 'Shoes & Bags' },
  { value: 'beauty', label: 'Beauty & Cosmetics' },
  { value: 'home-kitchenware', label: 'Home & Kitchenware' },
  { value: 'furniture-decor', label: 'Furniture & Decor' },
  { value: 'building-materials', label: 'Building Materials & Accessories' },
  { value: 'baby-kids', label: 'Baby & Kids' },
  { value: 'automotive', label: 'Automotive Parts' },
  { value: 'books-stationery', label: 'Books & Stationery' },
  { value: 'toys-games', label: 'Toys & Games' },
  { value: 'health-wellness', label: 'Health & Wellness' },
  { value: 'sports-fitness', label: 'Sports & Fitness' },
  { value: 'pet-supplies', label: 'Pet Supplies' },
  { value: 'office-supplies', label: 'Office Supplies' },
  { value: 'party-events', label: 'Party & Events' },
  { value: 'garden-outdoor', label: 'Garden & Outdoor' },
  { value: 'other', label: 'Other' },
];

// Category value -> subcategory names.
export const SUBCATEGORY_MAP: Record<string, string[]> = {
  fabrics: ['Ankara', 'Jonkoso', 'Big & Small Lana', '7 Star', 'Brushmouth', 'Checkers', 'White', 'Silk & Damask', 'Italian Pigal', 'Senator Materials'],
  fashion: ["Women's Wear", "Men's Wear", 'Unisex Wear', 'Shoes & Bags', 'Traditional Wear', 'Kids Wear', 'Jewelry & Accessories', 'Sportswear'],
  electronics: ['Mobile Phones', 'Laptop & Computers', 'Tablets', 'Accessories', 'Audio & Music', 'Cameras & Photography', 'Gaming', 'Smart Watches'],
  foodstuff: ['Grains & Cereals', 'Oils & Spices', 'Snacks & Beverages', 'Fresh Produce', 'Frozen Foods', 'Provisions', 'Bakery Items', 'Drinks'],
  accessories: ['Jewelry', 'Bags & Wallets', 'Belts', 'Sunglasses', 'Watches', 'Hair Accessories', 'Scarves', 'Perfumes', 'Sewing & Tailoring Supplies'],
  'shoes-bags': ["Men's Shoes", "Women's Shoes", 'Sneakers', 'Handbags', 'Backpacks & Luggage', 'Slippers & Sandals'],
  beauty: ['Skincare', 'Makeup', 'Haircare & Wigs', 'Fragrances', 'Soaps & Body Care', 'Beauty Tools'],
  'home-kitchenware': ['Cookware & Pots', 'Cutlery & Utensils', 'Storage & Containers', 'Home Decor', 'Cleaning Supplies', 'Small Appliances'],
  'furniture-decor': ['Sofas & Chairs', 'Tables & Desks', 'Beds & Mattresses', 'Wardrobes & Shelves', 'Decor & Art'],
  'building-materials': [
    'Cement & Blocks',
    'Tools & Hardware',
    'Plumbing & Pipes',
    'Electrical Supplies',
    'Paints & Finishes',
    'Fasteners & Fittings',
    'Locks & Hinges',
    'Ladders & Wheelbarrows',
    'Safety Equipment',
  ],
  'baby-kids': ['Baby & Kids Clothing', 'Feeding & Nursing', 'Diapers & Wipes', 'Baby Toys', 'Strollers & Carriers'],
  automotive: ['Engine Parts', 'Tyres & Wheels', 'Batteries', 'Car Accessories', 'Oils & Lubricants'],
  'books-stationery': ['Textbooks', 'Notebooks & Paper', 'Pens & Writing', 'Office Stationery', 'Art Supplies'],
  'toys-games': ['Action Figures', 'Dolls & Playsets', 'Board Games & Puzzles', 'Outdoor Toys', 'Educational Toys'],
  'health-wellness': ['Supplements & Vitamins', 'First Aid', 'Fitness & Wellness', 'Personal Care', 'Medical Devices'],
  'sports-fitness': ['Gym Equipment', 'Team Sports', 'Fitness Gear', 'Outdoor & Camping', 'Sportswear'],
  'pet-supplies': ['Pet Food', 'Pet Accessories', 'Pet Grooming', 'Cages & Housing'],
  'office-supplies': ['Stationery', 'Office Furniture', 'Printers & Equipment', 'Filing & Storage'],
  'party-events': ['Decorations & Balloons', 'Partyware', 'Gifts & Souvenirs', 'Canopies & Rentals'],
  'garden-outdoor': ['Plants & Seeds', 'Garden Tools', 'Outdoor Furniture', 'Grills & BBQ'],
};
