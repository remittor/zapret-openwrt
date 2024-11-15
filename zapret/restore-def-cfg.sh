#!/bin/sh
# Copyright (c) 2024 remittor

. /opt/zapret/comfunc.sh

create_default_cfg

if [ "$1" = "sync" ]; then
	# renew main config
	/opt/zapret/sync_config.sh
fi
