#!/bin/sh
# Deprecated: the frontend now reads VITE_API_BASE_URL directly from the
# environment at build time. Keeping this file as a no-op avoids confusion
# with Cloud Run public URLs and internal service names.

exec nginx -g 'daemon off;'
