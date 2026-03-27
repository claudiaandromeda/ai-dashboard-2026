import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface TeamHeaderProps {
  name: string;
  code: string;
  primaryColor: string;
}

export default function TeamHeader({ name, code, primaryColor }: TeamHeaderProps) {
  return (
    <div className="space-y-6">
      <Link
        href="/#teams"
        className="inline-flex items-center gap-1.5 text-xs text-[#888888] transition hover:text-white"
      >
        <ArrowLeft className="h-3 w-3" />
        All Teams
      </Link>

      <div className="flex items-center gap-5">
        {/* Crest placeholder */}
        <div
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white sm:h-20 sm:w-20 sm:text-xl"
          style={{ backgroundColor: primaryColor }}
        >
          {code.slice(0, 2)}
        </div>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
            {name}
          </h1>
          <p className="text-xs text-[#888888] sm:text-sm">
            Official Personalized Merchandise
          </p>
        </div>
      </div>
    </div>
  );
}
