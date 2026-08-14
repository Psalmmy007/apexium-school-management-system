import React from "react";
import Link from "next/link";
import { School } from "lucide-react";
import { tokens } from "@/lib/design-system/tokens";

export function BrandLogo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center space-x-3 group">
      <div className={tokens.iconBoxPrimary}>
        <School className="w-5 h-5 text-white" />
      </div>
      <span className="text-xl font-bold tracking-tight text-white">
        Apexium<span className="text-indigo-400">ERP</span>
      </span>
    </Link>
  );
}
