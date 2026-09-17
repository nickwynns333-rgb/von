type BrandMarkProps = {
  className?: string;
  iconClassName?: string;
  inverse?: boolean;
  compact?: boolean;
};

export function BrandMark({ className = "", iconClassName = "", inverse = false, compact = false }: BrandMarkProps) {
  const wordColor = inverse ? "text-white" : "text-[#0B1736]";
  const accentColor = inverse ? "text-[#8DEFE2]" : "text-[#246BFD]";

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`} aria-label="VonWork">
      <span className={`relative grid place-items-center rounded-[0.8rem] bg-[#0B1736] shadow-[0_8px_20px_rgba(11,23,54,0.22)] ring-1 ring-white/20 ${iconClassName}`}>
        <span className="absolute inset-[2px] rounded-[0.65rem] bg-gradient-to-br from-[#246BFD] via-[#3F7CFF] to-[#14D9C4] opacity-95" />
        <img src="/manus-storage/vonwork-monogram_18ed6132.png" alt="" className="relative z-10 h-[88%] w-[88%] object-contain p-1" />
      </span>
      {!compact && (
        <span className={`font-extrabold tracking-[-0.045em] ${wordColor}`}>
          Von<span className={accentColor}>Work</span>
        </span>
      )}
    </div>
  );
}
