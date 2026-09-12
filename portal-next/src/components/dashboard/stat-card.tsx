import Image from 'next/image';

export type StatCardProps = {
  icon: string;
  label: string;
  value: string;
  delta?: string;
  stars?: string;
};

// Stat card ported 1:1 from dashboard.html's .stat-card (circular icon
// badge, label, big value, small delta line underneath).
export function StatCard({ icon, label, value, delta, stars }: StatCardProps) {
  return (
    <div className="rounded-[14px] border border-[#e2e3e6] bg-white p-4">
      <div className="mb-2.5 flex h-8.5 w-8.5 items-center justify-center rounded-full border border-[#e2e3e6] bg-gradient-to-br from-[#e5e6e8] to-[#c7c9cc]">
        <Image src={icon} alt="" width={17} height={17} className="h-[17px] w-[17px] object-contain" />
      </div>
      <div className="text-[0.72rem] text-[#6b7280]">{label}</div>
      <div className="mt-0.5 text-[1.3rem] font-extrabold">
        {value}
        {stars && <span className="ml-1 text-[0.78rem] text-[#f4b740]">{stars}</span>}
      </div>
      {delta && <div className="mt-1 text-[0.68rem] text-[#6b7280]">{delta}</div>}
    </div>
  );
}
