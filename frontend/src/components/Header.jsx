import React from "react";

/**
 * Header Component
 * Handles the main dashboard tab switching and dark mode toggle utility modules.
 */
export default function Header({ activeTab, setActiveTab, isDarkMode, onToggleTheme }) {
  return (
    <header className="z-20 transition-colors duration-200 bg-white shadow-sm dark:bg-gray-800">
      <div className="flex items-center justify-between px-4 py-4 mx-auto max-w-7xl">
        
        {/* Brand Identity Branding Logo Section */}
        <div className="flex items-center gap-3">
          <img src="/CertExtIcon.png" alt="CertExt Logo" className="w-auto h-10 select-none" />
          <h1 className="text-xl font-bold tracking-tight text-gray-800 dark:text-white">
            CertExt
            <span className="px-2 py-1 ml-2 text-xs font-bold tracking-wider text-blue-800 uppercase bg-blue-100 rounded select-none dark:bg-blue-900 dark:text-blue-200">
              Admin
            </span>
          </h1>
        </div>

        {/* Global Navigation Controls Section Links */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-2 font-semibold text-sm transition focus:outline-none ${
              activeTab === "dashboard"
                ? "text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400"
                : "text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
            }`}
          >
            Dashboard
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`px-4 py-2 font-semibold text-sm transition focus:outline-none ${
              activeTab === "upload"
                ? "text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400"
                : "text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
            }`}
          >
            Add / Upload
          </button>

          {/* Theme State Switcher Icon UI Toggle Button */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="flex items-center justify-center w-8 h-8 ml-2 text-gray-600 transition bg-gray-100 rounded-full dark:bg-gray-700 dark:text-yellow-400 hover:bg-gray-200 dark:hover:bg-gray-600 active:scale-90"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            <i className={`fas ${isDarkMode ? "fa-sun" : "fa-moon"}`}></i>
          </button>
        </div>
      </div>
    </header>
  );
}