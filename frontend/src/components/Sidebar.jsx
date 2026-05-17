import React from "react";

/**
 * Sidebar Component
 * Displays available database collections grouped by functional utility types.
 */
export default function Sidebar({ collections, currentCollection, onSelectCollection }) {
  return (
    <div className="w-64 bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 h-full flex flex-col transition-colors duration-200">
      <h3 className="text-xs font-bold text-gray-400 uppercase mb-3 tracking-wider">
        Folders
      </h3>
      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {collections.map((col) => {
          const isService = col.includes("SERVICE");
          const isActive = currentCollection === col;

          return (
            <button
              key={col}
              onClick={() => onSelectCollection(col)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition flex items-center focus:outline-none ${
                isActive
                  ? "bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 font-semibold"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              }`}
            >
              <i
                className={`fas ${
                  isService ? "fa-tools text-purple-400" : "fa-folder text-yellow-400"
                } mr-2.5 text-base`}
              ></i>
              <span className="truncate">
                {col.replace("_SERVICE", " (Client)")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}