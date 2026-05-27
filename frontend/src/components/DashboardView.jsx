import React, { useState } from "react";
import { 
  FiSearch, 
  FiCalendar, 
  FiClock, 
  FiTrash2, 
  FiChevronDown,
  FiAlertTriangle,
  FiCheckCircle
} from "react-icons/fi";
import { FaFilePdf } from "react-icons/fa";
// FIXED: Relative path adjusted to step out of 'components' into the 'src' directory structure safely
import { certApi } from "../services/api.js"; 

/**
 * DashboardView Component
 * Manages search filters, sorting, item list grid, and multi-selection deletion.
 */
export default function DashboardView({
  currentCollection,
  filteredData,
  searchQuery,
  setSearchQuery,
  filterField,
  setFilterField,
  dateType,
  setDateType,
  selectedYear,
  setSelectedYear,
  availableYears,
  sortOrder,
  setSortOrder,
  onRowClick,
  onRefreshData, // Hook callback to inform parent state context to rehydrate records from database
  selectedItemIds,
  setSelectedItemIds,
}) {
  const activeFolder = typeof currentCollection === "string" ? currentCollection : "";
  const [isDeleting, setIsDeleting] = useState(false);

  // Custom Modal UI State Configuration supporting 'confirm' and 'status' view layers
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    type: "confirm", // 'confirm' or 'status'
    title: "",
    message: "",
    onConfirm: null,
  });

  // Handle select all / deselect all checkboxes
  const isAllSelected = filteredData.length > 0 && selectedItemIds.length === filteredData.length;
  
  const handleSelectAllToggle = () => {
    if (isAllSelected) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(filteredData.map((item) => item.id));
    }
  };

  const handleItemCheckboxToggle = (e, id) => {
    e.stopPropagation(); // Avoid triggering row details overlay selection panel expansion
    if (selectedItemIds.includes(id)) {
      setSelectedItemIds(selectedItemIds.filter((itemId) => itemId !== id));
    } else {
      setSelectedItemIds([...selectedItemIds, id]);
    }
  };

  /**
   * Closes the active confirmation window cleanly
   */
  const closeModal = () => {
    setModalConfig((prev) => ({ ...prev, isOpen: false }));
  };

  /**
   * Execution routine called when a user confirms a bulk batch delete action
   */
  const executeBulkDelete = async () => {
    closeModal();
    try {
      setIsDeleting(true);
      const trackingReceipt = await certApi.deleteRecords(activeFolder, selectedItemIds);
      
      // Clear selected checks out immediately
      setSelectedItemIds([]);
      
      // Trigger live parent layout rehydration block *before* displaying success status
      if (onRefreshData) {
        await onRefreshData(activeFolder);
      }

      // Render custom success modal window
      setModalConfig({
        isOpen: true,
        type: "status",
        title: "Success",
        message: trackingReceipt.message || `Successfully dropped ${selectedItemIds.length} system records.`,
        onConfirm: closeModal
      });
    } catch (error) {
      console.error("❌ Failed attempting bulk database removal execution flow:", error);
      setModalConfig({
        isOpen: true,
        type: "status",
        title: "Deletion Error",
        message: "Unable to drop specified records. Please verify backend configurations.",
        onConfirm: closeModal
      });
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Orchestrates the bulk batch drop actions by opening the custom modal
   */
  const handleBulkDelete = () => {
    if (!activeFolder || selectedItemIds.length === 0) return;
    
    setModalConfig({
      isOpen: true,
      type: "confirm",
      title: "Confirm Batch Deletion",
      message: `Are you absolutely sure you want to permanently delete these ${selectedItemIds.length} selected entries from ${activeFolder.replace("_SERVICE", " (Client)")}? This action cannot be undone.`,
      onConfirm: executeBulkDelete,
    });
  };

  /**
   * Execution routine called when a user confirms a single item delete action
   */
  const executeSingleDelete = async (itemId) => {
    closeModal();
    try {
      setIsDeleting(true);
      await certApi.deleteRecords(activeFolder, [itemId]);
      
      setSelectedItemIds((prev) => prev.filter((id) => id !== itemId));
      
      if (onRefreshData) {
        await onRefreshData(activeFolder);
      }

      setModalConfig({
        isOpen: true,
        type: "status",
        title: "Success",
        message: `Record "${itemId}" successfully dropped from database context.`,
        onConfirm: closeModal
      });
    } catch (error) {
      console.error(`❌ Failed tracking deletion request target [${itemId}]:`, error);
      setModalConfig({
        isOpen: true,
        type: "status",
        title: "Deletion Error",
        message: "System failed to clean target entity. Check connection state rules.",
        onConfirm: closeModal
      });
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Orchestrates individual row trash-can drop actions by opening the custom modal
   */
  const handleSingleDelete = (e, itemId) => {
    e.stopPropagation(); // Shield outer rows from tracking cell click expansions
    if (!activeFolder) return;

    setModalConfig({
      isOpen: true,
      type: "confirm",
      title: "Confirm Record Deletion",
      message: `Are you sure you want to permanently remove the certificate record "${itemId}"? This database transaction is irreversible.`,
      onConfirm: () => executeSingleDelete(itemId),
    });
  };

  return (
    <div className={`flex flex-col flex-1 overflow-hidden transition-colors duration-200 bg-white border border-gray-100 shadow-sm dark:border-gray-700 dark:bg-gray-800 rounded-xl relative ${isDeleting ? "opacity-60 pointer-events-none" : ""}`}>
      
      {/* Header and Counters */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-700 dark:text-gray-200">
            {activeFolder ? activeFolder.replace("_SERVICE", " (Client)") : "Select a Folder"}
          </h2>
          <div className="flex items-center gap-2">
            {selectedItemIds.length > 0 && (
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white transition bg-red-500 rounded-lg shadow-sm hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 disabled:bg-gray-400"
              >
                <FiTrash2 className="text-sm" /> {isDeleting ? "Dropping..." : `Delete Selected (${selectedItemIds.length})`}
              </button>
            )}
            <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-full font-medium">
              {filteredData.length} items found
            </span>
          </div>
        </div>

        {/* Filters and Inputs Row */}
        <div className="flex flex-wrap gap-2">
          
          {/* Combined Search Input + Target Filter Field Wrapper */}
          <div className="flex flex-1 min-w-[320px] bg-white border rounded-lg border-gray-200 dark:border-gray-600 dark:bg-gray-700 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition">
            <div className="relative flex items-center flex-1">
              <FiSearch className="absolute text-gray-400 left-3" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-2 pl-10 pr-4 text-sm text-gray-800 placeholder-gray-400 bg-transparent outline-none dark:text-white dark:placeholder-gray-500"
              />
            </div>

            {/* Target Filter Select Wrapper */}
            <div className="relative flex items-center border-l border-gray-200 dark:border-l-gray-600 bg-gray-50 dark:bg-gray-600/50">
              <select
                value={filterField}
                onChange={(e) => setFilterField(e.target.value)}
                className="h-full pl-3 pr-8 text-xs font-medium text-gray-600 bg-transparent rounded-r-lg outline-none appearance-none cursor-pointer dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                <option value="all" className="dark:bg-gray-700 dark:text-white">All Fields</option>
                <option value="serial" className="dark:bg-gray-700 dark:text-white">Serial No</option>
                <option value="model" className="dark:bg-gray-700 dark:text-white">Model Name</option>
                <option value="cert" className="dark:bg-gray-700 dark:text-white">Cert ID Reference</option>
                <option value="lot" className="dark:bg-gray-700 dark:text-white">Lot Batch No</option>
              </select>
              <FiChevronDown className="absolute right-2.5 text-gray-400 pointer-events-none text-xs" />
            </div>
          </div>

          {/* Date Filtering Selection Dropdowns */}
          <div className="flex overflow-hidden bg-white border border-gray-200 rounded-lg dark:border-gray-600 dark:bg-gray-700">
            <div className="relative flex items-center border-r border-gray-200 bg-gray-50 dark:bg-gray-600/50 dark:border-r-gray-600">
              <select
                value={dateType}
                onChange={(e) => setDateType(e.target.value)}
                className="h-full pl-3 text-xs font-bold text-gray-600 bg-transparent outline-none appearance-none cursor-pointer pr-7 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                <option value="expiry" className="dark:bg-gray-700 dark:text-white">Expiry Year</option>
                <option value="cert" className="dark:bg-gray-700 dark:text-white">Cert Year</option>
              </select>
              <FiCalendar className="absolute text-xs text-gray-400 pointer-events-none right-2" />
            </div>
            
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-24 px-2 py-2 text-sm text-gray-700 bg-white outline-none cursor-pointer dark:bg-gray-700 dark:text-white"
            >
              <option value="all" className="dark:bg-gray-700 dark:text-white">All Years</option>
              {availableYears.map((year) => (
                <option key={year} value={year} className="dark:bg-gray-700 dark:text-white">{year}</option>
              ))}
            </select>
          </div>

          {/* Sorting Field */}
          <div className="relative flex items-center bg-white border border-gray-200 rounded-lg dark:border-gray-600 dark:bg-gray-700">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="py-2 pl-3 pr-8 text-sm text-gray-700 bg-transparent rounded-lg outline-none appearance-none cursor-pointer dark:text-white"
            >
              <option value="updated_desc" className="dark:bg-gray-700 dark:text-white">Recent Updates</option>
              <option value="updated_asc" className="dark:bg-gray-700 dark:text-white">Oldest Updates</option>
              <option value="exp_asc" className="dark:bg-gray-700 dark:text-white">Expiring Soon</option>
              <option value="exp_desc" className="dark:bg-gray-700 dark:text-white">Expiring Later</option>
              <option value="serial_asc" className="dark:bg-gray-700 dark:text-white">Serial (A-Z)</option>
            </select>
            <FiClock className="absolute right-2.5 text-gray-400 pointer-events-none" />
          </div>

        </div>
      </div>

      {/* Main Records Table Data Layout */}
      <div className="flex-1 overflow-auto bg-white dark:bg-gray-800">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 text-xs text-gray-500 uppercase shadow-sm bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
            <tr>
              <th className="w-12 px-6 py-3.5 text-center">
                <input 
                  type="checkbox" 
                  checked={isAllSelected} 
                  onChange={handleSelectAllToggle}
                  disabled={filteredData.length === 0}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded cursor-pointer focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-offset-gray-800"
                />
              </th>
              <th className="px-6 py-3.5">Serial No</th>
              <th className="px-6 py-3.5">Model / Brand</th>
              <th className="px-6 py-3.5">Expiry Date</th>
              <th className="px-6 py-3.5">Last Updated</th>
              <th className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-100 dark:divide-gray-700">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-10 font-medium text-center text-gray-400 dark:text-gray-500">
                  {activeFolder
                    ? "No items match your search filters." 
                    : "Please select a folder on the left panel to view its items."}
                </td>
              </tr>
            ) : (
              filteredData.map((item) => {
                const updateTimestamp = item.last_updated
                  ? new Date(item.last_updated).toLocaleDateString()
                  : "-";
                const isChecked = selectedItemIds.includes(item.id);

                return (
                  <tr
                    key={item.id}
                    onClick={() => onRowClick(item)}
                    className={`transition border-b border-gray-100 cursor-pointer hover:bg-gray-50/80 dark:hover:bg-gray-700/40 dark:border-gray-700 ${
                      isChecked ? "bg-blue-50/40 dark:bg-blue-950/40" : ""
                    }`}
                  >
                    {/* Item Checkbox Cell */}
                    <td className="px-6 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={(e) => handleItemCheckboxToggle(e, item.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded cursor-pointer focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:focus:ring-offset-gray-800"
                      />
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-gray-900 dark:text-gray-100">
                      {item.serial}
                    </td>
                    <td className="px-6 py-3.5 text-gray-600 dark:text-gray-300 max-w-xs truncate">
                      {item.model || "Unknown Model"}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300">
                        {item.expiry_date || item.exp || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-gray-500 dark:text-gray-400">
                      {updateTimestamp}
                    </td>
                    {/* Action Triggers */}
                    <td className="px-6 py-3.5 text-right space-x-3" onClick={(e) => e.stopPropagation()}>
                      {item.pdf_url && (
                        <a
                          href={item.pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block text-blue-500 transition transform hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:scale-110"
                          title="View PDF"
                        >
                          <FaFilePdf className="text-base" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleSingleDelete(e, item.id)}
                        disabled={isDeleting}
                        className="inline-block text-red-400 transition transform hover:text-red-600 dark:text-red-500 dark:hover:text-red-400 focus:outline-none hover:scale-110 disabled:text-gray-400"
                        title="Delete Item"
                      >
                        <FiTrash2 className="text-base" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* --- EMBEDDED CUSTOM MODAL ENGINE --- */}
      {modalConfig.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-auto bg-black/60 backdrop-blur-xs">
          {/* Modal Container Body */}
          <div 
            className="w-full max-w-md p-6 transition-all duration-200 transform scale-100 bg-white border border-gray-100 shadow-xl dark:bg-gray-900 rounded-xl dark:border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              {modalConfig.type === "confirm" ? (
                <div className="flex items-center justify-center p-3 bg-red-100 rounded-full dark:bg-red-950/50 shrink-0">
                  <FiAlertTriangle className="text-xl text-red-600 dark:text-red-400" />
                </div>
              ) : (
                <div className="flex items-center justify-center p-3 bg-green-100 rounded-full dark:bg-green-950/50 shrink-0">
                  <FiCheckCircle className="text-xl text-green-600 dark:text-green-400" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  {modalConfig.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                  {modalConfig.message}
                </p>
              </div>
            </div>

            {/* Dynamic Actions Buttons Tray Footer */}
            <div className="flex items-center justify-end gap-2 mt-6">
              {modalConfig.type === "confirm" ? (
                <>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-sm font-semibold text-gray-700 transition bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={modalConfig.onConfirm}
                    className="px-4 py-2 text-sm font-semibold text-white transition bg-red-500 rounded-lg shadow-xs hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700"
                  >
                    Permanently Delete
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={modalConfig.onConfirm}
                  className="px-5 py-2 text-sm font-semibold text-white transition bg-blue-500 rounded-lg shadow-xs hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}