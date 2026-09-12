'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import type { Product, ProductStockStats } from '@/lib/shop';
import { createClient } from '@/lib/supabase/client';

// Same category list add-product.html/add-product-client.tsx uses, so the
// edit modal's Category dropdown matches what's offered when a product is
// first created.
const CATEGORY_OPTIONS = [
  { value: 'fashion', label: 'Clothing & Fashion' },
  { value: 'electronics', label: 'Electronics & Gadgets' },
  { value: 'fabrics', label: 'Fabrics & Textiles' },
  { value: 'foodstuff', label: 'Foodstuffs & Oils' },
  { value: 'accessories', label: 'Accessories' },
  { value: 'other', label: 'Other' },
];

const editInputClass =
  'w-full rounded-lg border border-[#e2e3e6] bg-[#f8f9fa] px-3 py-2.25 text-[0.86rem] max-md:text-[16px] text-[#1d2734] outline-none focus:border-[#6c5ce7]';

type EditForm = {
  productName: string;
  category: string;
  description: string;
  sellingPrice: string;
  stockQuantity: string;
  condition: string;
  status: string;
};

// Client Component: ported from products.html's stats/search/filter/table
// script logic. The first page of products (plus the shop's full stock
// stats and total product count) is fetched server-side (page.tsx) and
// passed in as props; "Load More" fetches subsequent pages directly from
// Supabase (same RLS-scoped read the server already did) and appends them.
// Search/category/status/stock filtering below applies to whatever
// products have been loaded so far, matching the static site's
// getFilteredProducts()/renderProductsTable() behavior for that subset.
export default function ProductsClient({
  shopId,
  initialProducts,
  totalCount,
  stockStats,
  pageSize,
}: {
  shopId: string | null;
  initialProducts: Product[];
  totalCount: number;
  stockStats: ProductStockStats;
  pageSize: number;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [loadedCount, setLoadedCount] = useState(initialProducts.length);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [stock, setStock] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const total = stockStats.total;
  const inStock = stockStats.inStock;
  const lowStock = stockStats.lowStock;
  const outOfStock = stockStats.outOfStock;
  const hasMore = loadedCount < totalCount;

  async function loadMore() {
    if (!shopId || loadingMore || !hasMore) return;
    setLoadingMore(true);

    const supabase = createClient();
    const { data } = await supabase
      .from('sx_products')
      .select('id, product_name, category, description, images, selling_price, stock_quantity, condition, status')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: false })
      .range(loadedCount, loadedCount + pageSize - 1);

    const nextPage = ((data as Record<string, unknown>[]) || []).map((p) => ({
      id: p.id as string,
      productName: (p.product_name as string) || '',
      category: (p.category as string) || '',
      description: (p.description as string) || '',
      images: (p.images as string[]) || [],
      sellingPrice: (p.selling_price as number) || 0,
      stockQuantity: (p.stock_quantity as number) || 0,
      condition: (p.condition as string) || '',
      status: (p.status as string) || 'draft',
    }));

    setProducts((prev) => [...prev, ...nextPage]);
    setLoadedCount((prev) => prev + nextPage.length);
    setLoadingMore(false);
  }

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.category && set.add(p.category));
    return Array.from(set).sort();
  }, [products]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((p) => {
      if (query) {
        const haystack = (p.productName + ' ' + p.category).toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (category && p.category !== category) return false;
      if (status && p.status !== status) return false;
      if (stock) {
        const qty = p.stockQuantity;
        if (stock === 'in-stock' && !(qty > 5)) return false;
        if (stock === 'low-stock' && !(qty > 0 && qty <= 5)) return false;
        if (stock === 'out-of-stock' && !(qty <= 0)) return false;
      }
      return true;
    });
  }, [products, search, category, status, stock]);

  const editingProduct = editingId ? products.find((p) => p.id === editingId) || null : null;

  function openEditModal(p: Product) {
    setEditingId(p.id);
    setEditForm({
      productName: p.productName,
      category: p.category,
      description: p.description,
      sellingPrice: String(p.sellingPrice),
      stockQuantity: String(p.stockQuantity),
      condition: p.condition || 'new',
      status: p.status,
    });
    setEditError('');
  }

  function closeEditModal() {
    setEditingId(null);
    setEditForm(null);
    setEditError('');
  }

  async function saveEdit() {
    if (!editingId || !editForm) return;

    if (!editForm.productName.trim()) {
      setEditError('Product name is required.');
      return;
    }

    const targetId = editingId;
    const previousProducts = products;
    const updates = {
      product_name: editForm.productName.trim(),
      category: editForm.category,
      description: editForm.description,
      selling_price: Number(editForm.sellingPrice) || 0,
      stock_quantity: Number(editForm.stockQuantity) || 0,
      condition: editForm.condition,
      status: editForm.status,
    };

    // Apply the edit locally and close the modal immediately instead of
    // waiting on the network round-trip; roll back and reopen with an
    // error message if the write actually fails.
    setProducts((prev) =>
      prev.map((p) =>
        p.id === targetId
          ? {
              ...p,
              productName: updates.product_name,
              category: updates.category,
              description: updates.description,
              sellingPrice: updates.selling_price,
              stockQuantity: updates.stock_quantity,
              condition: updates.condition,
              status: updates.status,
            }
          : p
      )
    );
    closeEditModal();
    setSaving(true);

    const supabase = createClient();
    const { error } = await supabase.from('sx_products').update(updates).eq('id', targetId);
    setSaving(false);

    if (error) {
      setProducts(previousProducts);
      openEditModal(previousProducts.find((p) => p.id === targetId)!);
      setEditError(error.message || 'Could not save changes. Please try again.');
    }
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4 max-md:flex-col">
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-4 max-md:w-full lg:grid-cols-4">
          <StatCard icon={<Image src="/assets/parcel.png" alt="" width={17} height={17} className="h-[17px] w-[17px] object-contain" />} label="Total Products" value={total} sub="Active Listings" />
          <StatCard icon={<span className="h-3.25 w-3.25 rounded-full bg-[#34d16b] shadow-[0_0_0_3px_rgba(52,209,107,0.18),0_0_10px_2px_rgba(52,209,107,0.7)]" />} label="In Stock" value={inStock} sub="Products available" />
          <StatCard icon={<span className="h-3.25 w-3.25 rounded-full bg-[#f4b740] shadow-[0_0_0_3px_rgba(244,183,64,0.18),0_0_10px_2px_rgba(244,183,64,0.7)]" />} label="Low Stock" value={lowStock} sub="Products" />
          <StatCard icon={<span className="h-3.25 w-3.25 rounded-full bg-[#e04b4b] shadow-[0_0_0_3px_rgba(224,75,75,0.18),0_0_10px_2px_rgba(224,75,75,0.7)]" />} label="Out of Stock" value={outOfStock} sub="Products" />
        </div>

        <a
          href="/add-product"
          className="flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-[10px] border border-[#e2e3e6] bg-white px-4 py-2.5 text-[0.82rem] font-extrabold text-[#1d2734] hover:bg-[#e5e6e8] max-md:w-full"
        >
          + Add New Product
        </a>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="relative min-w-55 flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[0.82rem] text-[#6b7280]">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name, SKU or category..."
            className="w-full rounded-[10px] border border-[#e2e3e6] bg-white py-2.5 pl-9 pr-3.5 text-[0.82rem] text-[#1d2734] outline-none focus:border-[#6c5ce7]"
          />
        </div>
      </div>

      <div className="mb-4.5 flex flex-wrap items-center gap-3 max-md:flex-nowrap max-md:gap-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="min-w-35 flex-1 cursor-pointer rounded-[10px] border border-[#e2e3e6] bg-white px-3.5 py-2.5 text-[0.8rem] font-semibold text-[#6b7280] max-md:min-w-0 max-md:px-2 max-md:py-2.5 max-md:text-[0.72rem]"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="min-w-35 flex-1 cursor-pointer rounded-[10px] border border-[#e2e3e6] bg-white px-3.5 py-2.5 text-[0.8rem] font-semibold text-[#6b7280] max-md:min-w-0 max-md:px-2 max-md:py-2.5 max-md:text-[0.72rem]"
        >
          <option value="">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
        <select
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          className="min-w-35 flex-1 cursor-pointer rounded-[10px] border border-[#e2e3e6] bg-white px-3.5 py-2.5 text-[0.8rem] font-semibold text-[#6b7280] max-md:min-w-0 max-md:px-2 max-md:py-2.5 max-md:text-[0.72rem]"
        >
          <option value="">Stock Status</option>
          <option value="in-stock">In Stock</option>
          <option value="low-stock">Low Stock</option>
          <option value="out-of-stock">Out of Stock</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-[14px] border border-[#e2e3e6] bg-white">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <div className="text-[2rem]">🛍</div>
            <h3 className="text-[1rem] font-bold">{total === 0 ? 'No products yet' : 'No matching products'}</h3>
            <p className="max-w-[360px] text-[0.82rem] text-[#6b7280]">
              {total === 0
                ? 'Start building your catalog by adding your first product. Your listings will appear here.'
                : 'Try adjusting your search or filters.'}
            </p>
            {total === 0 && (
              <a href="/add-product" className="mt-2 rounded-[10px] border border-[#e2e3e6] bg-white px-4 py-2.5 text-[0.82rem] font-extrabold text-[#1d2734] hover:bg-[#e5e6e8]">
                + Add New Product
              </a>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-160 border-collapse">
              <thead>
                <tr>
                  {['Product', 'Category', 'Price', 'Stock', 'Status', ''].map((h) => (
                    <th key={h} className="border-b border-[#e2e3e6] px-5 py-3.5 text-left text-[0.7rem] font-bold uppercase tracking-wide text-[#6b7280]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id}>
                    <td className={`px-5 py-4 text-[0.84rem] ${i < filtered.length - 1 ? 'border-b border-[#e2e3e6]' : ''}`}>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#e2e3e6] bg-[#e5e6e8] text-[0.9rem]">
                          {p.images[0] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                          ) : (
                            '🛍'
                          )}
                        </div>
                        <span className="font-bold">{p.productName}</span>
                      </div>
                    </td>
                    <td className={`px-5 py-4 text-[0.84rem] ${i < filtered.length - 1 ? 'border-b border-[#e2e3e6]' : ''}`}>{p.category || '—'}</td>
                    <td className={`px-5 py-4 text-[0.84rem] ${i < filtered.length - 1 ? 'border-b border-[#e2e3e6]' : ''}`}>
                      ₦{p.sellingPrice.toLocaleString()}
                    </td>
                    <td className={`px-5 py-4 text-[0.84rem] ${i < filtered.length - 1 ? 'border-b border-[#e2e3e6]' : ''}`}>{p.stockQuantity}</td>
                    <td className={`px-5 py-4 text-[0.84rem] ${i < filtered.length - 1 ? 'border-b border-[#e2e3e6]' : ''}`}>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.75 text-[0.7rem] font-bold ${
                          p.status === 'published' ? 'bg-[#1e8b4a]/[0.14] text-[#1e8b4a]' : 'bg-[#c7c9cc]/30 text-[#6b7280]'
                        }`}
                      >
                        {p.status === 'published' ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className={`px-5 py-4 text-[0.84rem] ${i < filtered.length - 1 ? 'border-b border-[#e2e3e6]' : ''}`}>
                      <button
                        type="button"
                        title="Edit product"
                        onClick={() => openEditModal(p)}
                        className="flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-[#e2e3e6] bg-[#e5e6e8] text-[0.86rem] text-[#6b7280] hover:border-[#6c5ce7] hover:bg-white hover:text-[#1d2734]"
                      >
                        ✎
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-[10px] border border-[#e2e3e6] bg-white px-5 py-2.5 text-[0.82rem] font-extrabold text-[#1d2734] hover:bg-[#e5e6e8] disabled:opacity-50"
          >
            {loadingMore ? 'Loading…' : `Load More (${loadedCount} of ${totalCount})`}
          </button>
        </div>
      )}

      {editingProduct && editForm && (
        <div
          className="fixed inset-0 z-100 flex items-center justify-center bg-black/55 p-5"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEditModal();
          }}
        >
          <div className="max-h-[88vh] w-full max-w-[480px] overflow-y-auto rounded-2xl border border-[#e2e3e6] bg-white p-6">
            <div className="mb-4 border-b border-[#e2e3e6] pb-3.5 text-[1rem] font-bold">Edit Product</div>
            {editError && <div className="mb-3 text-[0.78rem] text-[#e08a8a]">{editError}</div>}

            <div className="mb-3.5">
              <label className="mb-1.5 block text-[0.78rem] font-semibold text-[#6b7280]">Product Name</label>
              <input
                type="text"
                value={editForm.productName}
                onChange={(e) => setEditForm({ ...editForm, productName: e.target.value })}
                className={editInputClass}
              />
            </div>

            <div className="mb-3.5">
              <label className="mb-1.5 block text-[0.78rem] font-semibold text-[#6b7280]">Category</label>
              <select
                value={editForm.category}
                onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                className={editInputClass}
              >
                <option value="">Select a category</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3.5">
              <label className="mb-1.5 block text-[0.78rem] font-semibold text-[#6b7280]">Description</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className={`min-h-20 resize-y ${editInputClass}`}
              />
            </div>

            <div className="mb-3.5 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[0.78rem] font-semibold text-[#6b7280]">Selling Price</label>
                <input
                  type="number"
                  min="0"
                  value={editForm.sellingPrice}
                  onChange={(e) => setEditForm({ ...editForm, sellingPrice: e.target.value })}
                  className={editInputClass}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[0.78rem] font-semibold text-[#6b7280]">Stock Quantity</label>
                <input
                  type="number"
                  min="0"
                  value={editForm.stockQuantity}
                  onChange={(e) => setEditForm({ ...editForm, stockQuantity: e.target.value })}
                  className={editInputClass}
                />
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[0.78rem] font-semibold text-[#6b7280]">Condition</label>
                <select
                  value={editForm.condition}
                  onChange={(e) => setEditForm({ ...editForm, condition: e.target.value })}
                  className={editInputClass}
                >
                  <option value="new">New</option>
                  <option value="used">Used</option>
                  <option value="refurbished">Refurbished</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[0.78rem] font-semibold text-[#6b7280]">Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className={editInputClass}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>

            <div className="mt-1.5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={closeEditModal}
                className="rounded-[10px] border border-[#e2e3e6] bg-transparent px-4 py-2.5 text-[0.82rem] font-bold text-[#6b7280] hover:bg-[#e5e6e8] hover:text-[#1d2734]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={saving}
                className="rounded-[10px] border-none bg-white px-4 py-2.5 text-[0.82rem] font-extrabold text-[#1d2734] shadow-[0_0_0_1px_#e2e3e6] hover:bg-[#e5e6e8] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number; sub: string }) {
  return (
    <div className="rounded-[14px] border border-[#e2e3e6] bg-white p-4">
      <div className="mb-2.5 flex h-8.5 w-8.5 items-center justify-center rounded-full border border-[#e2e3e6] bg-[#e5e6e8] text-[0.9rem]">
        {icon}
      </div>
      <div className="text-[0.72rem] text-[#6b7280]">{label}</div>
      <div className="mt-0.5 text-[1.3rem] font-extrabold">{value}</div>
      <div className="mt-1 text-[0.68rem] text-[#6b7280]">{sub}</div>
    </div>
  );
}
