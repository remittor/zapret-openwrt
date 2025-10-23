#!/bin/sh
# Copyright (c) 2024 remittor

. /opt/zapret/comfunc.sh

function uncomment_param
{
	local param=$1
	local fname=${2:-$ZAPRET_CONFIG}
	sed -i "/^#$param=/s/^#//" $fname
}

function append_param
{
	local param=$1
	local fname=${2:-$ZAPRET_CONFIG}
	grep -q "^$param=" $fname
	if [ "$?" != "0" ]; then
		echo "" >> $fname
		echo "$param=" >> $fname
	fi
}

function set_param_value
{
	local param=$1
	local value=$( adapt_for_sed "$2" )
	local fname=${3:-$ZAPRET_CONFIG}
	sed -i "s/^$param=.*/$param=$value/g" $fname
}

function set_param_value_str
{
	local param=$1
	local value=$( adapt_for_sed "$2" )
	local fname=${3:-$ZAPRET_CONFIG}
	sed -i "s/^$param=.*/$param=\"$value\"/g" $fname
}

function sync_param
{
	local param=$1
	local vtype=$2
	local value="$( uci -q get zapret.config.$param )"
	uncomment_param $param
	append_param $param
	local TAB="$( echo -n -e '\t' )"
	if [ "$value" = "$TAB" ]; then
		value=""
	fi
	if [ "$param" = "NFQWS_PORTS_TCP_KEEPALIVE" -o "$param" = "NFQWS_PORTS_UDP_KEEPALIVE" ]; then
		[ "$value" = "0" ] && value=""
	fi
	if [ "$param" = "NFQWS_OPT" -a "$value" != "" ]; then
		value=$( echo -n "$value" | sed '/^#/d' )
	fi
	if [ "$vtype" = "str" ]; then
		set_param_value_str $param "$value"
	else
		set_param_value $param $value
	fi
}

if [ ! -f "$ZAPRET_CONFIG" ]; then
	if [ ! -f "$ZAPRET_CONFIG_DEF" ]; then
		touch "$ZAPRET_CONFIG"
	else
		cp -f "$ZAPRET_CONFIG_DEF" "$ZAPRET_CONFIG"
	fi
fi

cp -f "$ZAPRET_CONFIG" "$ZAPRET_CONFIG_NEW"

ZAPRET_CONFIG__SAVED="$ZAPRET_CONFIG"
ZAPRET_CONFIG="$ZAPRET_CONFIG_NEW"

sync_param FWTYPE
sync_param POSTNAT
sync_param FLOWOFFLOAD
sync_param INIT_APPLY_FW
sync_param DISABLE_IPV4
sync_param DISABLE_IPV6
sync_param FILTER_TTL_EXPIRED_ICMP
sync_param MODE_FILTER
sync_param DISABLE_CUSTOM
sync_param WS_USER str
sync_param DAEMON_LOG_ENABLE
sync_param DAEMON_LOG_FILE str

sync_param AUTOHOSTLIST_RETRANS_THRESHOLD
sync_param AUTOHOSTLIST_FAIL_THRESHOLD
sync_param AUTOHOSTLIST_FAIL_TIME
sync_param AUTOHOSTLIST_DEBUGLOG

sync_param NFQWS_ENABLE
sync_param DESYNC_MARK
sync_param DESYNC_MARK_POSTNAT
sync_param FILTER_MARK str
sync_param NFQWS_PORTS_TCP str
sync_param NFQWS_PORTS_UDP str
sync_param NFQWS_TCP_PKT_OUT str
sync_param NFQWS_TCP_PKT_IN str
sync_param NFQWS_UDP_PKT_OUT str
sync_param NFQWS_UDP_PKT_IN str
sync_param NFQWS_PORTS_TCP_KEEPALIVE str
sync_param NFQWS_PORTS_UDP_KEEPALIVE str
sync_param NFQWS_OPT str

ZAPRET_CONFIG="$ZAPRET_CONFIG__SAVED"

if is_valid_config "$ZAPRET_CONFIG_NEW" ; then
	cp -f "$ZAPRET_CONFIG_NEW" "$ZAPRET_CONFIG"
	rm -f "$ZAPRET_CONFIG_NEW"
else
	rm -f "$ZAPRET_CONFIG_NEW"
	return 97
fi
