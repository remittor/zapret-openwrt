#!/bin/sh
# Copyright (c) 2024 remittor

. /opt/zapret/comfunc.sh

cfg_run_on_boot="$( uci -q get zapret.config.run_on_boot )"

restore_all_ipset_cfg
create_default_cfg

if [ "$cfg_run_on_boot" = "1" ]; then
	uci set zapret.config.run_on_boot=1
	uci commit
fi

if [ "$1" = "sync" ]; then
	# renew main config
	/opt/zapret/sync_config.sh
fi
