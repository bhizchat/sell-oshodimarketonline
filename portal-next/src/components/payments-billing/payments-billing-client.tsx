'use client';

import Image from 'next/image';
import Script from 'next/script';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { BillingMethod, SubscriptionStatus } from '@/lib/shop';

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
  hasAccess: boolean;
  billingMethod: BillingMethod;
  accessUntil: string | null;
  cancelAtPeriodEnd: boolean;
  subscriptionStatus: SubscriptionStatus;
  isTrialEligible: boolean;
};

type PaymentMethod = 'card' | 'transfer';

export default function PaymentsBillingClient({
  isStaff,
  hasAccess,
  billingMethod,
  accessUntil,
  cancelAtPeriodEnd,
  subscriptionStatus,
  isTrialEligible,
}: PaymentsBillingClientProps) {
  const router = useRouter();
  const [dates, setDates] = useState<TrialDates | null>(null);
  const [error, setError] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('card');
  const [renewing, setRenewing] = useState(false);
  const [status, setStatus] = useState<
    'idle' | 'starting' | 'awaiting-checkout' | 'verifying' | 'confirming' | 'success'
  >('idle');
  const [scriptReady, setScriptReady] = useState(false);
  const [successMethod, setSuccessMethod] = useState<PaymentMethod | null>(null);
  const [wasTrialStart, setWasTrialStart] = useState(false);
  const [lastReference, setLastReference] = useState<string | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  // Trial (either method) and a transfer payment always grant 30 days.
  // Only a real (non-trial) card charge runs on a monthly cadence.
  const isTrial = isTrialEligible;

  useEffect(() => {
    const start = new Date();
    const billingDate = new Date(start);
    if (method === 'card' && !isTrial) {
      billingDate.setMonth(billingDate.getMonth() + 1);
    } else {
      billingDate.setDate(billingDate.getDate() + 30);
    }

    setDates({
      period: `${formatDate(start)} \u2013 ${formatDate(billingDate)}`,
      starts: formatDate(start),
      firstBilling: formatDate(billingDate),
      cancelBy: formatDate(billingDate),
    });
  }, [method, isTrial]);

  // Bank transfers are confirmed asynchronously — Paystack's own systems
  // can take a little while to reflect a transfer that has genuinely
  // cleared, even though the popup already closed. So instead of treating
  // a single failed /verify check as "payment failed", we poll a few
  // times before giving up. Card verification is a normal instant charge,
  // so it only ever needs a single check.
  const POLL_INTERVAL_MS = 4000;
  const MAX_POLL_ATTEMPTS = 15; // ~1 minute of polling for slow transfers

  async function verifyOnce(reference: string): Promise<'success' | 'failed' | 'pending'> {
    try {
      const verifyRes = await fetch(`/api/paystack/verify?reference=${encodeURIComponent(reference)}`);
      const verifyJson = await verifyRes.json();
      if (verifyRes.ok && verifyJson.status === 'success') return 'success';
      if (verifyRes.ok && verifyJson.status === 'failed') return 'failed';
      return 'pending';
    } catch {
      return 'pending';
    }
  }

  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function confirmPayment(reference: string) {
    setLastReference(reference);
    setStatus('verifying');

    const maxAttempts = method === 'transfer' ? MAX_POLL_ATTEMPTS : 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const result = await verifyOnce(reference);

      if (result === 'success') {
        setStatus('success');
        setSuccessMethod(method);
        setError('');
        router.refresh();
        return;
      }

      if (result === 'failed') {
        setError(
          method === 'transfer'
            ? `We could not confirm your transfer. If money already left your account, contact support with reference ${reference}.`
            : 'We could not confirm your card verification. Please try again.'
        );
        setStatus('idle');
        return;
      }

      if (attempt < maxAttempts - 1) {
        setStatus('confirming');
        await sleep(POLL_INTERVAL_MS);
      }
    }

    setError(
      'We could not confirm your transfer yet. If you already sent the money, this can take a few minutes to reflect — click "Check again" below once you\'re sure it went through.'
    );
    setStatus('idle');
  }

  async function handleCheckAgain() {
    if (!lastReference) return;
    await confirmPayment(lastReference);
  }

  async function handleStartTransferTrial() {
    setError('');
    setWasTrialStart(true);
    setStatus('starting');

    try {
      const initRes = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'transfer' }),
      });
      const initJson = await initRes.json();

      if (!initRes.ok || !initJson.trialStarted) {
        throw new Error(initJson.error || 'Could not start your free trial.');
      }

      setSuccessMethod('transfer');
      setStatus('success');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start your free trial.');
      setStatus('idle');
    }
  }

  async function handlePay() {
    if (method === 'transfer' && isTrial) {
      await handleStartTransferTrial();
      return;
    }

    if (!scriptReady || !window.PaystackPop) return;
    setError('');
    setWasTrialStart(isTrial);
    setStatus('starting');

    try {
      const initRes = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method }),
      });
      const initJson = await initRes.json();

      if (!initRes.ok) {
        throw new Error(initJson.error || 'Could not start checkout.');
      }

      setStatus('awaiting-checkout');
      const popup = new window.PaystackPop();
      popup.resumeTransaction(initJson.accessCode, {
        onSuccess: (transaction) => {
          void confirmPayment(transaction.reference);
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

  function handleRenewNow() {
    setMethod('transfer');
    setRenewing(true);
    setError('');
  }

  async function handleConfirmCancel() {
    setCanceling(true);
    setCancelError('');
    try {
      const res = await fetch('/api/paystack/cancel-subscription', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Could not cancel subscription.');
      }
      setConfirmingCancel(false);
      router.refresh();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Could not cancel subscription.');
    } finally {
      setCanceling(false);
    }
  }

  const showCheckout = status === 'success' ? false : !hasAccess || renewing;

  return (
    <>
      <Script
        src="https://js.paystack.co/v2/inline.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onError={() => setError('Could not load the payment form. Please check your connection and refresh the page.')}
      />

      {showCheckout && (
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
      )}

      {status === 'success' && successMethod ? (
        <div className="mx-auto max-w-xl rounded-[14px] border border-[#bfe8cf] bg-white p-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#1e8b4a]/10 text-[1.8rem] text-[#1e8b4a]">
            ✓
          </div>
          <h2 className="mb-1.5 text-[1.15rem] font-extrabold text-[#1d2734]">
            {wasTrialStart
              ? 'Your free trial has started!'
              : successMethod === 'card'
                ? 'Payment received — your subscription is active!'
                : "Payment received — you're subscribed!"}
          </h2>
          <p className="mb-5 text-[0.85rem] text-[#6b7280]">
            {wasTrialStart
              ? successMethod === 'card'
                ? `Your card is verified and saved. Enjoy 30 days free, then we'll auto-charge ₦10,000/month starting ${dates?.firstBilling ?? 'in 30 days'} unless you cancel.`
                : `No payment was needed. You now have full access to your dashboard for 30 days — pay ₦10,000 via bank transfer before ${dates?.firstBilling ?? 'your trial ends'} to keep it active.`
              : successMethod === 'card'
                ? `You're all set with the Seller Plan. We'll auto-charge ₦10,000/month starting ${dates?.firstBilling ?? 'next month'} unless you cancel.`
                : `Your bank transfer was confirmed. You now have full access to your dashboard until ${dates?.firstBilling ?? 'your next renewal date'}.`}
          </p>

          <div className="mb-6 flex flex-col gap-2.5 rounded-[10px] border border-[#e2e3e6] bg-[#f8f9fa] p-3.5 text-left">
            <div className="flex items-center justify-between text-[0.78rem]">
              <span className="text-[#6b7280]">Plan</span>
              <span className="font-bold">Seller Plan</span>
            </div>
            <div className="flex items-center justify-between text-[0.78rem]">
              <span className="text-[#6b7280]">Access Period</span>
              <span className="font-bold">{dates?.period ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between text-[0.78rem]">
              <span className="text-[#6b7280]">
                {wasTrialStart ? 'Free Trial Ends' : successMethod === 'card' ? 'Next Billing Date' : 'Renew By'}
              </span>
              <span className="font-bold">{dates?.firstBilling ?? '—'}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-1.5 rounded-[9px] bg-[#1e8b4a] px-5 py-2.5 text-[0.82rem] font-bold text-white hover:bg-[#197a40]"
          >
            Go to Dashboard →
          </button>
        </div>
      ) : !showCheckout ? (
        <div className="mx-auto max-w-xl rounded-[14px] border border-[#e2e3e6] bg-white p-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-11.5 w-11.5 items-center justify-center rounded-xl bg-[#e5e6e8] text-[1.3rem]">🏬</div>
            <div>
              <div className="text-[1.05rem] font-extrabold">Seller Plan</div>
              <div className="text-[0.78rem] text-[#6b7280]">
                {billingMethod === 'transfer' ? 'Paid via Bank Transfer' : 'Paid via Card (auto-renews)'}
              </div>
            </div>
            <span
              className={`ml-auto rounded-full px-3 py-1 text-[0.74rem] font-bold ${
                subscriptionStatus === 'trialing' ? 'bg-[#6c5ce7]/10 text-[#6c5ce7]' : 'bg-[#1e8b4a]/10 text-[#1e8b4a]'
              }`}
            >
              {subscriptionStatus === 'trialing' ? 'Free Trial' : 'Active'}
            </span>
          </div>

          <div className="mb-5 flex flex-col gap-2.5 rounded-[10px] border border-[#e2e3e6] bg-[#f8f9fa] p-3.5">
            <div className="flex items-center justify-between text-[0.78rem]">
              <span className="text-[#6b7280]">
                {subscriptionStatus === 'trialing' ? 'Free Trial Ends' : billingMethod === 'transfer' ? 'Renew By' : 'Next Billing Date'}
              </span>
              <span className="font-bold">{accessUntil ? formatDate(new Date(accessUntil)) : '—'}</span>
            </div>
            <div className="flex items-center justify-between text-[0.78rem]">
              <span className="text-[#6b7280]">Amount</span>
              <span className="font-bold">
                {subscriptionStatus === 'trialing'
                  ? billingMethod === 'transfer'
                    ? 'Free (30 days)'
                    : '₦10,000 / month after trial'
                  : billingMethod === 'transfer'
                    ? '₦10,000 / 30 days'
                    : '₦10,000 / month'}
              </span>
            </div>
          </div>

          {billingMethod === 'transfer' ? (
            <>
              <div className="mb-5 flex items-start gap-2 rounded-[10px] border border-[#f4b740]/35 bg-[#f4b740]/10 p-2.5 px-3 text-[0.76rem]">
                <span className="shrink-0">⏰</span>
                <span>
                  {subscriptionStatus === 'trialing' ? (
                    <>
                      Your free trial doesn&apos;t auto-renew. Pay <strong>₦10,000</strong> any time before{' '}
                      <strong>{accessUntil ? formatDate(new Date(accessUntil)) : 'your trial end date'}</strong> to keep
                      access.
                    </>
                  ) : (
                    <>
                      Bank transfer doesn&apos;t auto-renew. Pay again any time before{' '}
                      <strong>{accessUntil ? formatDate(new Date(accessUntil)) : 'your renewal date'}</strong> to keep
                      access.
                    </>
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={handleRenewNow}
                className="inline-flex items-center gap-1.5 rounded-[9px] bg-[#1e8b4a] px-5 py-2.5 text-[0.82rem] font-bold text-white hover:bg-[#197a40]"
              >
                {subscriptionStatus === 'trialing' ? 'Pay Now' : 'Renew Now'}
              </button>
            </>
          ) : (
            <>
              <div className="mb-5 flex items-start gap-2 rounded-[10px] border border-[#1e8b4a]/25 bg-[#1e8b4a]/8 p-2.5 px-3 text-[0.76rem]">
                <span className="shrink-0 text-[#1e8b4a]">🛡</span>
                <span>
                  {subscriptionStatus === 'trialing'
                    ? `You're on a free trial — your card is saved and will be auto-charged ₦10,000/month starting ${accessUntil ? formatDate(new Date(accessUntil)) : 'when your trial ends'}. Contact support to make changes.`
                    : 'Your card auto-renews ₦10,000/month — no action needed. Contact support to make changes.'}
                </span>
              </div>

              {cancelAtPeriodEnd ? (
                <div className="flex items-start gap-2 rounded-[10px] border border-[#f4b740]/35 bg-[#f4b740]/10 p-2.5 px-3 text-[0.76rem]">
                  <span className="shrink-0">⏰</span>
                  <span>
                    Your subscription is canceled and won&apos;t renew. You&apos;ll keep access until{' '}
                    <strong>{accessUntil ? formatDate(new Date(accessUntil)) : 'your current period ends'}</strong>.
                  </span>
                </div>
              ) : confirmingCancel ? (
                <div className="rounded-[10px] border border-[#e2554a]/30 bg-[#e2554a]/8 p-3 px-3.5">
                  <p className="mb-3 text-[0.8rem] font-bold text-[#b3261e]">
                    Cancel your subscription? You&apos;ll keep access until{' '}
                    {accessUntil ? formatDate(new Date(accessUntil)) : 'your current period ends'}, then it won&apos;t renew.
                  </p>
                  {cancelError && <p className="mb-3 text-[0.76rem] text-[#b3261e]">{cancelError}</p>}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleConfirmCancel}
                      disabled={canceling}
                      className="rounded-[9px] bg-[#b3261e] px-4 py-2 text-[0.78rem] font-bold text-white hover:bg-[#98201a] disabled:opacity-70"
                    >
                      {canceling ? 'Canceling…' : 'Yes, cancel'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmingCancel(false);
                        setCancelError('');
                      }}
                      disabled={canceling}
                      className="rounded-[9px] border border-[#e2e3e6] bg-white px-4 py-2 text-[0.78rem] font-bold text-[#1d2734] hover:bg-[#f8f9fa] disabled:opacity-70"
                    >
                      No, keep it
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingCancel(true)}
                  className="text-[0.78rem] font-bold text-[#b3261e] underline underline-offset-2 hover:text-[#98201a]"
                >
                  Cancel Subscription
                </button>
              )}
            </>
          )}
        </div>
      ) : (
      <div className="grid items-start gap-5 grid-cols-[minmax(0,1.4fr)_minmax(0,2.4fr)] max-[780px]:grid-cols-1">
        <div className="rounded-[14px] border border-[#e2e3e6] bg-white p-5.5 px-6 max-[780px]:order-2">
          <div className="mb-3.5 flex h-11.5 w-11.5 items-center justify-center rounded-xl bg-[#e5e6e8] text-[1.3rem]">🏬</div>
          <div className="text-[0.76rem] text-[#6b7280]">Seller Plan</div>
          <div className="mt-0.5 text-[1.15rem] font-extrabold">Seller Plan</div>
          <div className="mb-4 mt-px text-[0.8rem] text-[#6b7280]">
            {isTrial ? '30-day free trial' : method === 'card' ? 'for 1 month' : '30 days access'}
          </div>

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
              <span className="text-[#6b7280]">Access Period</span>
              <span className="font-bold">{dates?.period ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between text-[0.78rem]">
              <span className="text-[#6b7280]">Starts</span>
              <span className="font-bold">{dates?.starts ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between text-[0.78rem]">
              <span className="text-[#6b7280]">{isTrial ? 'Free Trial Ends' : method === 'card' ? 'Next Billing Date' : 'Renew By'}</span>
              <span className="font-bold">{dates?.firstBilling ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between text-[0.78rem]">
              <span className="text-[#6b7280]">Amount</span>
              <span className="font-bold">
                {isTrial ? (method === 'card' ? '₦50 (refundable)' : 'Free') : method === 'card' ? '₦10,000 / month' : '₦10,000 now'}
              </span>
            </div>
          </div>

          {method === 'card' ? (
            <div className="flex items-start gap-2 rounded-[10px] border border-[#1e8b4a]/25 bg-[#1e8b4a]/8 p-2.5 px-3 text-[0.76rem]">
              <span className="shrink-0 text-[#1e8b4a]">🛡</span>
              <span>
                {isTrial ? (
                  <>
                    You&apos;ll be charged a refundable <strong>₦50</strong> to verify your card. Enjoy 30 days free, then
                    we&apos;ll auto-charge ₦10,000/month starting <strong>{dates?.cancelBy ?? '—'}</strong> unless you
                    cancel.
                  </>
                ) : (
                  <>
                    You&apos;ll be charged ₦10,000 now. Cancel anytime before <strong>{dates?.cancelBy ?? '—'}</strong> to
                    avoid next month&apos;s charge.
                  </>
                )}
              </span>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-[10px] border border-[#f4b740]/35 bg-[#f4b740]/10 p-2.5 px-3 text-[0.76rem]">
              <span className="shrink-0">⏰</span>
              <span>
                {isTrial ? (
                  <>
                    No payment needed today. Pay ₦10,000 before <strong>{dates?.firstBilling ?? '—'}</strong> to keep
                    access — trials don&apos;t auto-renew.
                  </>
                ) : (
                  <>
                    Access ends on <strong>{dates?.firstBilling ?? '—'}</strong> unless you pay again — there&apos;s no
                    auto-renewal with bank transfer.
                  </>
                )}
              </span>
            </div>
          )}
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
              <div className="mb-4 grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setMethod('card')}
                  disabled={status !== 'idle'}
                  className={`rounded-[10px] border px-3.5 py-3 text-left text-[0.82rem] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
                    method === 'card' ? 'border-[#6c5ce7] bg-[#6c5ce7]/8' : 'border-[#e2e3e6] bg-white hover:border-[#c9c5e0]'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Image src="/assets/visa.png" alt="" width={20} height={13} className="h-3.25 w-auto object-contain" />
                    Pay with Card
                  </span>
                  <span className="mt-1 block text-[0.72rem] font-normal text-[#6b7280]">
                    {isTrial ? 'Start free 30-day trial — ₦50 refundable card check' : '₦10,000 charged now, auto-renews monthly'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('transfer')}
                  disabled={status !== 'idle'}
                  className={`rounded-[10px] border px-3.5 py-3 text-left text-[0.82rem] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
                    method === 'transfer' ? 'border-[#6c5ce7] bg-[#6c5ce7]/8' : 'border-[#e2e3e6] bg-white hover:border-[#c9c5e0]'
                  }`}
                >
                  <span className="flex items-center gap-1.5">🏦 Pay with Transfer</span>
                  <span className="mt-1 block text-[0.72rem] font-normal text-[#6b7280]">
                    {isTrial ? 'Start free 30-day trial — no payment now' : '₦10,000 now, 30 days access, renew manually'}
                  </span>
                </button>
              </div>

              {method === 'card' ? (
                <div className="mb-4 flex items-start gap-2.5 rounded-[10px] border border-[#e2e3e6] bg-[#f8f9fa] px-4 py-3.5">
                  <span className="flex shrink-0 items-center gap-1.5">
                    <Image src="/assets/visa.png" alt="Visa" width={28} height={18} className="h-4.5 w-auto object-contain" />
                    <Image src="/assets/mastercard.png" alt="Mastercard" width={28} height={18} className="h-4.5 w-auto object-contain" />
                  </span>
                  <div>
                    <div className="text-[0.84rem] font-bold">Pay securely with Paystack</div>
                    <div className="mt-0.75 text-[0.78rem] text-[#6b7280]">
                      {isTrial ? (
                        <>
                          We&apos;ll place a small, refundable ₦50 charge to verify your card (refunded automatically).
                          Enjoy 30 days free, then we&apos;ll auto-charge ₦10,000/month — cancel anytime to stop future
                          charges.
                        </>
                      ) : (
                        <>
                          You&apos;ll be charged ₦10,000 now for immediate access. Your card is securely saved and
                          auto-charged ₦10,000/month going forward — cancel anytime to stop future charges.
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-4 flex items-start gap-2.5 rounded-[10px] border border-[#e2e3e6] bg-[#f8f9fa] px-4 py-3.5">
                  <span className="flex shrink-0 items-center text-[1.1rem]">🏦</span>
                  <div>
                    <div className="text-[0.84rem] font-bold">{isTrial ? 'Start your free trial' : 'Pay ₦10,000 via bank transfer'}</div>
                    <div className="mt-0.75 text-[0.78rem] text-[#6b7280]">
                      {isTrial ? (
                        <>
                          No payment needed today. You&apos;ll get 30 days of full access immediately — come back and
                          pay ₦10,000 via bank transfer before your trial ends to keep your shop live.
                        </>
                      ) : (
                        <>
                          Paystack will generate a one-time bank account for this payment — no card needed. Once it
                          clears, you get 30 days of full access. Since transfers can&apos;t be auto-charged,
                          you&apos;ll need to come back and pay again before it expires.
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-3.5 flex flex-col gap-2 rounded-[10px] border border-[#ffd4d4] bg-[#fff5f5] px-3.5 py-3">
                  <p className="text-[0.78rem] text-[#c0392b]">{error}</p>
                  {method === 'transfer' && lastReference && (
                    <button
                      type="button"
                      onClick={handleCheckAgain}
                      disabled={status !== 'idle'}
                      className="self-start text-[0.78rem] font-bold text-[#6c5ce7] underline disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Check again
                    </button>
                  )}
                </div>
              )}

              <div className="mt-1 flex items-center justify-between gap-3">
                <a
                  href="/dashboard"
                  onClick={(e) => {
                    if (renewing) {
                      e.preventDefault();
                      setRenewing(false);
                      setError('');
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-[9px] border border-[#e2e3e6] bg-white px-4.5 py-2.5 text-[0.82rem] font-bold text-[#1d2734] hover:border-[#6c5ce7]"
                >
                  ← Back
                </a>
                <button
                  type="button"
                  onClick={handlePay}
                  disabled={status !== 'idle' || (!(method === 'transfer' && isTrial) && !scriptReady)}
                  className="inline-flex items-center gap-1.5 rounded-[9px] bg-[#1e8b4a] px-5 py-2.5 text-[0.82rem] font-bold text-white hover:bg-[#197a40] disabled:cursor-not-allowed disabled:opacity-90"
                >
                  {status === 'idle' && !scriptReady && !(method === 'transfer' && isTrial) && 'Loading payment form...'}
                  {status === 'idle' && (scriptReady || (method === 'transfer' && isTrial)) && (
                    <>
                      <Image src="/assets/lock.png" alt="" width={14} height={14} className="object-contain invert" />
                      {isTrial ? 'Start Free Trial' : method === 'card' ? 'Pay with Card' : 'Pay with Transfer'}
                    </>
                  )}
                  {status === 'starting' && 'Starting checkout...'}
                  {status === 'awaiting-checkout' && 'Waiting for payment...'}
                  {status === 'verifying' && 'Verifying...'}
                  {status === 'confirming' && 'Confirming transfer...'}
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
      )}
    </>
  );
}

