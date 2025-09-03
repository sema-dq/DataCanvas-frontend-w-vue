<template>
    <footer class="worksheet-tabs">
      <div 
        v-for="sheet in worksheets" 
        :key="sheet.id" 
        class="tab"
        :class="{ 'active': sheet.id === activeWorksheetId }"
        @click="$emit('set-active', sheet.id)"
        @dblclick="$emit('start-edit', sheet)">
        
        <input 
          v-if="editingId === sheet.id"
          type="text" 
          class="tab-editor"
          :value="editText"
          @input="$emit('update:editText', $event.target.value)"
          @blur="$emit('save-edit')" 
          @keyup.enter="$emit('save-edit')" 
          @keyup.esc="$emit('cancel-edit')"
          @click.stop
          v-focus
        />
        <span v-else>{{ sheet.name }}</span>
  
        <button 
          class="close-tab" 
          v-if="worksheets.length > 1 && editingId !== sheet.id" 
          @click.stop="$emit('remove-sheet', sheet.id)"
        >×</button>
      </div>
      <button class="tab add-sheet" @click="$emit('add-sheet')">+</button>
    </footer>
  </template>
  
  <script setup>
  import { nextTick } from 'vue';
  
  const props = defineProps({
    worksheets: Array,
    activeWorksheetId: Number,
    editingId: [Number, String, null],
    editText: String,
  });
  
  defineEmits([
      'set-active', 
      'add-sheet', 
      'remove-sheet', 
      'start-edit', 
      'save-edit', 
      'cancel-edit',
      'update:editText'
  ]);
  
  // Custom directive to focus the input when it appears
  const vFocus = {
    mounted: (el) => {
      nextTick(() => {
          el.focus();
          el.select();
      });
    }
  }
  </script>
  
  <style scoped>
  /* Scoped styles for the Worksheet Tabs */
  .worksheet-tabs {
    grid-column: 2 / 3;
    grid-row: 2 / 3;
    display: flex;
    align-items: center;
    background-color: var(--bg-main);
    border-top: 1px solid var(--border-color);
    padding: 0 0.5rem;
    overflow-x: auto;
    flex-shrink: 0; /* Prevents shrinking in flex layouts */
  }
  
  .tab {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1.5rem;
    cursor: pointer;
    border-right: 1px solid var(--border-color);
    color: var(--text-color-light);
    font-size: 0.9rem;
    position: relative;
    white-space: nowrap;
    background: none;
    border-left: none;
    border-top: none;
    border-bottom: none;
    font-family: inherit;
    transition: background-color 0.2s;
  }
  
  .tab:hover {
    background-color: var(--bg-panel);
  }
  
  .tab.active {
    background-color: var(--bg-panel);
    color: var(--primary-color);
    font-weight: 500;
  }
  
  .tab.active::before {
    content: '';
    position: absolute;
    top: -1px;
    left: 0;
    right: 0;
    height: 2px;
    background-color: var(--primary-color);
  }
  
  .add-sheet {
    font-size: 1.2rem;
    font-weight: bold;
  }
  
  .close-tab {
    font-size: 1.2rem;
    line-height: 1;
    padding: 0.1rem 0.25rem;
    border-radius: 4px;
    transition: background-color 0.2s ease;
    border: none;
    background: none;
    color: inherit;
    cursor: pointer;
  }
  
  .close-tab:hover {
    background-color: var(--border-color);
  }
  
  .tab-editor {
    border: 1px solid var(--primary-color);
    background-color: var(--bg-main);
    color: var(--text-color);
    padding: 2px 4px;
    border-radius: 4px;
    font-family: inherit;
    font-size: 0.9rem;
    font-weight: 500;
    outline: none;
    width: 100px; /* Give the editor a default width */
  }
  </style>