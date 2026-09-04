#!/bin/sh

set -e

git pull
pnpm build
pm2 restart msg
pm2 reset msg
