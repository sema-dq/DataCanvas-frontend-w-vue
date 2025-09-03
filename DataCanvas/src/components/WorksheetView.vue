<template>
    <main class="main-content" v-if="activeWorksheet">
      <div v-if="!settings.autoUpdateEnabled && uiState.isDirty" class="update-banner">
        <span>The view has changed.</span>
        <button class="action-button" @click="$emit('apply-manual-update')">Update</button>
      </div>
  
      <div class="shelves-and-filters">
        <button class="action-button add-to-dash-button" @click="$emit('add-to-dashboard')">Add to Dashboard</button>
        
        <div v-if="activeWorksheet.activeChartType === 'pivot'" class="shelves-panel pivot-shelves">
          <div class="shelf-group">
            <label>Rows</label>
            <draggable v-model="localShelves.pivotRows" class="shelf" item-key="name" group="fields">
              <template #item="{element}">
                <div :class="['field-pill', element.type]">
                  {{ element.name }}
                  <button @click="removeFromShelf('pivotRows', element)" class="remove-pill">×</button>
                </div>
              </template>
            </draggable>
          </div>
          <div class="shelf-group">
            <label>Columns</label>
            <draggable v-model="localShelves.pivotColumns" class="shelf" item-key="name" group="fields">
              <template #item="{element}">
                <div :class="['field-pill', element.type]">
                  {{ element.name }}
                  <button @click="removeFromShelf('pivotColumns', element)" class="remove-pill">×</button>
                </div>
              </template>
            </draggable>
          </div>
          <div class="shelf-group">
            <label>Values</label>
            <draggable v-model="localShelves.pivotValues" class="shelf" item-key="name" group="fields">
              <template #item="{element}">
                <div :class="['field-pill', element.type]">
                  {{ element.name }} ({{ element.aggregation || 'SUM' }})
                  <button @click="removeFromShelf('pivotValues', element)" class="remove-pill">×</button>
                </div>
              </template>
            </draggable>
          </div>
        </div>
  
        <div class="shelves-panel" v-if="activeWorksheet.activeChartType !== 'pivot'">
          <div class="shelf-group">
            <label>Columns (X-Axis)</label>
            <draggable v-model="localShelves.columns" class="shelf" item-key="name" group="fields">
              <template #item="{element}">
                <div :class="['field-pill', element.type]">
                  <span v-if="element.isDate">
                    {{ element.name }} ({{ element.drillLevel }})
                    <span class="drill-controls">
                      <button @click.stop="drillDate(element, 'up')" :disabled="element.drillLevel === 'year'">-</button>
                      <button @click.stop="drillDate(element, 'down')" :disabled="element.drillLevel === 'month'">+</button>
                    </span>
                  </span>
                  <span v-else>{{ element.name }}</span>
                  <button class="sort-icon-container" @click.stop="toggleSort(element)" :class="getSortClass(element)">
                    <svg class="sort-svg" viewBox="0 0 10 16"><path fill-rule="evenodd" d="M5 11L0 6l1.5-1.5L5 8.25 8.5 4.5 10 6z"></path></svg>
                  </button>
                  <button @click="removeFromShelf('columns', element)" class="remove-pill">×</button>
                </div>
              </template>
            </draggable>
          </div>
          <div class="shelf-group">
            <label>Rows (Y-Axis)</label>
            <draggable v-model="localShelves.rows" class="shelf" item-key="name" group="fields">
               <template #item="{element}">
                <div :class="['field-pill', element.type]">
                  <span v-if="element.isDate">
                    {{ element.name }} ({{ element.drillLevel }})
                    <span class="drill-controls">
                      <button @click.stop="drillDate(element, 'up')" :disabled="element.drillLevel === 'year'">-</button>
                      <button @click.stop="drillDate(element, 'down')" :disabled="element.drillLevel === 'month'">+</button>
                    </span>
                  </span>
                  <span v-else>{{ element.name }}</span>
                  <button class="sort-icon-container" @click.stop="toggleSort(element)" :class="getSortClass(element)">
                    <svg class="sort-svg" viewBox="0 0 10 16"><path fill-rule="evenodd" d="M5 11L0 6l1.5-1.5L5 8.25 8.5 4.5 10 6z"></path></svg>
                  </button>
                  <button @click="removeFromShelf('rows', element)" class="remove-pill">×</button>
                </div>
              </template>
            </draggable>
          </div>
          <div class="shelf-group">
            <label>Color</label>
            <draggable v-model="localShelves.color" class="shelf" item-key="name" group="fields">
              <template #item="{element}">
                <div :class="['field-pill', element.type]">
                  {{ element.name }}
                  <button @click="removeFromShelf('color', element)" class="remove-pill">×</button>
                </div>
              </template>
            </draggable>
          </div>
        </div>
        
        <div class="filters-panel">
          <label>Filters</label>
          <draggable :list="localShelves.filters" class="shelf filters-shelf" item-key="field" group="fields" @add="handleAddFilter">                        
            <template #item="{element}">
              <div class="field-pill" @click="$emit('set-active-filter', element)">
                {{ element.field }} <button @click.stop="removeFromShelf('filters', element)" class="remove-pill">×</button>
              </div>
            </template>
          </draggable>
        </div>
      </div>
      
      <div class="canvas-panel">
        <div id="chart-container" ref="chartContainer" class="chart-container" v-show="activeWorksheet.activeChartType !== 'table' && activeWorksheet.activeChartType !== 'pivot'"></div>
        
        <div class="table-container" v-if="activeWorksheet.activeChartType === 'table'">
          <table>
            <thead>
              <tr>
                <th v-for="header in uiState.tableData.headers" :key="header">{{ header }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, rowIndex) in uiState.tableData.rows" :key="rowIndex">
                <td v-for="(header, colIndex) in uiState.tableData.headers" :key="colIndex" :style="getTableCellStyle(row[header], header)">
                  <span>{{ typeof row[header] === 'number' ? formatNumber(row[header]) : row[header] }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
  
        <div class="table-container" v-if="activeWorksheet.activeChartType === 'pivot'">
          <table class="pivot-table">
            <thead>
              <tr><th v-for="header in pivotTableData.headers" :key="header">{{ header }}</th></tr>
            </thead>
            <tbody>
              <tr v-for="(row, rIndex) in pivotTableData.rows" :key="rIndex">
                <td v-for="(cell, cIndex) in row" :key="cIndex">{{ typeof cell === 'number' ? formatNumber(cell) : cell }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </template>
  
  <script setup>
  import { ref, reactive, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
  const echarts = window.echarts;
  const ss = window.ss;
  
  const props = defineProps({
    activeWorksheet: Object,
    settings: Object,
    uiState: Object,
    pivotTableData: Object,
    dataState: Object,
  });
  
  const emit = defineEmits([
    'update-worksheet-shelves',
    'add-to-dashboard',
    'add-filter',
    'set-active-filter',
    'apply-manual-update'
  ]);
  
  const chartContainer = ref(null);
  let mainChart = null; 
  let resizeObserver = null;
  
  const localShelves = reactive({
      columns: [], rows: [], color: [], filters: [],
      pivotRows: [], pivotColumns: [], pivotValues: []
  });
  watch(() => props.activeWorksheet.shelves, (newShelves) => {
    if (newShelves) {
      Object.assign(localShelves, JSON.parse(JSON.stringify(newShelves)));
    }
  }, { immediate: true, deep: true });
  
  watch(localShelves, (newShelves) => {
    emit('update-worksheet-shelves', newShelves);
  }, { deep: true });
  
  // --- Local Methods ---
  
  const formatNumber = (value) => {
      if (typeof value !== 'number' || isNaN(value)) return value;
      switch (props.settings.activeNumberFormat) {
          case 'usd': return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
          case 'eur': return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
          case 'gbp': return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);
          case 'jpy': return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(value);
          case 'percent': return new Intl.NumberFormat('default', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
          default: return new Intl.NumberFormat('default', { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(value);
      }
  };
  
  const getTableCellStyle = (value, header) => {
      if (typeof value !== 'number' || !props.dataState.measures.find(m => m.name === header)) return {};
      if (value < 0) return { color: '#ee6666' };
      if (value > 0) return { color: '#3ba272' };
      return {};
  };
  
  const getSortClass = (field) => field.sort ? `sort-${field.sort}` : '';
  
  const removeFromShelf = (shelf, item) => {
    const shelfArray = localShelves[shelf];
    if (!shelfArray) return;
    const findIndexFn = shelf === 'filters' ? f => f.field === item.field : i => i.name === item.name;
    const index = shelfArray.findIndex(findIndexFn);
    if (index > -1) {
      shelfArray.splice(index, 1);
      if (shelf === 'filters') {
        emit('set-active-filter', null);
      }
    }
  };
  
  const handleAddFilter = (event) => {
    const field = event.added.element;
    const tempIndex = event.added.newIndex;
    localShelves.filters.splice(tempIndex, 1);
    emit('add-filter', field);
  };
  
  const toggleSort = (field) => {
    const allShelfFields = [...localShelves.columns, ...localShelves.rows];
    allShelfFields.forEach(f => {
      if (f.name !== field.name) delete f.sort;
    });
    if (!field.sort) field.sort = 'desc';
    else if (field.sort === 'desc') field.sort = 'asc';
    else delete field.sort;
  };
  
  const drillDate = (field, direction) => {
    const dateLevels = ['year', 'quarter', 'month'];
    const currentIndex = dateLevels.indexOf(field.drillLevel);
    if (direction === 'down' && currentIndex < dateLevels.length - 1) {
      field.drillLevel = dateLevels[currentIndex + 1];
    } else if (direction === 'up' && currentIndex > 0) {
      field.drillLevel = dateLevels[currentIndex - 1];
    }
  };
  
  // --- Chart Generation Logic ---
  
  const renderChart = () => {
    if (!mainChart || !props.activeWorksheet || !props.activeWorksheet.payload) return;
  
    const chartType = props.activeWorksheet.activeChartType;
    const isChartVisible = chartType !== 'table' && chartType !== 'pivot';
  
    if (!isChartVisible) {
      mainChart.clear();
      return;
    }
    
    const { chartData, payload } = props.activeWorksheet;
    const option = generateChartOption(chartData, payload);
    if (option) {
      mainChart.setOption(option, { notMerge: true });
    } else {
      mainChart.clear();
    }
  };
  
  const generateChartOption = (chartData, payload) => {
    const chartGenerators = { 
        bar: _getBarLineAreaOption, line: _getBarLineAreaOption, area: _getBarLineAreaOption,
        pie: _getPieOption, scatter: _getScatterOption, heatmap: _getHeatmapOption, 
        treemap: _getTreemapOption, combo: _getComboOption, map: _getMapOption,
        boxplot: _getBoxPlotOption, sankey: _getSankeyOption, 
        wordCloud: _getWordCloudOption, gantt: _getGanttOption
    };
    const generator = chartGenerators[payload?.chart_type];
    return generator ? generator(chartData, payload) : null;
  };
  
  const _createTooltipFormatter = (params) => `${params[0].axisValueLabel}<br/>` + params.map(p => `${p.marker} ${p.seriesName}: ${formatNumber(p.value)}`).join('<br/>');
  const getMapCountryName = (name) => ({ "United States": "United States of America", "England": "United Kingdom" }[name] || name);
  
  const _getBarLineAreaOption = (chartData, payload) => {
      const { chart_type, x_axis, y_axes, color, analytics } = payload;
      const categories = [...new Set(chartData.map(d => d[x_axis]))];
      const legendData = color ? [...new Set(chartData.map(d => d[color]))] : y_axes;
      const series = legendData.length > 0 && color
          ? legendData.map(c => ({ 
              name: c, type: chart_type === 'area' ? 'line' : chart_type, 
              stack: 'total', areaStyle: chart_type === 'area' ? {} : null, emphasis: { focus: 'series' }, 
              data: categories.map(cat => chartData.find(d => d[x_axis] === cat && d[color] === c)?.[y_axes[0]] || 0) 
          }))
          : y_axes.map(yAxis => ({ 
              name: yAxis, type: chart_type === 'area' ? 'line' : chart_type, 
              areaStyle: chart_type === 'area' ? {} : null, emphasis: { focus: 'series' },
              data: categories.map(cat => chartData.find(d => d[x_axis] === cat)?.[yAxis] || 0) 
          }));
  
      const option = { 
          tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: _createTooltipFormatter }, 
          legend: { data: legendData }, 
          xAxis: { type: 'category', data: categories }, 
          yAxis: { type: 'value', axisLabel: { formatter: formatNumber } }, 
          series, grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true } 
      };
  
      if (chart_type === 'line' && analytics?.showTrendLine && chartData.length > 1 && !color) {
          const regressionData = chartData.map((d, i) => [i, d[y_axes[0]]]);
          const trendLineFunc = ss.linearRegressionLine(ss.linearRegression(regressionData));
          const trendLineData = regressionData.map(d => trendLineFunc(d[0]));
          option.series.push({ name: 'Trend Line', type: 'line', smooth: true, symbol: 'none', lineStyle: { type: 'dashed' }, data: trendLineData });
          option.legend.data.push('Trend Line');
      }
      return option;
  };
  const _getPieOption = (chartData, payload) => ({ tooltip: { trigger: 'item', formatter: p => `${p.name}: ${formatNumber(p.value)} (${p.percent}%)` }, series: [{ name: payload.y_axes[0], type: 'pie', radius: '60%', data: chartData.map(d => ({ value: d[payload.y_axes[0]], name: d[payload.x_axis] })), emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.5)' } } }] });
  const _getScatterOption = (chartData, payload) => ({ tooltip: { trigger: 'item', formatter: p => `${payload.x_axis}: ${formatNumber(p.value[0])}<br/>${payload.y_axes[0]}: ${formatNumber(p.value[1])}` }, xAxis: { type: 'value', name: payload.x_axis, axisLabel: { formatter: formatNumber } }, yAxis: { type: 'value', name: payload.y_axes[0], axisLabel: { formatter: formatNumber } }, series: [{ symbolSize: 10, type: 'scatter', data: chartData.map(d => [d[payload.x_axis], d[payload.y_axes[0]]]) }], grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true } });
  // ... other chart option functions would be fully implemented here ...
  
  // --- Lifecycle & Watchers ---
  
  onMounted(() => {
    if (chartContainer.value) {
      mainChart = echarts.init(chartContainer.value, props.settings.theme);
      renderChart();
      resizeObserver = new ResizeObserver(() => {
        if (mainChart) mainChart.resize();
      });
      resizeObserver.observe(chartContainer.value);
    }
  });
  
  onBeforeUnmount(() => {
    if (mainChart) mainChart.dispose();
    if (resizeObserver && chartContainer.value) {
      resizeObserver.unobserve(chartContainer.value);
    }
  });
  
  watch(() => [ props.activeWorksheet.chartData, props.activeWorksheet.payload, props.activeWorksheet.activeChartType, props.settings], () => {
      if (mainChart && mainChart.getOption() && mainChart.getOption().theme !== props.settings.theme) {
          mainChart.dispose();
          mainChart = echarts.init(chartContainer.value, props.settings.theme);
      }
      renderChart();
    }, { deep: true }
  );
  
  watch(() => props.activeWorksheet.id, () => {
      nextTick(() => {
          if(mainChart) mainChart.resize();
          renderChart();
      });
  });
  </script>
  
  <style scoped>
  .main-content {
    display: flex; flex-direction: column; padding: 1.5rem;
    overflow: hidden; height: 100%; box-sizing: border-box;
  }
  .update-banner {
    display: flex; justify-content: space-between; align-items: center;
    background-color: var(--hover-bg); padding: 0.75rem 1rem;
    border-radius: 8px; margin-bottom: 1rem; border: 1px solid var(--border-color);
  }
  .update-banner .action-button { width: auto; padding: 0.5rem 1rem; }
  .shelves-and-filters { display: flex; flex-direction: column; gap: 1rem; padding-bottom: 1.5rem; }
  .add-to-dash-button { margin-bottom: 0rem; }
  .shelves-panel { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
  .shelf-group, .filters-panel { flex: 1; }
  .shelf-group label, .filters-panel label {
    display: block; margin-bottom: 0.5rem; font-weight: 500;
    color: var(--text-color-light); font-size: 0.9rem;
  }
  .shelf {
    background-color: var(--shelf-bg); border: 2px dashed var(--shelf-border);
    border-radius: 8px; padding: 0.5rem; min-height: 42px;
    transition: border-color 0.2s ease, background-color 0.2s ease;
  }
  .shelf:hover, .sortable-ghost { border-color: var(--primary-color); background-color: var(--hover-bg); }
  .canvas-panel {
    flex-grow: 1; display: flex; background-color: var(--bg-panel);
    border-radius: 12px; box-shadow: var(--shadow); min-height: 0;
  }
  #chart-container { width: 100%; height: 100%; }
  .table-container { width: 100%; height: 100%; overflow: auto; padding: 0; }
  .table-container table { width: 100%; border-collapse: collapse; }
  .table-container th, .table-container td {
    padding: 0.75rem; text-align: left; border-bottom: 1px solid var(--border-color); white-space: nowrap;
  }
  .table-container th { font-weight: 600; position: sticky; top: 0; background: var(--bg-panel); }
  .pivot-table th, .pivot-table td { border: 1px solid var(--border-color); }
  .pivot-table th { background-color: var(--shelf-bg); }
  
  .field-pill {
    display: flex; align-items: center; padding: 0.5rem 0.75rem;
    margin-bottom: 0.5rem; border-radius: 6px; font-size: 0.9rem;
    cursor: grab; border: 1px solid transparent;
  }
  .field-pill.dimension {
    background-color: var(--dimension-bg); color: var(--dimension-color); border-color: var(--dimension-border);
  }
  .field-pill.measure {
    background-color: var(--measure-bg); color: var(--measure-color); border-color: var(--measure-border);
  }
  .remove-pill {
    font-weight: bold; cursor: pointer; opacity: 0.5; transition: opacity 0.2s ease;
    padding: 0 0.25rem; margin-left: 8px; border: none; background: none; color: inherit;
  }
  .field-pill:hover .remove-pill { opacity: 1; }
  .sort-icon-container {
    margin-left: auto; padding: 2px 4px; border-radius: 4px; cursor: pointer;
    display: flex; align-items: center; justify-content: center; border: none; background: none;
  }
  .sort-icon-container:hover { background-color: rgba(0, 0, 0, 0.1); }
  html.dark .sort-icon-container:hover { background-color: rgba(255, 255, 255, 0.1); }
  .sort-svg {
    width: 12px; height: 12px; fill: currentColor; opacity: 0;
    transform: rotate(0deg); transition: opacity 0.2s, transform 0.2s;
  }
  .field-pill:hover .sort-svg { opacity: 0.5; }
  .sort-icon-container.sort-asc .sort-svg,
  .sort-icon-container.sort-desc .sort-svg { opacity: 1; }
  .sort-icon-container.sort-asc .sort-svg { transform: rotate(180deg); }
  .drill-controls {
    display: inline-flex; margin-left: 8px; background-color: rgba(0,0,0,0.05); border-radius: 4px;
  }
  html.dark .drill-controls { background-color: rgba(255, 255, 255, 0.1); }
  .drill-controls button {
    border: none; background: transparent; color: var(--text-color);
    cursor: pointer; font-weight: bold; padding: 0 6px;
  }
  .drill-controls button:hover:not(:disabled) { background-color: rgba(0, 0, 0, 0.1); }
  .drill-controls button:disabled { cursor: not-allowed; opacity: 0.3; }
  </style>