#!/bin/sh /etc/rc.common
# Copyright (c) 2024 remittor

USE_PROCD=1
# after network
START=21

SCRIPT_FILENAME=$1

. /opt/zapret/comfunc.sh

if ! is_valid_config ; then
	logger -p err -t ZAPRET "Wrong main config: $ZAPRET_CONFIG"
	exit 91
fi

. $ZAPRET_ORIG_INITD

EXEDIR=/opt/zapret
ZAPRET_BASE=/opt/zapret

is_run_on_boot && IS_RUN_ON_BOOT=1 || IS_RUN_ON_BOOT=0


function enable
{
	local run_on_boot=""
	if [ "$IS_RUN_ON_BOOT" = "1" ]; then
		if [ -n "$ZAPRET_CFG_SEC_NAME" ]; then
			run_on_boot=$( get_run_on_boot_option )
			if [ $run_on_boot != 1 ]; then
				logger -p notice -t ZAPRET "Attempt to enable service, but service blocked!"
				return 61
			fi
		fi
	fi
	if [ -n "$ZAPRET_CFG_SEC_NAME" ]; then
		uci set $ZAPRET_CFG_NAME.config.run_on_boot=1
		uci commit
	fi
	/bin/sh /etc/rc.common $ZAPRET_ORIG_INITD enable
}

function enabled
{
	local run_on_boot=""
	if [ -n "$ZAPRET_CFG_SEC_NAME" ]; then
		run_on_boot=$( get_run_on_boot_option )
		if [ $run_on_boot != 1 ]; then
			if [ "$IS_RUN_ON_BOOT" = "1" ]; then
				logger -p notice -t ZAPRET "Service is blocked!"
			fi
			return 61
		fi
	fi
	/bin/sh /etc/rc.common $ZAPRET_ORIG_INITD enabled
}

function boot
{
	local run_on_boot=""
	if [ "$IS_RUN_ON_BOOT" = "1" ]; then
		if [ -n "$ZAPRET_CFG_SEC_NAME" ]; then
			run_on_boot=$( get_run_on_boot_option )
			if [ $run_on_boot != 1 ]; then
				logger -p notice -t ZAPRET "Attempt to run service on boot! Service is blocked!"
				return 61
			fi
		fi
	fi
	/bin/sh /etc/rc.common $ZAPRET_ORIG_INITD start "$@"
}

