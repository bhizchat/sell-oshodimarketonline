'use client';

import Image from 'next/image';
import Script from 'next/script';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

// Client-side layer for Payments & Billing. Card entry itself happens
// inside Paystack's own secure popup (never on this page/domain) — we
// only ever initialize/verify the transaction through our own backend
// (see /api/paystack/initialize + /verify), matching Paystack's
// recommendation to never expose the secret key to the browser. The
// popup is a modal overlay, so nothing else on the page is clickable
// while checkout is in progress.
declare global {
  interface Window {
    PaystackPop?: new () => {
      resumeTransaction: (
        accessCode: string,
        callbacks: {
          onSuccess?: (transaction: { reference: string }) => void;
          onCancel?: () => void;
          onError?: (error: { message: string }) => void;
        }
      ) => void;
    };
  }
}

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

type TrialDates = {
  period: string;
  starts: string;
  firstBilling: string;
  cancelBy: string;
};

type PaymentsBillingClientProps = {
  isStaff: boolean;
};

export default function PaymentsBillingClient({ isStaff }: PaymentsBillingClientProps) {
  const router = useRouter();
  const [dates, setDates] = useState<TrialDates | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'idle' | 'starting' | 'awaiting-checkout' | 'verifying' | 'done'>('idle');
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    const start = new Date();
    const billingDate = new Date(start);
    billingDate.setMonth(billingDate.getMonth() + 1);

    setDates({
      period: `${formatDate(start)} \u2013 ${formatDate(billingDate)}`,
      starts: formatDate(start),
      firstBilling: formatDate(billingDate),
      cancelBy: formatDate(billingDate),
    });
  }, []);

  async function handlePay() {
    if (!scriptReady || !window.PaystackPop) return;
    setError('');
    setStatus('starting');

    try {
      const initRes = await fetch('/api/paystack/initialize', { method: 'POST' });
      const initJson = await initRes.json();

      if (!initRes.ok) {
        throw new Error(initJson.error || 'Could not start checkout.');
      }

      setStatus('awaiting-checkout');
      const popup = new window.PaystackPop();
      popup.resumeTransaction(initJson.accessCode, {
        onSuccess: async (transaction) => {
          setStatus('verifying');
          try {
            const verifyRes = await fetch(`/api/paystack/verify?reference=${encodeURIComponent(transaction.reference)}`);
            const verifyJson = await verifyRes.json();
            if (verifyRes.ok && verifyJson.status === 'success') {
              setStatus('done');
              router.push('/dashboard');
              router.refresh();
            } else {
              setError('We could not confirm your card verification. Please try again.');
              setStatus('idle');
            }
          } catch {
            setError('We could not confirm your card verification. Please try again.');
            setStatus('idle');
          }
        },
        onCancel: () => setStatus('idle'),
        onError: (err) => {
          setError(err?.message || 'Payment failed. Please try again.');
          setStatus('idle');
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout.');
      setStatus('idle');
    }
  }

  return (
    <>
      <Script
        src="https://js.paystack.co/v2/inline.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onError={() => setError('Could not load the payment form. Please check your connection and refresh the page.')}
      />

      <div className="mb-6 flex items-center gap-2.5">
        <div className="flex items-center gap-2 text-[0.82rem] font-bold text-[#6b7280]">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1e8b4a] text-white">✓</span>
          <span className="text-[#1d2734]">Choose Plan</span>
        </div>
        <div className="h-0.5 w-15 bg-[#1e8b4a]" />
        <div className="flex items-center gap-2 text-[0.82rem] font-bold text-[#6b7280]">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1e8b4a] text-white">2</span>
          <span className="text-[#1d2734]">Payment Details</span>
        </div>
        <div className="h-0.5 w-15 bg-[#e2e3e6]" />
        <div className="flex items-center gap-2 text-[0.82rem] font-bold text-[#6b7280]">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e5e6e8] text-[#6b7280]">3</span>
          <span>Confirmation</span>
        </div>
      </div>

      <div className="grid items-start gap-5 grid-cols-[minmax(0,1.4fr)_minmax(0,2.4fr)] max-[780px]:grid-cols-1">
        <div className="rounded-[14px] border border-[#e2e3e6] bg-white p-5.5 px-6 max-[780px]:order-2">
          <div className="mb-3.5 flex h-11.5 w-11.5 items-center justify-center rounded-xl bg-[#e5e6e8] text-[1.3rem]">🏬</div>
          <div className="text-[0.76rem] text-[#6b7280]">Seller Plan</div>
          <div className="mt-0.5 text-[1.15rem] font-extrabold">Free Trial</div>
          <div className="mb-4 mt-px text-[0.8rem] text-[#6b7280]">for 1 month</div>

          <ul className="mb-4.5 flex flex-col gap-2.5">
            {[
              'Unlimited products',
              'Showcase your products',
              'Receive customer enquiries',
              'Customer reviews',
              'Email & chat support',
              'And much more!',
            ].map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-[0.82rem]">
                <span className="font-extrabold text-[#1e8b4a]">✓</span>
                {feature}
              </li>
            ))}
          </ul>

          <div className="mb-4 flex flex-col gap-2.5 rounded-[10px] border border-[#e2e3e6] bg-[#f8f9fa] p-3 px-3.5">
            <div className="flex items-center justify-between text-[0.78rem]">
              <span className="text-[#6b7280]">Trial Period</span>
              <span className="font-bold">{dates?.period ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between text-[0.78rem]">
              <span className="text-[#6b7280]">Starts</span>
              <span className="font-bold">{dates?.starts ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between text-[0.78rem]">
              <span className="text-[#6b7280]">First Billing Date</span>
              <span className="font-bold">{dates?.firstBilling ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between text-[0.78rem]">
              <span className="text-[#6b7280]">Amount</span>
              <span className="font-bold">₦10,000 / month</span>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-[10px] border border-[#1e8b4a]/25 bg-[#1e8b4a]/8 p-2.5 px-3 text-[0.76rem]">
            <span className="shrink-0 text-[#1e8b4a]">🛡</span>
            <span>
              You can cancel anytime before <strong>{dates?.cancelBy ?? '—'}</strong> to avoid being charged.
            </span>
          </div>
        </div>

        <div className="rounded-[14px] border border-[#e2e3e6] bg-white p-5.5 px-6 max-[780px]:order-1">
          <h2 className="flex items-center gap-2 text-[0.98rem] font-bold">
            <Image src="/assets/lock.png" alt="" width={16} height={16} className="object-contain" />
            Payment Details
          </h2>
          <div className="mb-5 mt-1.5 flex items-center gap-1.5 text-[0.74rem] text-[#6b7280]">
            <Image src="/assets/lock.png" alt="" width={13} height={13} className="object-contain" />
            Your payment information is secure and encrypted.
          </div>

          {isStaff ? (
            <div className="rounded-[10px] border border-[#e2e3e6] bg-[#f8f9fa] px-4 py-5 text-center text-[0.84rem] text-[#6b7280]">
              Only the shop owner can set up billing. Please ask them to complete this step so you can access the dashboard.
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-start gap-2.5 rounded-[10px] border border-[#e2e3e6] bg-[#f8f9fa] px-4 py-3.5">
                <span className="flex shrink-0 items-center gap-1.5">
                  <Image src="/assets/visa.png" alt="Visa" width={28} height={18} className="h-4.5 w-auto object-contain" />
                  <Image src="/assets/mastercard.png" alt="Mastercard" width={28} height={18} className="h-4.5 w-auto object-contain" />
                </span>
                <div>
                  <div className="text-[0.84rem] font-bold">Pay securely with Paystack</div>
                  <div className="mt-0.75 text-[0.78rem] text-[#6b7280]">
                    We&apos;ll verify your card with a refundable ₦50 charge, which is automatically refunded. Your free
                    trial starts right away — you won&apos;t be charged the full ₦10,000 until it ends.
                  </div>
                </div>
              </div>

              {error && <p className="mb-3.5 text-[0.78rem] text-[#ff6b6b]">{error}</p>}

              <div className="mt-1 flex items-center justify-between gap-3">
                <a
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 rounded-[9px] border border-[#e2e3e6] bg-white px-4.5 py-2.5 text-[0.82rem] font-bold text-[#1d2734] hover:border-[#6c5ce7]"
                >
                  ← Back
                </a>
                <button
                  type="button"
                  onClick={handlePay}
                  disabled={status !== 'idle' || !scriptReady}
                  className="inline-flex items-center gap-1.5 rounded-[9px] bg-[#1e8b4a] px-5 py-2.5 text-[0.82rem] font-bold text-white hover:bg-[#197a40] disabled:cursor-not-allowed disabled:opacity-90"
                >
                  {status === 'idle' && !scriptReady && 'Loading payment form...'}
                  {status === 'idle' && scriptReady && (
                    <>
                      <Image src="/assets/lock.png" alt="" width={14} height={14} className="object-contain invert" />
                      Pay with Paystack
                    </>
                  )}
                  {status === 'starting' && 'Starting checkout...'}
                  {status === 'awaiting-checkout' && 'Waiting for payment...'}
                  {status === 'verifying' && 'Verifying...'}
                  {status === 'done' && '✓ Trial Started'}
                </button>
              </div>
              <div className="mt-2.5 text-right text-[0.72rem] text-[#6b7280]">
                By continuing, you agree to our{' '}
                <a href="/terms" className="border-b border-[#e2e3e6] font-bold text-[#1d2734]">
                  Terms &amp; Conditions
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

