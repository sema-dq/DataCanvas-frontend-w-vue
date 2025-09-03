<template>
  <Transition name="fade">
    <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-content">
        <h2>Create Bins</h2>
        
        <div class="form-group">
          <label for="bin-field-name">New Bin Name</label>
          <input 
            type="text" 
            id="bin-field-name" 
            v-model.trim="binningState.binName" 
            placeholder="e.g., Sales Bins"
          >
        </div>

        <div class="form-group">
          <label for="measure-to-bin">Measure to Bin</label>
          <select id="measure-to-bin" v-model="binningState.measure" class="settings-dropdown">
            <option disabled value="">Select a measure</option>
            <option v-for="m in dataState.measures" :key="m.name" :value="m.name">{{ m.name }}</option>
          </select>
        </div>

        <div class="form-group">
          <label for="bin-size">Bin Size</label>
          <input 
            type="number" 
            id="bin-size" 
            v-model.number="binningState.binSize" 
            min="1"
          >
          <p class="formula-hint">Defines the width of each bin (e.g., a size of 100 creates bins like 0-100, 100-200, etc.).</p>
        </div>
        
        <div v-if="errorMessage" class="connection-status error">
          {{ errorMessage }}
        </div>

        <div class="modal-actions">
          <button class="action-button secondary" @click="$emit('close')">Cancel</button>
          <button class="action-button" @click="submitBinning" :disabled="!isFormValid || isLoading">
            {{ isLoading ? 'Creating...' : 'Create Bins' }}
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

const emit = defineEmits(['close', 'create-bins']);

const isLoading = ref(false);
const errorMessage = ref('');

const binningState = reactive({
  measure: '',
  binSize: 100,
  binName: '',
});

// Reset the form's state every time the modal is opened
watch(() => props.show, (isVisible) => {
  if (isVisible) {
    isLoading.value = false;
    errorMessage.value = '';

    // Pre-populate form with sensible defaults
    const defaultMeasure = props.dataState.measures[0]?.name || '';
    binningState.measure = defaultMeasure;
    binningState.binSize = 100;
    binningState.binName = defaultMeasure ? `${defaultMeasure} (Bins)` : '';
  }
});

const isFormValid = computed(() => {
  return binningState.binName && binningState.measure && binningState.binSize > 0;
});

const submitBinning = async () => {
  errorMessage.value = '';
  if (!isFormValid.value) {
    errorMessage.value = 'Please fill in all fields.';
    return;
  }

  const existingFields = [...props.dataState.dimensions, ...props.dataState.measures].map(f => f.name);
  if (existingFields.includes(binningState.binName)) {
    errorMessage.value = 'This field name already exists. Please choose a different name.';
    return;
  }

  isLoading.value = true;
  try {
    // We create a temporary worker to handle the calculation off the main thread
    const worker = new Worker('/worker.js');
    
    const workerResult = await new Promise((resolve, reject) => {
      worker.onmessage = (event) => {
        worker.terminate();
        resolve(event.data);
      };
      worker.onerror = (error) => {
        worker.terminate();
        reject(error);
      };

      worker.postMessage({ 
        type: 'runBinning', 
        payload: {
          records: JSON.parse(JSON.stringify(props.dataState.records)),
          measure: binningState.measure,
          binSize: binningState.binSize,
          binName: binningState.binName
        }
      });
    });

    if (workerResult.error) {
      throw new Error(workerResult.error);
    }
    
    // Emit the successful result to the parent component
    emit('create-bins', {
      records: workerResult.records,
      newDimensionName: binningState.binName
    });

    emit('close');

  } catch (e) {
    console.error("Binning failed:", e);
    errorMessage.value = `Failed to create bins: ${e.message}`;
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
/* Scoped styles for the Binning Modal */
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
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  box-sizing: border-box;
  background-color: var(--bg-main);
  color: var(--text-color);
  font-family: inherit;
}

.formula-hint {
  font-size: 0.8rem;
  color: var(--text-color-light);
  margin-top: 0.5rem;
  margin-bottom: 0;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 2rem;
}

.connection-status.error {
  color: #ee6666;
  font-weight: 500;
  margin-top: 1rem;
  text-align: center;
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