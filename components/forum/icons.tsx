// Petites icônes SVG (trait 1.75, 24×24) pour le forum, sans dépendance externe.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 18, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const PlusIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>
);
export const SearchIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></Svg>
);
export const ChatIcon = (p: IconProps) => (
  <Svg {...p}><path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.4A8.5 8.5 0 1 1 21 12Z" /></Svg>
);
export const PencilIcon = (p: IconProps) => (
  <Svg {...p}><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /><path d="m14.5 5.5 3 3" /></Svg>
);
export const TrashIcon = (p: IconProps) => (
  <Svg {...p}><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5" /></Svg>
);
export const ArrowLeftIcon = (p: IconProps) => (
  <Svg {...p}><path d="M19 12H5M12 19l-7-7 7-7" /></Svg>
);
export const CheckCircleIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></Svg>
);
export const AlertIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></Svg>
);
export const InfoIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></Svg>
);
export const ShieldCheckIcon = (p: IconProps) => (
  <Svg {...p}><path d="M12 3 19 6v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6Z" /><path d="m9 12 2 2 4-4" /></Svg>
);
export const CloseIcon = (p: IconProps) => (
  <Svg {...p}><path d="M18 6 6 18M6 6l12 12" /></Svg>
);
export const SendIcon = (p: IconProps) => (
  <Svg {...p}><path d="M21 3 10 14M21 3l-7 18-4-7-7-4Z" /></Svg>
);
export const ClockIcon = (p: IconProps) => (
  <Svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>
);
