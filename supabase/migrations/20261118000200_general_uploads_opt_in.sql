-- General supporting-file uploads are optional per service. Specific file
-- questions in a service's order form remain available independently.
UPDATE public.services
SET allow_file_uploads = false
WHERE allow_file_uploads IS DISTINCT FROM false;
