<template>
    <div class="app-layout" role="application">
      <div class="spinner-overlay" v-if="uiState.isLoading" aria-busy="true">
        <div class="spinner" role="status"></div>
      </div>
  
      <DataPanel 
        :dataState="dataState"
        :uiState="uiState"
        :canUndo="canUndo"
        :canRedo="canRedo"
        v-model:viewMode="uiState.viewMode"
        v-model:dataUrl="dataState.dataUrl"
        @file-uploaded="handleFileUpload"
        @save-workspace="saveWorkspace"
        @load-data-from-url="loadDataFromUrl"
        @undo="undo"
        @redo="redo"
        @open-modal="(name) => modals[name] = true"
        @show-context-menu="showContextMenu"
      />
  
      <MainContent
        v-if="dataState.records.length > 0"
        :uiState="uiState"
        :settings="settings"
        :dataState="dataState"
        :activeWorksheet="activeWorksheet"
        :pivotTableData="pivotTableData"
        :dashboardLayout="dashboardLayout"
        :worksheets="worksheets"
        @update-worksheet-shelves="updateWorksheetShelves"
        @add-to-dashboard="addToDashboard"
        @add-filter="handleAddFilter"
        @set-active-filter="filter => activeFilter = filter"
        @remove-from-dashboard="removeFromDashboard"
        @update-layout="newLayout => dashboardLayout = newLayout"
        @start-edit="startEdit"
      />
      <div class="welcome-panel" v-else>
        <div class="welcome-content">
          <span class="welcome-icon">📊</span>
          <h2>Welcome to DataCanvas</h2>
          <p>Load a CSV or .datacanvas file to begin your analysis.</p>
        </div>
      </div>
      
      <ContextPanel 
        v-if="dataState.records.length > 0 && activeWorksheet"
        :activeWorksheet="activeWorksheet"
        :dataState="dataState"
        :activeFilter="activeFilter"
        :chartSuggestions="chartSuggestions"
        :isAnalyticsPanelVisible="isAnalyticsPanelVisible"
        @set-chart-type="setChartType"
        @update-analytics="updateWorksheetAnalytics"
        @update-filter="updateActiveFilter"
        @reset-view="resetView"
        @export-png="exportAsPNG"
        @export-csv="exportDataAsCSV"
        @open-modal="(name) => modals[name] = true"
      />
  
      <WorksheetTabs
        v-if="dataState.records.length > 0"
        :worksheets="worksheets"
        :activeWorksheetId="activeWorksheetId"
        :editingId="uiState.editingId"
        v-model:editText="uiState.editText"
        @set-active="setActiveWorksheet"
        @add-sheet="addWorksheet"
        @remove-sheet="removeWorksheet"
        @start-edit="startEdit"
        @save-edit="saveEdit(worksheets.find(w => w.id === uiState.editingId))"
        @cancel-edit="cancelEdit"
      />
  
      <SettingsModal 
          :show="modals.settings" 
          :settings="settings" 
          @close="modals.settings = false" 
          @reset-app="resetApplication"
          @update-setting="({key, value}) => settings[key] = value"
      />
      <AnalysisModal 
          :show="modals.statisticalAnalysis" 
          :dataState="dataState" 
          @close="modals.statisticalAnalysis = false"
          @analysis-complete="handleAnalysisComplete"
      />
      <CalculatedFieldModal 
          :show="modals.calculatedField" 
          @close="modals.calculatedField = false" 
          @create="submitCalcField" 
      />
      <FieldSelectorModal 
          :show="modals.fieldSelector" 
          :fieldSelection="fieldSelection" 
          @close="cancelDataLoad" 
          @load="finalizeDataLoad"
      />
      <DatabaseModal 
          :show="modals.database" 
          @close="modals.database = false" 
          @load="({data, fileName}) => loadNewData({data}, fileName)" 
      />
      <GroupingModal
          :show="modals.grouping"
          :fieldToGroup="uiState.contextMenu.field"
          :records="dataState.records"
          @close="modals.grouping = false"
          @create-group="submitGroup"
      />
      <BinningModal
          :show="modals.binning"
          :dataState="dataState"
          @close="modals.binning = false"
          @create-bins="submitBin"
      />
    </div>
  </template>
  
  <script setup>
  // This script contains the entire logic from your original script.js file.
  // It manages the state for the entire application.
  import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue';
  
  // Component Imports
  import DataPanel from './components/DataPanel.vue';
  import MainContent from './components/MainContent.vue';
  import ContextPanel from './components/ContextPanel.vue';
  import WorksheetTabs from './components/WorksheetTabs.vue';
  import SettingsModal from './components/SettingsModal.vue';
  import AnalysisModal from './components/AnalysisModal.vue';
  import CalculatedFieldModal from './components/CalculatedFieldModal.vue';
  import FieldSelectorModal from './components/FieldSelectorModal.vue';
  import DatabaseModal from './components/DatabaseModal.vue';
  import GroupingModal from './components/GroupingModal.vue';
  import BinningModal from './components/BinningModal.vue';
  
  // The entire content of your original script.js setup function goes here
  const apiUrl = 'https://datacanvas-api.onrender.com';
  const debounce = (func, delay) => {
      let timeoutId;
      return (...args) => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
              func.apply(this, args);
          }, delay);
      };
  };
  
  let worker;
  const dataState = reactive({
      file: null, dataUrl: '', records: [], dimensions: [], measures: [], calculatedFields: [],
  });
  const uiState = reactive({
      isLoading: false, viewMode: 'worksheet', isDirty: false,
      contextMenu: { visible: false, top: 0, left: 0, field: null },
      editingId: null, editText: '',
      tableData: { headers: [], rows: [] },
  });
  const modals = reactive({
      settings: false, grouping: false, calculatedField: false,
      statisticalAnalysis: false, binning: false, fieldSelector: false, database: false,
  });
  const fieldSelection = reactive({
      mode: 'all', availableDimensions: [], availableMeasures: [],
      selectedFields: [], rawData: [], fileName: ''
  });
  const settings = reactive({
      theme: localStorage.getItem('datacanvas-theme') || 'light',
      activePalette: localStorage.getItem('datacanvas-palette') || 'default',
      activeNumberFormat: localStorage.getItem('datacanvas-format') || 'default',
      showDataLabels: JSON.parse(localStorage.getItem('datacanvas-labels') || 'false'),
      autoUpdateEnabled: JSON.parse(localStorage.getItem('datacanvas-autoupdate') || 'true'),
      yAxisMode: 'auto', yAxisMin: null, yAxisMax: null,
  });
  const pivotTableData = reactive({ headers: [], rows: [] });
  const worksheets = ref([]);
  const activeWorksheetId = ref(null);
  let worksheetCounter = 1;
  const dashboardLayout = ref([]);
  const dashboardFilters = reactive({});
  const activeFilter = ref(null);
  
  const activeWorksheet = computed(() => worksheets.value.find(w => w.id === activeWorksheetId.value));
// --- Undo/Redo History Logic ---

// This flag prevents the watcher from saving a new state while we are actively undoing/redoing.
let isTimeTraveling = false; 

// The array that will store snapshots of your application's state.
const history = reactive([]);

// A ref that points to the current position in the history array.
const historyIndex = ref(-1);

/**
 * Creates a deep, serializable copy of the essential parts of the application state.
 */
const createSnapshot = () => {
    return JSON.parse(JSON.stringify({
        worksheets: worksheets.value,
        dashboardLayout: dashboardLayout.value,
        calculatedFields: dataState.calculatedFields,
        dimensions: dataState.dimensions,
        measures: dataState.measures,
    }));
};

/**
 * Takes a snapshot and applies its state back to the application.
 */
const loadStateFromSnapshot = (snapshot) => {
    isTimeTraveling = true; // Set the flag to prevent feedback loops

    // Restore the state from the snapshot
    worksheets.value = snapshot.worksheets.map(w => ({ 
        ...w, 
        shelves: reactive(w.shelves), 
        analytics: reactive(w.analytics || { showTrendLine: false, forecastPeriods: 3, model: 'linear' }) 
    }));
    dashboardLayout.value = snapshot.dashboardLayout;
    dataState.calculatedFields = snapshot.calculatedFields;
    dataState.dimensions = snapshot.dimensions;
    dataState.measures = snapshot.measures;

    // Ensure the active worksheet is still valid
    if (!worksheets.value.find(w => w.id === activeWorksheetId.value)) {
        activeWorksheetId.value = worksheets.value[0]?.id || null;
    }

    nextTick(() => {
        const updatePromise = uiState.viewMode === 'worksheet'
            ? updateVisualization()
            : renderDashboardCharts(); // Assuming you have a renderDashboardCharts function
        
        updatePromise.finally(() => {
            isTimeTraveling = false; // Reset the flag after the view has updated
        });
    });
};

/**
 * Saves the current state to the history stack.
 */
const saveStateSnapshot = () => {
    if (isTimeTraveling) return; 

    // If we have undone some steps, and now make a new change,
    // we must discard the old "future" states.
    if (historyIndex.value < history.length - 1) {
        history.splice(historyIndex.value + 1);
    }
    history.push(createSnapshot());
    historyIndex.value = history.length - 1;
};

/**
 * Navigates to the previous state in the history.
 */
const undo = () => {
    if (canUndo.value) {
        historyIndex.value--;
        loadStateFromSnapshot(history[historyIndex.value]);
    }
};

/**
 * Navigates to the next state in the history.
 */
const redo = () => {
    if (canRedo.value) {
        historyIndex.value++;
        loadStateFromSnapshot(history[historyIndex.value]);
    }
};

// These are the final computed properties that your template will use.
const canUndo = computed(() => historyIndex.value > 0);
const canRedo = computed(() => historyIndex.value < history.length - 1);

// This watcher automatically saves a snapshot whenever the core state changes.
watch(
    () => ({
        worksheets: worksheets.value,
        dashboardLayout: dashboardLayout.value,
        calculatedFields: dataState.calculatedFields,
        dimensions: dataState.dimensions,
        measures: dataState.measures,
    }),
    saveStateSnapshot,
    { deep: true }
);
  
  const isAnalyticsPanelVisible = computed(() => {
      if (!activeWorksheet.value) return false;
      return activeWorksheet.value.activeChartType === 'line' && 
             activeWorksheet.value.shelves.columns.some(f => f.isDate);
  });
  const chartSuggestions = computed(() => {
      // Placeholder for chart suggestion logic
      return [
          { name: 'Table', type: 'table', icon: '📇' },
          { name: 'Bar Chart', type: 'bar', icon: '📊' },
          { name: 'Line Chart', type: 'line', icon: '📈' }
      ];
  });
  
  const processDataWithWorker = (config) => {
      return new Promise((resolve, reject) => {
          if (!worker) return reject(new Error("Worker not available."));
          worker.onmessage = (event) => resolve(event.data);
          worker.onerror = (error) => reject(error);
          worker.postMessage({
              type: 'processDataForChart',
              payload: {
                  records: JSON.parse(JSON.stringify(dataState.records)),
                  config: JSON.parse(JSON.stringify(config)),
                  measures: JSON.parse(JSON.stringify(dataState.measures)),
                  dashboardFilters: JSON.parse(JSON.stringify(dashboardFilters))
              }
          });
      });
  };
  
  const updateVisualization = async () => {
      if (!activeWorksheet.value) return;
      uiState.isLoading = true;
      try {
          const { chartData, payload } = await processDataWithWorker(activeWorksheet.value);
          activeWorksheet.value.chartData = chartData;
          activeWorksheet.value.payload = payload;
  
          if (payload.chart_type === 'table') {
              uiState.tableData = { 
                  headers: chartData.length > 0 ? Object.keys(chartData[0]) : [], 
                  rows: chartData 
              };
          } else if (payload.chart_type === 'pivot') {
              pivotTableData.headers = chartData.headers || [];
              pivotTableData.rows = chartData.rows || [];
          }
      } catch (e) {
          console.error("Visualization update failed:", e);
      } finally {
          uiState.isLoading = false;
          uiState.isDirty = false;
      }
  };
  
  const debouncedUpdateVisualization = debounce(updateVisualization, 300);
  
  const requestVisualizationUpdate = () => {
      if (settings.autoUpdateEnabled) {
          debouncedUpdateVisualization();
      } else {
          uiState.isDirty = true;
      }
  };
  
// --- Utility & Helper Methods ---

const setLoading = (isLoading) => {
    // A slight delay prevents the spinner from flashing on very fast operations
    setTimeout(() => {
        uiState.isLoading = isLoading;
    }, isLoading ? 100 : 0);
};

const getWorksheetById = (id) => {
    return worksheets.value.find(w => w.id === id);
};

// --- Data Loading & Management ---

const loadNewData = (parsedResults, fileName) => {
    resetApplication(true, false); // Reset without confirmation, don't save state yet
    dataState.records = parsedResults.data;
    dataState.file = { name: fileName };
    
    const headers = Object.keys(parsedResults.data[0] || {});
    const sample = parsedResults.data[0];
    
    dataState.dimensions = headers
        .filter(h => typeof sample[h] !== 'number')
        .map(name => ({ name, type: 'dimension' }));
    dataState.measures = headers
        .filter(h => typeof sample[h] === 'number')
        .map(name => ({ name, type: 'measure' }));

    // Now save the initial state to history
    nextTick(() => {
        saveStateSnapshot();
    });
};

const handleFileUpload = (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;
    setLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
        if (selectedFile.name.endsWith('.datacanvas')) {
            loadStateFromSnapshot(JSON.parse(e.target.result));
            setLoading(false);
        } else {
            window.Papa.parse(e.target.result, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: (results) => {
                    promptForFieldSelection(results, selectedFile.name);
                    setLoading(false);
                },
                error: () => setLoading(false)
            });
        }
    };
    reader.readAsText(selectedFile);
    event.target.value = '';
};

const loadDataFromUrl = async () => {
    if (!dataState.dataUrl.trim()) return;
    setLoading(true);
    try {
        const response = await fetch(dataState.dataUrl.trim());
        const csvText = await response.text();
        window.Papa.parse(csvText, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
                promptForFieldSelection(results, dataState.dataUrl.split('/').pop());
                dataState.dataUrl = '';
                setLoading(false);
            }
        });
    } catch (error) {
        setLoading(false);
    }
};

const promptForFieldSelection = (parsedResults, fileName) => {
    const headers = Object.keys(parsedResults.data[0] || {});
    const sample = parsedResults.data[0];
    
    fieldSelection.availableDimensions = headers.filter(h => typeof sample[h] !== 'number');
    fieldSelection.availableMeasures = headers.filter(h => typeof sample[h] === 'number');
    fieldSelection.selectedFields = [...headers];
    fieldSelection.rawData = parsedResults.data;
    fieldSelection.fileName = fileName;
    fieldSelection.mode = 'all';
    modals.fieldSelector = true;
};

const finalizeDataLoad = ({ mode, selectedFields }) => {
    let recordsToLoad = fieldSelection.rawData;
    if (mode === 'select') {
        const selected = new Set(selectedFields);
        recordsToLoad = fieldSelection.rawData.map(record => {
            const newRecord = {};
            for (const field of selected) {
                if (record.hasOwnProperty(field)) newRecord[field] = record[field];
            }
            return newRecord;
        });
    }
    loadNewData({ data: recordsToLoad }, fieldSelection.fileName);
    modals.fieldSelector = false;
};

const cancelDataLoad = () => {
    fieldSelection.rawData = [];
    modals.fieldSelector = false;
};

// --- Workspace & Export ---

const saveWorkspace = () => {
    const workspace = createSnapshot();
    const blob = new Blob([JSON.stringify(workspace, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'workspace.datacanvas';
    link.click();
    URL.revokeObjectURL(link.href);
};

const exportAsPNG = () => { /* Logic to get chart instance and export would be needed */ };
const exportDataAsCSV = () => { /* Logic to get chart data and export */ };

// --- Application & Worksheet State ---

const resetApplication = (skipConfirm = false, shouldSaveState = true) => {
    if (skipConfirm || confirm("Are you sure? This will clear all data and worksheets.")) {
        dataState.records = []; dataState.dimensions = []; dataState.measures = [];
        dataState.calculatedFields = []; dataState.file = null;
        dashboardLayout.value = [];
        Object.keys(dashboardFilters).forEach(key => delete dashboardFilters[key]);
        
        worksheetCounter = 1;
        const newSheet = { id: 1, name: 'Sheet 1', shelves: reactive({ columns: [], rows: [], color: [], filters: [], pivotRows: [], pivotColumns: [], pivotValues: [] }), activeChartType: 'bar', analytics: reactive({ showTrendLine: false, forecastPeriods: 3, model: 'linear' }), chartData: [], payload: {} };
        worksheets.value = [newSheet];
        activeWorksheetId.value = 1;
        
        activeFilter.value = null;
        modals.settings = false;
        
        if (shouldSaveState) {
            history.splice(0, history.length);
            historyIndex.value = -1;
            nextTick(() => saveStateSnapshot()); 
        }
    }
};

const addWorksheet = () => {
    worksheetCounter = worksheets.value.reduce((maxId, sheet) => Math.max(sheet.id, maxId), 0) + 1;
    const newSheet = { id: worksheetCounter, name: `Sheet ${worksheetCounter}`, shelves: reactive({ columns: [], rows: [], color: [], filters: [], pivotRows: [], pivotColumns: [], pivotValues: [] }), activeChartType: 'bar', analytics: reactive({ showTrendLine: false, forecastPeriods: 3, model: 'linear' }), chartData: [], payload: {} };
    worksheets.value.push(newSheet);
    setActiveWorksheet(newSheet.id);
};

const removeWorksheet = (idToRemove) => {
    const index = worksheets.value.findIndex(w => w.id === idToRemove);
    if (index === -1) return;
    if (activeWorksheetId.value === idToRemove) {
        const newActiveIndex = (index === 0) ? 0 : index - 1;
        setActiveWorksheet(worksheets.value[newActiveIndex === index ? index + 1 : newActiveIndex].id);
    }
    worksheets.value.splice(index, 1);
};

const setActiveWorksheet = (id) => {
    activeWorksheetId.value = id;
    uiState.viewMode = 'worksheet';
};

const setChartType = (type) => {
    if (activeWorksheet.value) {
        activeWorksheet.value.activeChartType = type;
        requestVisualizationUpdate();
    }
};

const resetView = () => {
    if (activeWorksheet.value) {
        activeWorksheet.value.shelves = { columns: [], rows: [], color: [], filters: [], pivotRows: [], pivotColumns: [], pivotValues: [] };
        requestVisualizationUpdate();
    }
    activeFilter.value = null;
};

// --- Editing & UI Interaction ---

const startEdit = (sheet) => {
    uiState.editingId = sheet.id;
    uiState.editText = sheet.name;
};

const saveEdit = (sheet) => {
    if (uiState.editText.trim() && sheet) {
        sheet.name = uiState.editText.trim();
    }
    cancelEdit();
};

const cancelEdit = () => {
    uiState.editingId = null;
    uiState.editText = '';
};

const showContextMenu = (field, event) => {
    uiState.contextMenu = { visible: true, top: event.clientY, left: event.clientX, field };
};

const convertFieldType = () => { /* ... */ };

// --- Dashboard Management ---

const addToDashboard = () => {
    const sheet = activeWorksheet.value;
    if (!sheet || dashboardLayout.value.some(item => item.i === sheet.id.toString())) return;
    const y = dashboardLayout.value.reduce((maxY, item) => Math.max(item.y + item.h, maxY), 0);
    dashboardLayout.value.push({ x: 0, y, w: 6, h: 5, i: sheet.id.toString(), worksheetId: sheet.id });
    uiState.viewMode = 'dashboard';
};

const removeFromDashboard = (id) => {
    const index = dashboardLayout.value.findIndex(item => item.i === id);
    if (index > -1) dashboardLayout.value.splice(index, 1);
};

// --- Event Handlers for Child Components ---

const handleAddFilter = (field) => {
    const newFilter = {
        field: field.name,
        // ... other filter properties
    };
    activeWorksheet.value.shelves.filters.push(newFilter);
    activeFilter.value = newFilter;
    requestVisualizationUpdate();
};

const updateActiveFilter = (newFilterState) => {
    Object.assign(activeFilter.value, newFilterState);
    requestVisualizationUpdate();
};

const updateWorksheetAnalytics = (newAnalyticsState) => {
    if (activeWorksheet.value) {
        activeWorksheet.value.analytics = newAnalyticsState;
        requestVisualizationUpdate();
    }
};

const submitCalcField = (newField) => {
    dataState.calculatedFields.push(newField);
    dataState.measures.push(newField);
};

const submitGroup = ({ originalFieldName, newGroupName, valuesToGroup }) => {
    const newFieldName = `${originalFieldName} (Group)`;
    dataState.records.forEach(record => {
        if (valuesToGroup.includes(record[originalFieldName])) {
            record[newFieldName] = newGroupName;
        } else if (!record[newFieldName]) { // Avoid overwriting other groups
            record[newFieldName] = record[originalFieldName];
        }
    });
    if (!dataState.dimensions.some(d => d.name === newFieldName)) {
        dataState.dimensions.push({ name: newFieldName, type: 'dimension' });
    }
};

const submitBin = ({ records, newDimensionName }) => {
    dataState.records = records;
    if (!dataState.dimensions.some(d => d.name === newDimensionName)) {
        dataState.dimensions.push({ name: newDimensionName, type: 'dimension' });
    }
};

const handleAnalysisComplete = ({ type, records }) => {
    if (type === 'clustering') {
        dataState.records = records;
        if (!dataState.dimensions.some(d => d.name === 'Cluster')) {
            dataState.dimensions.push({ name: 'Cluster', type: 'dimension' });
        }
    }
};
  
  const updateWorksheetShelves = (newShelves) => {
      if(activeWorksheet.value) {
          activeWorksheet.value.shelves = newShelves;
          requestVisualizationUpdate();
      }
  };
  
// --- Lifecycle Hooks & Watchers ---

onMounted(() => {
  // Initialize the Web Worker
  try {
    // Make sure your worker.js file is in the public directory
    worker = new Worker('/worker.js'); 
  } catch (e) {
    console.error("Failed to create worker. This may happen during development server setup. Ensure worker.js is accessible.", e);
  }

  // Initialize the application state when the component is mounted
  resetApplication(true);

  // Add a global click listener to close the custom context menu when clicking outside
  window.addEventListener('click', () => {
    if (uiState.contextMenu.visible) {
      uiState.contextMenu.visible = false;
    }
  });
});

// Watch for changes in the theme setting to update the <html> element
watch(() => settings.theme, (newTheme) => {
  localStorage.setItem('datacanvas-theme', newTheme);
  document.documentElement.classList.toggle('dark', newTheme === 'dark');
  // Re-render visuals as theme change requires chart re-initialization
  if (uiState.viewMode === 'worksheet') {
    updateVisualization();
  } else {
    // renderDashboardCharts(); // This function would be called in the DashboardView component
  }
}, { immediate: true });

// Watch for changes in other settings and persist them to localStorage
watch(
  () => [
    settings.activePalette, 
    settings.activeNumberFormat, 
    settings.showDataLabels, 
    settings.autoUpdateEnabled,
    settings.yAxisMode,
    settings.yAxisMin,
    settings.yAxisMax
  ], 
  () => {
    localStorage.setItem('datacanvas-palette', settings.activePalette);
    localStorage.setItem('datacanvas-format', settings.activeNumberFormat);
    localStorage.setItem('datacanvas-labels', settings.showDataLabels);
    localStorage.setItem('datacanvas-autoupdate', settings.autoUpdateEnabled);

    if (settings.autoUpdateEnabled && uiState.isDirty) {
      updateVisualization();
      uiState.isDirty = false;
    } else {
      requestVisualizationUpdate();
    }
  }, 
  { deep: true }
);

// Watch for changes in the view mode or active worksheet
watch([() => uiState.viewMode, activeWorksheetId], ([newMode]) => {
  if (newMode === 'dashboard') {
    nextTick(() => {
        // The DashboardView component will handle its own rendering via its onMounted/watch hooks
    });
  } else {
    nextTick(() => {
        updateVisualization();
    });
  }
});

// Watch the active filter object for changes
watch(activeFilter, () => {
  requestVisualizationUpdate();
}, { deep: true });

// Watch for a change in the active chart type
watch(() => activeWorksheet.value?.activeChartType, (newType, oldType) => {
  if (newType && newType !== oldType && uiState.viewMode === 'worksheet') {
    requestVisualizationUpdate();
  }
});
  </script>
  
  <style>
/* --- 1. Variables & Base Styles --- */
:root {
  /* Default Light Theme */
  --primary-color: #3b82f6;
  --primary-color-hover: #2563eb;
  --bg-main: #f8fafc;
  --bg-panel: #ffffff;
  --text-color: #334155;
  --text-color-light: #64748b;
  --border-color: #e2e8f0;
  --dimension-color: #059669;
  --dimension-bg: #f0fdf4;
  --dimension-border: #bbf7d0;
  --measure-color: #2563eb;
  --measure-bg: #eff6ff;
  --measure-border: #bfdbfe;
  --shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  --shelf-bg: #f1f5f9;
  --shelf-border: #cbd5e1;
  --hover-bg: rgba(59, 130, 246, 0.1); 
}

html.dark {
  /* Dark Theme Overrides */
  --primary-color: #60a5fa;
  --primary-color-hover: #3b82f6;
  --bg-main: #18181b;
  --bg-panel: #27272a;
  --text-color: #e4e4e7;
  --text-color-light: #a1a1aa;
  --border-color: #3f3f46;
  --dimension-color: #34d399;
  --dimension-bg: #064e3b;
  --dimension-border: #15803d;
  --measure-color: #93c5fd;
  --measure-bg: #1e3a8a;
  --measure-border: #1d4ed8;
  --shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  --shelf-bg: #3f3f46;
  --shelf-border: #52525b;
  --hover-bg: rgba(96, 165, 250, 0.1); 
}

body {
  font-family: 'Inter', sans-serif;
  background-color: var(--bg-main);
  color: var(--text-color);
  margin: 0;
  transition: background-color 0.2s, color 0.2s;
  overflow: hidden;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* --- 2. Layout --- */
.app-layout {
  display: grid;
  grid-template-columns: 280px 1fr 280px;
  grid-template-rows: 1fr auto;
  height: 100vh;
}

/* --- 3. Shared Components --- */
.action-button,
.file-upload-label {
  display: block;
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-radius: 8px;
  box-sizing: border-box;
  cursor: pointer;
  text-align: center;
  font-weight: 500;
  transition: background-color 0.2s ease, transform 0.1s ease;
  background-color: var(--primary-color);
  color: white;
}

.action-button:hover,
.file-upload-label:hover {
  background-color: var(--primary-color-hover);
}

.action-button:active,
.file-upload-label:active {
  transform: scale(0.98);
}

.action-button:disabled {
  background-color: var(--text-color-light);
  cursor: not-allowed;
  transform: none;
}

.action-button.secondary {
  background-color: #64748b;
}

html.dark .action-button.secondary {
  background-color: #475569;
}

.action-button.secondary:hover {
  background-color: #475569;
}

html.dark .action-button.secondary:hover {
  background-color: #334155;
}

.settings-dropdown {
  padding: 0.5rem;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-main);
  color: var(--text-color);
  font-family: inherit;
  font-size: 0.9rem;
}

.topn-input {
  width: 60px;
  padding: 0.5rem;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-main);
  color: var(--text-color);
  font-family: inherit;
}

/* --- 5. Modals & Overlays --- */
.spinner-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(248, 250, 252, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  backdrop-filter: blur(4px);
}

html.dark .spinner-overlay {
  background-color: rgba(24, 24, 27, 0.7);
}

.spinner {
  border: 5px solid var(--border-color);
  border-top: 5px solid var(--primary-color);
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* --- 9. Misc & Welcome --- */
.welcome-panel {
  grid-column: 2 / 4;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
}

.welcome-content {
  text-align: center;
  color: var(--text-color-light);
}

.welcome-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  display: block;
}

/* --- 10. Media Queries --- */
@media (max-width: 1200px) {
  .app-layout {
      grid-template-columns: 240px 1fr;
  }
  .context-panel {
      display: none;
  }
}

@media (max-width: 768px) {
  .app-layout {
      grid-template-columns: 1fr;
      grid-template-rows: auto 1fr auto;
      height: auto;
      min-height: 100vh;
      overflow-y: auto;
  }

  .data-panel {
      grid-row: 1;
      height: auto;
      border-right: none;
      border-bottom: 1px solid var(--border-color);
  }

  .main-container {
      grid-row: 2;
      overflow: visible;
  }
  
  .main-content {
      height: auto;
      min-height: 400px;
  }

  .worksheet-tabs {
      grid-row: 3;
      grid-column: 1;
  }
  
  .welcome-panel {
      grid-column: 1;
  }
}
  </style>