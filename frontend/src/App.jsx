import React, { useState, useEffect } from 'react';

// --- COMPONENT IMPORTS ---
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import UploadView from './components/UploadView';
import DetailModal from './components/DetailModal';
import BatchReviewModal from './components/BatchReviewModal';
import LoadingOverlay from './components/LoadingOverlay';

// --- ICONS FOR TOASTS ---
import { FiCheckCircle, FiXCircle } from "react-icons/fi";

// --- API IMPLEMENTATION ---
import { certApi } from './services/api';

/**
 * Main Application Shell Component
 * Coordinates collection states, search filtering arrays, upload pipeline loops,
 * and global operational modal display layers.
 */
export default function App() {
  // --- CORE SYSTEM STATES ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [collections, setCollections] = useState([]);
  const [currentCollection, setCurrentCollection] = useState(''); // String structure for single-select
  const [rawData, setRawData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [selectedItemIds, setSelectedItemIds] = useState([]); // Track bulk checked items inside folder

  // Filter and Sort Configuration Rules
  const [searchQuery, setSearchQuery] = useState('');
  const [filterField, setFilterField] = useState('all');
  const [dateType, setDateType] = useState('expiry');
  const [selectedYear, setSelectedYear] = useState('all');
  const [availableYears, setAvailableYears] = useState([]);
  const [sortOrder, setSortOrder] = useState('updated_desc');

  // Multi-upload Pipeline Handling Hooks
  const [isServiceUpload, setIsServiceUpload] = useState(false);
  const [uploadTypeSelected, setUploadTypeSelected] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [batchResults, setBatchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Loading operations...');

  // Custom Toast State Configuration
  const [toast, setToast] = useState({
    isVisible: false,
    message: '',
    type: 'success' // 'success' or 'error'
  });

  // Form Fields State Structure Hook using unified property names
  const [formFields, setFormFields] = useState({
    serial: '', model: '', cal: '', exp: '', cert: '', lot: '', pdf_url: ''
  });

  // Modal Dialog UI Display State Flags
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [selectedPdfFile, setSelectedPdfFile] = useState(null);

  // --- COMPONENT LIFECYCLE INITIALIZATION ---
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    }
    fetchCollectionsList();
  }, []);

  // Recalculate tables automatically whenever raw data or active filters update
  useEffect(() => {
    applyFiltersAndSorting();
  }, [rawData, searchQuery, filterField, dateType, selectedYear, sortOrder]);

  // Clear check marks instantly if the user switches active folder views
  useEffect(() => {
    setSelectedItemIds([]);
  }, [currentCollection]);

  // Handle self-closing custom toast notifications
  useEffect(() => {
    if (toast.isVisible) {
      const autoCloseTimer = setTimeout(() => {
        setToast((prev) => ({ ...prev, isVisible: false }));
      }, 3500);
      return () => clearTimeout(autoCloseTimer);
    }
  }, [toast.isVisible]);

  /**
   * Helper utility to spin up non-blocking notification toast windows
   */
  const triggerToast = (message, type = 'success') => {
    setToast({
      isVisible: true,
      message,
      type
    });
  };

  /**
   * Syncs the directory layout categories directly out of Firebase
   */
  const fetchCollectionsList = async () => {
    try {
      const data = await certApi.getCollections();
      setCollections(data.collections || []);
    } catch (error) {
      console.error('❌ Failed fetching dynamic asset folders:', error);
    }
  };

  /**
   * Loads item dataset for a single chosen folder safely
   */
  const loadCollectionData = async (collectionName) => {
    const nextCollection = currentCollection === collectionName ? '' : collectionName;
    setCurrentCollection(nextCollection);

    if (!nextCollection) {
      setRawData([]);
      setFilteredData([]);
      setAvailableYears([]);
      return;
    }

    try {
      setLoading(true);
      setLoadingText('Loading items...');
      const response = await certApi.getCollectionData(nextCollection);
      const data = response.data || [];
      
      const taggedData = data.map((item) => ({
        ...item,
        _collection: nextCollection,
        id: item.id || item.serial || Math.random().toString(),
        cal: item.calibration_date || item.cal || '',
        exp: item.expiry_date || item.exp || '',
      }));
      
      setRawData(taggedData);
      extractAvailableYears(taggedData, dateType);
    } catch (error) {
      console.error(`❌ Failed tracking synchronization on collection target [${nextCollection}]:`, error);
      setRawData([]);
      setFilteredData([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Compiles unique year strings from record fields for dropdown population
   */
  const extractAvailableYears = (data, targetDateType) => {
    if (!data || data.length === 0) {
      setAvailableYears([]);
      return;
    }
    const yearsSet = new Set();
    data.forEach((item) => {
      let structuralYear = null;
      if (targetDateType === 'expiry') {
        const dateString = item.expiry_date || item.exp || item.calibration_date || item.cal;
        if (dateString) structuralYear = new Date(dateString).getFullYear();
      } else {
        const certificateString = item.cert || '';
        const regexMatch = certificateString.match(/20\d{2}/);
        if (regexMatch) structuralYear = parseInt(regexMatch[0]);
      }
      if (structuralYear && !isNaN(structuralYear) && structuralYear > 2000 && structuralYear < 2100) {
        yearsSet.add(structuralYear);
      }
    });
    setAvailableYears(Array.from(yearsSet).sort((a, b) => a - b));
  };

  /**
   * Formulates array filter conditions over table components
   */
  const applyFiltersAndSorting = () => {
    if (!rawData || rawData.length === 0) {
      setFilteredData([]);
      return;
    }
    let dataset = [...rawData];
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      dataset = filterField === 'all'
        ? dataset.filter((item) => Object.values(item).some((val) => String(val).toLowerCase().includes(lowerQuery)))
        : dataset.filter((item) => String(item[filterField] || '').toLowerCase().includes(lowerQuery));
    }
    if (selectedYear !== 'all') {
      dataset = dateType === 'expiry'
        ? dataset.filter((item) => (item.expiry_date || item.exp || '').startsWith(selectedYear))
        : dataset.filter((item) => (item.cert || '').includes(selectedYear));
    }
    dataset.sort((a, b) => {
      if (sortOrder === 'updated_desc') return new Date(b.last_updated || 0) - new Date(a.last_updated || 0);
      if (sortOrder === 'updated_asc') return new Date(a.last_updated || 0) - new Date(b.last_updated || 0);
      if (sortOrder === 'exp_asc') return new Date(a.expiry_date || a.exp || '2099-01-01') - new Date(b.expiry_date || b.exp || '2099-01-01');
      if (sortOrder === 'exp_desc') return new Date(b.expiry_date || b.exp || '2099-01-01') - new Date(a.expiry_date || a.exp || '2099-01-01');
      return sortOrder === 'serial_asc' ? (a.serial || '').localeCompare(b.serial || '') : 0;
    });
    setFilteredData(dataset);
  };

  /**
   * Orchestrates multipage document parsing using centralized upload API definitions
   */
  const processFilesPipeline = async (filesList) => {
    if (!filesList || filesList.length === 0) return;
    setSelectedPdfFile(filesList[0]);
    setLoading(true);
    setLoadingText('Processing document options...');

    try {
      let flattenedPageResults = [];
      for (const file of Array.from(filesList)) {
        const response = await certApi.extractPdfData(file, isServiceUpload);
        if (response && response.data) {
          flattenedPageResults = [...flattenedPageResults, ...response.data];
        }
      }

      setBatchResults(flattenedPageResults);

      if (flattenedPageResults.length > 0) {
        const result = flattenedPageResults[0];
        setFormFields({
          serial: result.serial === "MANUAL_ENTRY_REQUIRED" ? "" : result.serial || '',
          model: result.model || '',
          cal: result.calibration_date || result.cal || '',
          exp: result.expiry_date || result.exp || '',
          cert: result.cert || '',
          lot: result.lot || '',
          pdf_url: result.pdf_url || ''
        });
      }
      setIsBatchModalOpen(true);
    } catch (error) {
      console.error('❌ File parsing pipeline execution crash:', error);
      triggerToast("Failed to parse document layout fields.", "error");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Commits verified staging entries sequentially to Firebase storage context
   */
  const executeManualSave = async () => {
    if (!selectedPdfFile) return;
    if (batchResults.length === 0) return;

    setLoading(true);
    setLoadingText('Saving information details to Firebase...');

    try {
      for (const record of batchResults) {
        const computedFolderType = record.type || 'GD';
        const destinationCollection = computedFolderType === 'UNRESOLVED' 
          ? 'UNRESOLVED' 
          : computedFolderType + (isServiceUpload ? '_SERVICE' : '');

        const finalCal = record.calibration_date || record.cal || '';
        const finalExp = record.expiry_date || record.exp || '';

        if (!record.serial || !finalCal || !finalExp) {
          throw new Error(`Incomplete values present on certificate record tracking parameters.`);
        }

        const uploadPayload = {
          file: selectedPdfFile,
          serial: record.serial,
          model: record.model || '',
          cal: finalCal,
          exp: finalExp,
          cert: record.cert || '',
          lot: record.lot || '',
          collection: destinationCollection
        };

        await certApi.saveValidatedRecord(uploadPayload);
      }

      triggerToast("Batch assets successfully processed and saved to Firebase!");

      await fetchCollectionsList();
      clearFormFields();
      setIsBatchModalOpen(false);
      setActiveTab('dashboard');
    } catch (error) {
      console.error('❌ Failed to commit entry payload updates to backend:', error);
      triggerToast(error.message || "Required parameters missing from loop context.", "error");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles saving edited item records based on application mode (Staging vs Existential Updates)
   */
  const commitManualEntryUpdate = async (updatedItem) => {
    const isNewStagingItem = updatedItem.id?.startsWith("STAGE_OK_");

    if (isNewStagingItem) {
      setBatchResults((prev) => prev.map((row) => (row.id === updatedItem.id ? updatedItem : row)));
      
      setFormFields({
        serial: updatedItem.serial === "MANUAL_ENTRY_REQUIRED" ? "" : updatedItem.serial || '',
        model: updatedItem.model || '',
        cal: updatedItem.calibration_date || updatedItem.cal || '',
        exp: updatedItem.expiry_date || updatedItem.exp || '',
        cert: updatedItem.cert || '',
        lot: updatedItem.lot || '',
        pdf_url: updatedItem.pdf_url || ''
      });

      setIsModalOpen(false);
      setSelectedItem(null);
      setIsBatchModalOpen(true);
      return;
    }

    setLoading(true);
    setLoadingText('Updating information details...');
    try {
      // Guard assignment supporting tracking layout re-routing parameters safely
      const resolvedCollection = updatedItem.target_collection || updatedItem._collection || currentCollection;

      if (!resolvedCollection) {
        throw new Error("Unable to resolve destination collection path properties.");
      }

      // FIXED: Point original identifier strings explicitly back to updatedItem specifications directly
      const targetDocumentId = updatedItem.id || selectedItem?.id || updatedItem.serial;

      const patchPayload = {
        collection: resolvedCollection,
        id: targetDocumentId, 
        serial: updatedItem.serial,
        model: updatedItem.model || '',
        calibration_date: updatedItem.calibration_date || updatedItem.cal || '',
        expiry_date: updatedItem.expiry_date || updatedItem.exp || '',
        cert: updatedItem.cert || '',
        lot: updatedItem.lot || ''
      };

      await certApi.updateRecord(patchPayload);
      
      triggerToast("Record updated successfully!");
      
      if (currentCollection) {
        await loadCollectionData(currentCollection);
      }
      
      setIsModalOpen(false);
      setSelectedItem(null);
    } catch (error) {
      console.error("❌ Critical exception handling document edit updates: ", error);
      triggerToast("Failed to modify record attributes on server.", "error");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Resets local file form values to default state layers
   */
  const clearFormFields = () => {
    setFormFields({ serial: '', model: '', cal: '', exp: '', cert: '', lot: '', pdf_url: '' });
    setBatchResults([]); 
    setSelectedPdfFile(null); 
    setUploadTypeSelected(false);
  };

  /**
   * Routes the review row click target to launch detail inspection overlays
   */
  const handleBatchItemInspection = (item) => {
    setSelectedItem(item);
    setIsBatchModalOpen(false);
    setIsModalOpen(true);
  };

  /**
   * Toggles application color space parameters between light and dark spectrums
   */
  const toggleTheme = () => {
    const nextTheme = isDarkMode ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', !isDarkMode);
    localStorage.setItem('theme', nextTheme);
    setIsDarkMode(!isDarkMode);
  };

  return (
    <div className="relative flex flex-col h-screen overflow-hidden transition-colors duration-200 bg-gray-50 dark:bg-gray-900">
      
      {/* GLOBAL FLOATING TOAST NOTIFICATION CONTAINER PORTAL */}
      {toast.isVisible && (
        <div className="fixed top-5 right-5 z-[99999] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl font-semibold text-sm text-white border transition transform translate-y-0 scale-100 animate-scaleIn bg-gray-900/90 border-gray-800 dark:bg-white dark:text-gray-900 dark:border-gray-100">
          {toast.type === 'success' ? (
            <FiCheckCircle className="text-base text-green-500 dark:text-green-600" />
          ) : (
            <FiXCircle className="text-base text-red-500 dark:text-red-600" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      <Header activeTab={activeTab} setActiveTab={setActiveTab} isDarkMode={isDarkMode} onToggleTheme={toggleTheme} />
      
      <div className="w-full py-2 text-center bg-gray-100 dark:bg-gray-800">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Deployment Version: v1.2 update
        </p>
      </div>

      <main className="flex-1 w-full p-6 mx-auto overflow-hidden max-w-7xl">
        {activeTab === 'dashboard' ? (
          <div className="flex h-full gap-6">
            <Sidebar collections={collections} currentCollection={currentCollection} onSelectCollection={loadCollectionData} />
            <DashboardView 
              currentCollection={currentCollection} 
              filteredData={filteredData} 
              searchQuery={searchQuery} 
              setSearchQuery={setSearchQuery} 
              filterField={filterField} 
              setFilterField={setFilterField} 
              dateType={dateType} 
              setDateType={setDateType} 
              selectedYear={selectedYear} 
              setSelectedYear={setSelectedYear} 
              availableYears={availableYears} 
              sortOrder={sortOrder} 
              setSortOrder={setSortOrder} 
              selectedItemIds={selectedItemIds}
              setSelectedItemIds={setSelectedItemIds}
              onRowClick={(item) => { setSelectedItem(item); setIsModalOpen(true); }} 
              onRefreshData={async (folderName) => {
                await loadCollectionData(folderName);
              }}
            />
          </div>
        ) : (
          <UploadView 
            isServiceUpload={isServiceUpload} 
            setIsServiceUpload={setIsServiceUpload} 
            uploadTypeSelected={uploadTypeSelected} 
            setUploadTypeSelected={setUploadTypeSelected} 
            dragActive={dragActive} 
            onDragEvent={(e) => { e.preventDefault(); setDragActive(e.type === 'dragenter' || e.type === 'dragover'); }} 
            onDropEvent={(e) => { e.preventDefault(); setDragActive(false); if (e.dataTransfer.files) processFilesPipeline(e.dataTransfer.files); }} 
            onFileSelect={processFilesPipeline} 
            onExecuteManualSave={executeManualSave} 
            formFields={formFields} 
            setFormField={(f, v) => setFormFields(prev => ({ ...prev, [f]: v }))} 
            batchResultsLength={batchResults.length} 
            onOpenBatchModal={() => setIsBatchModalOpen(true)} 
            onClearForm={clearFormFields} 
          />
        )}
      </main>

      <DetailModal item={selectedItem} onClose={() => { setIsModalOpen(false); if (activeTab === 'upload') setIsBatchModalOpen(true); setSelectedItem(null); }} onUpdateCommit={commitManualEntryUpdate} />
      <BatchReviewModal 
        isOpen={isBatchModalOpen} 
        batchResults={batchResults} 
        onClose={() => setIsBatchModalOpen(false)} 
        onInspectItem={handleBatchItemInspection} 
        onFinalSubmitSave={executeManualSave}
      />
      <LoadingOverlay isVisible={loading} loadingMessage={loadingText} />
    </div>
  );
}