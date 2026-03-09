import { ChevronRight, Home } from "lucide-react";
import Link from "next/link";

export interface Breadcrumb {
  label: string;
  href: string;
}

interface DrillDownProps {
  breadcrumbs: Breadcrumb[];
}

export default function DrillDown({ breadcrumbs }: DrillDownProps) {
  return (
    <nav className="flex items-center gap-1.5 text-sm overflow-x-auto pb-1 scrollbar-hide">
      <Link
        href="/"
        className="text-gray-400 hover:text-white transition-colors shrink-0 flex items-center gap-1"
      >
        <Home className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Home</span>
      </Link>

      {breadcrumbs.map((crumb, idx) => (
        <span key={crumb.href} className="flex items-center gap-1.5 shrink-0">
          <ChevronRight className="w-3 h-3 text-gray-600" />
          {idx === breadcrumbs.length - 1 ? (
            <span className="text-white font-medium">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
