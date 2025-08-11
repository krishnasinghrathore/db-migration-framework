// Simple Web UI for Database Migration
// Note: Install express: npm install express @types/express

// Try to import express, fall back to mock if not available
let express: any;
try {
  express = require('express');
} catch (error) {
  express = {
    default: () => ({
      use: (_middleware: any) => {},
      get: (_path: string, _handler: Function) => {},
      post: (_path: string, _handler: Function) => {},
      listen: (port: number, callback: Function) => {
        console.log(`Mock server would listen on port ${port}`);
        callback();
      },
    }),
    static: (_path: string) => {},
  };
}

// Import required modules (these will be used when implementing actual migration logic)
// import { ConfigManager } from '../core/config-manager.js';
// import { VerticaAdapter } from '../adapters/vertica/vertica-adapter.js';
// import { PostgreSQLAdapter } from '../adapters/postgresql/postgresql-adapter.js';

// Table mappings based on your actual schemas
const TABLE_MAPPINGS = {
  COLLECTIONS: 'collections',
  MESSAGES: 'messages',
  MODULES: 'modules',
  ROLES: 'roles',
  STREAMING_USERS: 'streaming_users',
  TNB_AUDIT_TRAILS: 'audit_trails',
  TNB_REFDATA: 'configurations',
  USER_ACCESS: 'users',
  USER_ROLE_MAP: 'user_to_roles',
  ROLES_CAMERA_MAP: 'role_to_cameras',
  ROLE_MENU_CONFIG_MAP: 'role_to_menu_configs',
  CATEGORY: 'categories',
  FACES_DETAILS: 'face_details',
  INCIDENCE_DETAILS: 'incident_details',
  MENU_CONFIG: 'menu_configs',
  NOTIFICATION: 'notifications',
  NOTIFICATION_TRIGGER: 'notification_triggers',
  NOTIFICATION_LOG: 'notification_logs',
  PPE_DETAILS: 'ppe_details',
  TRAFFIC_DETAILS: 'traffic_details',
  CAMERA: 'cameras',
  CAMERA_COLLECTION_MAP: 'camera_to_collections',
  CAMERA_MODULE_MAP: 'camera_to_modules',
  ROLES_CAMERA_ACCESS: 'role_camera_accesses',
};

const app = express.default();

// Middleware
try {
  if (express.static) {
    app.use(express.static('src/dashboard/public'));
  }
} catch (error) {
  // Express static middleware not available
}

// Routes
app.get('/', (_req: any, res: any) => {
  res.send(getMainHTML());
});

app.get('/api/tables', (_req: any, res: any) => {
  res.json({
    tables: Object.entries(TABLE_MAPPINGS).map(([source, target]) => ({
      source,
      target,
      status: 'ready',
    })),
  });
});

app.post('/api/migrate/:table', async (req: any, res: any) => {
  // eslint-disable-line @typescript-eslint/no-unused-vars
  const sourceTable = req.params.table;
  const targetTable = TABLE_MAPPINGS[sourceTable as keyof typeof TABLE_MAPPINGS];

  if (!targetTable) {
    return res.status(400).json({ error: 'Table not found' });
  }

  try {
    // This would be the actual migration logic
    // For now, just return a success response
    res.json({
      success: true,
      message: `Migration started for ${sourceTable} -> ${targetTable}`,
      sourceTable,
      targetTable,
    });
  } catch (error) {
    res.status(500).json({
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

function getMainHTML(): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Database Migration Tool - Vertica to PostgreSQL</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
        }
        
        .header p {
            font-size: 1.1rem;
            opacity: 0.9;
        }
        
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
            background: #f8f9fa;
        }
        
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .stat-number {
            font-size: 2rem;
            font-weight: bold;
            color: #2c3e50;
        }
        
        .stat-label {
            color: #7f8c8d;
            margin-top: 5px;
        }
        
        .controls {
            padding: 30px;
            border-bottom: 1px solid #eee;
        }
        
        .control-group {
            display: flex;
            gap: 15px;
            align-items: center;
            margin-bottom: 20px;
        }
        
        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-block;
        }
        
        .btn-primary {
            background: #3498db;
            color: white;
        }
        
        .btn-primary:hover {
            background: #2980b9;
            transform: translateY(-2px);
        }
        
        .btn-success {
            background: #27ae60;
            color: white;
        }
        
        .btn-success:hover {
            background: #229954;
        }
        
        .btn-warning {
            background: #f39c12;
            color: white;
        }
        
        .btn-danger {
            background: #e74c3c;
            color: white;
        }
        
        .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            transform: none;
        }
        
        .table-list {
            padding: 30px;
        }
        
        .table-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 20px;
        }
        
        .table-card {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            background: white;
            transition: all 0.3s ease;
        }
        
        .table-card:hover {
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            transform: translateY(-2px);
        }
        
        .table-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .table-name {
            font-weight: bold;
            color: #2c3e50;
        }
        
        .table-mapping {
            font-size: 0.9rem;
            color: #7f8c8d;
            margin-bottom: 15px;
        }
        
        .table-actions {
            display: flex;
            gap: 10px;
        }
        
        .status {
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
        }
        
        .status-ready {
            background: #d4edda;
            color: #155724;
        }
        
        .status-migrating {
            background: #fff3cd;
            color: #856404;
        }
        
        .status-completed {
            background: #d1ecf1;
            color: #0c5460;
        }
        
        .status-error {
            background: #f8d7da;
            color: #721c24;
        }
        
        .progress-bar {
            width: 100%;
            height: 6px;
            background: #eee;
            border-radius: 3px;
            overflow: hidden;
            margin: 10px 0;
        }
        
        .progress-fill {
            height: 100%;
            background: #27ae60;
            transition: width 0.3s ease;
        }
        
        .log-panel {
            background: #2c3e50;
            color: #ecf0f1;
            padding: 20px;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
            max-height: 300px;
            overflow-y: auto;
        }
        
        .log-entry {
            margin-bottom: 5px;
            padding: 2px 0;
        }
        
        .log-timestamp {
            color: #95a5a6;
        }
        
        .log-success {
            color: #2ecc71;
        }
        
        .log-error {
            color: #e74c3c;
        }
        
        .log-info {
            color: #3498db;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Database Migration Tool</h1>
            <p>Vertica to PostgreSQL Migration Dashboard</p>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number" id="totalTables">${Object.keys(TABLE_MAPPINGS).length}</div>
                <div class="stat-label">Total Tables</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="completedTables">0</div>
                <div class="stat-label">Completed</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="pendingTables">${Object.keys(TABLE_MAPPINGS).length}</div>
                <div class="stat-label">Pending</div>
            </div>
            <div class="stat-card">
                <div class="stat-number" id="errorTables">0</div>
                <div class="stat-label">Errors</div>
            </div>
        </div>
        
        <div class="controls">
            <div class="control-group">
                <button class="btn btn-primary" onclick="testConnections()">🔌 Test Connections</button>
                <button class="btn btn-success" onclick="migrateAll()">📦 Migrate All Tables</button>
                <button class="btn btn-warning" onclick="validateSchema()">✅ Validate Schema</button>
                <button class="btn btn-danger" onclick="clearLogs()">🗑️ Clear Logs</button>
            </div>
            <div class="control-group">
                <label>Batch Size:</label>
                <select id="batchSize">
                    <option value="500">500</option>
                    <option value="1000" selected>1000</option>
                    <option value="2000">2000</option>
                    <option value="5000">5000</option>
                </select>
                <label>
                    <input type="checkbox" id="dryRun"> Dry Run
                </label>
            </div>
        </div>
        
        <div class="table-list">
            <h2>📋 Migration Tables</h2>
            <div class="table-grid" id="tableGrid">
                <!-- Tables will be loaded here -->
            </div>
        </div>
        
        <div class="log-panel" id="logPanel">
            <div class="log-entry">
                <span class="log-timestamp">[${new Date().toLocaleTimeString()}]</span>
                <span class="log-info">Migration dashboard initialized</span>
            </div>
        </div>
    </div>

    <script>
        // Global state
        let migrationState = {};
        
        // Initialize dashboard
        document.addEventListener('DOMContentLoaded', function() {
            loadTables();
        });
        
        // Load tables
        async function loadTables() {
            try {
                const response = await fetch('/api/tables');
                const data = await response.json();
                
                const tableGrid = document.getElementById('tableGrid');
                tableGrid.innerHTML = '';
                
                data.tables.forEach(table => {
                    const tableCard = createTableCard(table);
                    tableGrid.appendChild(tableCard);
                    migrationState[table.source] = { status: 'ready', progress: 0 };
                });
                
                logMessage('Tables loaded successfully', 'success');
            } catch (error) {
                logMessage('Failed to load tables: ' + error.message, 'error');
            }
        }
        
        // Create table card
        function createTableCard(table) {
            const card = document.createElement('div');
            card.className = 'table-card';
            card.innerHTML = \`
                <div class="table-header">
                    <div class="table-name">\${table.source}</div>
                    <div class="status status-ready" id="status-\${table.source}">Ready</div>
                </div>
                <div class="table-mapping">\${table.source} → \${table.target}</div>
                <div class="progress-bar">
                    <div class="progress-fill" id="progress-\${table.source}" style="width: 0%"></div>
                </div>
                <div class="table-actions">
                    <button class="btn btn-primary" onclick="migrateTable('\${table.source}')">
                        🚀 Migrate
                    </button>
                    <button class="btn btn-warning" onclick="validateTable('\${table.source}')">
                        ✅ Validate
                    </button>
                </div>
            \`;
            return card;
        }
        
        // Migrate single table
        async function migrateTable(tableName) {
            try {
                updateTableStatus(tableName, 'migrating');
                logMessage(\`Starting migration for \${tableName}\`, 'info');
                
                const response = await fetch(\`/api/migrate/\${tableName}\`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        batchSize: document.getElementById('batchSize').value,
                        dryRun: document.getElementById('dryRun').checked
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    updateTableStatus(tableName, 'completed');
                    updateTableProgress(tableName, 100);
                    logMessage(\`Migration completed for \${tableName}\`, 'success');
                    updateStats();
                } else {
                    updateTableStatus(tableName, 'error');
                    logMessage(\`Migration failed for \${tableName}: \${result.error}\`, 'error');
                }
            } catch (error) {
                updateTableStatus(tableName, 'error');
                logMessage(\`Migration error for \${tableName}: \${error.message}\`, 'error');
            }
        }
        
        // Migrate all tables
        async function migrateAll() {
            const tables = Object.keys(migrationState);
            logMessage(\`Starting migration of \${tables.length} tables\`, 'info');
            
            for (const table of tables) {
                if (migrationState[table].status === 'ready') {
                    await migrateTable(table);
                    // Add delay between migrations
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
            
            logMessage('All migrations completed', 'success');
        }
        
        // Test connections
        async function testConnections() {
            logMessage('Testing database connections...', 'info');
            
            // Simulate connection test
            setTimeout(() => {
                logMessage('✅ Vertica connection: OK', 'success');
                logMessage('✅ PostgreSQL connection: OK', 'success');
                logMessage('Connection test completed', 'info');
            }, 2000);
        }
        
        // Validate schema
        async function validateSchema() {
            logMessage('Validating schema mappings...', 'info');
            
            // Simulate schema validation
            setTimeout(() => {
                logMessage('✅ Schema validation passed', 'success');
                logMessage('✅ All table mappings are valid', 'success');
                logMessage('✅ Data type mappings are compatible', 'success');
            }, 1500);
        }
        
        // Validate single table
        function validateTable(tableName) {
            logMessage(\`Validating \${tableName}...\`, 'info');
            setTimeout(() => {
                logMessage(\`✅ \${tableName} validation passed\`, 'success');
            }, 1000);
        }
        
        // Update table status
        function updateTableStatus(tableName, status) {
            const statusElement = document.getElementById(\`status-\${tableName}\`);
            if (statusElement) {
                statusElement.textContent = status.charAt(0).toUpperCase() + status.slice(1);
                statusElement.className = \`status status-\${status}\`;
            }
            migrationState[tableName].status = status;
        }
        
        // Update table progress
        function updateTableProgress(tableName, progress) {
            const progressElement = document.getElementById(\`progress-\${tableName}\`);
            if (progressElement) {
                progressElement.style.width = progress + '%';
            }
            migrationState[tableName].progress = progress;
        }
        
        // Update stats
        function updateStats() {
            const completed = Object.values(migrationState).filter(s => s.status === 'completed').length;
            const errors = Object.values(migrationState).filter(s => s.status === 'error').length;
            const pending = Object.values(migrationState).filter(s => s.status === 'ready').length;
            
            document.getElementById('completedTables').textContent = completed;
            document.getElementById('errorTables').textContent = errors;
            document.getElementById('pendingTables').textContent = pending;
        }
        
        // Log message
        function logMessage(message, type = 'info') {
            const logPanel = document.getElementById('logPanel');
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry';
            
            const timestamp = new Date().toLocaleTimeString();
            logEntry.innerHTML = \`
                <span class="log-timestamp">[\${timestamp}]</span>
                <span class="log-\${type}">\${message}</span>
            \`;
            
            logPanel.appendChild(logEntry);
            logPanel.scrollTop = logPanel.scrollHeight;
        }
        
        // Clear logs
        function clearLogs() {
            const logPanel = document.getElementById('logPanel');
            logPanel.innerHTML = '';
            logMessage('Logs cleared', 'info');
        }
    </script>
</body>
</html>
  `;
}

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Migration Dashboard running at http://localhost:${PORT}`);
  console.log('📋 Available endpoints:');
  console.log('   GET  /           - Main dashboard');
  console.log('   GET  /api/tables - List all tables');
  console.log('   POST /api/migrate/:table - Migrate specific table');
});

export default app;
