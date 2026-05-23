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
  const [currentCollection, setCurrentCollection] = useState([]);
  const [rawData, setRawData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);

  // Filtering and Sorting Fields
  const [searchQuery, setSearchQuery] = useState('');
  const [filterField, setFilterField] = useState('all');
  const [dateType, setDateType] = useState('expiry');
  const [selectedYear, setSelectedYear] = useState('all');
  const [availableYears, setAvailableYears] = useState([]);
  const [sortOrder, setSortOrder] = useState('updated_desc');

  // Upload Flow States
  const [isServiceUpload, setIsServiceUpload] = useState(false);
  const [uploadTypeSelected, setUploadTypeSelected] = useState(false);

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

  const [selectedPdfFile, setSelectedPdfFile] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    }

    fetchCollectionsList();
  }, []);

  useEffect(() => {
    applyFiltersAndSorting();
  }, [rawData, searchQuery, filterField, dateType, selectedYear, sortOrder]);

  const fetchCollectionsList = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/collections`);
      setCollections(response.data.collections || []);
    } catch (error) {
      console.error(error);
    }
  };

const loadCollectionData = async (collectionName) => {
  let updatedCollections = [];

  // Toggle collection selection
  if (currentCollection.includes(collectionName)) {
    updatedCollections = currentCollection.filter(
      (c) => c !== collectionName
    );
  } else {
    updatedCollections = [...currentCollection, collectionName];
  }

  setCurrentCollection(updatedCollections);

  // Nothing selected
  if (updatedCollections.length === 0) {
    setRawData([]);
    setFilteredData([]);
    return;
  }

  try {
    let mergedData = [];

    // Load all selected collections
    for (const collection of updatedCollections) {
      const response = await axios.get(
        `${API_BASE_URL}/api/collection/${collection}`
      );

      const data = response.data.data || [];

      // Add collection name into each row
      const taggedData = data.map((item) => ({
        ...item,
        _collection: collection,
      }));

      mergedData = [...mergedData, ...taggedData];
    }

    setRawData(mergedData);
    extractAvailableYears(mergedData, dateType);

  } catch (error) {
    console.error("Collection loading error:", error);
  }
};

  const extractAvailableYears = (data, targetDateType) => {
    const yearsSet = new Set();

    data.forEach((item) => {
      let structuralYear = null;

      if (targetDateType === 'expiry') {
        const dateString = item.expiry_date || item.exp;

        if (dateString) {
          structuralYear = new Date(dateString).getFullYear();
        }
      } else {
        const certificateString = item.cert || '';
        const regexMatch = certificateString.match(/20\d{2}/);

        if (regexMatch) {
          structuralYear = parseInt(regexMatch[0]);
        }
      }

      if (
        structuralYear &&
        !isNaN(structuralYear) &&
        structuralYear > 2000 &&
        structuralYear < 2100
      ) {
        yearsSet.add(structuralYear);
      }
    });

    setAvailableYears(Array.from(yearsSet).sort((a, b) => a - b));
  };

  const applyFiltersAndSorting = () => {
    let dataset = [...rawData];

    if (searchQuery.trim()) {
      const lowerQuery = searchQuery.toLowerCase();

      if (filterField === 'all') {
        dataset = dataset.filter((item) =>
          Object.values(item).some((val) =>
            String(val).toLowerCase().includes(lowerQuery)
          )
        );
      } else {
        dataset = dataset.filter((item) =>
          String(item[filterField] || '')
            .toLowerCase()
            .includes(lowerQuery)
        );
      }
    }

    if (selectedYear !== 'all') {
      if (dateType === 'expiry') {
        dataset = dataset.filter((item) => {
          const d = item.expiry_date || item.exp;
          return d && d.startsWith(selectedYear);
        });
      } else {
        dataset = dataset.filter((item) => {
          const c = item.cert || '';
          return c.includes(selectedYear);
        });
      }
    }

    dataset.sort((a, b) => {
      const tsA = new Date(a.last_updated || 0);
      const tsB = new Date(b.last_updated || 0);
      const expA = new Date(a.expiry_date || '2099-01-01');
      const expB = new Date(b.expiry_date || '2099-01-01');

      if (sortOrder === 'updated_desc') return tsB - tsA;
      if (sortOrder === 'updated_asc') return tsA - tsB;
      if (sortOrder === 'exp_asc') return expA - expB;
      if (sortOrder === 'exp_desc') return expB - expA;
      if (sortOrder === 'serial_asc') {
        return (a.serial || '').localeCompare(b.serial || '');
      }

      return 0;
    });

    setFilteredData(dataset);
  };

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.remove('dark');
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

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
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
  if (!filesList || filesList.length === 0) return;
  setSelectedPdfFile(filesList[0]);

  setLoading(true);
  setLoadingText('Extracting certificate data from PDF...');

  try {
    const extractedResults = [];

    for (const file of Array.from(filesList)) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('is_service', isServiceUpload ? 'true' : 'false');

      const response = await axios.post(`${API_BASE_URL}/extract`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      extractedResults.push(response.data);
    }

    setBatchResults(extractedResults);

    if (extractedResults.length === 1) {
      const result = extractedResults[0];

      setFormSerial(result.serial || '');
      setFormModel(result.model || '');
      setFormCal(result.cal || result.calibration_date || '');
      setFormExp(result.exp || result.expiry_date || '');
      setFormCert(result.cert || result.certificate_no || '');
      setFormLot(result.lot || '');
    }

    setIsBatchModalOpen(true);
  } catch (error) {
    console.error('PDF extraction failed:', error);

    const message =
      error.response?.data?.detail ||
      error.message ||
      'PDF extraction failed. Please check the backend connection.';

    alert(message);
  } finally {
    setLoading(false);
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
  if (!fileInputRef.current?.files?.[0]) {
    alert('Please upload a PDF file before saving.');
    return;
  }

  if (!formSerial.trim()) {
    alert('Serial number is required before saving.');
    return;
  }

  setLoading(true);
  setLoadingText('Saving certificate record...');

  try {
    const formData = new FormData();
    formData.append('file', fileInputRef.current.files[0]);
    formData.append('serial', formSerial);
    formData.append('model', formModel);
    formData.append('cal', formCal);
    formData.append('exp', formExp);
    formData.append('cert', formCert);
    formData.append('lot', formLot);
    formData.append(
      'collection',
      isServiceUpload ? 'GD_SERVICE' : 'GD'
    );

    await axios.post(`${API_BASE_URL}/save`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    alert('Certificate record saved successfully.');
    fetchCollectionsList();
  } catch (error) {
    console.error('Save failed:', error);

    const message =
      error.response?.data?.detail ||
      error.message ||
      'Failed to save certificate record.';

    alert(message);
  } finally {
    setLoading(false);
  }
};

  const commitManualEntryUpdate = async () => {
    setIsModalOpen(false);
  };

  const deleteDatabaseItem = async (colName, itemId, e) => {
    e.stopPropagation();

    if (!confirm('Delete this record?')) return;

    try {
      await axios.delete(`${API_BASE_URL}/api/collection/${colName}/${itemId}`);
      setCurrentCollection((prev) => [...prev]);
      loadCollectionData(colName);
    } catch (err) {
      alert('Delete failed');
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
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />
      <div className="w-full text-center py-2 bg-gray-100 dark:bg-gray-800">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Deployment Version: v1.1
        </p>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 overflow-hidden">
        {activeTab === 'dashboard' ? (
          <div className="h-full flex gap-6">
            <Sidebar
              collections={collections}
              currentCollection={currentCollection}
              onSelectCollection={loadCollectionData}
            />

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
              onRowClick={(item) => {
                setSelectedItem(item);
                setIsModalOpen(true);
              }}
              onDeleteItem={deleteDatabaseItem}
            />
          </div>
        ) : (
          <UploadView
            isServiceUpload={isServiceUpload}
            setIsServiceUpload={setIsServiceUpload}
            uploadTypeSelected={uploadTypeSelected}
            setUploadTypeSelected={setUploadTypeSelected}
            dragActive={dragActive}
            onDragEvent={handleDrag}
            onDropEvent={handleDrop}
            onFileSelect={processFilesPipeline}
            onExecuteManualSave={executeManualSave}
            formFields={{
              serial: formSerial,
              model: formModel,
              cal: formCal,
              exp: formExp,
              cert: formCert,
              lot: formLot,
            }}
            setFormField={handleFormFieldChange}
            batchResultsLength={batchResults.length}
            onOpenBatchModal={() => setIsBatchModalOpen(true)}
            onClearForm={clearFormFields}
          />
        )}
      </main>

      <DetailModal
        item={selectedItem}
        currentCollection={currentCollection}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedItem(null);
        }}
        onUpdateCommit={commitManualEntryUpdate}
      />

      <BatchReviewModal
        isOpen={isBatchModalOpen}
        batchResults={batchResults}
        onClose={() => setIsBatchModalOpen(false)}
        onInspectItem={handleBatchItemInspection}
      />

      <LoadingOverlay
        isVisible={loading}
        diagnosticText={loadingText}
      />
    </div>
  );
}
