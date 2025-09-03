<template>
  <Transition name="fade">
    <div v-if="show" class="modal-overlay">
      <div class="modal-content">
        <h2>Load Data Options</h2>
        <p>Choose how to load the fields from your file: <strong>{{ fieldSelection.fileName }}</strong></p>

        <div class="load-options">
          <label class="radio-option">
            <input type="radio" name="load-option" value="all" v-model="selectionState.mode">
            <span>Load all fields</span>
          </label>
          <label class="radio-option">
            <input type="radio" name="load-option" value="select" v-model="selectionState.mode">
            <span>Select specific fields</span>
          </label>
        </div>

        <div v-if="selectionState.mode === 'select'" class="field-selection-container">
          <h4>Dimensions</h4>
          <div class="values-list">
            <div v-for="field in fieldSelection.availableDimensions" :key="field" class="checkbox-item">
              <input type="checkbox" :id="`select-${field}`" :value="field" v-model="selectionState.selectedFields">
              <label :for="`select-${field}`">{{ field }}</label>
            </div>
          </div>
          <h4>Measures</h4>
          <div class="values-list">
            <div v-for="field in fieldSelection.availableMeasures" :key="field" class="checkbox-item">
              <input type="checkbox" :id="`select-${field}`" :value="field" v-model="selectionState.selectedFields">
              <label :for="`select-${field}`">{{ field }}</label>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button class="action-button secondary" @click="$emit('close')">Cancel</button>
          <button 
            class="action-button" 
            @click="finalizeLoad" 
            :disabled="selectionState.mode === 'select' && selectionState.selectedFields.length === 0"
          >
            Load Data
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { reactive, watchEffect } from 'vue';

const props = defineProps({
  show: Boolean,
  // This prop contains the initial data passed from the parent
  fieldSelection: Object,
});

const emit = defineEmits(['close', 'load']);

// We create a local reactive state to manage the form.
// This prevents directly mutating the prop, which is a Vue anti-pattern.
const selectionState = reactive({
  mode: 'all',
  selectedFields: [],
});

// When the modal is shown, sync the local state with the prop data.
// This "resets" the form every time it's opened with a new file.
watchEffect(() => {
  if (props.show) {
    selectionState.mode = props.fieldSelection.mode || 'all';
    // Deep copy the array to ensure reactivity and prevent mutation issues
    selectionState.selectedFields = [...props.fieldSelection.selectedFields];
  }
});

const finalizeLoad = () => {
  // Emit the final user choices back to the parent component.
  // The parent (App.vue) is responsible for the actual data processing.
  emit('load', {
    mode: selectionState.mode,
    selectedFields: selectionState.selectedFields,
  });
};
</script>

<style scoped>
/* Scoped styles for the Field Selector Modal */
.modal-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background-color: rgba(0, 0, 0, 0.5); display: flex;
  justify-content: center; align-items: flex-start;
  overflow-y: auto; padding: 3rem 1rem; z-index: 1000;
}
.modal-content {
  background: var(--bg-panel); padding: 2rem; border-radius: 12px;
  max-width: 450px; width: 100%; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}
.modal-content h2 { margin-top: 0; }
.modal-content p { margin-bottom: 1.5rem; color: var(--text-color-light); }
.modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; }

.load-options {
  display: flex; flex-direction: column; gap: 1rem;
  margin: 1.5rem 0; background-color: var(--shelf-bg);
  padding: 1rem; border-radius: 8px;
}
.radio-option {
  display: flex; align-items: center; gap: 0.75rem;
  cursor: pointer; font-weight: 500;
}
.radio-option input[type="radio"] {
  accent-color: var(--primary-color);
  width: 18px; height: 18px;
}

.field-selection-container h4 {
  margin-top: 1.5rem; margin-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.5rem;
}
.values-list {
  max-height: 150px; overflow-y: auto; border: 1px solid var(--border-color);
  border-radius: 8px; padding: 0.75rem;
}
.checkbox-item { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }

/* Fade Transition */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>