'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Category -> Subcategory mapping, matching the exact subcategory names
// used by Oshodi Market Online's own category-products-data.js, so any
// subcategory picked here lines up with their storefront category pages
// without needing translation on either side. Ported 1:1 from
// add-product.html's SUBCATEGORY_MAP.
const SUBCATEGORY_MAP: Record<string, string[]> = {
  fabrics: ['Ankara Fabrics', 'Jonkoso', 'Big & Small Lana', '7 Star', 'Brushmouth', 'Checkers', 'White', 'Silk & Damask', 'Italian Pigal', 'Senator Materials'],
  fashion: ["Women's Wear", "Men's Wear", 'Unisex Wear', 'Shoes & Bags', 'Traditional Wear', 'Kids Wear', 'Jewelry & Accessories', 'Sportswear'],
  electronics: ['Mobile Phones', 'Laptop & Computers', 'Tablets', 'Accessories', 'Audio & Music', 'Cameras & Photography', 'Gaming', 'Smart Watches'],
  foodstuff: ['Grains & Cereals', 'Oils & Spices', 'Snacks & Beverages', 'Fresh Produce', 'Frozen Foods', 'Provisions', 'Bakery Items', 'Drinks'],
  accessories: ['Jewelry', 'Bags & Wallets', 'Belts', 'Sunglasses', 'Watches', 'Hair Accessories', 'Scarves', 'Perfumes'],
};

const CATEGORY_OPTIONS = [
  { value: 'fashion', label: 'Clothing & Fashion' },
  { value: 'electronics', label: 'Electronics & Gadgets' },
  { value: 'fabrics', label: 'Fabrics & Textiles' },
  { value: 'foodstuff', label: 'Foodstuffs & Oils' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'other', label: 'Other' },
];

// iOS Safari auto-zooms the page when focusing any input/select/textarea
// with font-size below 16px, and doesn't reliably zoom back out on blur —
// max-md:text-[16px] prevents the zoom from triggering at all on mobile,
// while keeping the smaller desktop size. Same fix used across the rest
// of this codebase's mobile forms (see repo memory notes).
const inputClass =
  'w-full rounded-[10px] border border-[#e2e3e6] bg-[#f8f9fa] px-3 py-2.5 text-[0.84rem] max-md:text-[16px] text-[#1d2734] outline-none focus:border-[#6c5ce7] disabled:cursor-not-allowed disabled:opacity-60';

// Client Component: ported 1:1 from add-product.html's <form
// id="addProductForm"> — Product Information, Product Images,
// Pricing & Stock, Additional Details cards, plus the tags-input and
// image-preview interactions its inline <script> handled with plain DOM
// APIs. Requires sx-products-schema.sql (sku column) and
// sx-product-assets-schema.sql (storage bucket) to have been run.
export default function AddProductClient({ shopId }: { shopId: string | null }) {
  const router = useRouter();

  const [productName, setProductName] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [brand, setBrand] = useState('');
  const [description, setDescription] = useState('');

  const [sellingPrice, setSellingPrice] = useState('');
  const [comparePrice, setComparePrice] = useState('');
  const [stockQuantity, setStockQuantity] = useState('');
  const [sku, setSku] = useState('');

  const [condition, setCondition] = useState('new');
  const [warranty, setWarranty] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagEntry, setTagEntry] = useState('');

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState<'draft' | 'published' | null>(null);

  const subcategoryOptions = SUBCATEGORY_MAP[category] || [];

  // Object URLs for image previews need revoking on cleanup/replacement to
  // avoid leaking memory, matching the static site's URL.createObjectURL
  // usage but adapted to React's effect lifecycle.
  useEffect(() => {
    const urls = imageFiles.map((file) => URL.createObjectURL(file));
    setImagePreviews(urls);
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [imageFiles]);

  function handleCategoryChange(value: string) {
    setCategory(value);
    setSubcategory('');
  }

  function addFiles(files: FileList | File[]) {
    const incoming = Array.from(files);
    setImageFiles((prev) => {
      const room = Math.max(0, 8 - prev.length);
      return prev.concat(incoming.slice(0, room));
    });
  }

  function removeImage(index: number) {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const value = tagEntry.trim();
    if (!value) return;
    setTags((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setTagEntry('');
  }

  function removeTag(index: number) {
    setTags((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadProductImages(supabase: ReturnType<typeof createClient>, userId: string, productId: string) {
    // Uploads are independent of each other, so run them in parallel
    // instead of one-at-a-time to cut total upload time roughly to the
    // slowest single upload rather than the sum of all of them.
    const uploads = imageFiles.map(async (file, i) => {
      const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
      const path = `${userId}/${productId}/${Date.now()}-${i}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from('sx-product-images')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('sx-product-images').getPublicUrl(path);
      return data.publicUrl;
    });
    return Promise.all(uploads);
  }

  async function saveProduct(status: 'draft' | 'published') {
    setError('');

    if (
      status === 'published' &&
      (!productName.trim() || !category || !subcategory || !description.trim() || !sellingPrice || stockQuantity === '')
    ) {
      setError('Please fill in all required fields before publishing.');
      return;
    }
    if (!shopId) {
      setError('Your shop profile isn\u2019t set up yet \u2014 finish onboarding before adding products.');
      return;
    }

    setSubmitting(status);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const productId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
      const imageUrls = await uploadProductImages(supabase, user.id, productId);

      const { error: insertError } = await supabase.from('sx_products').insert({
        id: productId,
        owner_id: user.id,
        shop_id: shopId,
        product_name: productName.trim() || 'Untitled product',
        category: category || null,
        subcategory: subcategory || null,
        brand: brand.trim() || null,
        description,
        sku: sku.trim() || null,
        tags,
        images: imageUrls,
        selling_price: sellingPrice ? Number(sellingPrice) : 0,
        compare_price: comparePrice ? Number(comparePrice) : null,
        stock_quantity: stockQuantity ? Number(stockQuantity) : 0,
        condition,
        warranty: warranty.trim() || null,
        status,
      });

      if (insertError) throw insertError;

      router.push('/products');
      router.refresh();
    } catch (err) {
      // Supabase's PostgrestError/StorageError objects aren't always
      // `instanceof Error`, so check for a `.message` string directly
      // instead of relying on instanceof (which silently swallowed the
      // real error and only ever showed the generic fallback below).
      console.error('saveProduct failed:', err);
      const message =
        (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string'
          ? (err as { message: string }).message
          : null) || 'Something went wrong saving your product. Please try again.';
      setError(message);
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        saveProduct('published');
      }}
    >
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-5 max-md:grid-cols-1">
        <div className="flex flex-col gap-5">
          <div className="rounded-[14px] border border-[#e2e3e6] bg-white p-5.5 px-6">
            <div className="mb-1 flex items-center gap-2.5">
              <span className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full bg-[#392065] text-[0.7rem] font-extrabold text-white">1</span>
              <h2 className="text-[0.94rem] font-bold">Product Information</h2>
            </div>

            <div className="mb-4 mt-4.5 grid grid-cols-2 gap-4 max-md:grid-cols-1">
              <div>
                <label className="mb-1.5 block text-[0.78rem] font-semibold" htmlFor="productName">
                  Product Name <span className="text-[#e04b4b]">*</span>
                </label>
                <input
                  id="productName"
                  type="text"
                  placeholder="Enter product name"
                  required
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className={inputClass}
                />
                <div className="mt-1.25 text-[0.7rem] text-[#6b7280]">Choose a clear and descriptive name for your product.</div>
              </div>
              <div>
                <label className="mb-1.5 block text-[0.78rem] font-semibold" htmlFor="productCategory">
                  Category <span className="text-[#e04b4b]">*</span>
                </label>
                <select
                  id="productCategory"
                  required
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className={inputClass}
                >
                  <option value="" disabled>
                    Select category
                  </option>
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <div className="mt-1.25 text-[0.7rem] text-[#6b7280]">Choose the category that best fits your product.</div>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-4 max-md:grid-cols-1">
              <div>
                <label className="mb-1.5 block text-[0.78rem] font-semibold" htmlFor="productSubcategory">
                  Subcategory <span className="text-[#e04b4b]">*</span>
                </label>
                <select
                  id="productSubcategory"
                  required
                  disabled={!category || subcategoryOptions.length === 0}
                  value={subcategory}
                  onChange={(e) => setSubcategory(e.target.value)}
                  className={inputClass}
                >
                  <option value="" disabled>
                    {category ? (subcategoryOptions.length ? 'Select subcategory' : 'No subcategories for this category') : 'Select category first'}
                  </option>
                  {subcategoryOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <div className="mt-1.25 text-[0.7rem] text-[#6b7280]">Choose a subcategory to help buyers find this product faster.</div>
              </div>
              <div>
                <label className="mb-1.5 block text-[0.78rem] font-semibold" htmlFor="productBrand">
                  Brand <span className="font-normal text-[#6b7280]">(Optional)</span>
                </label>
                <input
                  id="productBrand"
                  type="text"
                  placeholder="Enter brand name"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[0.78rem] font-semibold" htmlFor="productDescription">
                Product Description <span className="text-[#e04b4b]">*</span>
              </label>
              <div className="overflow-hidden rounded-[10px] border border-[#e2e3e6] bg-[#f8f9fa]">
                <div className="flex items-center gap-1 border-b border-[#e2e3e6] px-2.5 py-2">
                  <select className="mr-1 rounded-md border border-[#e2e3e6] bg-transparent px-2 py-1 text-[0.74rem] text-[#6b7280]" disabled>
                    <option>Normal</option>
                  </select>
                  {['B', 'I', 'U', '\u2022\u2022\u2022', '\u2630', '\ud83d\udd17'].map((label) => (
                    <button
                      key={label}
                      type="button"
                      disabled
                      className="flex h-6.5 w-6.5 items-center justify-center rounded-md text-[0.8rem] text-[#6b7280] disabled:cursor-default"
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <textarea
                  id="productDescription"
                  maxLength={1000}
                  required
                  placeholder="Describe your product features, benefits and specifications..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-32.5 w-full resize-y border-none bg-transparent p-3.5 text-[0.84rem] max-md:text-[16px] text-[#1d2734] outline-none"
                />
                <div className="px-3 py-1.5 text-right text-[0.7rem] text-[#6b7280]">{description.length} / 1000</div>
              </div>
            </div>
          </div>

          <div className="rounded-[14px] border border-[#e2e3e6] bg-white p-5.5 px-6">
            <div className="mb-1 flex items-center gap-2.5">
              <span className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full bg-[#392065] text-[0.7rem] font-extrabold text-white">2</span>
              <h2 className="text-[0.94rem] font-bold">Product Images</h2>
            </div>
            <div className="mb-4.5 mt-1 text-[0.76rem] text-[#6b7280]">Upload clear images of your product. You can add up to 8 images.</div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              multiple
              hidden
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files);
                e.target.value = '';
              }}
            />

            {imageFiles.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
                }}
                className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#e2e3e6] bg-[#f8f9fa] px-5 py-8 text-center hover:border-[#6c5ce7]"
              >
                <div className="mb-2.5 flex h-10.5 w-10.5 items-center justify-center rounded-full border border-[#e2e3e6] bg-white text-[1.1rem]">&#8593;</div>
                <div className="text-[0.84rem] font-bold">Click to upload or drag and drop</div>
                <div className="mt-0.75 text-[0.74rem] text-[#6b7280]">PNG, JPG or WEBP (Max 5MB each)</div>
              </div>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2.5">
                {imagePreviews.map((src, index) => (
                  <div key={index} className="relative aspect-square overflow-hidden rounded-[10px] border border-[#e2e3e6] bg-[#f8f9fa]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Product image ${index + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      aria-label="Remove image"
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/75 text-[0.85rem] leading-none text-[#e5e6e8] hover:bg-black hover:text-white"
                    >
                      &times;
                    </button>
                  </div>
                ))}
                {imageFiles.length < 8 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex aspect-square items-center justify-center rounded-[10px] border border-dashed border-[#e2e3e6] bg-[#f8f9fa] text-[1.6rem] font-light text-[#6b7280] hover:border-[#6c5ce7] hover:text-[#1d2734]"
                  >
                    +
                  </button>
                )}
              </div>
            )}

            <div className="mt-3.5 flex flex-col gap-1 text-[0.76rem] text-[#6b7280]">
              <div>
                <span className="text-[#1e8b4a]">&#10003;</span> Use clear, high-quality images
              </div>
              <div>
                <span className="text-[#1e8b4a]">&#10003;</span> Show different angles if possible
              </div>
              <div>
                <span className="text-[#1e8b4a]">&#10003;</span> Image size ratio 1:1 is recommended
              </div>
            </div>
            <div className="mt-2 text-right text-[0.72rem] text-[#6b7280]">{imageFiles.length} / 8 images</div>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="rounded-[14px] border border-[#e2e3e6] bg-white p-5.5 px-6">
            <div className="mb-4.5 flex items-center gap-2.5">
              <span className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full bg-[#392065] text-[0.7rem] font-extrabold text-white">3</span>
              <h2 className="text-[0.94rem] font-bold">Pricing &amp; Stock</h2>
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-[0.78rem] font-semibold" htmlFor="sellingPrice">
                Selling Price (&#8358;) <span className="text-[#e04b4b]">*</span>
              </label>
              <input
                id="sellingPrice"
                type="number"
                min={0}
                step="0.01"
                placeholder="Enter price"
                required
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-[0.78rem] font-semibold" htmlFor="comparePrice">
                Compare at Price <span className="font-normal text-[#6b7280]">(Optional)</span>
              </label>
              <input
                id="comparePrice"
                type="number"
                min={0}
                step="0.01"
                placeholder="Enter original price"
                value={comparePrice}
                onChange={(e) => setComparePrice(e.target.value)}
                className={inputClass}
              />
              <div className="mt-1.25 text-[0.7rem] text-[#6b7280]">Leave empty if not on sale</div>
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-[0.78rem] font-semibold" htmlFor="stockQuantity">
                Stock Quantity <span className="text-[#e04b4b]">*</span>
              </label>
              <input
                id="stockQuantity"
                type="number"
                min={0}
                step="1"
                placeholder="Enter quantity"
                required
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                className={inputClass}
              />
              <div className="mt-1.25 text-[0.7rem] text-[#6b7280]">Number of items available in stock</div>
            </div>

            <div>
              <label className="mb-1.5 block text-[0.78rem] font-semibold" htmlFor="productSku">
                SKU <span className="font-normal text-[#6b7280]">(Optional)</span>
              </label>
              <input
                id="productSku"
                type="text"
                placeholder="Enter SKU (e.g. ELEC-001)"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className={inputClass}
              />
              <div className="mt-1.25 text-[0.7rem] text-[#6b7280]">Unique identifier for your product</div>
            </div>
          </div>

          <div className="rounded-[14px] border border-[#e2e3e6] bg-white p-5.5 px-6">
            <div className="mb-4.5 flex items-center gap-2.5">
              <span className="flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-full bg-[#392065] text-[0.7rem] font-extrabold text-white">4</span>
              <h2 className="text-[0.94rem] font-bold">Additional Details</h2>
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-[0.78rem] font-semibold" htmlFor="productCondition">
                Condition
              </label>
              <select
                id="productCondition"
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className={inputClass}
              >
                <option value="new">New</option>
                <option value="used">Used</option>
                <option value="refurbished">Refurbished</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-[0.78rem] font-semibold" htmlFor="productWarranty">
                Warranty <span className="font-normal text-[#6b7280]">(Optional)</span>
              </label>
              <input
                id="productWarranty"
                type="text"
                placeholder="e.g. 12 months"
                value={warranty}
                onChange={(e) => setWarranty(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[0.78rem] font-semibold" htmlFor="productTagsEntry">
                Product Tags <span className="font-normal text-[#6b7280]">(Optional)</span>
              </label>
              <div className="flex flex-wrap items-center gap-1.5 rounded-[10px] border border-[#e2e3e6] bg-[#f8f9fa] px-2.5 py-2">
                {tags.map((tag, index) => (
                  <span key={tag} className="flex items-center gap-1.5 rounded-full border border-[#e2e3e6] bg-white px-2.5 py-0.75 text-[0.74rem] font-semibold">
                    {tag}
                    <button type="button" onClick={() => removeTag(index)} aria-label="Remove tag" className="text-[0.8rem] leading-none text-[#6b7280] hover:text-[#1d2734]">
                      &times;
                    </button>
                  </span>
                ))}
                <input
                  id="productTagsEntry"
                  type="text"
                  placeholder="Enter tags and press Enter"
                  value={tagEntry}
                  onChange={(e) => setTagEntry(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  className="min-w-25 flex-1 border-none bg-transparent py-1 text-[0.84rem] max-md:text-[16px] text-[#1d2734] outline-none"
                />
              </div>
              <div className="mt-1.25 text-[0.7rem] text-[#6b7280]">Add relevant tags to help customers find your product.</div>
            </div>
          </div>
        </div>
      </div>

      {error && <p className="mt-4 text-[0.8rem] font-semibold text-[#e04b4b]">{error}</p>}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 max-md:flex-col-reverse max-md:items-stretch">
        <a
          href="/products"
          className="flex items-center justify-center gap-2 rounded-[10px] border border-[#e2e3e6] bg-transparent px-4.5 py-2.5 text-[0.82rem] font-bold text-[#6b7280] hover:bg-[#e5e6e8] hover:text-[#1d2734]"
        >
          &#10005; Cancel
        </a>
        <div className="flex gap-2.5 max-md:flex-col-reverse">
          <button
            type="button"
            disabled={submitting !== null}
            onClick={() => saveProduct('draft')}
            className="flex items-center justify-center gap-2 rounded-[10px] border border-[#e2e3e6] bg-transparent px-4.5 py-2.5 text-[0.82rem] font-bold text-[#6b7280] hover:bg-[#e5e6e8] hover:text-[#1d2734] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting === 'draft' ? 'Saving…' : <>&#128190; Save as Draft</>}
          </button>
          <button
            type="submit"
            disabled={submitting !== null}
            className="flex items-center justify-center gap-2 rounded-[10px] border border-[#4B2E83] bg-[#392065] px-4.5 py-2.5 text-[0.82rem] font-extrabold text-white hover:bg-[#2d1850] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting === 'published' ? 'Publishing…' : <>&#10003; Publish Product</>}
          </button>
        </div>
      </div>
    </form>
  );
}
