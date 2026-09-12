import Image from 'next/image';

// Left marketing panel shared by /login and /signup — restyled with the
// Oshodi Market Online purple brand (see index.html's :root --brand/
// --brand-dark/--purple-accent) instead of Oshodi Market Online's black/gray theme.
export default function BrandPanel() {
  return (
    <section className="relative hidden flex-[1.15] flex-col overflow-hidden bg-gradient-to-b from-[#e4d7fc] to-[#d2c2f8] p-12 sm:flex">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(75,46,131,0.08),transparent_60%)]" />

      <div className="relative z-10 flex flex-col gap-1">
        <Image src="/assets/oshodi-logo.png" alt="Oshodi Market Online logo" width={150} height={40} className="h-auto w-[150px] object-contain" />
        <div className="mt-0.5 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#4B2E83]">
          Local Markets. Limitless Possibilities.
        </div>
      </div>

      <div className="relative z-10 mt-auto max-w-[460px] text-[#1d2734]">
        <h1 className="mb-3.5 text-[2.4rem] font-black leading-[1.1] tracking-tight">
          Bringing Local
          <br />
          Markets <span className="text-[#6c5ce7]">Online.</span>
        </h1>
        <p className="mb-7 text-[0.95rem] text-[#6b7280]">
          Oshodi Market Online empowers local vendors and shoppers by connecting markets to more people, more efficiently.
        </p>

        <div className="mb-9 flex flex-col gap-4">
          <Feature icon="/assets/shop.png" title="For Local Vendors" desc="Expand your reach and grow your business online." />
          <Feature icon="/assets/parcel.png" title="For Shoppers" desc="Discover trusted local products and shop with ease." />
          <Feature icon="/assets/graph.png" title="For Communities" desc="Stronger local economies, built together." />
        </div>

        <div className="flex flex-wrap items-center gap-5 rounded-2xl bg-[rgba(75,46,131,0.85)] px-5 py-4 text-white backdrop-blur-sm">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/15">
              <Image src="/assets/group.png" alt="" width={18} height={18} className="h-[18px] w-[18px] object-contain" />
            </div>
            <div className="text-[0.78rem] leading-tight">
              Together, we can make local go further.
              <br />
              <strong className="text-[#e4d7fc]">Join Oshodi Market Online today.</strong>
            </div>
          </div>
          <Stat num="500+" label="Vendors" />
          <Stat num="10K+" label="Products" />
          <Stat num="25K+" label="Happy Shoppers" />
        </div>
      </div>
    </section>
  );
}

function Feature({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3.5">
      <div className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-[10px] border border-[#d2c2f8] bg-gradient-to-br from-[#e4d7fc] to-[#c7b8f0]">
        <Image src={icon} alt="" width={20} height={20} className="h-5 w-5 object-contain" />
      </div>
      <div>
        <div className="mb-0.5 text-[0.9rem] font-bold text-[#1d2734]">{title}</div>
        <div className="text-[0.8rem] text-[#6b7280]">{desc}</div>
      </div>
    </div>
  );
}

function Stat({ num, label }: { num: string; label: string }) {
  return (
    <div className="shrink-0 text-center">
      <div className="text-[1.05rem] font-extrabold text-[#e4d7fc]">{num}</div>
      <div className="text-[0.68rem] text-[#d2c2f8]">{label}</div>
    </div>
  );
}

