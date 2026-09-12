import { redirect } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { loadShopDetails, loadShopOverviewStats, loadStaffMembers, STAFF_PAGE_SIZE } from '@/lib/shop';
import Sidebar from '@/components/dashboard/sidebar';
import Topbar from '@/components/dashboard/topbar';

function formatMemberSince(dateString: string | null) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatJoinedDate(dateString: string | null) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '—';
  return 'Joined ' + date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const ROLE_LABELS: Record<string, string> = { manager: 'Manager', staff: 'Staff' };

// Server Component: ported 1:1 (layout/copy) from my-shop.html — Shop
// Overview, Shop Information, Shop Visuals, Team Members. All data is
// fetched server-side before render (shop details, product/rating stats,
// staff list), so the page arrives fully populated with no client-side
// loading skeleton.
export default async function MyShopPage({ searchParams }: { searchParams: Promise<{ staffPage?: string }> }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const meta = (user.user_metadata as Record<string, unknown>) || {};
  const isOnboarded = !!meta.sx_onboarded;
  if (!isOnboarded) {
    redirect('/onboarding');
  }

  const shop = await loadShopDetails(supabase, user);
  const isStaff = meta.sx_shop_role === 'staff';
  if (isStaff && !shop) {
    redirect('/staff-join');
  }

  const details = shop!;
  const staffPage = Math.max(1, Number((await searchParams).staffPage) || 1);
  const staffOffset = (staffPage - 1) * STAFF_PAGE_SIZE;
  const [stats, staffResult] = await Promise.all([
    details.id ? loadShopOverviewStats(supabase, details.id) : Promise.resolve({ productCount: 0, avgRating: null }),
    details.id
      ? loadStaffMembers(supabase, details.id, { offset: staffOffset })
      : Promise.resolve({ staff: [], totalCount: 0 }),
  ]);
  const { staff, totalCount: staffTotalCount } = staffResult;
  const staffTotalPages = Math.max(1, Math.ceil(staffTotalCount / STAFF_PAGE_SIZE));

  const shopMeta = details.category
    ? details.category + (details.marketPlatform !== 'Not set yet' ? ' · ' + details.marketPlatform : '')
    : details.marketPlatform;
  const shopInitial = details.shopName.charAt(0).toUpperCase() || 'S';
  const fullStars = Math.round(stats.avgRating ?? 0);
  const canManageTeam = details.role === 'owner' || details.role === 'manager';

  return (
    <div className="flex min-h-screen bg-[#392065]">
      <Sidebar
        shopName={details.shopName}
        shopMeta={shopMeta}
        shopInitial={shopInitial}
        logoUrl={details.logoUrl}
        isStaff={details.isStaff}
        role={details.role}
      />

      <div className="flex min-w-0 flex-1 flex-col bg-[#f8f9fa] text-[#1d2734]">
        <Topbar firstName={((meta.sx_full_name as string) || '').trim().split(' ')[0] || 'there'} profileInitial={shopInitial} />

        <div className="min-w-0 flex-1 px-8 pb-12 pt-7 max-md:px-4.5 max-md:pb-24 max-md:pt-5.5">
          <h1 className="text-[1.5rem] font-extrabold">My Shop</h1>
          <p className="mb-5.5 mt-1 text-[0.86rem] text-[#6b7280]">Manage your shop information, products and settings.</p>

          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[3fr_2fr]">
            {/* Main column */}
            <div className="flex flex-col gap-5">
              {/* Shop Overview */}
              <div className="rounded-[14px] border border-[#e2e3e6] bg-white p-5.5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-[0.98rem] font-bold">Shop Overview</h2>
                  <a href="#" className="border-b border-[#6c5ce7] text-[0.76rem] font-bold text-[#6c5ce7] hover:text-[#1d2734]">
                    ✎ Edit Profile
                  </a>
                </div>

                <div className="flex flex-wrap justify-between gap-6 max-md:flex-col">
                  <div className="flex min-w-0 flex-1 gap-3.5">
                    <div className="flex h-17 w-17 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#e5e6e8]">
                      {details.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={details.logoUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[1.3rem] font-extrabold text-[#1d2734]">{shopInitial}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="text-[1.05rem] font-extrabold">{details.shopName}</span>
                        <span className="rounded-full bg-[#c7c9cc] px-2.5 py-0.75 text-[0.66rem] font-bold text-[#1d2734]">Open</span>
                      </div>
                      <div className="mt-0.75 text-[0.8rem] text-[#6b7280]">{shopMeta}</div>
                      <div className="mt-2.5 flex flex-wrap gap-4 text-[0.8rem] text-[#6b7280]">
                        <span>📞 {details.phone || '—'}</span>
                        <span>💬 {details.whatsapp || '—'}</span>
                      </div>
                      <div className="mt-1.5 text-[0.8rem] text-[#6b7280]">📍 {details.location || '—'}</div>
                      {details.tagline && <p className="mt-2.5 max-w-[420px] text-[0.8rem] text-[#6b7280]">{details.tagline}</p>}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col gap-3 max-md:mt-1 max-md:w-full max-md:flex-row max-md:justify-between max-md:gap-2.5">
                    <OverviewStat icon="📅" label="Member Since" value={formatMemberSince(details.memberSince)} />
                    <OverviewStat
                      icon={<Image src="/assets/parcel.png" alt="" width={15} height={15} className="h-[15px] w-[15px] object-contain" />}
                      label="Total Products"
                      value={String(stats.productCount)}
                    />
                    <OverviewStat
                      icon="⭐"
                      label="Shop Rating"
                      value={
                        <>
                          {stats.avgRating !== null ? stats.avgRating.toFixed(1) : '0.0'}{' '}
                          <span className="text-[0.72rem] text-[#f4b740]">
                            {'★'.repeat(fullStars)}
                            {'☆'.repeat(5 - fullStars)}
                          </span>
                        </>
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Shop Information */}
              <div className="rounded-[14px] border border-[#e2e3e6] bg-white p-5.5">
                <h2 className="mb-4 text-[0.98rem] font-bold">Shop Information</h2>
                <div className="flex flex-col">
                  <InfoRow label="Shop Name" value={details.shopName} />
                  <InfoRow label="Category" value={details.category || '—'} />
                  <InfoRow label="Market Platform" value={details.marketPlatform} editHref="/onboarding/step2" />
                  <InfoRow label="Phone Number (Public)" value={details.phone || '—'} editHref="/onboarding/step2" />
                  <InfoRow label="WhatsApp Number (Public)" value={details.whatsapp || '—'} editHref="/onboarding/step2" />
                  <InfoRow label="Shop Address" value={details.location || '—'} />
                  <InfoRow label="Shop Tagline" value={details.tagline || '—'} isLast />
                </div>
              </div>
            </div>

            {/* Side column */}
            <div className="flex flex-col gap-5">
              {/* Shop Visuals */}
              <div className="rounded-[14px] border border-[#e2e3e6] bg-white p-5.5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-[0.98rem] font-bold">Shop Visuals</h2>
                  <a href="#" className="border-b border-[#6c5ce7] text-[0.76rem] font-bold text-[#6c5ce7] hover:text-[#1d2734]">
                    Edit
                  </a>
                </div>
                <div className="flex gap-3.5 max-[480px]:flex-col">
                  <div className="w-30 shrink-0 max-[480px]:w-full">
                    <div className="mb-1.5 text-[0.74rem] text-[#6b7280]">Shop Logo</div>
                    <div className="flex h-27.5 items-center justify-center overflow-hidden rounded-[10px] border border-[#e2e3e6] bg-[#e5e6e8] text-[0.72rem] text-[#6b7280]">
                      {details.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={details.logoUrl} alt="Shop logo" className="h-full w-full object-cover" />
                      ) : (
                        'No logo yet'
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 text-[0.74rem] text-[#6b7280]">Shop Banner</div>
                    <div className="flex h-27.5 items-center justify-center overflow-hidden rounded-[10px] border border-[#e2e3e6] bg-[#e5e6e8] text-[0.72rem] text-[#6b7280]">
                      {details.bannerUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={details.bannerUrl} alt="Shop banner" className="h-full w-full object-cover" />
                      ) : (
                        'No banner yet'
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Team Members */}
              <div className="rounded-[14px] border border-[#e2e3e6] bg-white p-5.5">
                <h2 className="text-[0.98rem] font-bold">Team Members</h2>
                <p className="mb-4 mt-1 text-[0.78rem] text-[#6b7280]">Invite people to help manage your shop.</p>

<div className="mb-4.5 rounded-xl border border-[#e2e3e6] p-3.5 px-4 max-md:text-center">
                  <div className="mb-1 text-[0.82rem] font-bold">Invitation Code</div>
                  <div className="mb-3 text-[0.74rem] text-[#6b7280]">
                    Share this code with trusted people so they can request access to your shop.
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 max-md:flex-col max-md:items-center max-md:gap-3.5">
                    <span className="flex-1 whitespace-nowrap font-mono text-[0.95rem] font-extrabold tracking-wide max-md:flex max-md:w-full max-md:justify-center max-md:text-[1.3rem]">
                      {details.inviteCode || 'Not generated yet'}
                    </span>
                    <button
                      type="button"
                      className="whitespace-nowrap rounded-lg border border-[#e2e3e6] bg-white px-3 py-1.75 text-[0.76rem] font-bold hover:bg-[#e5e6e8] max-md:w-full max-md:max-w-65"
                    >
                      Copy Code
                    </button>
                    <a href="#" className="ml-auto whitespace-nowrap border-b border-[#6c5ce7] text-[0.76rem] font-bold text-[#6c5ce7] hover:text-[#1d2734] max-md:ml-0">
                      ↻ Generate New Code
                    </a>
                  </div>
                </div>

                <div className="mb-0.5 text-[0.82rem] font-bold">Staff List</div>
                <p className="mb-3 text-[0.74rem] text-[#6b7280]">Manage your team members and their access.</p>

                {staff.length === 0 ? (
                  <p className="py-2 text-[0.78rem] text-[#6b7280]">No team members yet.</p>
                ) : (
                  <div>
                    {staff.map((member, i) => (
                      <div
                        key={member.id}
                        className={`flex items-center gap-2.5 py-2.5 ${i < staff.length - 1 ? 'border-b border-[#e2e3e6]' : ''}`}
                      >
                        <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full bg-[#e5e6e8] text-[0.78rem] font-extrabold text-[#1d2734]">
                          {member.fullName.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[0.84rem] font-bold">{member.fullName}</div>
                          <div className="mt-0.25 text-[0.7rem] text-[#6b7280]">{formatJoinedDate(member.joinedAt)}</div>
                        </div>
                        {member.role ? (
                          <span
                            className={
                              canManageTeam
                                ? 'shrink-0 rounded-lg border border-[#e2e3e6] bg-white px-2 py-1.25 text-[0.78rem] font-semibold'
                                : 'shrink-0 whitespace-nowrap rounded-full bg-[#fdf1cf] px-2.5 py-0.75 text-[0.68rem] font-bold text-[#8a6400]'
                            }
                          >
                            {ROLE_LABELS[member.role] || member.role}
                          </span>
                        ) : (
                          <span className="shrink-0 whitespace-nowrap rounded-full bg-[#fdf1cf] px-2.5 py-0.75 text-[0.68rem] font-bold text-[#8a6400]">
                            Pending
                          </span>
                        )}
                        {canManageTeam && (
                          <span className="shrink-0 cursor-pointer text-[0.76rem] font-bold text-[#6b7280] hover:text-[#c0392b]">Remove</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {staffTotalPages > 1 && (
                  <div className="mt-3.5 flex items-center justify-between text-[0.76rem] text-[#6b7280]">
                    <span>
                      Page {staffPage} of {staffTotalPages} ({staffTotalCount} total)
                    </span>
                    <div className="flex gap-2">
                      <a
                        href={staffPage > 1 ? `/my-shop?staffPage=${staffPage - 1}` : '#'}
                        aria-disabled={staffPage <= 1}
                        className={`rounded-lg border border-[#e2e3e6] px-2.5 py-1.25 font-bold ${
                          staffPage <= 1 ? 'pointer-events-none opacity-40' : 'hover:bg-[#e5e6e8]'
                        }`}
                      >
                        ← Prev
                      </a>
                      <a
                        href={staffPage < staffTotalPages ? `/my-shop?staffPage=${staffPage + 1}` : '#'}
                        aria-disabled={staffPage >= staffTotalPages}
                        className={`rounded-lg border border-[#e2e3e6] px-2.5 py-1.25 font-bold ${
                          staffPage >= staffTotalPages ? 'pointer-events-none opacity-40' : 'hover:bg-[#e5e6e8]'
                        }`}
                      >
                        Next →
                      </a>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2 border-t border-[#e2e3e6] pt-3.5 text-[0.74rem] text-[#6b7280]">
                  <Image src="/assets/lock.png" alt="" width={14} height={14} className="h-3.5 w-3.5 shrink-0 object-contain" />
                  Only people with an assigned role can access and manage your shop.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[#e2e3e6] px-8 py-4.5 text-[0.74rem] text-[#6b7280] max-md:mb-16 max-md:flex-col max-md:items-start max-md:gap-2 max-md:px-4.5">
          <div>© 2026 Oshodi Market Online. All rights reserved.</div>
          <div className="flex gap-4.5">
            <a href="/terms">Terms &amp; Conditions</a>
            <a href="/privacy">Privacy Policy</a>
            <a href="#">Contact Support</a>
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 max-md:min-w-0 max-md:flex-1 max-md:items-start max-[480px]:flex-col max-[480px]:items-start max-[480px]:gap-1.5">
      <div className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full border border-[#e2e3e6] bg-[#e5e6e8] text-[0.8rem]">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="truncate text-[0.68rem] text-[#6b7280]">{label}</div>
        <div className="truncate text-[0.86rem] font-bold">{value}</div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  editHref,
  isLast,
}: {
  label: string;
  value: string;
  editHref?: string;
  isLast?: boolean;
}) {
  return (
    <div className={`flex items-start gap-3 py-3 ${isLast ? '' : 'border-b border-[#e2e3e6]'}`}>
      <span className="w-40 shrink-0 text-[0.78rem] text-[#6b7280]">{label}</span>
      <span className="min-w-0 flex-1 text-[0.84rem] font-semibold">{value}</span>
      <a href={editHref || '#'} className="shrink-0 border-b border-[#6c5ce7] text-[0.76rem] font-bold text-[#6c5ce7] hover:text-[#1d2734]">
        Edit
      </a>
    </div>
  );
}
