'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

// Client-side layer for Payments & Billing's "Start Free Trial" step,
// ported from payments-billing.html's inline <script>. There is no real
// billing backend in the static site — trial dates are computed purely
// client-side (today → +1 month) and the "Start Free Trial" submit is a
// simulated, non-persisted UI transition (button disables and swaps its
// label after a short delay). That exact behavior is preserved here.

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

type TrialDates = {
  period: string;
  starts: string;
  firstBilling: string;
  cancelBy: string;
};

export default function PaymentsBillingClient() {
  const [dates, setDates] = useState<TrialDates | null>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done'>('idle');

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

  function handleCardNumberChange(value: string) {
    const digits = value.replace(/[^0-9]/g, '').slice(0, 16);
    setCardNumber(digits.replace(/(.{4})/g, '$1 ').trim());
  }

  function handleExpiryChange(value: string) {
    let digits = value.replace(/[^0-9]/g, '').slice(0, 4);
    if (digits.length > 2) digits = digits.slice(0, 2) + ' / ' + digits.slice(2);
    setCardExpiry(digits);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const rawCardNumber = cardNumber.replace(/\s/g, '');
    if (
      rawCardNumber.length < 15 ||
      cardExpiry.trim().length < 6 ||
      cardCvv.trim().length < 3 ||
      !cardholderName.trim() ||
      !billingAddress.trim()
    ) {
      setError('Please fill in all payment details correctly before continuing.');
      return;
    }

    setStatus('submitting');
    setTimeout(() => setStatus('done'), 900);
  }

  return (
    <>
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
              <span className="font-bold">₦4,000 / month</span>
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

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="mb-1.5 block text-[0.78rem] font-bold text-[#6b7280]" htmlFor="cardNumber">
                Card Information
              </label>
              <div className="flex items-center gap-2.5 rounded-[9px] border border-[#e2e3e6] bg-[#f8f9fa] px-3 focus-within:border-[#6c5ce7]">
                <Image src="/assets/credit-card.png" alt="" width={20} height={20} className="shrink-0 object-contain" />
                <input
                  id="cardNumber"
                  inputMode="numeric"
                  maxLength={19}
                  placeholder="1234 5678 9012 3456"
                  required
                  value={cardNumber}
                  onChange={(e) => handleCardNumberChange(e.target.value)}
                  className="min-w-0 flex-1 border-none bg-transparent py-2.75 text-[0.85rem] text-[#1d2734] outline-none"
                />
                <span className="flex shrink-0 items-center gap-1.5">
                  <Image src="/assets/visa.png" alt="Visa" width={28} height={18} className="h-4.5 w-auto object-contain" />
                  <Image src="/assets/mastercard.png" alt="Mastercard" width={28} height={18} className="h-4.5 w-auto object-contain" />
                </span>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3.5 max-[780px]:grid-cols-1">
              <div>
                <label className="mb-1.5 block text-[0.78rem] font-bold text-[#6b7280]" htmlFor="cardExpiry">
                  Expiry Date
                </label>
                <input
                  id="cardExpiry"
                  placeholder="MM / YY"
                  maxLength={7}
                  required
                  value={cardExpiry}
                  onChange={(e) => handleExpiryChange(e.target.value)}
                  className="w-full rounded-[9px] border border-[#e2e3e6] bg-[#f8f9fa] px-3 py-2.75 text-[0.85rem] text-[#1d2734] outline-none focus:border-[#6c5ce7]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[0.78rem] font-bold text-[#6b7280]" htmlFor="cardCvv">
                  CVV
                </label>
                <input
                  id="cardCvv"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="123"
                  required
                  value={cardCvv}
                  onChange={(e) => setCardCvv(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                  className="w-full rounded-[9px] border border-[#e2e3e6] bg-[#f8f9fa] px-3 py-2.75 text-[0.85rem] text-[#1d2734] outline-none focus:border-[#6c5ce7]"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-[0.78rem] font-bold text-[#6b7280]" htmlFor="cardholderName">
                Cardholder Name
              </label>
              <input
                id="cardholderName"
                placeholder="Enter cardholder name"
                required
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                className="w-full rounded-[9px] border border-[#e2e3e6] bg-[#f8f9fa] px-3 py-2.75 text-[0.85rem] text-[#1d2734] outline-none focus:border-[#6c5ce7]"
              />
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-[0.78rem] font-bold text-[#6b7280]" htmlFor="billingAddress">
                Billing Address
              </label>
              <input
                id="billingAddress"
                placeholder="Enter billing address"
                required
                value={billingAddress}
                onChange={(e) => setBillingAddress(e.target.value)}
                className="w-full rounded-[9px] border border-[#e2e3e6] bg-[#f8f9fa] px-3 py-2.75 text-[0.85rem] text-[#1d2734] outline-none focus:border-[#6c5ce7]"
              />
              <div className="mt-1.5 text-[0.72rem] text-[#6b7280]">We&apos;ll send your receipt and payment updates to your account email.</div>
            </div>

            <div className="my-5 mb-5.5 flex items-start gap-2.5 rounded-[10px] border border-[#e2e3e6] bg-[#f8f9fa] px-4 py-3.5">
              <span className="shrink-0 text-[1rem] text-[#1d2734]">ℹ</span>
              <div>
                <div className="text-[0.84rem] font-bold">No Charge Due Now</div>
                <div className="mt-0.75 text-[0.78rem] text-[#6b7280]">
                  After your free trial ends, you&apos;ll be automatically charged ₦4,000 every month.
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
                type="submit"
                disabled={status !== 'idle'}
                className="inline-flex items-center gap-1.5 rounded-[9px] bg-[#1e8b4a] px-5 py-2.5 text-[0.82rem] font-bold text-white hover:bg-[#197a40] disabled:cursor-not-allowed disabled:opacity-90"
              >
                {status === 'idle' && (
                  <>
                    <Image src="/assets/lock.png" alt="" width={14} height={14} className="object-contain invert" />
                    Start Free Trial
                  </>
                )}
                {status === 'submitting' && 'Starting Trial...'}
                {status === 'done' && '✓ Trial Started'}
              </button>
            </div>
            <div className="mt-2.5 text-right text-[0.72rem] text-[#6b7280]">
              By continuing, you agree to our{' '}
              <a href="/terms" className="border-b border-[#e2e3e6] font-bold text-[#1d2734]">
                Terms &amp; Conditions
              </a>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
