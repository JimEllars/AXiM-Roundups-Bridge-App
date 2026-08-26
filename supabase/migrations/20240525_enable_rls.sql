-- Enable RLS on affiliate_campaigns
ALTER TABLE affiliate_campaigns ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to perform all operations on affiliate_campaigns
CREATE POLICY "Allow authenticated users full access to affiliate_campaigns"
  ON affiliate_campaigns
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Enable RLS on roundups_audit_logs
ALTER TABLE roundups_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to perform all operations on roundups_audit_logs
CREATE POLICY "Allow authenticated users full access to roundups_audit_logs"
  ON roundups_audit_logs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
