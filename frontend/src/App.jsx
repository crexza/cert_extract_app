import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// --- COMPONENT INTERFACE INGESTIONS ---
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import UploadView from './components/UploadView';
import DetailModal from './components/DetailModal';
import BatchReviewModal from './components/BatchReviewModal';
import LoadingOverlay from './components/LoadingOverlay';

// Dynamically target backend microservice layers from injection runtime vectors
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export default function App() {
  // --- CORE STATE ENGINE MANIFESTS ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [collections, setCollections] = useState([]);
  const [currentCollection, setCurrentCollection] = useState('');
  const [rawData, setRawData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  
  // Filtering and Sorting Fields
  const [searchQuery, setSearchQuery] = useState('');
  const [filterField, setFilterField] = useState('all');
  const [dateType, setDateType] = useState('expiry');
  const [selectedYear, setSelectedYear] = useState('all');
  const [availableYears, setAvailableYears] = useState([]);
  const [sortOrder, setSortOrder] = useState('updated_desc');

  // Interactive Upload UI State Hooks
  const [isServiceUpload, setIsServiceUpload] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [batchResults, setBatchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('Processing application pipeline...');

  // Manual Input Control Form Fields
  const [formSerial, setFormSerial] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formCal, setFormCal] = useState('');
  const [formExp, setFormExp] = useState('');
  const [formCert, setFormCert] = useState('');
  const [formLot, setFormLot] = useState('');

  // Inspection Modal Selected Entities
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);

  // Core reference bindings for file upload elements
  const fileInputRef = useRef(null);

  // --- INITIALIZATION HOOKS ---
  useEffect(() => {
    // 1. Synchronize client interface theme layers
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    }
    
    // 2. Fire the initial API network calls when component mounts onto the screen
    fetchCollectionsList();
  }, []);

  useEffect(() => {
    // Recalculate context targets whenever filtering boundaries fluctuate
    applyFiltersAndSorting();
  }, [rawData, searchQuery, filterField, dateType, selectedYear, sortOrder]);

  // --- NETWORK DATA PIPELINES ---
  const fetchCollectionsList = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/collections`);
      // Correctly updates state arrays to pass data matrix context down to child views
      setCollections(response.data.collections || []);
    } catch (error) {
      console.error('System failed fetching target Firestore namespaces:', error);
    }
  };

  const loadCollectionData = async (collectionName) => {
    setCurrentCollection(collectionName);
    setRawData([]);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/collection/${collectionName}`);
      const data = response.data.data || [];
      setRawData(data);
      extractAvailableYears(data, dateType);
    } catch (error) {
      console.error(`Error loading database collections from: ${collectionName}`, error);
    }
  };

  // --- ALGORITHMIC FILTERS & PARSING ---
  const extractAvailableYears = (data, targetDateType) => {
    const yearsSet = new Set();
    data.forEach((item) => {
      let structuralYear = null;
      if (targetDateType === 'expiry') {
        const dateString = item.expiry_date || item.exp;
        if (dateString) structuralYear = new Date(dateString).getFullYear();
      } else if (targetDateType === 'cert') {
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

  const applyFiltersAndSorting = () => {
    let dataset = [...rawData];

    // 1. Text Query Matching Logic
    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();
      if (filterField === 'all') {
        dataset = dataset.filter((item) =>
          Object.values(item).some((val) => String(val).toLowerCase().includes(lowerQuery))
        );
      } else {
        dataset = dataset.filter((item) =>
          String(item[filterField] || '').toLowerCase().includes(lowerQuery)
        );
      }
    }

    // 2. Structural Year Segment Restrictions
    if (selectedYear !== 'all') {
      if (dateType === 'expiry') {
        dataset = dataset.filter((item) => {
          const d = item.expiry_date || item.exp;
          return d && d.startsWith(selectedYear);
        });
      } else if (dateType === 'cert') {
        dataset = dataset.filter((item) => {
          const c = item.cert || '';
          return c.includes(selectedYear);
        });
      }
    }

    // 3. Multi-property Sort Rules Mapping
    dataset.sort((a, b) => {
      const tsA = new Date(a.last_updated || 0);
      const tsB = new Date(b.last_updated || 0);
      const expA = new Date(a.expiry_date || '2099-01-01');
      const expB = new Date(b.expiry_date || '2099-01-01');

      if (sortOrder === 'updated_desc') return tsB - tsA;
      if (sortOrder === 'updated_asc') return tsA - tsB;
      if (sortOrder === 'exp_asc') return expA - expB;
      if (sortOrder === 'exp_desc') return expB - expA;
      if (sortOrder === 'serial_asc') return (a.serial || '').localeCompare(b.serial || '');
      return 0;
    });

    setFilteredData(dataset);
  };

  // --- ACTIONS & OPERATIONS ---
  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme', 'light');
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDarkMode(true);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFilesPipeline(e.dataTransfer.files);
    }
  };

  const processFilesPipeline = async (filesList) => {
    setLoading(true);
    const compiledResults = [];

    for (let i = 0; i < filesList.length; i++) {
      const targetFile = filesList[i];
      setLoadingText(`Analyzing PDF File Structural Layers: ${targetFile.name}...`);

      try {
        const extractionForm = new FormData();
        extractionForm.append('file', targetFile);
        extractionForm.append('is_service', String(isServiceUpload));

        const extractResponse = await axios.post(`${API_BASE_URL}/extract`, extractionForm);
        if (extractResponse.data.status !== 'success') continue;

        const structuralItems = extractResponse.data.data || [];
        for (const item of structuralItems) {
          setLoadingText(`Committing Synchronized Asset ID Tracking Records: ${item.serial}...`);
          
          const executionCommitForm = new FormData();
          executionCommitForm.append('file', targetFile);
          executionCommitForm.append('serial', item.serial);
          executionCommitForm.append('model', item.model);
          executionCommitForm.append('cal', item.cal);
          executionCommitForm.append('exp', item.exp);
          executionCommitForm.append('cert', item.cert);
          executionCommitForm.append('lot', item.lot);
          executionCommitForm.append('collection', item.target_collection);

          const saveResponse = await axios.post(`${API_BASE_URL}/save`, executionCommitForm);

          // Fixed structural mapping to handle sync properties safely with backend contract updates
          compiledResults.push({
            ...item,
            collection: item.target_collection,
            qr_link: saveResponse.data?.web_link || '',
            pdf_url: saveResponse.data?.pdf_url || '',
            qr_image_url: saveResponse.data?.qr_image_url || '',
            last_updated: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error(`Pipeline break at execution path: ${targetFile.name}`, error);
        alert(`Core validation parsing error encountered on: ${targetFile.name}`);
      }
    }

    setBatchResults(compiledResults);
    setLoading(false);
    setIsBatchModalOpen(true);
    if (compiledResults.length > 0) {
      const lastEntity = compiledResults[compiledResults.length - 1];
      setFormSerial(lastEntity.serial || '');
      setFormModel(lastEntity.model || '');
      setFormCal(lastEntity.cal || '');
      setFormExp(lastEntity.exp || '');
      setFormCert(lastEntity.cert || '');
    }
  };

  const handleFormFieldChange = (field, value) => {
    if (field === 'serial') setFormSerial(value);
    if (field === 'model') setFormModel(value);
    if (field === 'cal') setFormCal(value);
    if (field === 'exp') setFormExp(value);
    if (field === 'cert') setFormCert(value);
    if (field === 'lot') setFormLot(value);
  };

  const executeManualSave = async () => {
    if (!formSerial) {
      alert('Serial Number is required for manual indexing entry pipelines.');
      return;
    }
    alert('Please drop or select a targeted certificate file to build remote references.');
  };

  const commitManualEntryUpdate = async (updatedFields) => {
    if (!selectedItem) return;
    const updatePayload = new FormData();
    updatePayload.append('collection', currentCollection);
    updatePayload.append('serial', selectedItem.serial);
    updatePayload.append('model', updatedFields.model);
    updatePayload.append('cal', updatedFields.cal);
    updatePayload.append('exp', updatedFields.exp);
    updatePayload.append('cert', updatedFields.cert);
    updatePayload.append('lot', updatedFields.lot);

    try {
      await axios.post(`${API_BASE_URL}/api/update_record`, updatePayload);
      alert('Asset Database Modification Subsystem Synchronized!');
      setIsModalOpen(false);
      setSelectedItem(null); // Wipes node memory cache context seamlessly upon saving updates
      loadCollectionData(currentCollection);
    } catch (e) {
      alert('Transaction mapping dropped. Verify network connections.');
    }
  };

  const deleteDatabaseItem = async (colName, itemId, e) => {
    e.stopPropagation(); // Block row trigger clicks from opening entry logs
    if (!confirm('Purge target documentation entity from Firestore permanently?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/collection/${colName}/${itemId}`);
      loadCollectionData(colName);
    } catch (err) {
      alert('Delete routine processing error dropped. Verify authorization scopes.');
    }
  };

  const clearFormFields = () => {
    setFormSerial('');
    setFormModel('');
    setFormCal('');
    setFormExp('');
    setFormCert('');
    setFormLot('');
    setBatchResults([]);
  };

  const handleBatchItemInspection = (item) => {
    setSelectedItem(item);
    setIsBatchModalOpen(false);
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* 1. STRUCTURAL HEADER WRAPPER */}
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isDarkMode={isDarkMode} 
        onToggleTheme={toggleTheme} 
      />

      {/* VIEW CONDITIONAL PIPELINE MAPS */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 overflow-hidden">
        {activeTab === 'dashboard' ? (
          <div className="h-full flex gap-6">
            {/* 2. DIRECTORY SIDEBAR SECTION */}
            <Sidebar 
              collections={collections} 
              currentCollection={currentCollection} 
              onSelectCollection={loadCollectionData} 
            />

            {/* 3. REPOSITORY MANAGEMENT SHEET GRID */}
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
              onRowClick={(item) => { setSelectedItem(item); setIsModalOpen(true); }}
              onDeleteItem={deleteDatabaseItem}
            />
          </div>
        ) : (
          /* 4. TRANSACTION UPLOAD PIPELINE VIEW PANEL */
          <UploadView 
            isServiceUpload={isServiceUpload}
            setIsServiceUpload={setIsServiceUpload}
            dragActive={dragActive}
            onDragEvent={handleDrag}
            onDropEvent={handleDrop}
            onFileSelect={processFilesPipeline}
            onExecuteManualSave={executeManualSave}
            formFields={{
              serial: formSerial, model: formModel, cal: formCal, exp: formExp, cert: formCert, lot: formLot
            }}
            setFormField={handleFormFieldChange}
            batchResultsLength={batchResults.length}
            onOpenBatchModal={() => setIsBatchModalOpen(true)}
            onClearForm={clearFormFields}
          />
        )}
      </main>

      {/* 5. METADATA DETAILED MODAL INSPECTOR OVERLAY */}
      {/* Fixed: Clears selectedItem out of React state memory to handle clean window closure breaks */}
      <DetailModal 
        item={selectedItem}
        currentCollection={currentCollection}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedItem(null);
        }}
        onUpdateCommit={commitManualEntryUpdate}
      />

      {/* 6. BATCH WORKSPACE FINALIZE MATRIX SUMMARY */}
      <BatchReviewModal 
        isOpen={isBatchModalOpen}
        batchResults={batchResults}
        onClose={() => setIsBatchModalOpen(false)}
        onInspectItem={handleBatchItemInspection}
      />

      {/* 7. ASYNC CORE SYSTEM LOADER INTERCEPTOR */}
      <LoadingOverlay 
        isVisible={loading} 
        diagnosticText={loadingText} 
      />
    </div>
  );
}