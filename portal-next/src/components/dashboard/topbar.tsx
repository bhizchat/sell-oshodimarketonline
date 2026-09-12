'use client';

import { useState } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { toggleMobileNav } from './mobile-nav-store';

export type TopbarProps = {
  firstName: string;
  profileInitial: string;
};

// Topbar ported 1:1 from dashboard.html's <div class="topbar">: logout
// button + profile chip with dropdown menu (Log Out / Delete Account). On
// mobile a hamburger button (opens the Sidebar's off-canvas drawer) and a
// small logo appear on the left, and the standalone Log Out button hides
// since it's redundant with the bottom tab bar + drawer's own logout.
export default function Topbar({ firstName, profileInitial }: TopbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  // Ported (and upgraded from window.confirm to an in-app modal, opened via
  // handleDeleteAccount below) from sx-auth.js's deleteAccount(): calls the
  // sx_delete_account SECURITY DEFINER RPC (see sx-delete-account-schema.sql),
  // which deletes the caller's auth.users row and cascades to their
  // sx_shops, sx_products, and sx_shop_members rows — freeing up their
  // email for a fresh signup. Irreversible, so this always confirms with
  // the user first.
  function handleDeleteAccount() {
    setMenuOpen(false);
    setDeleteError('');
    setDeleteModalOpen(true);
  }

  async function confirmDeleteAccount() {
    setDeleting(true);
    setDeleteError('');
    const supabase = createClient();
    const { error } = await supabase.rpc('sx_delete_account');
    if (error) {
      setDeleting(false);
      setDeleteError(error.message);
      return;
    }

    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <div className="flex items-center justify-between border-b border-[#e2e3e6] px-8 py-5 max-md:px-4.5 max-md:py-4">
      <button
        type="button"
        onClick={toggleMobileNav}
        aria-label="Open menu"
        className="hidden h-9 w-9 items-center justify-center rounded-lg text-[1.15rem] text-[#6b7280] max-md:flex"
      >
        ☰
      </button>

      <div className="hidden items-center max-md:flex">
        <Image src="/assets/oshodi-logo.png" alt="Oshodi Market Online logo" width={104} height={26} className="h-auto w-26 object-contain" />
      </div>

      <div className="ml-auto flex items-center gap-4.5 max-md:gap-3">
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#392065] px-3.5 py-2 text-[0.78rem] font-bold text-[#e88888] hover:border-[#e04b4b]/30 hover:bg-[#e04b4b]/[0.14] hover:text-[#ff8080] max-md:hidden"
        >
          &#10148; Log Out
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full px-2.5 py-1.5 hover:bg-[#392065]/5"
          >
            <div className="flex h-8.5 w-8.5 items-center justify-center rounded-full bg-[#e5e6e8] text-[0.82rem] font-extrabold text-[#1d2734]">
              {profileInitial}
            </div>
            <div className="text-left text-[0.72rem] leading-tight text-[#6b7280]">
              Good morning,
              <strong className="block text-[0.82rem] font-bold text-[#1d2734]">{firstName}</strong>
            </div>
            <span className={`ml-1 text-[0.95rem] font-extrabold text-[#6b7280] transition-transform ${menuOpen ? 'rotate-180' : ''}`}>
              &#9662;
            </span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-[calc(100%+12px)] z-[200] flex min-w-[160px] flex-col gap-0.5 rounded-[10px] border border-white/[0.08] bg-[#392065] p-1.5 shadow-[0_10px_28px_rgba(0,0,0,0.45)]">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full rounded-lg px-2.5 py-2.25 text-left text-[0.82rem] font-semibold text-[#e88888] hover:bg-[#e04b4b]/[0.14] hover:text-[#ff8080]"
              >
                &#10148; Log Out
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="w-full rounded-lg px-2.5 py-2.25 text-left text-[0.82rem] font-semibold text-[#e88888] hover:bg-[#e04b4b]/[0.14] hover:text-[#ff8080]"
              >
                &#10148; Delete Account
              </button>
            </div>
          )}
        </div>
      </div>

      {deleteModalOpen && (
        <div
          className="fixed inset-0 z-500 flex items-center justify-center bg-black/55 p-5"
          onClick={(e) => {
            if (e.target === e.currentTarget && !deleting) setDeleteModalOpen(false);
          }}
        >
          <div className="w-full max-w-105 rounded-2xl border border-[#e2e3e6] bg-white p-6">
            <div className="text-[1.05rem] font-extrabold text-[#1d2734]">Delete your account?</div>
            <p className="mt-2.5 text-[0.86rem] leading-relaxed text-[#6b7280]">
              This permanently removes your shop, all its products, and your team data. This cannot be undone.
            </p>
            {deleteError && (
              <div className="mt-3 rounded-lg border border-[#e04b4b]/30 bg-[#e04b4b]/[0.08] px-3 py-2 text-[0.8rem] font-semibold text-[#c0392b]">
                Could not delete your account: {deleteError}
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteModalOpen(false)}
                className="rounded-lg border border-[#e2e3e6] px-4 py-2.25 text-[0.82rem] font-bold text-[#1d2734] hover:bg-[#e5e6e8] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDeleteAccount}
                className="rounded-lg bg-[#e04b4b] px-4 py-2.25 text-[0.82rem] font-bold text-white hover:bg-[#c0392b] disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Yes, Delete Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
