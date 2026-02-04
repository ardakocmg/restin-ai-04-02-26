#!/bin/bash

set -e

echo "starting services via supervisor"
supervisord -c /app/supervisord.conf
