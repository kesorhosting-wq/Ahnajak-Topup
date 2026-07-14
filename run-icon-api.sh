#!/bin/bash
set -a
source /root/angkor-topup-hub/.env
set +a
exec node /root/angkor-topup-hub/icon-api.cjs
