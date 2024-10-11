#!/bin/sh
# Copyright (c) 2024 remittor

EXEDIR=/opt/zapret
ZAPRET_BASE=/opt/zapret
ZAPRET_CONFIG="$ZAPRET_BASE/config"
ZAPRET_CFG=/etc/config/zapret

function get_sed_compat
{
	local str=$( ( echo $1|sed -r 's/([\$\.\*\/\[\\^])/\\\1/g'|sed 's/[]]/\\]/g' )>&1 )
	echo "$str"
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
	local value=$( uci -q get zapret.@main[0].$param )
	if [ "$vtype" = "str" ]; then
		set_param_value_str $param "$value"
	else
		set_param_value $param $value
	fi
}
	
sync_param MODE
sync_param FLOWOFFLOAD
sync_param INIT_APPLY_FW
sync_param DISABLE_IPV4
sync_param DISABLE_IPV6
sync_param MODE_FILTER
sync_param NFQWS_OPT_DESYNC str
sync_param NFQWS_OPT_DESYNC_SUFFIX str
sync_param MODE_HTTP
sync_param MODE_HTTP_KEEPALIVE
sync_param NFQWS_OPT_DESYNC_HTTP str
sync_param NFQWS_OPT_DESYNC_HTTP_SUFFIX str
sync_param NFQWS_OPT_DESYNC_HTTP6 str
sync_param NFQWS_OPT_DESYNC_HTTP6_SUFFIX str
sync_param MODE_HTTPS
sync_param NFQWS_OPT_DESYNC_HTTPS str
sync_param NFQWS_OPT_DESYNC_HTTPS_SUFFIX str
sync_param NFQWS_OPT_DESYNC_HTTPS6 str
sync_param NFQWS_OPT_DESYNC_HTTPS6_SUFFIX str
sync_param MODE_QUIC
sync_param NFQWS_OPT_DESYNC_QUIC str
sync_param NFQWS_OPT_DESYNC_QUIC_SUFFIX str
sync_param NFQWS_OPT_DESYNC_QUIC6 str
sync_param NFQWS_OPT_DESYNC_QUIC6_SUFFIX str

