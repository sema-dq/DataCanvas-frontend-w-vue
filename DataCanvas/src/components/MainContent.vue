<template>
  <div class="main-container">
    <WorksheetView 
      v-if="uiState.viewMode === 'worksheet'"
      :active-worksheet="activeWorksheet"
      :settings="settings"
      :ui-state="uiState"
      :pivot-table-data="pivotTableData"
      :data-state="dataState"
      @update-worksheet-shelves="shelves => $emit('update-worksheet-shelves', shelves)"
      @add-to-dashboard="$emit('add-to-dashboard')"
      @add-filter="filter => $emit('add-filter', filter)"
      @set-active-filter="filter => $emit('set-active-filter', filter)"
    />
    <DashboardView
      v-else-if="uiState.viewMode === 'dashboard'"
      :dashboard-layout="dashboardLayout"
      :worksheets="worksheets"
      @remove-from-dashboard="id => $emit('remove-from-dashboard', id)"
      @update-layout="newLayout => $emit('update-layout', newLayout)"
      @start-edit="sheet => $emit('start-edit', sheet)"
    />
  </div>
</template>

<script setup>
import WorksheetView from './WorksheetView.vue';
import DashboardView from './DashboardView.vue';

defineProps({
  uiState: Object,
  settings: Object,
  dataState: Object,
  activeWorksheet: Object,
  pivotTableData: Object,
  dashboardLayout: Array,
  worksheets: Array
});

defineEmits([
  'update-worksheet-shelves',
  'add-to-dashboard',
  'add-filter',
  'set-active-filter',
  'remove-from-dashboard',
  'update-layout',
  'start-edit'
]);
</script>

<style scoped>
.main-container {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  grid-row: 1 / 2;
  grid-column: 2 / 3;
}
</style>