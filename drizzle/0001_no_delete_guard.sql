-- Custom SQL migration file, put your code below! --

-- Node deletion policy, enforced at the database level:
-- published nodes can be edited or hidden (visible = false), but never
-- deleted. Even a manual query or a future application bug cannot remove one.
CREATE OR REPLACE FUNCTION prevent_published_node_delete() RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'published' THEN
    RAISE EXCEPTION 'Published nodes cannot be deleted - hide them instead (visible = false).';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER prevent_published_node_delete
BEFORE DELETE ON nodes
FOR EACH ROW
EXECUTE FUNCTION prevent_published_node_delete();
