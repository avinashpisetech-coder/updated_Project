/**
 * Inline SVG illustration components for decorative use throughout the app.
 * All illustrations use `currentColor` and CSS custom properties so they
 * adapt automatically to each theme.
 */

import { cn } from "@/lib/utils";

type IllustrationProps = {
  className?: string;
  width?: number;
  height?: number;
};

/** Hero dashboard illustration — abstract layered shapes */
export function DashboardHeroIllustration({ className, width = 280, height = 180 }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 280 180"
      width={width}
      height={height}
      className={cn("select-none pointer-events-none", className)}
      aria-hidden
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background orb */}
      <ellipse cx="200" cy="90" rx="120" ry="90" fill="var(--theme-spot-a)" />
      <ellipse cx="80" cy="120" rx="80" ry="60" fill="var(--theme-spot-b)" />
      {/* Layered bars — chart motif */}
      <rect x="30" y="100" width="20" height="60" rx="4" fill="var(--primary)" opacity="0.7" />
      <rect x="58" y="75" width="20" height="85" rx="4" fill="var(--primary)" opacity="0.85" />
      <rect x="86" y="55" width="20" height="105" rx="4" fill="var(--primary)" />
      <rect x="114" y="85" width="20" height="75" rx="4" fill="var(--accent)" opacity="0.8" />
      <rect x="142" y="40" width="20" height="120" rx="4" fill="var(--primary)" opacity="0.6" />
      {/* Connector line and dots */}
      <polyline
        points="40,95 68,70 96,50 124,80 152,35"
        stroke="var(--primary)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
      <circle cx="40" cy="95" r="4" fill="var(--primary)" />
      <circle cx="68" cy="70" r="4" fill="var(--primary)" />
      <circle cx="96" cy="50" r="4" fill="var(--primary)" />
      <circle cx="124" cy="80" r="5" fill="var(--accent)" />
      <circle cx="152" cy="35" r="4" fill="var(--primary)" />
      {/* Floating ticket icon */}
      <rect x="188" y="30" width="68" height="46" rx="8" fill="var(--card)" stroke="var(--border)" strokeWidth="1.5" />
      <line x1="202" y1="46" x2="242" y2="46" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
      <line x1="202" y1="56" x2="234" y2="56" stroke="var(--muted-foreground)" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="246" cy="36" r="6" fill="var(--primary)" opacity="0.85" />
      {/* Small shield icon */}
      <path d="M210 110 l12-6 l12 6 v12 c0 6-12 10-12 10s-12-4-12-10z" fill="var(--accent)" opacity="0.85" />
      {/* Checkmarks */}
      <circle cx="248" cy="120" r="10" fill="var(--primary)" opacity="0.2" />
      <path d="M243 120 l3 3.5 l7-7" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Empty state — no tickets found */
export function EmptyTicketsIllustration({ className, width = 200, height = 160 }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 160"
      width={width}
      height={height}
      className={cn("select-none pointer-events-none", className)}
      aria-hidden
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse cx="100" cy="145" rx="70" ry="12" fill="var(--muted)" opacity="0.5" />
      {/* Main document */}
      <rect x="55" y="25" width="90" height="110" rx="10" fill="var(--card)" stroke="var(--border)" strokeWidth="1.5" />
      <rect x="55" y="25" width="90" height="22" rx="10" fill="var(--primary)" opacity="0.15" />
      <rect x="55" y="35" width="90" height="12" fill="var(--primary)" opacity="0.15" />
      <line x1="70" y1="62" x2="130" y2="62" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="70" y1="76" x2="125" y2="76" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="70" y1="90" x2="118" y2="90" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Magnifier */}
      <circle cx="130" cy="110" r="22" fill="var(--muted)" stroke="var(--border)" strokeWidth="2" />
      <circle cx="130" cy="110" r="14" fill="var(--card)" />
      <line x1="126" y1="106" x2="134" y2="114" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round" />
      <line x1="134" y1="106" x2="126" y2="114" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round" />
      <line x1="146" y1="126" x2="156" y2="136" stroke="var(--muted-foreground)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Ticket scope picker — decorative illustration for new ticket form */
export function NewTicketIllustration({ className, width = 200, height = 130 }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 200 130"
      width={width}
      height={height}
      className={cn("select-none pointer-events-none", className)}
      aria-hidden
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <ellipse cx="100" cy="118" rx="75" ry="10" fill="var(--muted)" opacity="0.4" />
      {/* Stack of cards */}
      <rect x="62" y="40" width="76" height="72" rx="10" fill="var(--accent)" opacity="0.3" transform="rotate(-8 100 76)" />
      <rect x="62" y="36" width="76" height="72" rx="10" fill="var(--primary)" opacity="0.2" transform="rotate(-3 100 72)" />
      <rect x="62" y="32" width="76" height="72" rx="10" fill="var(--card)" stroke="var(--border)" strokeWidth="1.5" />
      <line x1="76" y1="50" x2="124" y2="50" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
      <line x1="76" y1="62" x2="118" y2="62" stroke="var(--muted-foreground)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="76" y1="74" x2="110" y2="74" stroke="var(--muted-foreground)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Plus badge */}
      <circle cx="148" cy="36" r="14" fill="var(--primary)" />
      <line x1="148" y1="30" x2="148" y2="42" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="142" y1="36" x2="154" y2="36" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/** Masters hub icon — gears + building + lock */
export function MastersIllustration({ className, width = 160, height = 120 }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 160 120"
      width={width}
      height={height}
      className={cn("select-none pointer-events-none", className)}
      aria-hidden
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Building */}
      <rect x="20" y="50" width="50" height="60" rx="4" fill="var(--card)" stroke="var(--border)" strokeWidth="1.5" />
      <rect x="28" y="60" width="12" height="12" rx="2" fill="var(--primary)" opacity="0.5" />
      <rect x="48" y="60" width="12" height="12" rx="2" fill="var(--primary)" opacity="0.5" />
      <rect x="28" y="80" width="12" height="12" rx="2" fill="var(--primary)" opacity="0.5" />
      <rect x="48" y="80" width="12" height="12" rx="2" fill="var(--primary)" opacity="0.5" />
      <rect x="36" y="95" width="18" height="15" rx="2" fill="var(--primary)" opacity="0.4" />
      <polygon points="20,50 45,28 70,50" fill="var(--primary)" opacity="0.4" />
      {/* Gear */}
      <circle cx="118" cy="58" r="22" fill="var(--accent)" opacity="0.2" />
      <circle cx="118" cy="58" r="12" fill="var(--card)" stroke="var(--primary)" strokeWidth="2" />
      <circle cx="118" cy="58" r="4" fill="var(--primary)" opacity="0.7" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <rect
          key={angle}
          x="115"
          y="32"
          width="6"
          height="8"
          rx="2"
          fill="var(--primary)"
          opacity="0.7"
          style={{ transformOrigin: "118px 58px", transform: `rotate(${angle}deg)` }}
        />
      ))}
      {/* Small lock */}
      <rect x="94" y="86" width="20" height="16" rx="3" fill="var(--primary)" opacity="0.5" />
      <path d="M98 86 v-5 a6 6 0 0 1 12 0 v5" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7" />
    </svg>
  );
}

/** Access control illustration — shield with lock */
export function AccessControlIllustration({ className, width = 120, height = 120 }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={width}
      height={height}
      className={cn("select-none pointer-events-none", className)}
      aria-hidden
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Shield */}
      <path
        d="M60 10 L100 28 L100 65 C100 88 60 108 60 108 C60 108 20 88 20 65 L20 28 Z"
        fill="var(--primary)"
        opacity="0.15"
        stroke="var(--primary)"
        strokeWidth="2"
      />
      {/* Lock body */}
      <rect x="44" y="58" width="32" height="26" rx="5" fill="var(--primary)" opacity="0.8" />
      <path d="M50 58 v-9 a10 10 0 0 1 20 0 v9" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx="60" cy="71" r="4" fill="white" opacity="0.7" />
      {/* Radial dots */}
      {[0, 60, 120, 180, 240, 300].map((a, i) => (
        <circle
          key={i}
          cx={60 + 42 * Math.cos((a * Math.PI) / 180)}
          cy={60 + 42 * Math.sin((a * Math.PI) / 180)}
          r="3"
          fill="var(--primary)"
          opacity="0.3"
        />
      ))}
    </svg>
  );
}

/** Login / auth page hero illustration */
export function AuthIllustration({ className, width = 320, height = 240 }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 320 240"
      width={width}
      height={height}
      className={cn("select-none pointer-events-none", className)}
      aria-hidden
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background geometry */}
      <ellipse cx="160" cy="200" rx="140" ry="30" fill="var(--muted)" opacity="0.4" />
      <circle cx="50" cy="50" r="38" fill="var(--theme-spot-a)" />
      <circle cx="270" cy="180" r="52" fill="var(--theme-spot-b)" />
      {/* Central device frame */}
      <rect x="90" y="30" width="140" height="160" rx="14" fill="var(--card)" stroke="var(--border)" strokeWidth="2" />
      {/* Screen top bar */}
      <rect x="90" y="30" width="140" height="26" rx="14" fill="var(--primary)" opacity="0.8" />
      <rect x="90" y="44" width="140" height="12" fill="var(--primary)" opacity="0.8" />
      <circle cx="160" cy="43" r="5" fill="white" opacity="0.5" />
      {/* Form lines */}
      <rect x="108" y="80" width="104" height="10" rx="3" fill="var(--muted)" />
      <rect x="108" y="100" width="104" height="10" rx="3" fill="var(--muted)" />
      <rect x="108" y="125" width="104" height="22" rx="5" fill="var(--primary)" opacity="0.8" />
      <line x1="128" y1="136" x2="192" y2="136" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      {/* Check badge */}
      <circle cx="240" cy="55" r="18" fill="var(--primary)" />
      <path d="M232 55 l5 6 l11-12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Organization/company illustration */
export function OrganizationIllustration({ className, width = 160, height = 120 }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 160 120"
      width={width}
      height={height}
      className={cn("select-none pointer-events-none", className)}
      aria-hidden
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Main org node */}
      <circle cx="80" cy="30" r="18" fill="var(--primary)" opacity="0.85" />
      <circle cx="80" cy="30" r="9" fill="white" opacity="0.6" />
      {/* Branches */}
      <line x1="80" y1="48" x2="40" y2="72" stroke="var(--border)" strokeWidth="2" />
      <line x1="80" y1="48" x2="120" y2="72" stroke="var(--border)" strokeWidth="2" />
      <line x1="80" y1="48" x2="80" y2="72" stroke="var(--border)" strokeWidth="2" />
      {/* Child nodes */}
      <circle cx="40" cy="80" r="13" fill="var(--accent)" opacity="0.7" />
      <circle cx="80" cy="80" r="13" fill="var(--accent)" opacity="0.7" />
      <circle cx="120" cy="80" r="13" fill="var(--accent)" opacity="0.7" />
      {/* Sub nodes */}
      <line x1="40" y1="93" x2="25" y2="108" stroke="var(--border)" strokeWidth="1.5" />
      <line x1="40" y1="93" x2="55" y2="108" stroke="var(--border)" strokeWidth="1.5" />
      <circle cx="25" cy="113" r="7" fill="var(--muted)" stroke="var(--border)" strokeWidth="1" />
      <circle cx="55" cy="113" r="7" fill="var(--muted)" stroke="var(--border)" strokeWidth="1" />
    </svg>
  );
}
