#!/bin/sh /etc/rc.common
# Copyright (c) 2024 remittor

USE_PROCD=1
# after network
START=21

SCRIPT_FILENAME=$1

. /opt/zapret/comfunc.sh

if ! is_valid_config ; then
	logger -p err -t $ZAP_LOG_TAG "Wrong main config: $ZAPRET_CONFIG"
	exit 91
fi

. $ZAPRET_ORIG_INITD

EXEDIR=/opt/$ZAPRET_CFG_NAME
ZAPRET_BASE=/opt/$ZAPRET_CFG_NAME

is_run_on_boot && IS_RUN_ON_BOOT=1 || IS_RUN_ON_BOOT=0


function enable
{
	local run_on_boot=""
	patch_luci_header_ut
	if [ "$IS_RUN_ON_BOOT" = "1" ]; then
		if [ -n "$ZAPRET_CFG_SEC_NAME" ]; then
			run_on_boot=$( get_run_on_boot_option )
			if [ $run_on_boot != 1 ]; then
				logger -p notice -t $ZAP_LOG_TAG "Attempt to enable service, but service blocked!"
				return 61
			fi
		fi
	fi
	if [ -n "$ZAPRET_CFG_SEC_NAME" ]; then
		uci set $ZAPRET_CFG_SEC.run_on_boot=1
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
				logger -p notice -t $ZAP_LOG_TAG "Service is blocked!"
			fi
			return 61
		fi
	fi
	/bin/sh /etc/rc.common $ZAPRET_ORIG_INITD enabled
}

function boot
{
	local run_on_boot=""
	patch_luci_header_ut
	if [ "$IS_RUN_ON_BOOT" = "1" ]; then
		if [ -n "$ZAPRET_CFG_SEC_NAME" ]; then
			run_on_boot=$( get_run_on_boot_option )
			if [ $run_on_boot != 1 ]; then
				logger -p notice -t $ZAP_LOG_TAG "Attempt to run service on boot! Service is blocked!"
				return 61
			fi
		fi
	fi
	init_before_start "$DAEMON_LOG_ENABLE"
	/bin/sh /etc/rc.common $ZAPRET_ORIG_INITD start "$@"
}

function start
{
	init_before_start "$DAEMON_LOG_ENABLE"
	/bin/sh /etc/rc.common $ZAPRET_ORIG_INITD start "$@"
}

function restart
{
	init_before_start "$DAEMON_LOG_ENABLE"
	/bin/sh /etc/rc.common $ZAPRET_ORIG_INITD restart "$@"
}
