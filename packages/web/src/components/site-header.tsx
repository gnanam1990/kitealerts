import { KiteLogo } from "./kite-logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-kite-border bg-kite-bg/95 backdrop-blur-sm shadow-xs">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KiteLogo />
          <span className="hidden sm:inline-block h-4 w-px bg-kite-border" />
          <span className="hidden sm:inline-block font-sans text-xs font-bold tracking-widest text-kite-primary uppercase">
            KiteAlerts
          </span>
        </div>
        <a
          href="https://github.com/gnanam1990/kitealerts"
          target="_blank"
          rel="noreferrer"
          className="text-xs font-semibold tracking-widest uppercase text-kite-fg/55 hover:text-kite-fg transition-colors"
        >
          GitHub
        </a>
      </div>
    </header>
  );
}
