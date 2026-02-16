#!/bin/sh
# Generate runtime env.js from environment variables
# This allows configuration without rebuilding the Docker image

cat <<EOF > /usr/share/nginx/html/env.js
window.env = {
  VITE_API_BASE_URL: "${VITE_API_BASE_URL:-/api/v1}"
};
EOF

echo "Runtime environment configured:"
cat /usr/share/nginx/html/env.js
