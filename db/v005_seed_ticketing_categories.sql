-- v005_seed_ticketing_categories.sql
-- Seed script for ticket categories and subcategories based on the PRD
-- Run after v004_ticketing_schema.sql and v003_seed_modules.sql

DO $$
DECLARE
  helpdesk_module_id uuid;
  erp_module_id uuid;
  general_module_id uuid;
  
  sys_admin_role_id uuid;

  hd_hard_cat_id uuid;
  hd_soft_cat_id uuid;
  hd_net_cat_id uuid;
  hd_acc_cat_id uuid;
  
  erp_acc_cat_id uuid;
  erp_txn_cat_id uuid;
  erp_data_cat_id uuid;
  
  gen_unc_cat_id uuid;
BEGIN
  -- 1. Get Module IDs
  SELECT id INTO helpdesk_module_id FROM modules WHERE slug = 'help-desk';
  SELECT id INTO erp_module_id FROM modules WHERE slug = 'erp';
  SELECT id INTO general_module_id FROM modules WHERE slug = 'general';

  -- 2. Insert Help Desk Categories
  IF helpdesk_module_id IS NOT NULL THEN
    INSERT INTO ticket_categories (module_id, name, description) VALUES
      (helpdesk_module_id, 'Hardware', 'Physical device issues') RETURNING id INTO hd_hard_cat_id;
    INSERT INTO ticket_categories (module_id, name, description) VALUES
      (helpdesk_module_id, 'Software', 'Application and OS issues') RETURNING id INTO hd_soft_cat_id;
    INSERT INTO ticket_categories (module_id, name, description) VALUES
      (helpdesk_module_id, 'Network & Connectivity', 'Internet, WiFi, VPN') RETURNING id INTO hd_net_cat_id;
    INSERT INTO ticket_categories (module_id, name, description) VALUES
      (helpdesk_module_id, 'Access & Accounts', 'Logins, passwords, permissions') RETURNING id INTO hd_acc_cat_id;
    INSERT INTO ticket_categories (module_id, name, description) VALUES
      (helpdesk_module_id, 'Other IT', 'Catch-all IT issues');

    -- Insert Help Desk Subcategories
    INSERT INTO ticket_subcategories (category_id, name) VALUES
      (hd_hard_cat_id, 'Laptop / Desktop issue'),
      (hd_hard_cat_id, 'Monitor issue'),
      (hd_hard_cat_id, 'Printer issue');
      
    INSERT INTO ticket_subcategories (category_id, name) VALUES
      (hd_soft_cat_id, 'Application error'),
      (hd_soft_cat_id, 'OS issue'),
      (hd_soft_cat_id, 'Software installation');
      
    INSERT INTO ticket_subcategories (category_id, name) VALUES
      (hd_net_cat_id, 'Internet not working'),
      (hd_net_cat_id, 'Wi-Fi slow'),
      (hd_net_cat_id, 'VPN issue');
      
    INSERT INTO ticket_subcategories (category_id, name) VALUES
      (hd_acc_cat_id, 'Email access'),
      (hd_acc_cat_id, 'New system access'),
      (hd_acc_cat_id, 'Password reset');
  END IF;

  -- 3. Insert ERP Categories
  IF erp_module_id IS NOT NULL THEN
    INSERT INTO ticket_categories (module_id, name, description) VALUES
      (erp_module_id, 'System Access', 'ERP Login and Roles') RETURNING id INTO erp_acc_cat_id;
    INSERT INTO ticket_categories (module_id, name, description) VALUES
      (erp_module_id, 'Transaction Issues', 'Errors saving or posting') RETURNING id INTO erp_txn_cat_id;
    INSERT INTO ticket_categories (module_id, name, description) VALUES
      (erp_module_id, 'Data & Reports', 'Incorrect data, missing reports') RETURNING id INTO erp_data_cat_id;
    INSERT INTO ticket_categories (module_id, name, description) VALUES
      (erp_module_id, 'Training', 'Request training on modules');
    INSERT INTO ticket_categories (module_id, name, description) VALUES
      (erp_module_id, 'Other ERP', 'Any other ERP issue');

    -- Insert ERP Subcategories
    INSERT INTO ticket_subcategories (category_id, name) VALUES
      (erp_acc_cat_id, 'ERP login issue'),
      (erp_acc_cat_id, 'New ERP user access'),
      (erp_acc_cat_id, 'Role/permission change');
      
    INSERT INTO ticket_subcategories (category_id, name) VALUES
      (erp_txn_cat_id, 'Transaction error'),
      (erp_txn_cat_id, 'Posting failed'),
      (erp_txn_cat_id, 'Amount mismatch');
      
    INSERT INTO ticket_subcategories (category_id, name) VALUES
      (erp_data_cat_id, 'Report not generating'),
      (erp_data_cat_id, 'Wrong data displayed');
  END IF;

  -- 4. Insert General Categories
  IF general_module_id IS NOT NULL THEN
    INSERT INTO ticket_categories (module_id, name, description) VALUES
      (general_module_id, 'Uncategorized', 'General inquiry or cross-department issue') RETURNING id INTO gen_unc_cat_id;
  END IF;

END $$;
