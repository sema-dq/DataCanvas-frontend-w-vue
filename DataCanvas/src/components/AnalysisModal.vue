<template>
  <Transition name="fade">
    <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-content">
        <h2>Statistical Analysis</h2>

        <div class="analysis-controls">
          <label for="analysis-type">Select Test</label>
          <select id="analysis-type" v-model="analysisState.testType" class="settings-dropdown">
            <option value="correlation">Correlation Analysis</option>
            <option value="ttest">Two-Sample T-Test</option>
            <option value="zscore">Z-Score Outliers</option>
            <option value="clustering">K-Means Clustering</option>
          </select>

          <div v-if="analysisState.testType === 'correlation'" class="analysis-inputs">
            <label>Measure 1:</label>
            <select v-model="analysisState.correlation.measure1" class="settings-dropdown">
              <option v-for="m in dataState.measures" :key="m.name" :value="m.name">{{ m.name }}</option>
            </select>
            <label>Measure 2:</label>
            <select v-model="analysisState.correlation.measure2" class="settings-dropdown">
              <option v-for="m in dataState.measures" :key="m.name" :value="m.name">{{ m.name }}</option>
            </select>
          </div>

          <div v-if="analysisState.testType === 'ttest'" class="analysis-inputs">
            <label>Measure:</label>
            <select v-model="analysisState.ttest.measure" class="settings-dropdown">
              <option v-for="m in dataState.measures" :key="m.name" :value="m.name">{{ m.name }}</option>
            </select>
            <label>Group Dimension:</label>
            <select v-model="analysisState.ttest.dimension" class="settings-dropdown">
              <option v-for="d in dataState.dimensions" :key="d.name" :value="d.name">{{ d.name }}</option>
            </select>
            <p class="formula-hint">This test compares the mean of the two largest groups in the selected dimension.</p>
          </div>

          <div v-if="analysisState.testType === 'zscore'" class="analysis-inputs">
            <label>Measure for Z-Score:</label>
            <select v-model="analysisState.zscore.measure" class="settings-dropdown">
              <option v-for="m in dataState.measures" :key="m.name" :value="m.name">{{ m.name }}</option>
            </select>
          </div>

          <div v-if="analysisState.testType === 'clustering'" class="analysis-inputs">
            <label>Number of Clusters (K):</label>
            <input type="number" class="topn-input" v-model.number="analysisState.clustering.k" min="2">
            <label>Fields to Cluster:</label>
            <div class="values-list" style="max-height: 150px;">
              <div v-for="m in dataState.measures" :key="m.name" class="checkbox-item">
                <input type="checkbox" :id="`cluster-${m.name}`" :value="m.name" v-model="analysisState.clustering.fields">
                <label :for="`cluster-${m.name}`">{{ m.name }}</label>
              </div>
            </div>
            <p class="formula-hint">Clusters will be added as a new dimension. Best visualized on a scatter plot.</p>
          </div>
        </div>

        <div v-if="analysisState.result || analysisState.error" class="analysis-results">
          <h3>Results</h3>
          <div v-if="analysisState.result" class="results-table">
            <table>
              <thead>
                <tr>
                  <th v-for="header in analysisState.result.headers">{{ header }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, index) in analysisState.result.rows" :key="index">
                  <td v-for="(cell, cIndex) in row" :key="cIndex">{{ cell }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-if="analysisState.error" class="connection-status error">
             Error: {{ analysisState.error }}
          </div>
        </div>

        <div class="modal-actions">
          <button class="action-button secondary" @click="$emit('close')">Close</button>
          <button class="action-button" @click="runAnalysis" :disabled="!canRunAnalysis || isLoading">
            {{ isLoading ? 'Running...' : 'Run Analysis' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';

const props = defineProps({
  show: Boolean,
  dataState: Object,
});

const emit = defineEmits(['close', 'analysis-complete']);

const apiUrl = 'https://datacanvas-api.onrender.com';
const isLoading = ref(false);

const analysisState = reactive({
  testType: 'correlation',
  correlation: { measure1: '', measure2: '' },
  ttest: { measure: '', dimension: '' },
  zscore: { measure: '' },
  clustering: { k: 3, fields: [] },
  result: null,
  error: '',
});

// Reset the modal's state every time it's opened
watch(() => props.show, (newValue) => {
  if (newValue) {
    analysisState.result = null;
    analysisState.error = '';
    analysisState.testType = 'correlation';
    
    // Pre-populate dropdowns with sensible defaults
    analysisState.correlation.measure1 = props.dataState.measures[0]?.name || '';
    analysisState.correlation.measure2 = props.dataState.measures[1]?.name || '';
    analysisState.ttest.measure = props.dataState.measures[0]?.name || '';
    analysisState.ttest.dimension = props.dataState.dimensions[0]?.name || '';
    analysisState.zscore.measure = props.dataState.measures[0]?.name || '';
    analysisState.clustering.fields = [];
  }
});

const canRunAnalysis = computed(() => {
  switch (analysisState.testType) {
    case 'correlation':
      return analysisState.correlation.measure1 && analysisState.correlation.measure2 && analysisState.correlation.measure1 !== analysisState.correlation.measure2;
    case 'ttest':
      return analysisState.ttest.measure && analysisState.ttest.dimension;
    case 'zscore':
      return analysisState.zscore.measure;
    case 'clustering':
      return analysisState.clustering.k > 1 && analysisState.clustering.fields.length >= 2;
    default:
      return false;
  }
});

const runAnalysis = async () => {
  analysisState.result = null;
  analysisState.error = '';
  isLoading.value = true;

  try {
    let endpoint = '';
    let payload = { records: JSON.parse(JSON.stringify(props.dataState.records)) };

    switch (analysisState.testType) {
      case 'correlation':
        endpoint = '/analysis/correlation';
        payload.measure1 = analysisState.correlation.measure1;
        payload.measure2 = analysisState.correlation.measure2;
        break;
      case 'ttest':
        endpoint = '/analysis/t-test';
        payload.measure = analysisState.ttest.measure;
        payload.dimension = analysisState.ttest.dimension;
        break;
      case 'zscore':
        endpoint = '/ml/z-score-outliers';
        payload.measure = analysisState.zscore.measure;
        break;
      case 'clustering':
        endpoint = '/ml/kmeans-clustering';
        payload.fields = analysisState.clustering.fields;
        payload.n_clusters = analysisState.clustering.k;
        break;
      default:
        throw new Error('Invalid test type selected.');
    }

    const response = await fetch(`${apiUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const apiResult = await response.json();
    if (!response.ok) {
      throw new Error(apiResult.detail || 'The API request failed.');
    }

    if (analysisState.testType === 'clustering') {
      // For clustering, we emit an event to update the main app's state
      emit('analysis-complete', { 
        type: 'clustering', 
        records: apiResult.records 
      });
      emit('close'); // Close the modal on success
    } else {
      // For other tests, we display the results locally in the modal
      const result = apiResult.result;
      let headers = [];
      let rows = [];

      if (result.correlation_coefficient !== undefined) {
        headers = ['Measures', 'Correlation Coefficient'];
        rows = [[`${payload.measure1} & ${payload.measure2}`, result.correlation_coefficient.toFixed(4)]];
      } else if (result.t_statistic !== undefined) {
        headers = ['T-Statistic', 'P-Value'];
        rows = [[result.t_statistic.toFixed(4), result.p_value.toFixed(4)]];
      } else if (result.outliers) {
        headers = result.outliers.length > 0 ? Object.keys(result.outliers[0]) : ['Message'];
        rows = result.outliers.length > 0 ? result.outliers.map(o => Object.values(o)) : [[result.message || 'No outliers found']];
      }
      analysisState.result = { headers, rows };
    }

  } catch (e) {
    console.error("Analysis failed:", e);
    analysisState.error = e.message;
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
/* Scoped styles ensure they only apply to this component */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: flex-start;
  overflow-y: auto;
  padding: 3rem 1rem;
  z-index: 1000;
}

.modal-content {
  background: var(--bg-panel);
  padding: 2rem;
  border-radius: 12px;
  max-width: 450px;
  width: 100%;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.modal-content h2 {
  margin-top: 0;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.analysis-controls {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.analysis-inputs {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.analysis-results {
  border-top: 1px solid var(--border-color);
  padding-top: 1rem;
  margin-top: 2rem;
}

.results-table {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

th {
  background: var(--bg-main);
  font-weight: 600;
  position: sticky;
  top: 0;
}

.connection-status.error {
  color: #ee6666;
  font-weight: 500;
}

.values-list {
  max-height: 250px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.75rem;
  margin-top: 0.5rem;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.formula-hint {
  font-size: 0.8rem;
  color: var(--text-color-light);
  margin-top: 0;
}

.settings-dropdown {
  width: 100%;
}

.topn-input {
  width: 80px;
}

/* Fade Transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>