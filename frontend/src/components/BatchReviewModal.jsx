import React, { useState } from "react";
import { FiAlertTriangle, FiCheckCircle } from "react-icons/fi";

/**
 * BatchReviewModal Component
 * Displays tabular metrics detailing bulk AI-extracted documents.
 * Emphasizes parsing exceptions that require human review overrides.
 */
export default function BatchReviewModal({ 
  isOpen, 
  batchResults = [], 
  onClose, 
  onInspectItem,
  onFinalSubmitSave
}) {
  if (!isOpen) return null;

  // Custom inner view status modal state management block
  const [innerStatus, setInnerStatus] = useState({
    isOpen: false,
    title: "",
    message: "",
    isSuccess: true
  });

  // Track unique serial numbers to avoid rendering duplicate entries
  const encounteredSerials = new Set();
  
  // Filter batch rows to guarantee uniqueness (except for items needing manual entries)
  const uniqueBatchResults = batchResults.filter((item) => {
    const serial = item.serial?.trim();
    if (!serial || serial === "MANUAL_ENTRY_REQUIRED") {
      return true; // Keep all rows that require manual serial entry
    }
    if (encounteredSerials.has(serial)) {
      return false; // Skip if we have already encountered this serial number
    }
    encounteredSerials.add(serial);
    return true;
  });

  // Structural Gatekeeper: Scan batch rows to see if anything still requires attention fixes
  const blockFinalSubmit = uniqueBatchResults.some(
    (item) => !item.is_valid || item.serial === "MANUAL_ENTRY_REQUIRED" || item.type === "UNRESOLVED"
  );

  /**
   * Fires the final commit routine while gracefully shielding execution using custom dialog panels
   */
  const handleInterceptSubmit = async () => {
    try {
      // Forward the execution frame up to App.jsx manual save promise loops
      await onFinalSubmitSave();
      
      // Trigger non-blocking theme status dialog message frame
      setInnerStatus({
        isOpen: true,
        title: "Batch Verification Complete",
        message: "All staging document sets have been verified and permanently recorded down to Firebase storage.",
        isSuccess: true
      });
    } catch (error) {
      setInnerStatus({
        isOpen: true,
        title: "Submission Terminated",
        message: "Could not safely commit collection fields. Please confirm cloud connection boundaries.",
        isSuccess: false
      });
    }
  };

  const closeInnerStatusAndParent = () => {
    setInnerStatus(prev => ({ ...prev, isOpen: false }));
    if (innerStatus.isSuccess) {
      onClose(); // Auto close primary panel layout workspace state parameters on success
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative flex flex-col w-full max-w-6xl p-6 transition-colors duration-200 bg-white shadow-2xl dark:bg-gray-800 rounded-xl h-5/6">
        
        {/* Absolute Close Interactive Upper Action Anchor */}
        <button 
          type="button"
          onClick={onClose} 
          className="absolute z-10 text-gray-400 transition top-4 right-4 hover:text-gray-600 dark:hover:text-gray-200"
          title="Dismiss Panel"
        >
          <i className="text-xl fas fa-times"></i>
        </button>

        {/* Informative Header Grid Block */}
        <h3 className="flex items-center mb-2 text-xl font-bold text-gray-800 dark:text-white">
          <i className="mr-2 text-purple-500 fas fa-list-check"></i> Batch Processing Manifest Reviews
        </h3>
        <p className="mb-4 text-xs text-gray-400">
          Please resolve items flagged with attention warnings before attempting final verification saves to storage.
        </p>

        {/* Content Table Container Wrapper */}
        <div className="flex-1 overflow-y-auto max-h-[60vh] bg-white border dark:border-gray-700 rounded-xl dark:bg-gray-900/40">
          <table className="w-full text-left text-gray-800 border-collapse dark:text-gray-200">
            <thead className="sticky top-0 z-20 text-xs text-gray-500 uppercase shadow-sm bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
              <tr>
                <th className="px-5 py-3">Serial Reference</th>
                <th className="px-5 py-3">Classification Type</th>
                <th className="px-5 py-3">Model Brand Specification</th>
                <th className="px-5 py-3">Calibration Date</th>
                <th className="px-5 py-3">Expiry Date</th>
                <th className="px-5 py-3">Action Status</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-100 dark:divide-gray-700">
              {uniqueBatchResults.map((item, idx) => {
                const isInvalid = !item.is_valid || item.serial === "MANUAL_ENTRY_REQUIRED" || item.type === "UNRESOLVED";
                const displayCalDate = item.calibration_date || item.cal || "N/A";
                const displayExpDate = item.expiry_date || item.exp || "N/A";

                return (
                  <tr
                    key={item.id || idx}
                    onClick={() => onInspectItem(item)}
                    className={`cursor-pointer transition border-b dark:border-gray-700 ${
                      isInvalid 
                        ? "bg-red-50/60 dark:bg-red-900/10 hover:bg-red-100/50" 
                        : "hover:bg-gray-50 dark:hover:bg-gray-700/60"
                    }`}
                  >
                    <td className="px-5 py-3">
                      <span className={`font-bold ${isInvalid ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}`}>
                        {item.serial || "MANUAL_ENTRY_REQUIRED"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        isInvalid 
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" 
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      }`}>
                        {item.type || "UNRESOLVED"}
                      </span>
                    </td>
                    <td className="max-w-xs px-5 py-3 text-gray-600 truncate dark:text-gray-300">
                      {item.model || "Unknown Model"}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">{displayCalDate}</td>
                    <td className="px-5 py-3 font-mono text-xs">{displayExpDate}</td>
                    <td className="px-5 py-3 font-semibold">
                      {isInvalid ? (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                          <i className="fas fa-exclamation-triangle"></i> Requires Fix
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                          <i className="fas fa-check-circle"></i> Verified Ready
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {uniqueBatchResults.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-10 text-xs text-center text-gray-400">
                    No items found inside the active session payload buffer.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Verification Statistics Segment Bar */}
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-gray-400">
            Total unique entries: {uniqueBatchResults.length} 
            {batchResults.length !== uniqueBatchResults.length && ` (${batchResults.length - uniqueBatchResults.length} duplicate entries omitted)`}
          </span>
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={onClose} 
              className="px-4 py-2 text-sm font-semibold text-gray-600 transition bg-gray-100 rounded-lg dark:bg-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Keep Staging
            </button>
            <button 
              type="button"
              disabled={blockFinalSubmit}
              onClick={handleInterceptSubmit} 
              className="px-6 py-2 font-bold text-white transition bg-green-600 rounded-lg shadow-md hover:bg-green-700 active:scale-95 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed disabled:transform-none"
              title={blockFinalSubmit ? "Please fix all validation warnings first" : "Commit batch to Firestore"}
            >
              <i className="mr-1.5 fas fa-cloud-upload-alt"></i> Save & Verify Batch
            </button>
          </div>
        </div>
      </div>

      {/* --- INLINE OVERLAY MODE STATUS DIALOG PANEL --- */}
      {innerStatus.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-sm p-6 bg-white border border-gray-100 shadow-2xl dark:bg-gray-900 rounded-xl dark:border-gray-800">
            <div className="flex flex-col items-center text-center">
              <div className={`p-3 rounded-full mb-3 shrink-0 ${innerStatus.isSuccess ? "bg-green-100 dark:bg-green-950/40 text-green-600 dark:text-green-400" : "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400"}`}>
                {innerStatus.isSuccess ? <FiCheckCircle className="text-3xl" /> : <FiAlertTriangle className="text-3xl" />}
              </div>
              <h4 className="text-base font-bold text-gray-900 dark:text-white">
                {innerStatus.title}
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                {innerStatus.message}
              </p>
              <button
                type="button"
                onClick={closeInnerStatusAndParent}
                className="w-full py-2 mt-5 font-semibold text-white transition bg-blue-500 rounded-lg shadow-md hover:bg-blue-600"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}