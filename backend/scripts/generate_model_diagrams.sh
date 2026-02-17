#!/bin/bash
# Generate Model Architecture Diagrams
# Requires: graphviz, pydot (installed in Docker)
#
# Usage: Run from project root (flyng/):
#   ./backend/scripts/generate_model_diagrams.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
PROJECT_DIR="$(dirname "$BACKEND_DIR")"
OUTPUT_DIR="$BACKEND_DIR/docs/architecture/generated"

echo "Generating model diagrams..."
echo "Output directory: $OUTPUT_DIR"

mkdir -p "$OUTPUT_DIR"

cd "$PROJECT_DIR"

# Generate all models diagram
echo "1. Generating all models diagram..."
docker-compose exec -T backend python manage.py graph_models -a \
    --output /app/docs/architecture/generated/all_models.dot 2>/dev/null || true

# Generate grouped diagram
echo "2. Generating grouped diagram..."
docker-compose exec -T backend python manage.py graph_models -a -g \
    --output /app/docs/architecture/generated/grouped.dot 2>/dev/null || true

# Generate per-app diagrams
for app in users organizations warehouses drones batteries inventory orders jobs logs; do
    if docker-compose exec -T backend python -c "import apps.$app" 2>/dev/null; then
        echo "3. Generating $app models diagram..."
        docker-compose exec -T backend python manage.py graph_models $app \
            --output /app/docs/architecture/generated/${app}_models.dot 2>/dev/null || true
    fi
done

echo ""
echo "Done! Diagrams saved to: backend/docs/architecture/generated/"
echo ""
echo "To convert .dot files to images (requires graphviz):"
echo "  cd backend/docs/architecture/generated"
echo "  dot -Tpng all_models.dot -o all_models.png"
echo "  dot -Tsvg all_models.dot -o all_models.svg"
