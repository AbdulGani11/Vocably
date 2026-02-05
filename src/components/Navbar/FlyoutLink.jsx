import { useState } from "react";

/**
 * FLYOUT LINK COMPONENT
 * Renders a navigation link with an animated dropdown menu.
 */
const FlyoutLink = ({ children, FlyoutContent }) => {
  // Track whether dropdown is currently open
  const [open, setOpen] = useState(false);

  // Determine classes based on state
  const flyoutClasses = open ? "flyout-visible" : "flyout-hidden";

  return (
    <div
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      className="relative w-fit h-fit"
    >
      <span className="group flex items-center gap-1 nav-link cursor-pointer">
        {children}
        <i
          className={`ri-arrow-down-s-line text-sm transition-transform duration-300 ${
            open ? "rotate-180" : "rotate-0"
          }`}
        ></i>
      </span>

      {/* 
        Native CSS Transition approach:
        Always render, just toggle visibility/opacity.
        "top-full" starts right at the bottom of the parent (no gap).
        "pt-4" creates the visual space (bridge) so mouse doesn't "leave".
      */}
      <div
        className={`absolute left-1/2 top-full -translate-x-1/2 pt-4 flyout-container ${flyoutClasses}`}
      >
        <div className="relative bg-white shadow-xl border border-neutral-100 rounded-2xl overflow-hidden w-max">
          <FlyoutContent />
        </div>
      </div>
    </div>
  );
};

export default FlyoutLink;
