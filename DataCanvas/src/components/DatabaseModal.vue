<template>
  <Transition name="fade">
    <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-content">
        <h2>Connect to Database</h2>
        <div class="db-connection-form">
          <div class="full-width">
            <label for="db-type">Database Type</label>
            <select id="db-type" v-model="dbState.db_type" class="settings-dropdown">
              <option value="postgresql">PostgreSQL</option>
              <option value="mysql">MySQL</option>
              <option value="sqlserver">SQL Server</option>
            </select>
          </div>
          <div>
            <label for="db-host">Host</label>
            <input type="text" id="db-host" v-model.trim="dbState.host">
          </div>
          <div>
            <label for="db-port">Port</label>
            <input type="number" id="db-port" v-model.number="dbState.port">
          </div>
          <div>
            <label for="db-user">User</label>
            <input type="text" id="db-user" v-model.trim="dbState.user">
          </div>
          <div>
            <label for="db-password">Password</label>
            <input type="password" id="db-password" v-model="dbState.password">
          </div>
          <div class="full-width">
            <label for="db-name">Database Name</label>
            <input type="text" id="db-name" v-model.trim="dbState.dbname">
          </div>
        </div>
        
        <div class="modal-actions">
          <button class="action-button secondary" @click="$emit('close')">Cancel</button>
          <button class="action-button" @click="testConnection" :disabled="dbState.isLoading">
            {{ dbState.isLoading ? 'Connecting...' : 'Connect' }}
          </button>
        </div>

        <div v-if="dbState.connectionMessage" :class="['connection-status', dbState.connectionStatus]">
          {{ dbState.connectionMessage }}
        </div>

        <div v-if="dbState.tables.length > 0" class="table-selector">
          <h3 style="margin-top: 2rem;">Select a Table to Load</h3>
          <div class="values-list" style="max-height: 150px;">
            <div v-for="table in dbState.tables" :key="table" class="radio-option">
              <input type="radio" :id="`table-${table}`" :value="table" v-model="dbState.selectedTable">
              <label :for="`table-${table}`">{{ table }}</label>
            </div>
          </div>
          <div class="modal-actions">
            <button class="action-button" @click="loadTable" :disabled="!dbState.selectedTable || dbState.isLoading">
              {{ dbState.isLoading ? 'Loading...' : 'Load Table' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { reactive, watch } from 'vue';

const props = defineProps({
  show: Boolean,
});

const emit = defineEmits(['close', 'load']);

const apiUrl = 'https://datacanvas-api.onrender.com';

const dbState = reactive({
  db_type: 'postgresql',
  host: 'localhost',
  port: 5432,
  user: '',
  password: '',
  dbname: '',
  isLoading: false,
  connectionStatus: '', // 'success' or 'error'
  connectionMessage: '',
  tables: [],
  selectedTable: null,
});

// Reset the form state every time the modal is opened
watch(() => props.show, (isVisible) => {
  if (isVisible) {
    dbState.isLoading = false;
    dbState.connectionStatus = '';
    dbState.connectionMessage = '';
    dbState.tables = [];
    dbState.selectedTable = null;
  }
});

const testConnection = async () => {
  dbState.isLoading = true;
  dbState.connectionMessage = '';
  dbState.tables = [];
  dbState.selectedTable = null;

  try {
    const response = await fetch(`${apiUrl}/data/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        db_type: dbState.db_type,
        host: dbState.host,
        port: dbState.port,
        user: dbState.user,
        password: dbState.password,
        dbname: dbState.dbname,
      })
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.detail || 'Failed to connect to the database.');
    }

    dbState.connectionStatus = 'success';
    dbState.connectionMessage = 'Connection successful! Tables loaded.';
    dbState.tables = result.tables;

  } catch (e) {
    dbState.connectionStatus = 'error';
    dbState.connectionMessage = `Error: ${e.message}`;
  } finally {
    dbState.isLoading = false;
  }
};

const loadTable = async () => {
  if (!dbState.selectedTable) return;
  dbState.isLoading = true;
  dbState.connectionMessage = ''; // Clear previous messages

  try {
    const payload = { ...dbState, table_name: dbState.selectedTable };
    const response = await fetch(`${apiUrl}/data/load-table`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.detail || 'Failed to load table data.');
    }
    
    // Emit the loaded data to the parent App.vue component
    emit('load', { 
        data: result.records, 
        fileName: dbState.selectedTable 
    });
    
    emit('close');

  } catch (e) {
    dbState.connectionStatus = 'error';
    dbState.connectionMessage = `Error loading table: ${e.message}`;
  } finally {
    dbState.isLoading = false;
  }
};
</script>

<style scoped>
/* Scoped styles for the Database Modal */
.modal-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background-color: rgba(0, 0, 0, 0.5); display: flex;
  justify-content: center; align-items: flex-start;
  overflow-y: auto; padding: 3rem 1rem; z-index: 1000;
}
.modal-content {
  background: var(--bg-panel); padding: 2rem; border-radius: 12px;
  max-width: 500px; width: 100%; box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}
.modal-content h2 { margin-top: 0; margin-bottom: 1.5rem; }
.modal-actions { display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem; }

.db-connection-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
.db-connection-form .full-width { grid-column: 1 / 3; }
.db-connection-form label {
  font-size: 0.9rem; color: var(--text-color-light);
  margin-bottom: 0.25rem; display: block;
}
.db-connection-form input, .db-connection-form select {
  width: 100%; padding: 0.75rem; border-radius: 8px;
  border: 1px solid var(--border-color); box-sizing: border-box;
  background-color: var(--bg-main); color: var(--text-color);
  font-family: inherit;
}

.connection-status { margin-top: 1rem; padding: 0.75rem; border-radius: 8px; font-weight: 500; }
.connection-status.success { color: var(--dimension-color); background-color: var(--dimension-bg); }
.connection-status.error { color: #ee6666; background-color: rgba(238, 102, 102, 0.1); }

.table-selector { border-top: 1px solid var(--border-color); margin-top: 2rem; padding-top: 1rem; }
.values-list { max-height: 200px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 8px; padding: 0.75rem; }
.radio-option { display: flex; align-items: center; gap: 0.75rem; cursor: pointer; padding: 0.5rem; }
.radio-option:not(:last-child) { margin-bottom: 0.25rem; }
.radio-option:hover { background-color: var(--hover-bg); }
.radio-option input[type="radio"] { accent-color: var(--primary-color); width: 18px; height: 18px; }

/* Fade Transition */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>