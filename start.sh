#!/bin/sh

set -e

git pull
pnpm build
pm2 restart tpass-cross_grade_messages
pm2 reset tpass-cross_grade_messages
