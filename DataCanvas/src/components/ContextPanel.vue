<template>
  <aside class="context-panel">
    <div class="context-panel-header">
      <div class="hamburger-container" ref="dropdownContainer">
        <button class="action-button hamburger-menu" @click="isDropdownVisible = !isDropdownVisible">
          <svg viewBox="0 0 100 100" class="hamburger-svg">
            <path d="M10 20L90 20M10 50L90 50M10 80L90 80" stroke-width="12" stroke-linecap="round"/>
          </svg>
        </button>
        <Transition name="fade">
          <div v-if="isDropdownVisible" class="dropdown-menu">
            <a href="#" class="dropdown-item" @click.prevent="$emit('reset-view')">Reset View</a>
            <a href="#" class="dropdown-item" @click.prevent="$emit('export-png')">Export as PNG</a>
            <a href="#" class="dropdown-item" @click.prevent="$emit('export-csv')">Export Data as CSV</a>
            <a href="#" class="dropdown-item" @click.prevent="$emit('open-modal', 'settings')">Settings</a>
          </div>
        </Transition>
      </div>
    </div>
    
    <div v-if="activeWorksheet?.chartConfigured" class="show-me-panel card">
      <h3>Chart Types</h3>
      <div class="suggestions-list">
        <div 
          v-for="suggestion in chartSuggestions" 
          :key="suggestion.type" 
          class="suggestion-button" 
          @click="$emit('set-chart-type', suggestion.type)" 
          :class="{ 'active-suggestion': suggestion.type === activeWorksheet.activeChartType }">
          <span class="suggestion-icon">{{ suggestion.icon }}</span>
          <span>{{ suggestion.name }}</span>
        </div>
      </div>
    </div>

    <div v-if="isAnalyticsPanelVisible" class="analytics-panel card">
      <h3>Analytics</h3>
      <div class="settings-item">
        <span>Show Trend Line / Forecast</span>
        <label class="theme-switch">
          <input 
            type="checkbox" 
            :checked="activeWorksheet.analytics.showTrendLine"
            @change="updateAnalytics('showTrendLine', $event.target.checked)"
          >
          <span class="switch-slider"></span>
        </label>
      </div>
      <template v-if="activeWorksheet.analytics.showTrendLine">
        <div class="settings-item">
          <span>Forecast Model</span>
          <select 
            class="settings-dropdown" 
            :value="activeWorksheet.analytics.model"
            @change="updateAnalytics('model', $event.target.value)"
          >
            <option value="linear">Linear Regression</option>
            <option value="smoothing">Exponential Smoothing</option>
          </select>
        </div>
        <div class="settings-item">
          <span>Forecast Periods</span>
          <input 
            type="number" 
            class="topn-input" 
            min="0"
            :value="activeWorksheet.analytics.forecastPeriods"
            @input="updateAnalytics('forecastPeriods', parseInt($event.target.value) || 0)"
          >
        </div>
      </template>
    </div>

    <div v-if="activeFilter" class="filter-editor card">
      <h3>Filter: {{ activeFilter.field }}</h3>
      <div v-if="activeFilter.filter_type === 'dimension'">
        <div class="filter-mode-switcher">
          <button :class="{ active: activeFilter.mode === 'list' }" @click="updateFilter('mode', 'list')">List</button>
          <button :class="{ active: activeFilter.mode === 'topN' }" @click="updateFilter('mode', 'topN')">Top N</button>
        </div>

        <div v-if="activeFilter.mode === 'list'" class="values-list">
          <div v-for="value in activeFilter.uniqueValues" :key="value" class="checkbox-item">
            <input 
              type="checkbox" 
              :id="value" 
              :value="value" 
              :checked="activeFilter.values.includes(value)"
              @change="updateFilterValues(value, $event.target.checked)"
            >
            <label :for="value">{{ value }}</label>
          </div>
        </div>

        <div v-if="activeFilter.mode === 'topN'" class="topn-controls">
          <span>Show Top</span>
          <input type="number" :value="activeFilter.n" @input="updateFilter('n', parseInt($event.target.value) || 1)" min="1" class="topn-input">
          <span>items by</span>
          <select :value="activeFilter.by" @change="updateFilter('by', $event.target.value)" class="settings-dropdown">
            <option v-for="measure in dataState.measures" :key="measure.name" :value="measure.name">
              {{ measure.name }}
            </option>
          </select>
        </div>
      </div>

      <div v-else-if="activeFilter.filter_type === 'range'">
        <div class="range-inputs">
          <label>Min: <input type="number" :value="activeFilter.values.min" @input="updateRangeFilter('min', $event.target.value)"></label>
          <label>Max: <input type="number" :value="activeFilter.values.max" @input="updateRangeFilter('max', $event.target.value)"></label>
        </div>
      </div>
    </div>
    
    <button class="action-button secondary analysis-button" @click="$emit('open-modal', 'statisticalAnalysis')">
      Run Statistical Analysis
    </button>
  </aside>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
  activeWorksheet: Object,
  dataState: Object,
  activeFilter: Object,
  chartSuggestions: Array,
  isAnalyticsPanelVisible: Boolean,
});

const emit = defineEmits([
  'set-chart-type', 'update-analytics', 'update-filter',
  'reset-view', 'export-png', 'export-csv', 'open-modal'
]);

const isDropdownVisible = ref(false);
const dropdownContainer = ref(null);

const handleClickOutside = (event) => {
  if (dropdownContainer.value && !dropdownContainer.value.contains(event.target)) {
    isDropdownVisible.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside);
});

// --- Methods for emitting updates ---

const updateAnalytics = (key, value) => {
  const newAnalytics = { ...props.activeWorksheet.analytics, [key]: value };
  emit('update-analytics', newAnalytics);
};

const updateFilter = (key, value) => {
  const newFilter = { ...props.activeFilter, [key]: value };
  emit('update-filter', newFilter);
};

const updateFilterValues = (value, isChecked) => {
  const currentValues = new Set(props.activeFilter.values);
  if (isChecked) {
    currentValues.add(value);
  } else {
    currentValues.delete(value);
  }
  updateFilter('values', Array.from(currentValues));
};

const updateRangeFilter = (key, value) => {
    const newValues = { ...props.activeFilter.values, [key]: parseFloat(value) || 0 };
    updateFilter('values', newValues);
};
</script>

<style scoped>
/* Scoped styles for the Context Panel */
.context-panel {
  background-color: var(--bg-panel);
  border-left: 1px solid var(--border-color);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.context-panel-header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  height: 48px;
  margin-bottom: -1rem; /* Overlap space slightly */
}

.hamburger-container {
  position: relative;
}

.hamburger-menu {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  padding: 0;
  background-color: transparent;
  border: none;
}

.hamburger-svg {
  width: 22px;
  height: 22px;
}
.hamburger-svg path {
    stroke: var(--text-color-light);
    transition: stroke 0.2s;
}
.hamburger-menu:hover .hamburger-svg path {
    stroke: var(--text-color);
}

.dropdown-menu {
  position: absolute;
  top: 50px;
  right: 0;
  width: 220px;
  background-color: var(--bg-panel);
  border-radius: 8px;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow);
  z-index: 1100;
  padding: 0.5rem 0;
  overflow: hidden;
  transform-origin: top right;
}

.dropdown-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.75rem 1.25rem;
  cursor: pointer;
  background: none;
  border: none;
  color: var(--text-color);
  text-decoration: none;
  white-space: nowrap;
}
.dropdown-item:hover {
  background-color: var(--hover-bg);
  color: var(--primary-color);
}

.card {
  background-color: var(--bg-panel);
  border-radius: 12px;
  box-shadow: var(--shadow);
  border: 1px solid var(--border-color);
  padding: 1.25rem;
}

.card h3 {
  margin-top: 0;
  font-size: 1rem;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.75rem;
  margin-bottom: 1rem;
}

.suggestions-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.suggestion-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
  font-size: 0.85rem;
}
.suggestion-button:hover, .suggestion-button.active-suggestion {
  border-color: var(--primary-color);
  background-color: var(--hover-bg);
  color: var(--primary-color);
  transform: translateY(-2px);
}
.suggestion-icon {
  font-size: 1.75rem;
  margin-bottom: 0.25rem;
}

.analytics-panel .settings-item, .filter-editor .settings-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  gap: 1rem;
}
.analytics-panel .settings-item:first-child {
  margin-top: 0;
}

.filter-mode-switcher {
  display: flex;
  background-color: var(--shelf-bg);
  border-radius: 6px;
  padding: 4px;
  margin-bottom: 1rem;
}
.filter-mode-switcher button {
  flex: 1; padding: 0.25rem; border: none; background-color: transparent;
  color: var(--text-color-light); font-weight: 500; border-radius: 4px; cursor: pointer;
}
.filter-mode-switcher button.active {
  background-color: var(--bg-panel); color: var(--primary-color); box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.values-list {
  max-height: 200px; overflow-y: auto; border: 1px solid var(--border-color);
  border-radius: 8px; padding: 0.75rem;
}
.checkbox-item { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }

.topn-controls, .range-inputs {
  display: flex; flex-direction: column; gap: 0.75rem;
}
.topn-controls { align-items: flex-start; }
.range-inputs label { display: flex; justify-content: space-between; align-items: center; width: 100%; }

.analysis-button {
  margin-top: auto; /* Pushes button to the bottom */
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>