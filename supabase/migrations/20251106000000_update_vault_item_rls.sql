-- Refine RLS Policy for Vault Items to ensure beneficiaries can only see unlocked content
-- This prevents heirs from seeing scheduled or draft items before the intended unlock date/event.

-- Drop existing policy
DROP POLICY IF EXISTS "Users can view own vault items" ON vault_items;

-- Create refined policy
CREATE POLICY "Users can view own vault items"
  ON vault_items FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    (
      id IN (
        SELECT bl.vault_item_id 
        FROM beneficiary_links bl
        JOIN beneficiaries b ON bl.beneficiary_id = b.id
        JOIN auth.users au ON au.email = b.email
        WHERE au.id = auth.uid()
      ) AND status IN ('LOCKED', 'PUBLISHED', 'SENT')
    )
  );

-- Add policy for audit logs to allow beneficiaries to see their own access history
CREATE POLICY "Beneficiaries can view relevant audit logs"
  ON vault_audit_logs FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    vault_item_id IN (
      SELECT bl.vault_item_id 
      FROM beneficiary_links bl
      JOIN beneficiaries b ON bl.beneficiary_id = b.id
      JOIN auth.users au ON au.email = b.email
      WHERE au.id = auth.uid()
    )
  );
