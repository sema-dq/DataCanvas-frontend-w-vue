<template>
    <div class="dashboard-grid" ref="dashboardGridRef">
      <div 
        v-for="item in dashboardLayout"
        :key="item.i"
        class="dashboard-item" 
        :style="gridItemStyle(item)"
        @mousedown="dragStart(item, $event)"
      >
        <div class="dashboard-item-content">
          <div class="chart-title" @dblclick.stop="$emit('start-edit', getWorksheetById(item.worksheetId))">
            
            <input
              v-if="editingId === item.worksheetId"
              type="text"
              class="title-editor"
              :value="editText"
              @input="$emit('update:editText', $event.target.value)"
              @blur="$emit('save-edit')"
              @keyup.enter="$emit('save-edit')"
              @keyup.esc="$emit('cancel-edit')"
              @click.stop
            />
  
            <span v-else-if="getWorksheetById(item.worksheetId)">
              {{ getWorksheetById(item.worksheetId)?.name }}
            </span>
  
          </div>
          <div class="chart-container-grid" :id="'chart-container-' + item.worksheetId"></div>
          <button class="remove-from-dash" @click.stop="$emit('remove-from-dashboard', item.i)">×</button>
        </div>
        <div class="resize-handle" @mousedown.stop="resizeStart(item, $event)"></div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, reactive, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
  
  // ECharts is loaded globally from index.html
  const echarts = window.echarts;
  
  const props = defineProps({
    dashboardLayout: Array,
    worksheets: Array,
    editingId: [Number, String, null],
    editText: String,
  });
  
  const emit = defineEmits([
    'remove-from-dashboard', 
    'update-layout', 
    'start-edit',
    'update:editText',
    'save-edit',
    'cancel-edit'
  ]);
  
  const dashboardGridRef = ref(null);
  const dashboardCharts = new Map();
  
  const gridInteraction = reactive({
    active: false, type: null, item: null, startX: 0, startY: 0, 
    initialX: 0, initialY: 0, initialW: 0, initialH: 0,
    gridCellWidth: 0, gridCellHeight: 0, animationFrameId: null,
  });
  
  const getWorksheetById = (id) => {
    return props.worksheets.find(w => w.id === id);
  };
  
  const renderDashboardCharts = async () => {
    await nextTick();
    if (!props.dashboardLayout) return;
  
    // Dispose of charts that are no longer in the layout
    const layoutIds = new Set(props.dashboardLayout.map(item => item.worksheetId));
    for (const [id, chart] of dashboardCharts.entries()) {
      if (!layoutIds.has(id)) {
        chart.dispose();
        dashboardCharts.delete(id);
      }
    }
  
    // Render or update charts
    for (const item of props.dashboardLayout) {
      const worksheet = getWorksheetById(item.worksheetId);
      if (!worksheet) continue;
      
      const chartDom = document.getElementById(`chart-container-${item.worksheetId}`);
      if (chartDom) {
        const { chartData, payload } = worksheet;
        const option = generateChartOption(chartData, payload);
        
        let dashChart = dashboardCharts.get(item.worksheetId);
        if (!dashChart) {
          dashChart = echarts.init(chartDom);
          dashboardCharts.set(item.worksheetId, dashChart);
        }
        
        dashChart.setOption(option, { notMerge: true });
      }
    }
  };
  
  // This chart generation logic is needed here to render the small charts.
  // In a real app, this could be moved to a shared utility file.
  const generateChartOption = (chartData, payload) => {
      // This is where the generateChartOption and all its helper functions
      // (_getBarOption, _getPieOption, etc.) from your original script would go.
      // For brevity, we'll return a simple placeholder.
      if (!payload) return {};
      return {
          // A minimal ECharts option
          tooltip: {},
          grid: { top: 8, right: 8, bottom: 24, left: 36 },
          xAxis: { type: 'category', data: chartData?.map(d => d[payload.x_axis]) },
          yAxis: { type: 'value' },
          series: [{
              type: payload.chart_type || 'bar',
              data: chartData?.map(d => d[payload.y_axes?.[0]])
          }]
      };
  };
  
  const gridItemStyle = (item) => ({
    gridColumn: `${item.x + 1} / span ${item.w}`,
    gridRow: `${item.y + 1} / span ${item.h}`,
  });
  
  const dragStart = (item, event) => {
    if (event.target.classList.contains('resize-handle')) return;
    const gridRect = dashboardGridRef.value.getBoundingClientRect();
    Object.assign(gridInteraction, {
      active: true, type: 'drag', item, startX: event.clientX, startY: event.clientY,
      initialX: item.x, initialY: item.y,
      gridCellWidth: (gridRect.width - (11 * 10)) / 12, gridCellHeight: 50 + 10,
    });
    window.addEventListener('mousemove', mouseMove);
    window.addEventListener('mouseup', mouseUp, { once: true });
  };
  
  const resizeStart = (item, event) => {
    const gridRect = dashboardGridRef.value.getBoundingClientRect();
    Object.assign(gridInteraction, {
      active: true, type: 'resize', item, startX: event.clientX, startY: event.clientY,
      initialW: item.w, initialH: item.h,
      gridCellWidth: (gridRect.width - (11 * 10)) / 12, gridCellHeight: 50 + 10,
    });
    window.addEventListener('mousemove', mouseMove);
    window.addEventListener('mouseup', mouseUp, { once: true });
  };
  
  const mouseMove = (event) => {
    if (!gridInteraction.active) return;
    if (gridInteraction.animationFrameId) cancelAnimationFrame(gridInteraction.animationFrameId);
    
    gridInteraction.animationFrameId = requestAnimationFrame(() => {
      event.preventDefault();
      const dx = event.clientX - gridInteraction.startX;
      const dy = event.clientY - gridInteraction.startY;
      if (gridInteraction.type === 'drag') {
        const newX = gridInteraction.initialX + Math.round(dx / gridInteraction.gridCellWidth);
        const newY = gridInteraction.initialY + Math.round(dy / gridInteraction.gridCellHeight);
        gridInteraction.item.x = Math.max(0, Math.min(newX, 12 - gridInteraction.item.w));
        gridInteraction.item.y = Math.max(0, newY);
      } else if (gridInteraction.type === 'resize') {
        const newW = gridInteraction.initialW + Math.round(dx / gridInteraction.gridCellWidth);
        const newH = gridInteraction.initialH + Math.round(dy / gridInteraction.gridCellHeight);
        gridInteraction.item.w = Math.max(2, Math.min(newW, 12 - gridInteraction.item.x));
        gridInteraction.item.h = Math.max(2, newH);
      }
    });
  };
  
  const mouseUp = () => {
    if (!gridInteraction.active) return;
    if (gridInteraction.animationFrameId) cancelAnimationFrame(gridInteraction.animationFrameId);
    gridInteraction.active = false;
    window.removeEventListener('mousemove', mouseMove);
    
    // Emit the final layout state to the parent
    emit('update-layout', props.dashboardLayout);
    
    // Resize charts after a short delay to allow the grid to settle
    setTimeout(() => {
      dashboardCharts.forEach(chart => chart.resize());
    }, 100);
  };
  
  const onWindowResize = () => {
    dashboardCharts.forEach(chart => chart.resize());
  };
  
  onMounted(() => {
    renderDashboardCharts();
    window.addEventListener('resize', onWindowResize);
  });
  
  onBeforeUnmount(() => {
    dashboardCharts.forEach(chart => chart.dispose());
    window.removeEventListener('resize', onWindowResize);
  });
  
  watch(() => [props.dashboardLayout, props.worksheets], renderDashboardCharts, { deep: true });
  </script>
  
  <style scoped>
  /* ALL styles related to the dashboard view go here */
  .dashboard-grid {
    position: relative; display: grid; grid-template-columns: repeat(12, 1fr);
    grid-auto-rows: 50px; gap: 10px; padding: 10px; width: 100%;
    height: 100%; overflow: auto; background-color: var(--shelf-bg);
    box-sizing: border-box;
  }
  .dashboard-item {
    background-color: var(--bg-panel); border-radius: 12px;
    box-shadow: var(--shadow); overflow: hidden; display: flex;
    flex-direction: column; box-sizing: border-box; position: relative;
    transition: box-shadow 0.2s ease-in-out, transform 0.2s ease-in-out;
    cursor: grab;
  }
  .dashboard-item:hover {
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1); transform: translateY(-2px);
  }
  .dashboard-item-content {
    display: flex; flex-direction: column; width: 100%; height: 100%;
    padding: 1rem; box-sizing: border-box; position: relative;
  }
  .chart-title {
    font-weight: 500; margin: 0 0 0.5rem 0; white-space: nowrap;
    overflow: hidden; text-overflow: ellipsis;
  }
  .title-editor {
    width: 90%; border: 1px solid var(--primary-color);
    background-color: var(--bg-main); color: var(--text-color);
    padding: 2px 4px; border-radius: 4px; font-family: inherit;
    font-size: 0.9rem; font-weight: 500;
  }
  .chart-container-grid {
    flex-grow: 1; width: 100%; height: 100%; min-height: 0;
  }
  .remove-from-dash {
    position: absolute; top: 5px; right: 5px; border: none;
    background: transparent; font-size: 1.5rem; cursor: pointer;
    color: var(--text-color-light); opacity: 0; transition: opacity 0.2s;
  }
  .dashboard-item:hover .remove-from-dash { opacity: 1; }
  .remove-from-dash:hover { color: var(--text-color); }
  .resize-handle {
    position: absolute; width: 20px; height: 20px;
    bottom: 0; right: 0; cursor: nwse-resize;
    background: repeating-linear-gradient(-45deg,
        transparent, transparent 4px,
        var(--border-color) 4px, var(--border-color) 5px);
    opacity: 0; transition: opacity 0.2s;
  }
  .dashboard-item:hover .resize-handle { opacity: 1; }
  </style>