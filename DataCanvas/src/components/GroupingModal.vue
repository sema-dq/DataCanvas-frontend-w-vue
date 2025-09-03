<template>
  <Transition name="fade">
    <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-content">
        <h2 v-if="fieldToGroup">Group Values in "{{ fieldToGroup.name }}"</h2>
        
        <div class="form-group">
          <label for="new-group-name">New Group Name</label>
          <input 
            type="text" 
            id="new-group-name" 
            v-model.trim="groupingState.newGroupName" 
            placeholder="e.g., West Coast"
          >
        </div>
        
        <p class="instruction-text">Select values to include in this group:</p>
        <div class="values-list">
          <div v-for="value in uniqueValues" :key="value" class="checkbox-item">
            <input 
              type="checkbox" 
              :id="`group-${value}`" 
              :value="value" 
              v-model="groupingState.selectedValues"
            >
            <label :for="`group-${value}`">{{ value }}</label>
          </div>
        </div>

        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <div class="modal-actions">
          <button class="action-button secondary" @click="$emit('close')">Cancel</button>
          <button class="action-button" @click="submitGroup">Group</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';

const props = defineProps({
  show: Boolean,
  // The field object being grouped (e.g., { name: 'Region' })
  fieldToGroup: Object,
  // The full dataset needed to derive unique values
  records: Array,
});

const emit = defineEmits(['close', 'create-group']);

const groupingState = reactive({
  newGroupName: '',
  selectedValues: [],
});

const errorMessage = ref('');

// Calculate the unique values for the selected field
const uniqueValues = computed(() => {
  if (!props.fieldToGroup || !props.records.length) {
    return [];
  }
  // Use a Set for performance and to automatically handle duplicates
  return [...new Set(props.records.map(r => r[props.fieldToGroup.name]))].sort();
});

// Reset the form state every time the modal is opened with a new field
watch(() => props.show, (isVisible) => {
  if (isVisible) {
    groupingState.newGroupName = '';
    groupingState.selectedValues = [];
    errorMessage.value = '';
  }
});

const submitGroup = () => {
  errorMessage.value = '';
  if (!groupingState.newGroupName) {
    errorMessage.value = 'Please provide a name for the new group.';
    return;
  }
  if (groupingState.selectedValues.length === 0) {
    errorMessage.value = 'Please select at least one value to include in the group.';
    return;
  }

  // Emit the necessary information to the parent App.vue component
  emit('create-group', {
    originalFieldName: props.fieldToGroup.name,
    newGroupName: groupingState.newGroupName,
    valuesToGroup: groupingState.selectedValues,
  });

  emit('close');
};
</script>

<style scoped>
/* Scoped styles for the Grouping Modal */
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

.modal-content h2 { margin-top: 0; margin-bottom: 1.5rem; }
.modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; }

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.form-group input {
  width: 100%; padding: 0.75rem; border-radius: 8px;
  border: 1px solid var(--border-color); box-sizing: border-box;
  background-color: var(--bg-main); color: var(--text-color);
  font-family: inherit; font-size: 1rem;
}

.instruction-text {
  color: var(--text-color-light);
  margin-bottom: 0.75rem;
}

.values-list {
  max-height: 250px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.75rem;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.25rem 0;
}
.checkbox-item:not(:last-child) {
  margin-bottom: 0.5rem;
}
.checkbox-item label {
  cursor: pointer;
}
.checkbox-item input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--primary-color);
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