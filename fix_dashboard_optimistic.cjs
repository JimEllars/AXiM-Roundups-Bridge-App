const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.jsx', 'utf-8');

// modify onRefresh calls in Dashboard.jsx to handle optimistic payload
content = content.replace(
  "onRefresh={fetchDashboardData}",
  "onRefresh={(payload) => {\n          if (payload && payload.optimisticLog) {\n            setRecentLogs(prev => [payload.optimisticLog, ...prev].slice(0, 8));\n          }\n          fetchDashboardData(true);\n        }}"
);
content = content.replace(
  "onRefresh={fetchDashboardData}",
  "onRefresh={() => fetchDashboardData(true)}"
);

fs.writeFileSync('src/pages/Dashboard.jsx', content);
