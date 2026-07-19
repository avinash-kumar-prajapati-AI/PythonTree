-- Custom SQL migration file, put your code below! --

-- Node deletion policy, enforced at the database level:
-- published nodes can be edited or hidden (visible = 0), but never deleted.
-- Even a manual query or a future application bug cannot remove one.
-- (Edges/links are replaceable content during edits, so only the node row
-- itself is guarded.)
CREATE TRIGGER IF NOT EXISTS prevent_published_node_delete
BEFORE DELETE ON nodes
FOR EACH ROW
WHEN OLD.status = 'published'
BEGIN
  SELECT RAISE(ABORT, 'Published nodes cannot be deleted - hide them instead (visible = 0).');
END;
