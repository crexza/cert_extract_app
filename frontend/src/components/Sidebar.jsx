import React from "react";

/**
 * Sidebar Component
 * Displays available folders grouped by category types.
 */
export default function Sidebar({ collections, currentCollection, onSelectCollection }) {
  // Checks if the current folder is active (supporting fallback text)
  const activeFolder = typeof currentCollection === "string" ? currentCollection : "";

  return (
    <div className="flex flex-col h-full p-4 transition-colors duration-200 bg-white border border-gray-100 shadow-sm w-72 dark:bg-gray-800 rounded-xl dark:border-gray-700/50">

      {/* Header Info */}
      <div className="mb-4 select-none">
        <h3 className="text-xs font-bold tracking-wider text-gray-400 uppercase">
          Folders
        </h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {activeFolder ? "1 folder selected" : "No folder selected"}
        </p>
      </div>

      {/* Folders List */}
      <div className="flex-1 pr-1 space-y-1 overflow-y-auto">
        {collections.map((col) => {
          const isService = col.includes("SERVICE");
          const isActive = activeFolder === col;

          return (
            <button
              key={col}
              onClick={() => onSelectCollection(col)}
              className={`w-full text-left px-3 py-3 rounded-xl text-sm transition flex items-center justify-between focus:outline-none border ${
                isActive
                  ? "bg-blue-50 dark:bg-blue-900/40 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-300 font-semibold shadow-sm"
                  : "border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              }`}
            >
              {/* Folder Icon and Label */}
              <div className="flex items-center min-w-0">
                <i
                  className={`fas ${
                    isService ? "fa-tools text-purple-400" : "fa-folder text-yellow-400"
                  } mr-3 text-base`}
                ></i>
                <span className="font-medium tracking-wide truncate">
                  {col.replace("_SERVICE", " (Client)")}
                </span>
              </div>

              {/* Selection Indicator */}
              {isActive && (
                <div className="flex-shrink-0 ml-2 animate-scaleIn">
                  <i className="text-blue-500 fas fa-check-circle dark:text-blue-300"></i>
                </div>
              )}
            </button>
          );
        })}

        {/* Empty State */}
        {collections.length === 0 && (
          <div className="py-10 text-sm font-medium text-center text-gray-400 select-none dark:text-gray-500">
            No folders found.
          </div>
        )}
      </div>
    </div>
  );
}