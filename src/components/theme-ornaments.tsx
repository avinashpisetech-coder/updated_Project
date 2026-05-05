"use client";

type ThemeOrnamentsProps = {
  variant?: "default" | "dashboard" | "tickets" | "masters" | "profile" | "auth";
};

export function ThemeOrnaments({ variant = "default" }: ThemeOrnamentsProps) {
  const showTopArc = variant === "dashboard" || variant === "default" || variant === "auth";
  const showGridTile = variant === "masters" || variant === "dashboard";
  const showFlowRing = variant === "tickets" || variant === "profile" || variant === "default";

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute -left-20 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -right-20 top-24 h-72 w-72 rounded-full bg-accent/12 blur-3xl" />

      {showTopArc && (
        <svg
          className="absolute -top-32 -right-28 h-[360px] w-[360px] text-primary/25 md:h-[420px] md:w-[420px]"
          viewBox="0 0 420 420"
          fill="none"
        >
          <defs>
            <radialGradient id="orbA" cx="0" cy="0" r="1" gradientTransform="translate(220 190) rotate(90) scale(220)">
              <stop offset="0" stopColor="currentColor" stopOpacity="0.55" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="210" cy="210" r="185" fill="url(#orbA)" />
          <path
            d="M44 234C66 154 152 94 235 106C320 118 376 188 371 264C366 340 305 397 226 401C149 406 82 362 54 299"
            stroke="currentColor"
            strokeWidth="20"
            strokeLinecap="round"
            opacity="0.55"
          />
          <path d="M130 100C198 66 292 88 338 146" stroke="currentColor" strokeWidth="8" strokeLinecap="round" opacity="0.5" />
        </svg>
      )}

      {showGridTile && (
        <svg
          className="absolute -bottom-28 -left-24 h-[360px] w-[360px] text-accent/30 md:h-[420px] md:w-[420px]"
          viewBox="0 0 440 440"
          fill="none"
        >
          <defs>
            <linearGradient id="tileB" x1="88" y1="96" x2="356" y2="340" gradientUnits="userSpaceOnUse">
              <stop stopColor="currentColor" stopOpacity="0.42" />
              <stop offset="1" stopColor="currentColor" stopOpacity="0.14" />
            </linearGradient>
          </defs>
          <rect x="72" y="78" width="292" height="292" rx="104" fill="url(#tileB)" />
          <path
            d="M92 250C156 130 262 121 344 194"
            stroke="currentColor"
            strokeWidth="16"
            strokeLinecap="round"
            opacity="0.65"
          />
          <path
            d="M112 316C174 354 265 356 334 301"
            stroke="currentColor"
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.5"
          />
          <path d="M170 126H272" stroke="currentColor" strokeWidth="9" strokeLinecap="round" opacity="0.55" />
        </svg>
      )}

      {showFlowRing && (
        <svg
          className="absolute left-1/2 top-[38%] h-64 w-64 -translate-x-1/2 text-secondary/25 md:h-72 md:w-72"
          viewBox="0 0 240 240"
          fill="none"
        >
          <circle cx="120" cy="120" r="102" fill="currentColor" opacity="0.06" />
          <path
            d="M22 120C22 66 66 22 120 22C174 22 218 66 218 120C218 174 174 218 120 218C66 218 22 174 22 120Z"
            stroke="currentColor"
            strokeWidth="14"
            opacity="0.6"
          />
          <path
            d="M56 120C56 83 86 56 120 56C154 56 184 83 184 120"
            stroke="currentColor"
            strokeWidth="12"
            strokeLinecap="round"
            opacity="0.7"
          />
          <circle cx="120" cy="120" r="44" stroke="currentColor" strokeWidth="10" opacity="0.45" />
        </svg>
      )}

      {variant === "tickets" && (
        <svg
          className="absolute right-10 top-20 h-52 w-52 text-primary/28"
          viewBox="0 0 240 240"
          fill="none"
        >
          <rect x="34" y="30" width="172" height="178" rx="26" stroke="currentColor" strokeWidth="12" />
          <path d="M72 86H168M72 122H150M72 156H136" stroke="currentColor" strokeWidth="10" strokeLinecap="round" opacity="0.75" />
          <circle cx="178" cy="180" r="20" fill="currentColor" opacity="0.16" />
        </svg>
      )}

      {variant === "masters" && (
        <svg
          className="absolute right-8 top-16 h-56 w-56 text-primary/24"
          viewBox="0 0 240 240"
          fill="none"
        >
          <rect x="30" y="30" width="78" height="78" rx="18" fill="currentColor" opacity="0.72" />
          <rect x="132" y="30" width="78" height="78" rx="18" fill="currentColor" opacity="0.52" />
          <rect x="30" y="132" width="78" height="78" rx="18" fill="currentColor" opacity="0.54" />
          <rect x="132" y="132" width="78" height="78" rx="18" fill="currentColor" opacity="0.84" />
          <path d="M106 70H132M70 106V132M170 106V132M106 170H132" stroke="currentColor" strokeWidth="8" strokeLinecap="round" opacity="0.45" />
        </svg>
      )}

      {variant === "profile" && (
        <svg
          className="absolute right-10 top-16 h-52 w-52 text-accent/30"
          viewBox="0 0 240 240"
          fill="none"
        >
          <circle cx="120" cy="92" r="40" stroke="currentColor" strokeWidth="12" />
          <path d="M52 198C69 161 97 142 120 142C143 142 171 161 188 198" stroke="currentColor" strokeWidth="12" strokeLinecap="round" />
          <circle cx="120" cy="120" r="92" stroke="currentColor" strokeWidth="8" opacity="0.2" />
        </svg>
      )}

      {variant === "auth" && (
        <svg
          className="absolute right-10 top-14 h-56 w-56 text-primary/26"
          viewBox="0 0 240 240"
          fill="none"
        >
          <path d="M46 90L120 46L194 90V176L120 214L46 176V90Z" stroke="currentColor" strokeWidth="12" />
          <path d="M84 122H156M96 152H144" stroke="currentColor" strokeWidth="10" strokeLinecap="round" opacity="0.72" />
          <circle cx="120" cy="132" r="86" stroke="currentColor" strokeWidth="8" opacity="0.18" />
        </svg>
      )}
    </div>
  );
}
