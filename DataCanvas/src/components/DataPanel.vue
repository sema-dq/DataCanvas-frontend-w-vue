<template>
  <aside class="data-panel">
    <header class="panel-header">
      <div class="header-top-row">
        <h2>Data Fields</h2>
        <div class="undo-redo-controls">
          <button @click="$emit('undo')" :disabled="!canUndo" title="Undo">↶</button>
          <button @click="$emit('redo')" :disabled="!canRedo" title="Redo">↷</button>
        </div>
      </div>

      <div class="view-switcher">
        <button 
          :class="{ active: uiState.viewMode === 'worksheet' }" 
          @click="$emit('update:viewMode', 'worksheet')"
        >
          Worksheet
        </button>
        <button 
          :class="{ active: uiState.viewMode === 'dashboard' }" 
          @click="$emit('update:viewMode', 'dashboard')"
        >
          Dashboard
        </button>
      </div>

      <div class="panel-actions">
        <label for="file-input" class="file-upload-label">{{ dataState.file ? dataState.file.name : 'Load Data' }}</label>
        <input 
          type="file" 
          id="file-input" 
          @change="$emit('file-uploaded', $event)" 
          accept=".csv,.datacanvas" 
          class="visually-hidden"
        >
        
        <button class="action-button secondary" @click="$emit('open-modal', 'database')">Connect to Database</button>
      
        <button class="action-button" @click="$emit('save-workspace')" v-if="dataState.records.length">Save Workspace</button>
        <button class="action-button secondary" @click="$emit('open-modal', 'calculatedField')" v-if="dataState.records.length">Create Calculated Field</button>
        <button class="action-button secondary" @click="$emit('open-modal', 'binning')" v-if="dataState.records.length">Create Bins</button>

        <div class="url-loader" v-if="!dataState.records.length">
          <input 
            type="url" 
            class="url-input" 
            :value="dataState.dataUrl" 
            @input="$emit('update:dataUrl', $event.target.value)"
            placeholder="Or paste URL to raw CSV..."
          >
          <button class="action-button" @click="$emit('load-data-from-url')">Load</button>
        </div>
      </div>
    </header>

    <div class="field-list" v-if="dataState.records.length">
      <h3>Dimensions</h3>
      <draggable 
        :list="dataState.dimensions" 
        class="draggable-zone" 
        item-key="name" 
        :group="{ name: 'fields', pull: 'clone', put: false }"
      >
        <template #item="{element}">
          <div class="field-pill dimension" @contextmenu.prevent="$emit('show-context-menu', element, $event)">
            {{ element.name }}
          </div>
        </template>
      </draggable>

      <h3>Measures</h3>
      <draggable 
        :list="dataState.measures" 
        class="draggable-zone" 
        item-key="name" 
        :group="{ name: 'fields', pull: 'clone', put: false }"
      >
        <template #item="{element}">
          <div class="field-pill measure" @contextmenu.prevent="$emit('show-context-menu', element, $event)">
            {{ element.name }}
          </div>
        </template>
      </draggable>
    </div>
  </aside>
</template>

<script setup>
// Define the data (props) this component expects to receive from its parent (App.vue)
defineProps({
  uiState: Object,
  dataState: Object,
  canUndo: Boolean,
  canRedo: Boolean
});

// Define the events this component can send to its parent
defineEmits([
  'undo',
  'redo',
  'update:viewMode', // For v-model binding on the view switcher
  'update:dataUrl',   // For v-model binding on the URL input
  'file-uploaded',
  'open-modal',
  'save-workspace',
  'load-data-from-url',
  'show-context-menu'
]);
</script>

<style scoped>
/* Scoped styles ensure they only apply to this component */
.data-panel {
  background-color: var(--bg-panel);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  grid-row: 1 / 3;
  overflow: hidden;
}

.panel-header {
  padding: 1rem 1rem 0;
  border-bottom: 1px solid var(--border-color);
}

.header-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-top-row h2 {
  margin: 0;
  font-size: 1.1rem;
}

.undo-redo-controls button {
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
  font-size: 1.2rem;
  color: var(--text-color);
  margin-left: 0.25rem;
}
.undo-redo-controls button:hover:not(:disabled) { background-color: var(--hover-bg); }
.undo-redo-controls button:disabled { cursor: not-allowed; opacity: 0.3; }

.view-switcher {
  display: flex;
  background-color: var(--shelf-bg);
  border-radius: 8px;
  padding: 4px;
  margin: 1rem 0;
}

.view-switcher button {
  flex: 1; padding: 0.5rem; border: none; background-color: transparent;
  color: var(--text-color-light); font-weight: 500; border-radius: 6px;
  cursor: pointer; transition: all 0.2s ease;
}

.view-switcher button.active {
  background-color: var(--bg-panel);
  color: var(--primary-color);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.panel-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-bottom: 1rem;
}

.url-loader {
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.url-input {
  width: 100%; padding: 0.75rem; border-radius: 8px;
  border: 1px solid var(--border-color); box-sizing: border-box;
  background-color: var(--bg-main); color: var(--text-color);
  font-family: inherit; font-size: 0.9rem;
}

.field-list {
  padding: 0 1rem 1rem;
  overflow-y: auto;
  flex-grow: 1;
}

.field-list h3 {
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: var(--text-color-light);
}

.field-pill {
  padding: 0.5rem 0.75rem;
  margin-bottom: 0.5rem;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: grab;
  border: 1px solid transparent;
  transition: border-color 0.2s, background-color 0.2s;
}

.field-pill.dimension {
  background-color: var(--dimension-bg);
  color: var(--dimension-color);
  border-color: var(--dimension-border);
}

.field-pill.measure {
  background-color: var(--measure-bg);
  color: var(--measure-color);
  border-color: var(--measure-border);
}

.visually-hidden {
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0, 0, 0, 0); border: 0;
}
</style>