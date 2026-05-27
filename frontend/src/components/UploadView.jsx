import React, { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { FiMaximize2, FiX, FiCheckCircle } from "react-icons/fi";

/**
 * UploadView Component
 * Manages item type selection, document uploads, and entry form details.
 */
export default function UploadView({
  isServiceUpload,
  setIsServiceUpload,
  uploadTypeSelected,
  setUploadTypeSelected,
  dragActive,
  onDragEvent,
  onDropEvent,
  onFileSelect,
  onExecuteManualSave,
  formFields = {},
  setFormField,
  batchResultsLength,
  onOpenBatchModal,
  onClearForm,
}) {
  const fileInputRef = useRef(null);
  const [isPreviewMaximized, setIsPreviewMaximized] = useState(false);
  
  // Local state to manage a non-blocking, smooth UI toast alert replacement
  const [toastMessage, setToastMessage] = useState("");

  // Auto-clear toast alert after 3 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Generates item parameters using original variables
  const computedQRLink = formFields.serial
    ? `https://qrcertificates-30ddb.web.app/?id=${encodeURIComponent(formFields.serial)}`
    : "...";

  const currentCalValue = formFields.cal || formFields.calibration_date || "";
  const currentExpValue = formFields.exp || formFields.expiry_date || "";

  const computedNFCPayload = `${computedQRLink}\nCert:${formFields.cert || ""}\nSN:${formFields.serial || ""}\nCal:${currentCalValue}\nExp:${currentExpValue}`;

  /**
   * Copies generated text metrics safely to clipboard without breaking execution threads
   */
  const copyPayloadToClipboard = (text) => {
    if (!formFields.serial) return;
    navigator.clipboard.writeText(text)
      .then(() => {
        setToastMessage("Copied to system clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy text parameters: ", err);
      });
  };

  return (
    <div className="relative flex items-start justify-center w-full h-full pt-5 overflow-y-auto">
      
      {/* Non-Blocking Custom Status Alert Toast */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-[10000] flex items-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-green-600 rounded-xl shadow-xl border border-green-500/30 animate-scaleIn">
          <FiCheckCircle className="text-base" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =========================
          TYPE SELECTION SCREEN
      ========================== */}
      {!uploadTypeSelected ? (
        <div className="w-full max-w-3xl animate-scaleIn">
          <div className="p-10 transition-colors duration-200 bg-white border shadow-xl dark:bg-gray-800 rounded-2xl dark:border-gray-700">
            <div className="mb-10 text-center">
              <h1 className="mb-3 text-3xl font-bold text-gray-800 dark:text-white">New Entry</h1>
              <p className="text-gray-500 dark:text-gray-400">Select a category to get started</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setIsServiceUpload(false);
                  setUploadTypeSelected(true);
                }}
                className="group bg-blue-600 hover:bg-blue-700 rounded-2xl p-10 text-white transition shadow-lg hover:scale-[1.02] active:scale-[0.98] outline-none"
              >
                <div className="mb-5 text-5xl">📋</div>
                <h2 className="mb-2 text-2xl font-bold">Internal Asset</h2>
                <p className="text-xs font-medium text-blue-100">Manage internal inventory records</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsServiceUpload(true);
                  setUploadTypeSelected(true);
                }}
                className="group bg-purple-600 hover:bg-purple-700 rounded-2xl p-10 text-white transition shadow-lg hover:scale-[1.02] active:scale-[0.98] outline-none"
              >
                <div className="mb-5 text-5xl">🔧</div>
                <h2 className="mb-2 text-2xl font-bold">Client Asset</h2>
                <p className="text-xs font-medium text-purple-100">Manage external client records</p>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* =========================
            MAIN FORM UI
           ========================= */
        <div className="relative flex flex-col w-full max-w-4xl gap-6 p-8 transition-colors duration-200 bg-white border shadow-lg dark:bg-gray-800 rounded-xl md:flex-row dark:border-gray-700/50 animate-fadeIn">

          {/* LEFT COLUMN: UPLOAD & FORM FIELDS */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                  {isServiceUpload ? "Client Asset Entry" : "Internal Asset Entry"}
                </h3>
                <button
                  type="button"
                  onClick={() => setUploadTypeSelected(false)}
                  className="mt-1 text-sm font-semibold text-blue-500 hover:text-blue-700 dark:text-blue-400"
                >
                  &larr; Change Category
                </button>
              </div>
              <button
                type="button"
                onClick={onClearForm}
                className="text-xs font-bold tracking-wider text-blue-500 uppercase hover:underline dark:text-blue-400"
              >
                Clear Form
              </button>
            </div>

            {/* Drag and Drop Upload Area */}
            <div
              onDragEnter={onDragEvent}
              onDragOver={onDragEvent}
              onDragLeave={onDragEvent}
              onDrop={onDropEvent}
              onClick={() => fileInputRef.current.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition mb-5 relative ${
                dragActive
                  ? "border-blue-500 bg-blue-50/50 dark:bg-gray-700"
                  : "border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/30"
              }`}
            >
              <i className="block mb-3 text-4xl text-gray-400 fas fa-file-pdf animate-pulse"></i>
              <p className="text-sm text-gray-600 dark:text-gray-200">
                Click or <b>Drag & Drop</b> PDF documents here
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 font-medium">
                Supports multi-page processing automatically
              </p>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="application/pdf"
                multiple
                onChange={(e) => onFileSelect(e.target.files)}
              />
            </div>

            {/* FORM FIELDS MATRIX */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="col-span-2">
                <label className="block mb-1 text-[10px] font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase">Serial Number</label>
                <input value={formFields.serial || ""} onChange={(e) => setFormField("serial", e.target.value)} className="w-full p-2 font-mono text-sm bg-white border rounded-lg outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="col-span-2">
                <label className="block mb-1 text-[10px] font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase">Model / Description</label>
                <input value={formFields.model || ""} onChange={(e) => setFormField("model", e.target.value)} className="w-full p-2 text-sm bg-white border rounded-lg outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block mb-1 text-[10px] font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase">Calibration Date (YYYY-MM-DD)</label>
                <input value={currentCalValue} placeholder="YYYY-MM-DD" onChange={(e) => setFormField("cal", e.target.value)} className="w-full p-2 font-mono text-sm bg-white border rounded-lg outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block mb-1 text-[10px] font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase">Expiry Date (YYYY-MM-DD)</label>
                <input value={currentExpValue} placeholder="YYYY-MM-DD" onChange={(e) => setFormField("exp", e.target.value)} className="w-full p-2 font-mono text-sm bg-white border rounded-lg outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block mb-1 text-[10px] font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase">Certificate Number</label>
                <input value={formFields.cert || ""} onChange={(e) => setFormField("cert", e.target.value)} className="w-full p-2 text-sm bg-white border rounded-lg outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block mb-1 text-[10px] font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase">Lot / Batch Number</label>
                <input value={formFields.lot || ""} onChange={(e) => setFormField("lot", e.target.value)} className="w-full p-2 text-sm bg-white border rounded-lg outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <button type="button" onClick={onExecuteManualSave} className="w-full py-3 font-bold text-white transition bg-green-600 shadow-md rounded-xl hover:bg-green-700 focus:outline-none active:scale-[0.99]">
              Save Entry
            </button>
          </div>

          {/* RIGHT COLUMN: PREVIEW PANELS */}
          <div className="flex flex-col w-full gap-4 p-4 border border-gray-200 md:w-80 bg-gray-50 dark:bg-gray-700/40 rounded-xl dark:border-gray-600/70">
            
            {/* Integrated Header and Batch Button Layout */}
            <div className="flex flex-col gap-2">
              {batchResultsLength > 0 && (
                <button
                  type="button"
                  onClick={onOpenBatchModal}
                  className="flex items-center justify-center w-full py-2 text-xs font-bold text-white transition bg-purple-600 rounded-lg shadow-sm hover:bg-purple-700 active:scale-95"
                >
                  <i className="mr-1.5 fas fa-list-check"></i> Review Batch ({batchResultsLength})
                </button>
              )}
              
              <div className="flex items-center justify-between pt-1">
                <h4 className="text-sm font-bold tracking-wide text-gray-600 select-none dark:text-gray-200">Document Preview</h4>
                {formFields.pdf_url && (
                  <button
                    type="button"
                    onClick={() => setIsPreviewMaximized(true)}
                    className="p-1.5 text-gray-500 transition rounded-lg hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-600 hover:text-gray-700"
                    title="Maximize Preview"
                  >
                    <FiMaximize2 className="text-base" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center h-40 overflow-hidden bg-gray-200 border border-dashed rounded-lg dark:bg-gray-600 dark:border-gray-500">
              {formFields.pdf_url ? (
                <iframe src={formFields.pdf_url} className="w-full h-full border-0" title="File Preview" />
              ) : (
                <span className="text-xs font-semibold text-gray-400 select-none dark:text-gray-400">No active PDF loaded</span>
              )}
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mb-1.5 block uppercase tracking-wider select-none">NFC Payload Data</label>
              <div
                onClick={() => copyPayloadToClipboard(computedNFCPayload)}
                className={`break-all select-all cursor-pointer transition p-2.5 rounded-lg border text-xs font-mono ${
                  formFields.serial
                    ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-100 shadow-sm"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-dashed"
                }`}
                title={formFields.serial ? "Click to copy payload" : "Provide a serial number"}
              >
                {formFields.serial ? computedNFCPayload : "(Awaiting required parameters)"}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mb-1.5 block uppercase tracking-wider select-none">Redirect Link</label>
              <div className="text-xs text-blue-600 dark:text-blue-400 font-medium break-all bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-gray-200 dark:border-gray-600/60 shadow-sm select-all font-mono">
                {computedQRLink}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* =========================================
          PORTAL: MAXIMIZED PREVIEW MODAL OVERLAY
      ============================================ */}
      {isPreviewMaximized && formFields.pdf_url && createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col p-6 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div className="flex items-center justify-between w-full max-w-6xl mx-auto mb-3 text-white">
            <h3 className="text-xl font-bold tracking-wide text-gray-100">Document Viewer</h3>
            <button
              type="button"
              onClick={() => setIsPreviewMaximized(false)}
              className="p-2 text-gray-200 transition rounded-full bg-gray-800/80 hover:bg-gray-700/90 hover:text-white"
              title="Close Preview"
            >
              <FiX className="text-2xl" />
            </button>
          </div>
          <div className="w-full h-full max-w-6xl mx-auto overflow-hidden bg-white border border-gray-200 shadow-2xl rounded-2xl dark:bg-gray-900 dark:border-gray-800">
            <iframe
              src={formFields.pdf_url}
              className="w-full h-full border-0"
              title="Maximized Document Preview"
            />
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}