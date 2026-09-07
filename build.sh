#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "==> Building React Frontend..."
cd frontend
npm install
npm run build
cd ..

echo "==> Installing Python Backend Requirements..."
pip install -r requirements.txt

echo "==> Applying Database Migrations..."
python manage.py migrate

echo "==> Collecting Static Files..."
python manage.py collectstatic --no-input

echo "==> Build Completed Successfully!"
