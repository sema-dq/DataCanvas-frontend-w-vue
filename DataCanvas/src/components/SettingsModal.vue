<template>
    <Transition name="fade">
      <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
        <div class="modal-content">
          <h2>Settings</h2>
  
          <div class="settings-item">
            <span>Dark Mode</span>
            <label class="theme-switch">
              <input type="checkbox" v-model="isDarkTheme">
              <span class="switch-slider"></span>
            </label>
          </div>
  
          <div class="settings-item">
            <span>Auto-Update Chart</span>
            <label class="theme-switch">
              <input 
                type="checkbox" 
                :checked="settings.autoUpdateEnabled" 
                @change="emitUpdate('autoUpdateEnabled', $event.target.checked)"
              >
              <span class="switch-slider"></span>
            </label>
          </div>
  
          <div class="settings-item">
            <span>Number Formatting</span>
            <select 
              class="settings-dropdown" 
              :value="settings.activeNumberFormat"
              @change="emitUpdate('activeNumberFormat', $event.target.value)"
            >
              <option v-for="(label, key) in numberFormats" :key="key" :value="key">
                {{ label }}
              </option>
            </select>
          </div>
  
          <div class="settings-item section-break">
            <span>Y-Axis Scaling</span>
            <select 
              class="settings-dropdown" 
              :value="settings.yAxisMode"
              @change="emitUpdate('yAxisMode', $event.target.value)"
            >
              <option value="auto">Automatic</option>
              <option value="fixed">Fixed</option>
            </select>
          </div>
          <div v-if="settings.yAxisMode === 'fixed'" class="settings-item sub-item">
            <input type="number" class="topn-input" :value="settings.yAxisMin" @input="emitUpdate('yAxisMin', $event.target.value)" placeholder="Min">
            <input type="number" class="topn-input" :value="settings.yAxisMax" @input="emitUpdate('yAxisMax', $event.target.value)" placeholder="Max">
          </div>
          
          <div class="settings-item palette-setting">
            <span>Chart Color Palette</span>
            <div class="palette-selector">
              <div v-for="(colors, name) in palettes" :key="name" class="palette-option" @click="emitUpdate('activePalette', name)">
                <input type="radio" :id="name" :value="name" :checked="settings.activePalette === name">
                <label :for="name">
                  <span class="palette-name">{{ name }}</span>
                  <div class="palette-preview">
                    <span v-for="color in colors" :key="color" :style="{ backgroundColor: color }"></span>
                  </div>
                </label>
              </div>
            </div>
          </div>
          
          <div class="settings-item section-break">
            <button class="action-button secondary" @click="$emit('reset-app')">Reset Application</button>
          </div>
  
          <div class="modal-actions">
            <button class="action-button" @click="$emit('close')">Done</button>
          </div>
        </div>
      </div>
    </Transition>
  </template>
  
  <script setup>
  import { computed } from 'vue';
  
  const props = defineProps({
    show: Boolean,
    settings: Object
  });
  
  const emit = defineEmits(['close', 'reset-app', 'update-setting']);
  
  // Local data for the template
  const palettes = {
      default: ['#40a9ff', '#1890ff', '#096dd9', '#0050b3', '#003a8c', '#13c2c2', '#08979c', '#006d75', '#00474f'],
      sunset: ['#f94144', '#f3722c', '#f8961e', '#f9c74f', '#43aa8b', '#577590', '#277da1'],
      forest: ['#1b4332', '#2d6a4f', '#40916c', '#52b788', '74c69d', '#95d5b2', '#b7e4c7'],
      colorblindFriendly: ['#332288', '#88CCEE', '#44AA99', '#117733', '#999933', '#DDCC77', '#CC6677', '#882255', '#AA4499']
  };
  const numberFormats = {
      default: 'Default (1,234.5)', usd: 'USD ($1,234.50)', eur: 'EUR (€1,234.50)',
      gbp: 'GBP (£1,234.50)', jpy: 'JPY (¥1,234)', percent: 'Percent (12.3%)'
  };
  
  // Computed property for v-model on the dark mode toggle
  const isDarkTheme = computed({
    get: () => props.settings.theme === 'dark',
    set: (isDark) => {
      emitUpdate('theme', isDark ? 'dark' : 'light');
    }
  });
  
  // Generic function to emit setting updates to the parent
  const emitUpdate = (key, value) => {
    emit('update-setting', { key, value });
  };
  </script>
  
  <style scoped>
  /* Scoped styles for the Settings Modal */
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
  .modal-content h2 { margin-top: 0; margin-bottom: 2rem; }
  .modal-actions { display: flex; justify-content: flex-end; margin-top: 2rem; }
  
  .settings-item {
    display: flex; justify-content: space-between; align-items: center;
    width: 100%; margin-top: 1.5rem;
  }
  .settings-item.sub-item { margin-top: 1rem; gap: 1rem; }
  .settings-item.section-break { 
    margin-top: 2rem; padding-top: 1.5rem; 
    border-top: 1px solid var(--border-color);
  }
  .theme-switch { position: relative; display: inline-block; width: 50px; height: 26px; }
  .theme-switch input { opacity: 0; width: 0; height: 0; }
  .switch-slider {
    position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
    background-color: #ccc; transition: .4s; border-radius: 26px;
  }
  .switch-slider:before {
    position: absolute; content: ""; height: 20px; width: 20px; left: 3px; bottom: 3px;
    background-color: white; transition: .4s; border-radius: 50%;
  }
  input:checked + .switch-slider { background-color: var(--primary-color); }
  input:checked + .switch-slider:before { transform: translateX(24px); }
  
  .settings-dropdown {
    padding: 0.5rem; border-radius: 6px; border: 1px solid var(--border-color);
    background-color: var(--bg-main); color: var(--text-color);
    font-family: inherit; font-size: 0.9rem;
  }
  .topn-input {
    width: 100%; padding: 0.5rem; border-radius: 6px; border: 1px solid var(--border-color);
    background-color: var(--bg-main); color: var(--text-color); font-family: inherit;
  }
  
  .palette-setting { flex-direction: column; align-items: flex-start; gap: 0.75rem; }
  .palette-selector { width: 100%; display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
  .palette-option label {
    display: block; padding: 0.75rem; border: 2px solid var(--border-color);
    border-radius: 8px; cursor: pointer; transition: border-color 0.2s;
  }
  .palette-option input[type="radio"] { display: none; }
  .palette-option input[type="radio"]:checked + label { border-color: var(--primary-color); }
  .palette-name { text-transform: capitalize; font-weight: 500; }
  .palette-preview { display: flex; height: 12px; border-radius: 6px; overflow: hidden; margin-top: 0.5rem; }
  .palette-preview span { flex: 1; }
  
  .fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
  .fade-enter-from, .fade-leave-to { opacity: 0; }
  </style>