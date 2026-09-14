import type { SupabaseClient } from '@supabase/supabase-js';

export type ShopContext = {
  isStaff: boolean;
  role: string | null;
  shopId: string | null;
  shopCode: string | null;
  shopName: string;
  category: string;
  marketPlatform: string;
  logoUrl: string;
};

// Server-side port of sx-auth.js's resolveShopContext(). Owners and staff
// share the exact same dashboard; this just resolves whose shop's data to
// load: owners by sx_shops.owner_id, staff by their sx_shop_members row.
// Returns null if a staff account hasn't joined a shop yet.
export async function resolveShopContext(
  supabase: SupabaseClient,
  user: { id: string; user_metadata?: Record<string, unknown> }
): Promise<ShopContext | null> {
  const meta = user.user_metadata || {};
  const isStaff = meta.sx_shop_role === 'staff';

  if (isStaff) {
    const { data: membership } = await supabase
      .from('sx_shop_members')
      .select('role, sx_shops(id, shop_code, shop_name, category, market_platform, logo_url)')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) return null;
    const shopRelation = membership.sx_shops as unknown;
    const joinedShop = ((Array.isArray(shopRelation) ? shopRelation[0] : shopRelation) as Record<string, unknown>) || {};
    return {
      isStaff: true,
      role: (membership.role as string) || null,
      shopId: (joinedShop.id as string) || null,
      shopCode: (joinedShop.shop_code as string) || null,
      shopName: (joinedShop.shop_name as string) || (meta.sx_shop_name as string) || 'Shop',
      category: (joinedShop.category as string) || '',
      marketPlatform: (joinedShop.market_platform as string) || 'Not set yet',
      logoUrl: (joinedShop.logo_url as string) || '',
    };
  }

  const { data: ownedShop } = await supabase
    .from('sx_shops')
    .select('id, shop_code, shop_name, category, market_platform, logo_url')
    .eq('owner_id', user.id)
    .maybeSingle();

  return {
    isStaff: false,
    role: 'owner',
    shopId: ownedShop?.id || null,
    shopCode: ownedShop?.shop_code || null,
    shopName: ownedShop?.shop_name || (meta.sx_shop_name as string) || 'Your Shop',
    category: ownedShop?.category || (meta.sx_category as string) || '',
    marketPlatform: ownedShop?.market_platform || (meta.sx_market_platform as string) || 'Not set yet',
    logoUrl: ownedShop?.logo_url || (meta.sx_shop_logo_url as string) || '',
  };
}

export type ShopStats = {
  productCount: number;
  avgRating: number | null;
  reviewCount: number;
  shopViews: number;
  contactClicks: number;
  whatsappClicks: number;
};
// Server-side port of the stat-card data fetching from dashboard.html's
// guardDashboard(). Runs every query in parallel via Promise.all so the
// whole dashboard resolves in one round-trip's worth of latency instead
// of the original's sequential awaits — then the Server Component below
// renders fully-populated HTML, with no client-side loading skeleton.
export async function loadShopStats(supabase: SupabaseClient, shopId: string): Promise<ShopStats> {
  const [productsCountResult, productIdsResult] = await Promise.all([
    supabase.from('sx_products').select('id', { count: 'exact', head: true }).eq('shop_id', shopId),
    supabase.from('sx_products').select('id, product_name').eq('shop_id', shopId),
  ]);

  const productCount = typeof productsCountResult.count === 'number' ? productsCountResult.count : 0;
  const shopProductsList = (productIdsResult.data as { id: string; product_name: string }[]) || [];
  const productIds = shopProductsList.map((p) => p.id);
  const productNames = shopProductsList.map((p) => p.product_name).filter(Boolean);

  const urlFilters = productIds.map((id) => `target_url.ilike.%id=${id}%`);
  urlFilters.push(`target_url.ilike.%sxshop=${shopId}%`);

  const [reviewsResult, eventsResult, contactEventsResult] = await Promise.all([
    productIds.length > 0
      ? supabase.from('reviews').select('rating').in('shop_key', productIds)
      : Promise.resolve({ data: [] as { rating: number }[] }),
    urlFilters.length > 0
      ? supabase.from('click_events').select('event_type, event_label, target_url').or(urlFilters.join(','))
      : Promise.resolve({ data: [] as { event_type: string; event_label: string }[] }),
    productNames.length > 0
      ? supabase
          .from('click_events')
          .select('event_type, event_label, product_name')
          .in('event_type', ['Calls', 'Messages'])
          .in('product_name', productNames)
      : Promise.resolve({ data: [] as { event_type: string; event_label: string }[] }),
  ]);

  const reviews = (reviewsResult.data as { rating: number }[]) || [];
  const avgRating =
    reviews.length > 0 ? reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length : null;

  const events = (eventsResult.data as { event_type: string; event_label: string }[]) || [];
  const shopViews = events.filter(
    (e) =>
      (e.event_type === 'Product clicks' && e.event_label === 'View Details') ||
      (e.event_type === 'Shop clicks' && e.event_label === 'Visit Shop')
  ).length;

  const contactEvents = (contactEventsResult.data as { event_type: string; event_label: string }[]) || [];
  const whatsappClicks = contactEvents.filter(
    (e) => e.event_type === 'Messages' && e.event_label === 'WhatsApp Message'
  ).length;
  const contactClicks = contactEvents.filter((e) => e.event_type === 'Calls').length;

  return {
    productCount,
    avgRating,
    reviewCount: reviews.length,
    shopViews,
    contactClicks,
    whatsappClicks,
  };
}

// Server-side port of dashboard.html's loadViewShopLink(): the storefront's
// shop-page route is "shops.html?sxshop=<sx_shops.id>", and its current
// base URL is kept in the shared "platform_links" table (one row per
// market_platform). Returns null if there's no matching row (button stays
// hidden), requires sx-platform-links-schema.sql to have been run.
export async function loadViewShopUrl(
  supabase: SupabaseClient,
  shopId: string | null,
  marketPlatform: string
): Promise<string | null> {
  if (!shopId || marketPlatform === 'Not set yet') return null;

  const { data } = await supabase
    .from('platform_links')
    .select('base_url')
    .eq('market_platform', marketPlatform)
    .maybeSingle();

  const baseUrl = data?.base_url as string | undefined;
  // Defense in depth: platform_links.base_url is writable by an
  // unauthenticated storefront role (see sx-platform-links-schema.sql), so
  // never trust it as a rendered link target unless it's an https:// URL —
  // this stops a compromised/malicious row from turning "View Shop" into a
  // javascript:/data:/http: (or other scheme) redirect.
  if (!baseUrl || !baseUrl.startsWith('https://')) return null;

  return baseUrl.replace(/\/$/, '') + '/shops/shops.html?sxshop=' + shopId;
}

export type ShopDetails = {
  id: string | null;
  isStaff: boolean;
  role: string | null;
  shopCode: string | null;
  shopName: string;
  category: string;
  marketPlatform: string;
  phone: string;
  whatsapp: string;
  location: string;
  tagline: string;
  logoUrl: string;
  bannerUrl: string;
  inviteCode: string | null;
  memberSince: string | null;
};

// Server-side port of my-shop.html's guardMyShop() shop-loading section:
// fetches the FULL sx_shops row (all editable fields), falling back to
// user_metadata for anything missing, same as the static page. Owners load
// by sx_shops.owner_id; staff/managers load the shop they've joined via
// sx_shop_members.
export async function loadShopDetails(
  supabase: SupabaseClient,
  user: { id: string; created_at?: string; user_metadata?: Record<string, unknown> }
): Promise<ShopDetails | null> {
  const meta = user.user_metadata || {};
  const isStaff = meta.sx_shop_role === 'staff';

  let shopRow: Record<string, unknown> = {};
  let role: string | null = null;

  if (isStaff) {
    const { data: membership } = await supabase
      .from('sx_shop_members')
      .select(
        'role, sx_shops(id, shop_code, shop_name, category, market_platform, phone, whatsapp, location, tagline, logo_url, banner_url, invite_code, created_at)'
      )
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) return null;
    const shopRelation = membership.sx_shops as unknown;
    shopRow = ((Array.isArray(shopRelation) ? shopRelation[0] : shopRelation) as Record<string, unknown>) || {};
    role = (membership.role as string) || null;
  } else {
    const { data } = await supabase
      .from('sx_shops')
      .select('id, shop_code, shop_name, category, market_platform, phone, whatsapp, location, tagline, logo_url, banner_url, invite_code, created_at')
      .eq('owner_id', user.id)
      .maybeSingle();
    shopRow = data || {};
    role = 'owner';
  }

  return {
    id: (shopRow.id as string) || null,
    isStaff,
    role,
    shopCode: (shopRow.shop_code as string) || null,
    shopName: (shopRow.shop_name as string) || (meta.sx_shop_name as string) || 'Your Shop',
    category: (shopRow.category as string) || (meta.sx_category as string) || '',
    marketPlatform: (shopRow.market_platform as string) || (meta.sx_market_platform as string) || 'Not set yet',
    phone: (shopRow.phone as string) || (meta.sx_phone as string) || '',
    whatsapp: (shopRow.whatsapp as string) || (meta.sx_whatsapp as string) || '',
    location: (shopRow.location as string) || (meta.sx_shop_address as string) || '',
    tagline: (shopRow.tagline as string) || (meta.sx_shop_tagline as string) || '',
    logoUrl: (shopRow.logo_url as string) || (meta.sx_shop_logo_url as string) || '',
    bannerUrl: (shopRow.banner_url as string) || (meta.sx_shop_banner_url as string) || '',
    inviteCode: (shopRow.invite_code as string) || null,
    memberSince: (shopRow.created_at as string) || user.created_at || null,
  };
}

export type ShopOverviewStats = {
  productCount: number;
  avgRating: number | null;
};

// Server-side port of my-shop.html's "Total Products" / "Shop Rating"
// stat loading: product count for this shop, plus average rating across
// all reviews for this shop's products (reviews.shop_key = the reviewed
// product's own sx_products.id, see loadShopStats() above for the same
// pattern used on the dashboard).
export async function loadShopOverviewStats(supabase: SupabaseClient, shopId: string): Promise<ShopOverviewStats> {
  const [productsCountResult, productIdsResult] = await Promise.all([
    supabase.from('sx_products').select('id', { count: 'exact', head: true }).eq('shop_id', shopId),
    supabase.from('sx_products').select('id').eq('shop_id', shopId),
  ]);

  const productCount = typeof productsCountResult.count === 'number' ? productsCountResult.count : 0;
  const productIds = ((productIdsResult.data as { id: string }[]) || []).map((p) => p.id);

  let avgRating: number | null = null;
  if (productIds.length > 0) {
    const { data: reviewsData } = await supabase.from('reviews').select('rating').in('shop_key', productIds);
    const reviews = (reviewsData as { rating: number }[]) || [];
    if (reviews.length > 0) {
      avgRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;
    }
  }

  return { productCount, avgRating };
}

export type StaffMember = {
  id: string;
  fullName: string;
  role: string | null;
  joinedAt: string | null;
};

export const STAFF_PAGE_SIZE = 20;

export type StaffMembersPage = {
  staff: StaffMember[];
  totalCount: number;
};

// Server-side port of my-shop.html's loadStaffMembers(): rows in
// sx_shop_members for this shop, ordered by join date. Offset-paginated
// (`.range()`) since a single shop's team is a small, page-scoped list —
// not worth the added complexity of cursor-based pagination.
export async function loadStaffMembers(
  supabase: SupabaseClient,
  shopId: string,
  opts: { limit?: number; offset?: number } = {}
): Promise<StaffMembersPage> {
  const limit = opts.limit ?? STAFF_PAGE_SIZE;
  const offset = opts.offset ?? 0;

  const { data, count } = await supabase
    .from('sx_shop_members')
    .select('id, full_name, role, joined_at', { count: 'exact' })
    .eq('shop_id', shopId)
    .order('joined_at', { ascending: true })
    .range(offset, offset + limit - 1);

  const staff = ((data as Record<string, unknown>[]) || []).map((member) => ({
    id: member.id as string,
    fullName: (member.full_name as string) || 'Unnamed',
    role: (member.role as string) || null,
    joinedAt: (member.joined_at as string) || null,
  }));

  return { staff, totalCount: count ?? staff.length };
}

export type Product = {
  id: string;
  productName: string;
  category: string;
  description: string;
  images: string[];
  sellingPrice: number;
  stockQuantity: number;
  condition: string;
  status: string;
};

export const PRODUCTS_PAGE_SIZE = 20;

export type ProductsPage = {
  products: Product[];
  totalCount: number;
};

function mapProductRow(p: Record<string, unknown>): Product {
  return {
    id: p.id as string,
    productName: (p.product_name as string) || '',
    category: (p.category as string) || '',
    description: (p.description as string) || '',
    images: (p.images as string[]) || [],
    sellingPrice: (p.selling_price as number) || 0,
    stockQuantity: (p.stock_quantity as number) || 0,
    condition: (p.condition as string) || '',
    status: (p.status as string) || 'draft',
  };
}

// Server-side port of products.html's loadProducts(): one page of product
// rows (draft + published) owned by this shop, newest first, plus the
// shop's total product count (so the caller can show "Load More"/paging
// controls without pulling the entire table into memory). Requires
// sx-products-schema.sql to have been run in Supabase.
export async function loadProducts(
  supabase: SupabaseClient,
  shopId: string,
  opts: { limit?: number; offset?: number } = {}
): Promise<ProductsPage> {
  const limit = opts.limit ?? PRODUCTS_PAGE_SIZE;
  const offset = opts.offset ?? 0;

  const { data, count } = await supabase
    .from('sx_products')
    .select('id, product_name, category, description, images, selling_price, stock_quantity, condition, status', {
      count: 'exact',
    })
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const products = ((data as Record<string, unknown>[]) || []).map(mapProductRow);
  return { products, totalCount: count ?? products.length };
}

export type ProductStockStats = {
  total: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
};

// Stat-card counts for products.html's "Total Products/In Stock/Low
// Stock/Out of Stock" cards. Deliberately separate from loadProducts()
// above: these need to reflect the WHOLE shop's inventory even when only
// one page of products has been loaded into the table, so each is its own
// count-only (head: true) query rather than being derived from whichever
// page happens to be in memory.
export async function loadProductStockStats(supabase: SupabaseClient, shopId: string): Promise<ProductStockStats> {
  const [totalResult, inStockResult, lowStockResult, outOfStockResult] = await Promise.all([
    supabase.from('sx_products').select('id', { count: 'exact', head: true }).eq('shop_id', shopId),
    supabase.from('sx_products').select('id', { count: 'exact', head: true }).eq('shop_id', shopId).gt('stock_quantity', 5),
    supabase
      .from('sx_products')
      .select('id', { count: 'exact', head: true })
      .eq('shop_id', shopId)
      .gt('stock_quantity', 0)
      .lte('stock_quantity', 5),
    supabase.from('sx_products').select('id', { count: 'exact', head: true }).eq('shop_id', shopId).lte('stock_quantity', 0),
  ]);

  return {
    total: totalResult.count ?? 0,
    inStock: inStockResult.count ?? 0,
    lowStock: lowStockResult.count ?? 0,
    outOfStock: outOfStockResult.count ?? 0,
  };
}

export type ReviewProduct = {
  id: string;
  productName: string;
  thumbUrl: string;
};

export type Review = {
  id: string;
  shopKey: string;
  reviewerName: string;
  rating: number;
  comment: string;
  shopReply: string;
  shopReplyAt: string | null;
  createdAt: string | null;
};

export type ReviewsData = {
  products: ReviewProduct[];
  reviews: Review[];
  totalCount: number;
  loadError: string | null;
};

export const REVIEWS_PAGE_SIZE = 20;

// Server-side port of reviews.html's loadReviews(): reviews are stored in
// a shared "reviews" table keyed by shop_key = the REVIEWED PRODUCT's own
// sx_products.id (not the shop's id), so every review for a shop is found
// by first fetching that shop's product ids, then matching reviews whose
// shop_key is in that list. The review rows themselves are offset-
// paginated (`.range()`); use loadShopReviewStats() alongside this for
// aggregate figures (avg rating, rating breakdown, top rated products)
// that must reflect ALL reviews, not just the current page.
export async function loadShopReviews(
  supabase: SupabaseClient,
  shopId: string,
  opts: { limit?: number; offset?: number } = {}
): Promise<ReviewsData> {
  const limit = opts.limit ?? REVIEWS_PAGE_SIZE;
  const offset = opts.offset ?? 0;

  const { data: productsData } = await supabase
    .from('sx_products')
    .select('id, product_name, images')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: true });

  const products: ReviewProduct[] = ((productsData as Record<string, unknown>[]) || []).map((p) => ({
    id: p.id as string,
    productName: (p.product_name as string) || '',
    thumbUrl: ((p.images as string[]) || [])[0] || '',
  }));

  const productIds = products.map((p) => p.id);
  let reviews: Review[] = [];
  let totalCount = 0;
  let loadError: string | null = null;

  if (productIds.length > 0) {
    const { data: reviewsData, count, error } = await supabase
      .from('reviews')
      .select('id, shop_key, reviewer_name, rating, comment, shop_reply, shop_reply_at, created_at', { count: 'exact' })
      .in('shop_key', productIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      // Most likely cause: the "reviews" table's RLS only grants SELECT to
      // "anon" (for the public storefront) and is missing a policy for
      // "authenticated" (the signed-in vendor dashboard) — see
      // sx-reviews-read-policy.sql for the fix.
      loadError = error.message;
    } else {
      totalCount = count ?? 0;
      reviews = ((reviewsData as Record<string, unknown>[]) || []).map((r) => ({
        id: r.id as string,
        shopKey: (r.shop_key as string) || '',
        reviewerName: (r.reviewer_name as string) || '',
        rating: (r.rating as number) || 0,
        comment: (r.comment as string) || '',
        shopReply: (r.shop_reply as string) || '',
        shopReplyAt: (r.shop_reply_at as string) || null,
        createdAt: (r.created_at as string) || null,
      }));
    }
  }

  return { products, reviews, totalCount, loadError };
}

export type ReviewStatsEntry = {
  shopKey: string;
  rating: number;
  hasReply: boolean;
};

// Lightweight companion to loadShopReviews(): every review's rating/
// shop_key/reply-status (NOT the full row — no reviewer name/comment/
// timestamps) for this shop's products, unpaginated. reviews.html's stats
// bar (total/avg rating/rating breakdown) and "Top Rated Products" panel
// are aggregates across the WHOLE review set, so they must be computed
// from every review, not just whichever page of full review objects is
// currently loaded in the table.
export async function loadShopReviewStats(supabase: SupabaseClient, shopId: string): Promise<ReviewStatsEntry[]> {
  const { data: productsData } = await supabase.from('sx_products').select('id').eq('shop_id', shopId);
  const productIds = ((productsData as { id: string }[]) || []).map((p) => p.id);
  if (productIds.length === 0) return [];

  const { data } = await supabase.from('reviews').select('shop_key, rating, shop_reply').in('shop_key', productIds);

  return ((data as Record<string, unknown>[]) || []).map((r) => ({
    shopKey: (r.shop_key as string) || '',
    rating: (r.rating as number) || 0,
    hasReply: !!(r.shop_reply as string)?.trim(),
  }));
}

