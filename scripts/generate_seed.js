import fs from 'fs';

const csv = fs.readFileSync('/tmp/affiliates.csv', 'utf8');
const lines = csv.split('\n').filter(l => l.trim().length > 0);
const records = [];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i];
  const regex = /(?:^|,)(?:"([^"]*)"|([^,]*))/g;
  let match;
  const row = [];
  while ((match = regex.exec(line)) !== null) {
    row.push(match[1] !== undefined ? match[1] : match[2]);
  }
  if (row[0] && row[0].trim() && row[0].trim() !== 'Feed Boss Ai') {
    const rawUrl = (row[1] || row[2] || '').trim();
    const url = rawUrl.startsWith('http') ? rawUrl : (rawUrl ? `https://${rawUrl}` : '');
    records.push({
      partner_name: row[0].trim(),
      affiliate_url: url,
      short_link: (row[2] || '').trim(),
      keywords: (row[3] || '').trim(),
      product_category: (row[4] || '').trim(),
      target_audience: (row[5] || '').trim() || 'Small Business, Startups & Digital Entrepreneurs',
      cron_schedule: '0 9 * * 1',
      campaign_status: 'active'
    });
  }
}

const sanitize = (str) => (str || '').replace(/'/g, "''");

const sqlHeader = `-- Seed initial affiliate partners from AXiM Affiliates Sheet
-- Generated on ${new Date().toISOString()}

`;

const sqlStatements = records.map(r => {
  return `INSERT INTO public.affiliate_campaigns (
  partner_name, 
  affiliate_url, 
  target_audience, 
  product_category, 
  keywords, 
  campaign_status, 
  cron_schedule
) VALUES (
  '${sanitize(r.partner_name)}',
  '${sanitize(r.affiliate_url || r.short_link)}',
  '${sanitize(r.target_audience)}',
  '${sanitize(r.product_category)}',
  '${sanitize(r.keywords)}',
  '${r.campaign_status}',
  '${r.cron_schedule}'
)
ON CONFLICT (id) DO NOTHING;`;
}).join('\n\n');

fs.writeFileSync('supabase/seed_affiliates.sql', sqlHeader + sqlStatements + '\n');
console.log(`Successfully generated supabase/seed_affiliates.sql with ${records.length} partners.`);
