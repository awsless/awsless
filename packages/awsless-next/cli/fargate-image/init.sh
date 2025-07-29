#!/bin/bash
set -e

if [[ -z "$S3_BUCKET" || -z "$S3_KEY" ]]; then
  echo "S3_BUCKET or S3_KEY not provided"
  exit 1
fi

echo "Fetching latest code from s3://$S3_BUCKET/$S3_KEY ..."
aws s3 cp "s3://$S3_BUCKET/$S3_KEY" /tmp/codebase.zip
unzip -j /tmp/codebase.zip -d /usr/src/app
rm /tmp/codebase.zip

echo "Installing dependencies..."
npm install

echo "Building application..."
npm run build

echo "Starting application..."
exec npm run start
