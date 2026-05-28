/**
 * CertExtract Frontend API Layer
 * Centralized service client for communicating with the FastAPI Engine.
 * Supports environment abstractions, multipart schema payloads, and batch mutations.
 */

import axios from 'axios';

// Pull fallback strings safely across standard Vite build configurations
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Shared Axios Instance configuration
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // Extend fallback boundaries for Groq inference processing
  headers: {
    'Accept': 'application/json',
  },
});

export const certApi = {
  /**
   * Fetches all valid asset collection names (including service variants) from Firestore.
   * Target endpoint: GET /api/collections
   * @returns {Promise<{collections: string[]}>} Array of compiled collection strings
   */
  getCollections: async () => {
    try {
      const response = await apiClient.get('/api/collections');
      return response.data;
    } catch (error) {
      console.error('❌ Failed fetching dynamic asset collections:', error);
      throw error;
    }
  },

  /**
   * Streams or downloads structured tabular rows out of an active collection target.
   * Target endpoint: GET /api/collection/{name}
   * @param {string} collectionName - Target Firestore collection name (e.g., "EEBD_SERVICE")
   * @returns {Promise<{data: Array}>} Array of matching system object records
   */
  getCollectionData: async (collectionName) => {
    try {
      const targetPath = `/api/collection/${encodeURIComponent(collectionName)}`;
      const response = await apiClient.get(targetPath);
      return response.data;
    } catch (error) {
      console.error(`❌ Failed pulling records from collection context [${collectionName}]:`, error);
      throw error;
    }
  },

  /**
   * Triggers the primary AI parser on a freshly uploaded raw multi-page PDF document.
   * Target endpoint: POST /extract
   * @param {File} pdfFile - The physical file object chosen via input selection bounds
   * @param {boolean} isService - Boolean value distinguishing operational asset states
   * @returns {Promise<{status: string, data: Array}>} List of AI-parsed data metrics mapped by page sequence
   */
  extractPdfData: async (pdfFile, isService = false) => {
    try {
      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('is_service', String(isService)); // Bound to strict string representations for Form bounds

      const response = await apiClient.post('/extract', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('❌ Error splitting and analyzing document layout metrics:', error);
      throw error;
    }
  },

  /**
   * Permanently commits verified metadata details into specific Firestore documents while generating matching QR identifiers.
   * Target endpoint: POST /save
   * @param {Object} payload - Asset detail manifest
   * @param {File} payload.file - The single target certificate document file
   * @param {string} payload.serial - Primary identifier token for unique identification keys
   * @param {string} payload.cal - Formatted target calculation/calibration window dates ("YYYY-MM-DD")
   * @param {string} payload.exp - Formatted system operational expiration boundaries ("YYYY-MM-DD")
   * @param {string} [payload.model] - Device structure name identifiers
   * @param {string} [payload.cert] - Document identification tags
   * @param {string} [payload.lot] - Physical production or manufacturing lot details
   * @param {string} payload.collection - Document tracking group bucket target
   * @returns {Promise<{status: string, web_link: string}>} Complete processing receipt details with global redirect tracking lines
   */
  saveValidatedRecord: async (payload) => {
    try {
      const formData = new FormData();
      
      if (!payload.file) {
        throw new Error('Missing file target binary inside data submission structures.');
      }

      formData.append('file', payload.file);
      formData.append('serial', payload.serial);
      formData.append('model', payload.model || '');
      formData.append('cal', payload.cal);
      formData.append('exp', payload.exp);
      formData.append('cert', payload.cert || '');
      formData.append('lot', payload.lot || '');
      formData.append('collection', payload.collection);

      const response = await apiClient.post('/save', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('❌ Failed saving validated system record state:', error);
      throw error;
    }
  },

  /**
   * Updates fields of an existing registry document map within Firestore.
   * Target endpoint: POST /api/records/edit
   * @param {Object} payload - Complete set of field updates mapped by document key constraints
   * @param {string} payload.collection - Name of target collection folder
   * @param {string} payload.id - Original baseline document identifier string
   * @param {string} payload.serial - Modified serial payload string
   * @param {string} payload.calibration_date - Calibration window date format ("YYYY-MM-DD")
   * @param {string} payload.expiry_date - System expiration date format ("YYYY-MM-DD")
   * @returns {Promise<{status: string, message: string}>} Execution success state confirmation block
   */
  updateRecord: async (payload) => {
    try {
      const response = await apiClient.post('/api/records/edit', payload);
      return response.data;
    } catch (error) {
      console.error('❌ Failed committing requested database edits to server context:', error);
      throw error;
    }
  },

  /**
   * Drops records using structural batch transactions directly targeted on specific entities.
   * Target endpoint: DELETE /api/records/delete
   * @param {string} collectionName - Target tracking bucket layout name (e.g., "GD")
   * @param {string[]} recordIds - List of primary database document tokens to scrub out
   * @returns {Promise<{status: string, message: string}>} Drop operational status receipt confirmation block
   */
  deleteRecords: async (collectionName, recordIds) => {
    try {
      const response = await apiClient.delete('/api/records/delete', {
        data: {
          collection: collectionName,
          ids: recordIds
        }
      });
      return response.data;
    } catch (error) {
      console.error(`❌ Failed dropping targeted entries from compilation index [${collectionName}]:`, error);
      throw error;
    }
  }
};

export default certApi;