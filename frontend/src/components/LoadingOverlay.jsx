import React from "react";

/**
 * LoadingOverlay Component
 * Displays a global backdrop lock screen during long-running async promises.
 */
export default function LoadingOverlay({ isVisible, diagnosticText }) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-white/90 dark:bg-gray-900/95 flex items-center justify-center z-50 transition-colors duration-200 animate-fadeIn">
      <div className="text-center p-6">
        {/* Animated Synchronous Vector Loop */}
        <i className="fas fa-circle-notch fa-spin text-5xl text-blue-600 mb-4 drop-shadow-sm"></i>
        <h3 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">
          Processing...
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 font-medium max-w-md truncate">
          {diagnosticText || "Please wait while system calls execute..."}
        </p>
      </div>
    </div>
  );
}