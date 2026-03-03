import { useState } from "react";
import FlyoutLink from "./FlyoutLink";
import { FeaturesContent, DocsContent } from "./NavContent";
import Logo from "./Logo";

const NAV_LINKS = [
  { label: "FEATURES", id: "features", Content: FeaturesContent },
  { label: "DOCS", id: "docs", Content: DocsContent },
];

const Navbar = ({ onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const mobileMenuClasses = mobileMenuOpen
    ? "opacity-100 translate-y-0 visible pointer-events-auto"
    : "opacity-0 -translate-y-2 invisible pointer-events-none";

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4 w-full bg-white/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto relative flex items-center justify-between">
        <Logo />

        <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 items-center gap-6 z-10">
          {NAV_LINKS.map((item) => (
            <FlyoutLink key={item.label} FlyoutContent={item.Content}>
              {item.label}
            </FlyoutLink>
          ))}
        </div>

        {onLogout && (
          <button
            onClick={onLogout}
            className="hidden lg:flex items-center gap-1.5 text-xs font-medium text-neutral-400 hover:text-neutral-700 transition-colors"
            aria-label="Log out"
            title="Log out"
          >
            <i className="ri-logout-box-r-line text-sm" />
            <span>Log out</span>
          </button>
        )}

        <button
          className="lg:hidden text-neutral-800 z-20 ml-auto"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle mobile menu"
        >
          <i
            className={`text-xl transition-transform ${mobileMenuOpen ? "ri-close-line" : "ri-menu-line"}`}
          ></i>
        </button>
      </div>

      <div
        className={`fixed inset-0 bg-white z-60 lg:hidden flex flex-col h-screen transition-all duration-300 ease-in-out ${mobileMenuClasses}`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <Logo />
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              setExpandedSection(null);
            }}
            aria-label="Close menu"
          >
            <i className="ri-close-line text-2xl text-neutral-800"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 min-h-0">
          <div className="flex flex-col gap-0">
            {NAV_LINKS.map((item) => (
              <div key={item.label} className="border-b border-neutral-100">
                <button
                  onClick={() => toggleSection(item.id)}
                  className="w-full flex items-center justify-between py-4 text-left"
                >
                  <span className="text-base font-medium uppercase tracking-wide text-neutral-800">
                    {item.label}
                  </span>
                  <i
                    className={`ri-arrow-right-s-line text-xl text-neutral-400 transition-transform duration-300 ${expandedSection === item.id ? "rotate-90" : ""}`}
                  ></i>
                </button>

                <div
                  className={`accordion-grid ${expandedSection === item.id ? "open" : ""}`}
                >
                  <div className="accordion-inner">
                    <item.Content />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
