const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.jsx', 'utf-8');

// Line 31 (initial load) should be false (show loading)
content = content.replace("fetchDashboardData(false);", "fetchDashboardData(false);");

// Line 42 (realtime updates) should be true (background update, don't show loading)
content = content.replace("fetchDashboardData(false);\n        setTimeout(() => setIsLive(false), 3000);", "fetchDashboardData(true);\n        setTimeout(() => setIsLive(false), 3000);");

// Line 153 (handleDeleteCampaign error) should be false
content = content.replace("fetchDashboardData(false);\n      toast.error('Failed to delete campaign');", "fetchDashboardData(false);\n      toast.error('Failed to delete campaign');");

fs.writeFileSync('src/pages/Dashboard.jsx', content);
