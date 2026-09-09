const fs = require('fs');
let content = fs.readFileSync('src/components/dashboard/NewCampaignModal.jsx', 'utf-8');

// Update to pass an optimistic log object to onRefresh or have onRefresh fetch background
// We can just add an optimistic add to the NewCampaignModal
content = content.replace("onRefresh();", "onRefresh({ optimisticLog: {\n        id: 'opt-' + Date.now(),\n        campaign_id: formData.campaign_id,\n        status: 'processing',\n        created_at: new Date().toISOString()\n      } });");

fs.writeFileSync('src/components/dashboard/NewCampaignModal.jsx', content);
