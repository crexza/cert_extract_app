import React from "react";

/**
 * Sidebar Component
 * Displays available database collections
 * grouped by functional utility types.
 */
export default function Sidebar({
  collections,
  currentCollection,
  onSelectCollection,
}) {

  const selectedCount = Array.isArray(currentCollection)
    ? currentCollection.length
    : 0;

  return (
    <div className="w-72 bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 h-full flex flex-col transition-colors duration-200">

      {/* Header */}
      <div className="mb-4">

        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
          Folders
        </h3>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {selectedCount} selected
        </p>

      </div>

      {/* Collections List */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-1">

        {collections.map((col) => {

          const isService = col.includes("SERVICE");

          const isActive = Array.isArray(currentCollection)
            ? currentCollection.includes(col)
            : false;

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

              {/* Left Section */}
              <div className="flex items-center min-w-0">

                <i
                  className={`fas ${
                    isService
                      ? "fa-tools text-purple-400"
                      : "fa-folder text-yellow-400"
                  } mr-3 text-base`}
                ></i>

                <span className="truncate">
                  {col.replace("_SERVICE", " (Client)")}
                </span>

              </div>

              {/* Right Check */}
              {isActive && (
                <div className="ml-2 flex-shrink-0">
                  <i className="fas fa-check-circle text-blue-500 dark:text-blue-300"></i>
                </div>
              )}

            </button>
          );
        })}

        {/* Empty State */}
        {collections.length === 0 && (
          <div className="text-sm text-gray-400 dark:text-gray-500 text-center py-10">
            No records
          </div>
        )}

      </div>
    </div>
  );
}
