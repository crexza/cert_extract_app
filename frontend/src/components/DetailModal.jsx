import React, { useEffect, useState } from "react";

/**
 * DetailModal Component
 * Full configuration form inspects and updates fields inside individual documents.
 */
export default function DetailModal({ item, currentCollection, onClose, onUpdateCommit }) {
  const [fields, setFields] = useState({
    model: "", cal: "", exp: "", cert: "", lot: ""
  });

  useEffect(() => {
    if (item) {
      setFields({
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

  const computedQRLink = item.qr_link || `https://qrcertificates-30ddb.web.app/?id=${item.serial}`;
  const nfcPayloadString = `${computedQRLink}\nCert:${fields.cert}\nSN:${item.serial}\nCal:${fields.cal}\nExp:${fields.exp}`;

  const executeClipboardCopy = () => {
    navigator.clipboard.writeText(nfcPayloadString);
    alert("Record hardware metrics copied successfully!");
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg p-6 relative transition-colors duration-200 max-h-[95vh] overflow-y-auto">
        
        {/* Fixed Close Trigger Event */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition focus:outline-none"
        >
          <i className="fas fa-times text-xl"></i>
        </button>

        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center">
          <i className="fas fa-file-invoice mr-2 text-blue-500"></i> Entry Metadata Details
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-400 tracking-wider block mb-1">SERIAL TRACKING ID (READ-ONLY)</label>
            <input value={item.serial} readOnly className="w-full border dark:border-gray-600 p-2.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-400 font-mono outline-none" />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wider block mb-1">Model Brand Specification</label>
            <input value={fields.model} onChange={(e) => handleInputChange("model", e.target.value)} className="w-full border dark:border-gray-600 p-2.5 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wider block mb-1">Calibration Date</label>
              <input value={fields.cal} onChange={(e) => handleInputChange("cal", e.target.value)} className="w-full border dark:border-gray-600 p-2.5 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wider block mb-1">Expiry Date</label>
              <input value={fields.exp} onChange={(e) => handleInputChange("exp", e.target.value)} className="w-full border dark:border-gray-600 p-2.5 rounded-lg bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 font-semibold focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wider block mb-1">Cert No</label>
              <input value={fields.cert} onChange={(e) => handleInputChange("cert", e.target.value)} className="w-full border dark:border-gray-600 p-2.5 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wider block mb-1">Lot Reference No</label>
              <input value={fields.lot} onChange={(e) => handleInputChange("lot", e.target.value)} className="w-full border dark:border-gray-600 p-2.5 rounded-lg bg-white dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700/30 p-2.5 rounded-lg text-xs flex justify-between text-gray-400 font-medium">
            <span>LAST SYNCHRONIZED RUNTIME:</span>
            <span>{item.last_updated ? new Date(item.last_updated).toLocaleString() : "-"}</span>
          </div>

          <div className="flex gap-2">
            <a
              href={item.pdf_url || "#"}
              target="_blank"
              rel="noreferrer"
              className={`flex-1 py-2.5 rounded-lg text-center text-sm font-bold transition flex items-center justify-center ${
                item.pdf_url ? "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200" : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              <i className="fas fa-file-pdf mr-2"></i> PDF Link
            </a>
            <a
              href={item.qr_image_url || "#"}
              target="_blank"
              rel="noreferrer"
              className={`flex-1 py-2.5 rounded-lg text-center text-sm font-bold transition flex items-center justify-center ${
                item.qr_image_url ? "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200" : "bg-gray-100 text-gray-400 cursor-not-allowed"
              }`}
            >
              <i className="fas fa-qrcode mr-2"></i> QR Template
            </a>
          </div>

          <div className="pt-3 border-t dark:border-gray-700">
            <label className="text-xs font-bold text-gray-400 tracking-wider block mb-1">NFC ENCODE TEXT</label>
            <div
              onClick={executeClipboardCopy}
              className="nfc-box select-all cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition p-2.5 rounded-lg border font-mono text-xs max-h-24 overflow-y-auto"
              title="Click to copy full payload data"
            >
              {nfcPayloadString}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <button
            onClick={() => onUpdateCommit(fields)}
            className="w-full bg-green-600 text-white py-2.5 rounded-lg font-bold hover:bg-green-700 transition shadow-md focus:outline-none"
          >
            Save Parameter Updates
          </button>
        </div>

      </div>
    </div>
  );
}