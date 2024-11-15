#!/bin/sh
# Copyright (c) 2024 remittor

. /opt/zapret/comfunc.sh

merge_cfg_with_def_values

CONFIGS_SYNC=0

[ ! -f "$ZAPRET_CONFIG" ] && CONFIGS_SYNC=1
[ "$1" = "sync" ] && CONFIGS_SYNC=1

if [ "$CONFIGS_SYNC" = "1" ]; then
	# renew main config
	/opt/zapret/sync_config.sh
fi
