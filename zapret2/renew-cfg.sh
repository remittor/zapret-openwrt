#!/bin/sh
# Copyright (c) 2024 remittor

EXE_DIR=$(cd "$(dirname "$0")" 2>/dev/null || exit 1; pwd)

. $EXE_DIR/comfunc.sh

merge_cfg_with_def_values

CONFIGS_SYNC=0

[ ! -f "$ZAPRET_CONFIG" ] && CONFIGS_SYNC=1
[ "$1" = "sync" ] && CONFIGS_SYNC=1

if [ "$CONFIGS_SYNC" = "1" ]; then
	# renew main config
	$ZAPRET_BASE/sync_config.sh
fi
