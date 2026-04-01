-- v050_performance_audit_indexes.sql
-- Description: Adds missing B-Tree indexes on Foreign Keys and heavily queried columns to eliminate "Full Table Scans".

-- 1. Tickets Table: Index Foreign Keys and categorization fields
CREATE INDEX IF NOT EXISTS idx_tickets_module_id ON public.tickets (module_id);
CREATE INDEX IF NOT EXISTS idx_tickets_category_id ON public.tickets (category_id);
CREATE INDEX IF NOT EXISTS idx_tickets_subcategory_id ON public.tickets (subcategory_id);

-- 2. Performance: Activity Log
-- Frequently filtered by ticket_id and actor_id
CREATE INDEX IF NOT EXISTS idx_ticket_activity_log_ticket_id ON public.ticket_activity_log (ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_activity_log_actor_id ON public.ticket_activity_log (actor_id);

-- 3. Performance: Chat Messages
-- Frequently filtered by ticket_id
CREATE INDEX IF NOT EXISTS idx_ticket_chat_messages_ticket_id ON public.ticket_chat_messages (ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_chat_messages_sender_id ON public.ticket_chat_messages (sender_id);

-- 4. Performance: Profiles & Departments
-- Frequently filtered/joined by department_id and role
CREATE INDEX IF NOT EXISTS idx_profiles_department_id ON public.profiles (department_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

-- 5. Performance: Categories
CREATE INDEX IF NOT EXISTS idx_ticket_categories_module_id ON public.ticket_categories (module_id);
CREATE INDEX IF NOT EXISTS idx_ticket_subcategories_category_id ON public.ticket_subcategories (category_id);
