#!/bin/sh
# Copyright (c) 2024 remittor

EXEDIR=/opt/zapret
ZAPRET_BASE=/opt/zapret
ZAPRET_CONFIG="$ZAPRET_BASE/config"
ZAPRET_CONFIG_NEW="$ZAPRET_BASE/config.new"
ZAPRET_CONFIG_DEF="$ZAPRET_BASE/config.default"
ZAPRET_CFG=/etc/config/zapret

ZAPRET_CFG_SEC_NAME="$( uci -q get zapret.config )"

if [ -z "$ZAPRET_CFG_SEC_NAME" ]; then
	# wrong uci-config
	return 96
fi

function get_sed_compat
{
	local str=$( ( echo $1|sed -r 's/([\$\.\*\/\[\\^])/\\\1/g'|sed 's/[]]/\\]/g' )>&1 )
	echo "$str"
}

function is_valid_sh_syntax
{
	local fname=${1:-$ZAPRET_CONFIG}
	sh -n "$fname" &>/dev/null
	return $?
}

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
	local value=$( get_sed_compat "$2" )
	local fname=${3:-$ZAPRET_CONFIG}
	sed -i "s/^$param=.*/$param=$value/g" $fname
}

function set_param_value_str
{
	local param=$1
	local value=$( get_sed_compat "$2" )
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

ZAPRET_CONFIG="$ZAPRET_CONFIG_NEW"

sync_param FWTYPE
sync_param POSTNAT
sync_param FLOWOFFLOAD
sync_param INIT_APPLY_FW
sync_param DISABLE_IPV4
sync_param DISABLE_IPV6
sync_param MODE_FILTER

sync_param AUTOHOSTLIST_RETRANS_THRESHOLD
sync_param AUTOHOSTLIST_FAIL_THRESHOLD
sync_param AUTOHOSTLIST_FAIL_TIME
sync_param AUTOHOSTLIST_DEBUGLOG

sync_param NFQWS_ENABLE
sync_param DESYNC_MARK
sync_param DESYNC_MARK_POSTNAT
sync_param NFQWS_PORTS_TCP str
sync_param NFQWS_PORTS_UDP str
sync_param NFQWS_TCP_PKT_OUT str
sync_param NFQWS_TCP_PKT_IN str
sync_param NFQWS_UDP_PKT_OUT str
sync_param NFQWS_UDP_PKT_IN str
sync_param NFQWS_PORTS_TCP_KEEPALIVE
sync_param NFQWS_PORTS_UDP_KEEPALIVE
sync_param NFQWS_OPT str

ZAPRET_CONFIG="$ZAPRET_BASE/config"

if is_valid_sh_syntax "$ZAPRET_CONFIG_NEW" ; then
	cp -f "$ZAPRET_CONFIG_NEW" "$ZAPRET_CONFIG"
	rm -f "$ZAPRET_CONFIG_NEW"
else
	rm -f "$ZAPRET_CONFIG_NEW"
	return 97
fi
