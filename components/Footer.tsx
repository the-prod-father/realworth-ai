import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="text-center py-6 px-4 text-slate-500 text-sm border-t border-slate-100 mt-8">
      <div className="max-w-4xl mx-auto">
        {/* Copyright and Legal Links */}
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 mb-2">
          <span>&copy; {currentYear} RealWorth.ai</span>
          <span className="hidden sm:inline text-slate-300">·</span>
          <Link href="/terms" className="hover:text-teal-600 transition-colors">
            Terms
          </Link>
          <span className="text-slate-300">·</span>
          <Link href="/privacy" className="hover:text-teal-600 transition-colors">
            Privacy
          </Link>
          <span className="text-slate-300">·</span>
          <Link href="/disclaimer" className="hover:text-teal-600 transition-colors">
            Disclaimer
          </Link>
        </div>

        {/* Why Not Us Labs Attribution */}
        <p className="text-slate-400 text-xs mb-2">
          RealWorth is an app by{' '}
          <a
            href="https://whynotus.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-600 hover:text-teal-700 transition-colors"
          >
            Why Not Us Labs
          </a>
        </p>

        {/* Support Email */}
        <a
          href="mailto:support@realworth.ai"
          className="text-slate-400 hover:text-teal-600 transition-colors text-xs"
        >
          support@realworth.ai
        </a>
      </div>
    </footer>
  );
}
