import React, { useEffect, useState } from "react";

/**
 * DetailModal Component
 * Facilitates custom attribute overrides and document validations alongside live PDF viewing structures.
 */
export default function DetailModal({ item, onClose, onUpdateCommit }) {
  const [fields, setFields] = useState({
    serial: "", type: "", model: "", cal: "", exp: "", cert: "", lot: ""
  });

  const availableCollections = ["GD", "EEBD", "HARNESS", "ABSORBER", "SMOKE HOOD", "SCBA", "AREA MONITOR", "RESCUE KIT", "UNRESOLVED"];

  // Mapping fallback structure to capture whatever values managed to extract natively
  useEffect(() => {
    if (item) {
      setFields({
        serial: item.serial && item.serial !== "MANUAL_ENTRY_REQUIRED" ? item.serial : "",
        type: item.type || item._collection || "UNRESOLVED",
        model: item.model || "",
        cal: item.calibration_date || item.cal || "",
        exp: item.expiry_date || item.exp || "",
        cert: item.cert || "",
        lot: item.lot || ""
      });
    }
  }, [item]);

  if (!item) return null;

  const handleInputChange = (key, value) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const fieldErrors = item.field_errors || {};
  const extractionErrorMessage = item.error_explanation || item.debugging_error_log || null;
  const hasFatalErrors = !item.is_valid || item.type === "UNRESOLVED" || !fields.serial.trim() || item.serial === "MANUAL_ENTRY_REQUIRED";

  /**
   * Formulates mutation updates map forwarding variables upstream to state engines
   */
  const saveAndResolveItem = () => {
    if (!fields.serial.trim() || fields.serial === "MANUAL_ENTRY_REQUIRED" || fields.type === "UNRESOLVED") {
      alert("Please update tracking fields with valid specifications before validation.");
      return;
    }
    
    // Construct a sanitized update schema payload mapping out explicit long keys for the backend validator
    const updatedRecord = {
      ...item,
      serial: fields.serial,
      model: fields.model,
      type: fields.type,
      cal: fields.cal,
      exp: fields.exp,
      calibration_date: fields.cal,
      expiry_date: fields.exp,
      cert: fields.cert,
      lot: fields.lot,
      target_collection: fields.type + (item.target_collection?.endsWith("_SERVICE") || item._collection?.endsWith("_SERVICE") ? "_SERVICE" : ""),
      is_valid: true,
      error_explanation: "Resolved via manual verification overrides.",
      debugging_error_log: null,
      field_errors: {} 
    };
    onUpdateCommit(updatedRecord);
  };

  const FieldErrorLabel = ({ fieldKey }) => {
    if (!fieldErrors[fieldKey]) return null;
    return (
      <span className="mt-1 text-[11px] font-medium text-red-500 dark:text-red-400 block animate-fadeIn">
        <i className="mr-1 fas fa-info-circle"></i> {fieldErrors[fieldKey]}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-6xl p-6 h-[90vh] flex gap-6 relative transition-colors duration-200">
        
        <button 
          type="button"
          onClick={onClose} 
          className="absolute z-50 text-gray-400 transition top-4 right-4 hover:text-gray-600 dark:hover:text-gray-200"
          title="Dismiss View"
        >
          <i className="text-xl fas fa-times"></i>
        </button>

        {/* LEFT COLUMN: LIVE PDF PREVIEW */}
        <div className="relative flex-1 hidden overflow-hidden bg-gray-100 border rounded-lg md:flex dark:border-gray-700 dark:bg-gray-900">
          {item.pdf_url ? (
            <iframe 
              src={`${item.pdf_url}#page=${item.page || 1}`} 
              className="w-full h-full border-0" 
              title="Source Document Visual Map" 
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-gray-400">
              <i className="mb-2 text-4xl text-gray-300 fas fa-file-pdf"></i>
              <span className="text-xs font-medium">Document rendering engine preview unlinked or missing source blob mapping.</span>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: METADATA OVERRIDES */}
        <div className="w-full md:w-[450px] flex flex-col justify-between overflow-y-auto pr-1">
          <div>
            <h3 className="flex items-center mb-4 text-xl font-bold text-gray-800 dark:text-white">
              <i className="mr-2 text-blue-500 fas fa-file-invoice"></i> Core Validation Form Review
            </h3>

            {extractionErrorMessage && (
              <div className={`mb-4 p-3 rounded-lg text-xs font-medium border ${
                hasFatalErrors
                  ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50" 
                  : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40"
              }`}>
                <div className="flex items-start gap-2">
                  <i className={`mt-0.5 fas ${hasFatalErrors ? "fa-times-circle" : "fa-check-circle"}`}></i>
                  <div>
                    <span className="font-bold uppercase tracking-wide block mb-0.5">
                      {hasFatalErrors ? "Extraction System Error" : "System Status Feedback"}
                    </span>
                    {extractionErrorMessage}
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3.5">
              <div>
                <label className="text-[10px] font-bold text-gray-400 tracking-wider block mb-1 uppercase">Serial Identification Tracking Number</label>
                <input 
                  type="text"
                  value={fields.serial} 
                  placeholder={fieldErrors.serial ? "Extraction failed - enter value manually" : "Enter asset serial number"}
                  onChange={(e) => handleInputChange("serial", e.target.value)}
                  className={`w-full border p-2 rounded-lg font-mono text-sm outline-none transition focus:ring-2 focus:ring-blue-500 ${
                    fieldErrors.serial || !fields.serial ? "border-red-400 bg-red-50/40 dark:bg-red-950/10 text-red-700 dark:text-red-400" : "dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  }`} 
                />
                <FieldErrorLabel fieldKey="serial" />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 tracking-wider block mb-1 uppercase">Asset Classification Category Target</label>
                <select
                  value={fields.type.replace("_SERVICE", "")}
                  onChange={(e) => handleInputChange("type", e.target.value)}
                  className={`w-full p-2 text-sm font-medium bg-white border rounded-lg outline-none cursor-pointer dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 ${
                    fields.type === "UNRESOLVED" ? "border-red-400 bg-red-50/40 dark:bg-red-950/10" : "dark:border-gray-600"
                  }`}
                >
                  {availableCollections.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
                <FieldErrorLabel fieldKey="type" />
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 tracking-wider block mb-1 uppercase">Model Brand Specification</label>
                <input 
                  type="text"
                  value={fields.model} 
                  onChange={(e) => handleInputChange("model", e.target.value)} 
                  className="w-full p-2 text-sm bg-white border border-gray-200 rounded-lg outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
                <FieldErrorLabel fieldKey="model" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 tracking-wider block mb-1 uppercase">Cal Date (YYYY-MM-DD)</label>
                  <input 
                    type="text"
                    value={fields.cal} 
                    onChange={(e) => handleInputChange("cal", e.target.value)} 
                    className="w-full p-2 font-mono text-sm bg-white border border-gray-200 rounded-lg outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                  <FieldErrorLabel fieldKey="calibration_date" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 tracking-wider block mb-1 uppercase">Exp Date (YYYY-MM-DD)</label>
                  <input 
                    type="text"
                    value={fields.exp} 
                    onChange={(e) => handleInputChange("exp", e.target.value)} 
                    className="w-full p-2 font-mono text-sm bg-white border border-gray-200 rounded-lg outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                  <FieldErrorLabel fieldKey="expiry_date" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 tracking-wider block mb-1 uppercase">Cert No</label>
                  <input 
                    type="text"
                    value={fields.cert} 
                    onChange={(e) => handleInputChange("cert", e.target.value)} 
                    className="w-full p-2 text-sm bg-white border border-gray-200 rounded-lg outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                  <FieldErrorLabel fieldKey="cert" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 tracking-wider block mb-1 uppercase">Lot Reference No</label>
                  <input 
                    type="text"
                    value={fields.lot} 
                    onChange={(e) => handleInputChange("lot", e.target.value)} 
                    className="w-full p-2 text-sm bg-white border border-gray-200 rounded-lg outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                  <FieldErrorLabel fieldKey="lot" />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t dark:border-gray-700">
            <button
              type="button"
              onClick={saveAndResolveItem}
              className="w-full bg-green-600 text-white py-2.5 rounded-lg font-bold hover:bg-green-700 transition shadow-md focus:outline-none active:scale-95"
            >
              Verify & Update Record
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}