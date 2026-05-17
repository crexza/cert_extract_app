import React, { useRef } from "react";

/**
 * UploadView Component
 * Ingests multi-page documents via drop interception bounds or file selector targets.
 */
export default function UploadView({
  isServiceUpload,
  setIsServiceUpload,
  dragActive,
  onDragEvent,
  onDropEvent,
  onFileSelect,
  onExecuteManualSave,
  formFields,
  setFormField,
  batchResultsLength,
  onOpenBatchModal,
  onClearForm,
}) {
  const fileInputRef = useRef(null);

  const computedQRLink = formFields.serial 
    ? `https://qrcertificates-30ddb.web.app/?id=${encodeURIComponent(formFields.serial)}` 
    : "...";
    
  const computedNFCPayload = `${computedQRLink}\nCert:${formFields.cert || ""}\nSN:${formFields.serial || ""}\nCal:${formFields.cal || ""}\nExp:${formFields.exp || ""}`;

  const copyPayloadToClipboard = (text) => {
    if (!formFields.serial) return;
    navigator.clipboard.writeText(text);
    alert("NFC Raw string configuration loaded to clipboard!");
  };

  return (
    <div className="h-full w-full flex justify-center items-start pt-5 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-4xl flex flex-col md:flex-row gap-6 relative transition-colors duration-200">
        
        {/* Floating Access Controls to Batch Overviews */}
        {batchResultsLength > 0 && (
          <button
            onClick={onOpenBatchModal}
            className="absolute top-8 right-8 bg-purple-600 text-white px-4 py-2 rounded-lg shadow-md hover:bg-purple-700 transition z-10 flex items-center text-sm font-semibold"
          >
            <i className="fas fa-list-check mr-2"></i> Review Batch Results
          </button>
        )}

        {/* Left Control Column: Form Manipulation */}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">New Entry Ingestion</h3>
            <button onClick={onClearForm} className="text-xs text-blue-500 hover:underline dark:text-blue-400 font-semibold">
              Clear Form
            </button>
          </div>

          {/* Database Target Namespace Discriminators */}
          <div className="flex mb-4 p-1 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
            <button
              onClick={() => setIsServiceUpload(false)}
              className={`flex-1 py-2 rounded-md text-sm font-bold transition focus:outline-none ${
                !isServiceUpload ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
              }`}
            >
              📋 Asset Parameter
            </button>
            <button
              onClick={() => setIsServiceUpload(true)}
              className={`flex-1 py-2 rounded-md text-sm font-bold transition focus:outline-none ${
                isServiceUpload ? "bg-purple-600 text-white shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700"
              }`}
            >
              🔧 Client Service
            </button>
          </div>

          {/* Structural Drag Zone Wrapper */}
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
            <i className="fas fa-file-pdf text-4xl text-gray-400 mb-3 block"></i>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Click or <b>Drag & Drop</b> verification PDF(s) here
            </p>
            <p className="text-xs text-gray-400 mt-1.5">Supports automated multi-page batch pipeline extraction</p>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="application/pdf"
              multiple
              onChange={(e) => onFileSelect(e.target.files)}
            />
          </div>

          {/* Granular Field Configuration Mappings */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="col-span-2">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 block">Serial No</label>
              <input
                value={formFields.serial}
                onChange={(e) => setFormField("serial", e.target.value)}
                className="w-full border dark:border-gray-600 p-2 rounded-lg bg-white dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 block">Model Description</label>
              <input
                value={formFields.model}
                onChange={(e) => setFormField("model", e.target.value)}
                className="w-full border dark:border-gray-600 p-2 rounded-lg bg-white dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 block">Cal Date</label>
              <input
                value={formFields.cal}
                placeholder="YYYY-MM-DD"
                onChange={(e) => setFormField("cal", e.target.value)}
                className="w-full border dark:border-gray-600 p-2 rounded-lg bg-white dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 block">Exp Date</label>
              <input
                value={formFields.exp}
                placeholder="YYYY-MM-DD"
                onChange={(e) => setFormField("exp", e.target.value)}
                className="w-full border dark:border-gray-600 p-2 rounded-lg bg-white dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 block">Cert No</label>
              <input
                value={formFields.cert}
                onChange={(e) => setFormField("cert", e.target.value)}
                className="w-full border dark:border-gray-600 p-2 rounded-lg bg-white dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1 block">Lot No</label>
              <input
                value={formFields.lot}
                onChange={(e) => setFormField("lot", e.target.value)}
                className="w-full border dark:border-gray-600 p-2 rounded-lg bg-white dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            onClick={onExecuteManualSave}
            className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 shadow-md transition focus:outline-none"
          >
            Save Manual Entry File Association
          </button>
        </div>

        {/* Right Column: Real-time Context Previews */}
        <div className="w-full md:w-80 bg-gray-50 dark:bg-gray-700/40 p-4 rounded-xl border border-gray-200 dark:border-gray-600/70 flex flex-col gap-4">
          <h4 className="font-bold text-gray-600 dark:text-gray-300 text-sm tracking-wide">Live Preview Mapping</h4>
          <div className="h-40 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center text-gray-400 dark:text-gray-400 text-xs font-medium border border-dashed dark:border-gray-500">
            No Active PDF Document Input Selected
          </div>
          
          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">NFC Hardware Payload Data</label>
            <div
              onClick={() => copyLabelString(computedNFCPayload)}
              className={`nfc-box break-all select-all cursor-pointer transition p-2.5 rounded-lg border text-xs font-mono ${
                formFields.serial 
                  ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-100" 
                  : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-dashed"
              }`}
              title={formFields.serial ? "Click to copy nfc payload string" : undefined}
            >
              {formFields.serial ? computedNFCPayload : "(Fill core variables to compile tracking telemetry)"}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1.5 block">Dynamic Web Routing URL</label>
            <div className="text-xs text-blue-600 dark:text-blue-400 font-medium break-all bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-gray-200 dark:border-gray-600/60 shadow-sm">
              {computedQRLink}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}