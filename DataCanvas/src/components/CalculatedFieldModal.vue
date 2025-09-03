<template>
  <Transition name="fade">
    <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-content">
        <h2>Create Calculated Field</h2>

        <div class="form-group">
          <label for="calc-field-name">Field Name</label>
          <input 
            type="text" 
            id="calc-field-name" 
            v-model.trim="newCalcField.name" 
            placeholder="e.g., Profit Ratio"
          >
        </div>

        <div class="form-group">
          <label for="calc-field-formula">Formula</label>
          <textarea 
            id="calc-field-formula" 
            v-model="newCalcField.formula" 
            placeholder="e.g., SUM([Profit]) / SUM([Sales])"
          ></textarea>
          <p class="formula-hint">
            Wrap field names in square brackets `[]`. Supports `SUM`, `AVG`, `COUNT`, `COUNTD`, `MIN`, `MAX`, `MEDIAN`, `STDEV`, and `VAR` functions.
          </p>
        </div>

        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <div class="modal-actions">
          <button class="action-button secondary" @click="$emit('close')">Cancel</button>
          <button class="action-button" @click="submit">Create Field</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { reactive, ref, watch } from 'vue';

const props = defineProps({
  show: Boolean,
});

const emit = defineEmits(['close', 'create']);

const newCalcField = reactive({
  name: '',
  formula: '',
});

const errorMessage = ref('');

// Reset the form's state every time the modal is opened
watch(() => props.show, (isVisible) => {
  if (isVisible) {
    newCalcField.name = '';
    newCalcField.formula = '';
    errorMessage.value = '';
  }
});

const submit = () => {
  errorMessage.value = '';

  // 1. Validate that the name and formula are not empty
  if (!newCalcField.name || !newCalcField.formula) {
    errorMessage.value = 'Please provide both a field name and a formula.';
    return;
  }

  // 2. Validate that the formula uses a valid aggregation function
  const functions = ['SUM', 'AVG', 'COUNT', 'COUNTD', 'MIN', 'MAX', 'MEDIAN', 'STDEV', 'VAR'];
  const aggRegex = new RegExp(`(${functions.join('|')})\\(\\[(.*?)\\]\\)`, 'g');
  if (!aggRegex.test(newCalcField.formula)) {
    errorMessage.value = `Formula must use at least one valid aggregation, like SUM([FieldName]).`;
    return;
  }

  // 3. If validation passes, create the field object
  const createdField = {
    name: newCalcField.name,
    type: 'measure',
    isCalculated: true,
    formula: newCalcField.formula
  };

  // 4. Emit the new field to the parent component and close the modal
  emit('create', createdField);
  emit('close');
};
</script>

<style scoped>
/* Scoped styles for the Calculated Field Modal */
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
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  box-sizing: border-box;
  background-color: var(--bg-main);
  color: var(--text-color);
  font-family: inherit;
  font-size: 1rem;
}

.form-group textarea {
  min-height: 100px;
  resize: vertical;
}

.formula-hint {
  font-size: 0.8rem;
  color: var(--text-color-light);
  margin-top: 0.5rem;
  margin-bottom: 0;
  line-height: 1.4;
}

.error-message {
  color: #ee6666;
  background-color: rgba(238, 102, 102, 0.1);
  border: 1px solid rgba(238, 102, 102, 0.3);
  padding: 0.75rem;
  border-radius: 8px;
  margin-top: 1.5rem;
  font-weight: 500;
  text-align: center;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 2rem;
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