import React from "react";

/**
 * LoadingOverlay Component
 * Displays a global backdrop lock screen during long-running background tasks.
 * * @param {boolean} isVisible - Controls the rendering state of the overlay.
 * @param {string} loadingMessage - The specific sub-text or stage message to display.
 */
export default function LoadingOverlay({ isVisible, loadingMessage }) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center transition-colors duration-200 bg-white/90 dark:bg-gray-900/95 animate-fadeIn">
      <div className="p-6 text-center">
        
        {/* Animated Spinner Icon */}
        <i className="mb-4 text-5xl text-blue-600 fas fa-circle-notch fa-spin drop-shadow-sm"></i>
        
        {/* Main Status Header */}
        <h3 className="text-xl font-bold tracking-tight text-gray-800 dark:text-white">
          Loading, please wait...
        </h3>
        
        {/* Secondary Informational Sub-text */}
        <p className="max-w-md mt-2 text-sm font-medium text-gray-500 truncate dark:text-gray-400">
          {loadingMessage || "Please wait while we update your information."}
        </p>
      </div>
    </div>
  );
}