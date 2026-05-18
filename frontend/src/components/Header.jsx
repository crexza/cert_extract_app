import React from "react";

/**
 * Header Component
 * Handles the main dashboard tab switching and dark mode toggle utilities.
 */
export default function Header({ activeTab, setActiveTab, isDarkMode, onToggleTheme }) {
  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm z-20 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        {/* Brand Identity Branding */}
        <div className="flex items-center gap-3">
          <img src="/CertExtIcon.png" alt="CertExt Logo" className="h-10 w-auto" />
          <h1 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">
            CertExt
            <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded ml-2">
              Admin
            </span>
          </h1>
        </div>

        {/* Global Navigation Controls */}
        <div className="flex gap-4 items-center">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-2 font-medium text-sm transition focus:outline-none ${
              activeTab === "dashboard"
                ? "text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400"
                : "text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
            }`}
          >
            Dashboard
          </button>
          
          <button
            onClick={() => setActiveTab("upload")}
            className={`px-4 py-2 font-medium text-sm transition focus:outline-none ${
              activeTab === "upload"
                ? "text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400"
                : "text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
            }`}
          >
            Add / Upload
          </button>

          {/* Theme State Switcher Icon */}
          <button
            onClick={onToggleTheme}
            className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-yellow-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition ml-2"
            title="Switch to Dark Mode"
          >
            <i className={`fas ${isDarkMode ? "fa-sun" : "fa-moon"}`}></i>
          </button>
        </div>
      </div>
    </header>
  );
}
