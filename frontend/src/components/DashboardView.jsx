import React from "react";

/**
 * DashboardView Component
 * Controls query search fields, year filters, sorting rules, and data list presentation.
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
  onDeleteItem,
}) {
  return (
    <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm flex flex-col overflow-hidden transition-colors duration-200">
      {/* Search Filter Header Action Panel */}
      <div className="p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-700 dark:text-gray-200">
            {Array.isArray(currentCollection) && currentCollection.length > 0
              ? `${currentCollection.length} Folders Selected`
              : "Select Folders"}
          </h2>
          <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2.5 py-1 rounded-full font-medium">
            {filteredData.length} items
          </span>
        </div>

        {/* Query Construction Controls Row */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border dark:border-gray-600 pl-10 pr-4 p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-gray-700 dark:text-white transition"
            />
          </div>

          {/* Chronological Year Restrictions Sub-menu */}
          <div className="flex border dark:border-gray-600 rounded-lg overflow-hidden bg-white dark:bg-gray-700">
            <select
              value={dateType}
              onChange={(e) => setDateType(e.target.value)}
              className="bg-gray-50 dark:bg-gray-600 text-gray-600 dark:text-gray-200 text-xs font-bold px-2 py-2 outline-none border-r dark:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-500 cursor-pointer"
            >
              <option value="expiry">📅 Expiry</option>
              <option value="cert">📜 Cert Year</option>
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-white dark:bg-gray-700 text-gray-700 dark:text-white text-sm px-2 py-2 outline-none w-24 cursor-pointer"
            >
              <option value="all">All</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Property Target Selection Dropdown */}
          <select
            value={filterField}
            onChange={(e) => setFilterField(e.target.value)}
            className="border dark:border-gray-600 p-2 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-white outline-none cursor-pointer focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Fields</option>
            <option value="serial">Serial No</option>
            <option value="model">Model</option>
            <option value="cert">Cert No</option>
            <option value="lot">Lot No</option>
          </select>

          {/* Sorting Engine Rule Mapping */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="border dark:border-gray-600 p-2 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-700 dark:text-white outline-none cursor-pointer focus:ring-2 focus:ring-blue-500"
          >
            <option value="updated_desc">🕒 Recent Updates</option>
            <option value="updated_asc">🕒 Oldest Updates</option>
            <option value="exp_asc">📅 Expiring Soon</option>
            <option value="exp_desc">📅 Expiring Later</option>
            <option value="serial_asc">🔤 Serial (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Main Responsive Grid Assembly */}
      <div className="flex-1 overflow-auto bg-white dark:bg-gray-800">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-xs uppercase sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-6 py-3.5">Serial No</th>
              <th className="px-6 py-3.5">Model</th>
              <th className="px-6 py-3.5">Expiry</th>
              <th className="px-6 py-3.5">Updated</th>
              <th className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-10 text-center text-gray-400 dark:text-gray-500 font-medium">
                  {currentCollection ? "No records match current parameters." : "Select a folder namespace to review data assets."}
                </td>
              </tr>
            ) : (
              filteredData.map((item) => {
                const updateTimestamp = item.last_updated
                  ? new Date(item.last_updated).toLocaleDateString()
                  : "-";

                return (
                  <tr
                    key={item.id}
                    onClick={() => onRowClick(item)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/60 transition border-b border-gray-100 dark:border-gray-700 cursor-pointer"
                  >
                    <td className="px-6 py-3.5 font-semibold text-gray-900 dark:text-white">
                      {item.serial}
                    </td>
                    <td className="px-6 py-3.5 text-gray-600 dark:text-gray-300 max-w-xs truncate">
                      {item.model}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-200">
                        {item.expiry_date || item.exp || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-xs text-gray-500 dark:text-gray-400">
                      {updateTimestamp}
                    </td>
                    <td className="px-6 py-3.5 text-right space-x-3" onClick={(e) => e.stopPropagation()}>
                      {item.pdf_url && (
                        <a
                          href={item.pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 inline-block"
                          title="View PDF Document"
                        >
                          <i className="fas fa-file-pdf text-base"></i>
                        </a>
                      )}
                      <button
                        onClick={(e) => onDeleteItem(currentCollection, item.id, e)}
                        className="text-red-400 hover:text-red-600 dark:hover:text-red-300 focus:outline-none inline-block"
                        title="Purge Record Entry"
                      >
                        <i className="fas fa-trash text-base"></i>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
