import React from "react";

export default function BatchReviewModal({ isOpen, batchResults, onClose, onInspectItem }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl p-6 h-3/4 flex flex-col relative transition-colors duration-200">
        
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
          <i className="fas fa-times text-xl"></i>
        </button>

        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center">
          <i className="fas fa-list-check mr-2 text-purple-500"></i> Batch Processing Extracted Manifest Reviews
        </h3>

        <div className="flex-1 overflow-auto border dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900/40">
          <table className="w-full text-left text-gray-800 dark:text-gray-200 border-collapse">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-xs uppercase sticky top-0 shadow-sm">
              <tr>
                <th className="px-5 py-3">Serial</th>
                <th className="px-5 py-3">Model Brand Target</th>
                <th className="px-5 py-3">Cal</th>
                <th className="px-5 py-3">Exp</th>
                <th className="px-5 py-3">Diagnostic Notes</th> {/* New Tracking Column */}
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
              {batchResults.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-400">No runtime batch results buffered for extraction.</td>
                </tr>
              ) : (
                batchResults.map((item, idx) => {
                  const hasWarning = item.debugging_error_log && item.debugging_error_log !== "None";
                  return (
                    <tr
                      key={item.serial + idx}
                      onClick={() => onInspectItem(item)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/60 cursor-pointer border-b dark:border-gray-700 transition"
                    >
                      <td className="px-5 py-3 font-bold text-gray-900 dark:text-white">{item.serial}</td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300 truncate max-w-xs">{item.model}</td>
                      <td className="px-5 py-3 text-xs font-mono">{item.cal}</td>
                      <td className="px-5 py-3 text-xs font-mono">{item.exp}</td>
                      
                      {/* Render Tracer logs directly into your web view dashboard */}
                      <td className={`px-5 py-3 text-xs max-w-xs truncate ${hasWarning ? "text-amber-500 font-medium" : "text-gray-400"}`}>
                        {item.debugging_error_log || "None"}
                      </td>
                      
                      <td className="px-5 py-3 text-green-600 dark:text-green-400 font-semibold">
                        <span className="inline-flex items-center gap-1">
                          <i className="fas fa-check-circle"></i> Committed
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-right">
          <button onClick={onClose} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-blue-700 transition shadow-md">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}