-- v135_fix_asset_relationships_fk.sql
-- Description: Fix potential foreign key issues with assets table extensions

ALTER TABLE public.asset_relationships 
DROP CONSTRAINT IF EXISTS asset_relationships_parent_asset_id_fkey,
DROP CONSTRAINT IF EXISTS asset_relationships_child_asset_id_fkey;

ALTER TABLE public.asset_relationships
ADD CONSTRAINT asset_relationships_parent_asset_id_fkey FOREIGN KEY (parent_asset_id) REFERENCES public.assets(id) ON DELETE CASCADE,
ADD CONSTRAINT asset_relationships_child_asset_id_fkey FOREIGN KEY (child_asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;
