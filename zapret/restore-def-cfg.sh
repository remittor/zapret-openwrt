#!/bin/sh
# Copyright (c) 2024 remittor

EXE_DIR=$(cd "$(dirname "$0")" 2>/dev/null || exit 1; pwd)

. $EXE_DIR/comfunc.sh

cfg_run_on_boot="$( uci -q get $ZAPRET_CFG_SEC.run_on_boot )"

opt_flags=${1:--}
opt_strat=$2

if echo "$opt_flags" | grep -q "(reset_ipset)"; then
	restore_all_ipset_cfg
fi

if echo "$opt_flags" | grep -q "(erase_autohostlist)"; then
	: > $ZAPRET_BASE/ipset/zapret-hosts-auto.txt
	: > $ZAPRET_BASE/ipset/zapret-hosts-auto-debug.log
fi
	
create_default_cfg "$opt_flags" "$opt_strat"

if [ "$cfg_run_on_boot" = "1" ]; then
	uci set $ZAPRET_CFG_SEC.run_on_boot=1
	uci commit
fi

ZAPRET_SYNC_CONFIG=0
if [ "$opt_flags" = "sync" ]; then
	ZAPRET_SYNC_CONFIG=1
fi
if echo "$opt_flags" | grep -q "(sync)"; then
	ZAPRET_SYNC_CONFIG=1
fi

if [ "$ZAPRET_SYNC_CONFIG" = "1" ]; then
	# renew main config
	$ZAPRET_BASE/sync_config.sh
fi
