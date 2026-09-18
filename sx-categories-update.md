# Category/subcategory update — instructions for the Oshodi Market Online storefront codebase

This portal (`sell-oshodimarketonline`, the seller dashboard) now offers
sellers 20 product categories (up from 5 + "Other"). The single source of
truth on this side is `portal-next/src/lib/categories.ts`.

For the **storefront site** (the actual oshodimarketonline.com shop-facing
codebase, its `category-products-data.js` or equivalent), update its
category/subcategory list to match the table below **exactly** — same
`value` slugs and same subcategory label text — so products sellers tag
here show up correctly filed under the matching category/subcategory page
there. Category pages on the storefront that don't yet exist for the 15
new categories will need to be created (or the storefront needs a generic
"category not found yet" fallback) until then.

## Category slug -> label -> subcategories

- `fabrics` — Fabrics & Textiles — Ankara, Jonkoso, Big & Small Lana, 7 Star, Brushmouth, Checkers, White, Silk & Damask, Italian Pigal, Senator Materials
- `fashion` — Clothing & Fashion — Women's Wear, Men's Wear, Unisex Wear, Shoes & Bags, Traditional Wear, Kids Wear, Jewelry & Accessories, Sportswear
- `electronics` — Electronics & Gadgets — Mobile Phones, Laptop & Computers, Tablets, Accessories, Audio & Music, Cameras & Photography, Gaming, Smart Watches
- `foodstuff` — Foodstuffs & Oils — Grains & Cereals, Oils & Spices, Snacks & Beverages, Fresh Produce, Frozen Foods, Provisions, Bakery Items, Drinks
- `accessories` — Clothing Accessories — Jewelry, Bags & Wallets, Belts, Sunglasses, Watches, Hair Accessories, Scarves, Perfumes, Sewing & Tailoring Supplies
- `shoes-bags` — Shoes & Bags — Men's Shoes, Women's Shoes, Sneakers, Handbags, Backpacks & Luggage, Slippers & Sandals
- `beauty` — Beauty & Cosmetics — Skincare, Makeup, Haircare & Wigs, Fragrances, Soaps & Body Care, Beauty Tools
- `home-kitchenware` — Home & Kitchenware — Cookware & Pots, Cutlery & Utensils, Storage & Containers, Home Decor, Cleaning Supplies, Small Appliances
- `furniture-decor` — Furniture & Decor — Sofas & Chairs, Tables & Desks, Beds & Mattresses, Wardrobes & Shelves, Decor & Art
- `building-materials` — Building Materials & Accessories — Cement & Blocks, Tools & Hardware, Plumbing & Pipes, Electrical Supplies, Paints & Finishes, Fasteners & Fittings, Locks & Hinges, Ladders & Wheelbarrows, Safety Equipment
- `baby-kids` — Baby & Kids — Baby & Kids Clothing, Feeding & Nursing, Diapers & Wipes, Baby Toys, Strollers & Carriers
- `automotive` — Automotive Parts — Engine Parts, Tyres & Wheels, Batteries, Car Accessories, Oils & Lubricants
- `books-stationery` — Books & Stationery — Textbooks, Notebooks & Paper, Pens & Writing, Office Stationery, Art Supplies
- `toys-games` — Toys & Games — Action Figures, Dolls & Playsets, Board Games & Puzzles, Outdoor Toys, Educational Toys
- `health-wellness` — Health & Wellness — Supplements & Vitamins, First Aid, Fitness & Wellness, Personal Care, Medical Devices
- `sports-fitness` — Sports & Fitness — Gym Equipment, Team Sports, Fitness Gear, Outdoor & Camping, Sportswear
- `pet-supplies` — Pet Supplies — Pet Food, Pet Accessories, Pet Grooming, Cages & Housing
- `office-supplies` — Office Supplies — Stationery, Office Furniture, Printers & Equipment, Filing & Storage
- `party-events` — Party & Events — Decorations & Balloons, Partyware, Gifts & Souvenirs, Canopies & Rentals
- `garden-outdoor` — Garden & Outdoor — Plants & Seeds, Garden Tools, Outdoor Furniture, Grills & BBQ
- `other` — Other — (no subcategories; catch-all)

## Notes on changes vs. the old 5-category list

- `fashion`, `electronics`, `foodstuff` — unchanged, subcategories identical.
- `accessories` — renamed label from "Accessories" to "Clothing Accessories"
  (slug unchanged); added one new subcategory: **Sewing & Tailoring Supplies**.
- `fabrics` — one subcategory renamed from **"Ankara Fabrics"** to **"Ankara"**
  (slug unchanged). If the storefront currently uses "Ankara Fabrics" as a
  subcategory label/slug anywhere, update it to "Ankara" to match.
- Everything else (`shoes-bags` through `garden-outdoor`) is brand new —
  15 new top-level categories that previously didn't exist on either side.

## Data integrity notes

- These `value` slugs are what gets stored in `sx_products.category` /
  `sx_shops.category` in Supabase — never reuse a slug for a different
  category later, only add new ones.
- If the storefront's own category values differ from these slugs (e.g.
  it uses full label text instead of a slug as the identifier), match by
  slug->label mapping above rather than assuming a 1:1 string match.
