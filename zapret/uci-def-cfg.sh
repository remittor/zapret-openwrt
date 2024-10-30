#!/bin/sh
# Copyright (c) 2024 remittor

SCRIPT_SOURCED=0
case ${0##*/} in ash|-ash) SCRIPT_SOURCED=1;; esac
#[[ $_ != $0 ]] && echo "Script is being sourced" || echo "Script is a subshell"

ZAPRET_BASE=/opt/zapret
ZAPRET_CONFIG="$ZAPRET_BASE/config"
ZAPRET_CONFIG_DEF="$ZAPRET_BASE/config.default"
ZAPRET_CFG_FILE=/etc/config/zapret
ZAPRET_CFG_NAME=zapret

CFG_OPT_FORCE=0
CFG_OPT_MERGE=0
CFG_OPT_SYNC_CFG=0


function set_default_values
{
	local cfgname=${1:-$ZAPRET_CFG_NAME}
	local TAB="$( echo -n -e '\t' )"
	uci batch <<-EOF
		set $cfgname.config.autostart='0'
		# settings for zapret service
		set $cfgname.config.FWTYPE='nftables'
		set $cfgname.config.POSTNAT='1'
		set $cfgname.config.FLOWOFFLOAD='none'
		set $cfgname.config.INIT_APPLY_FW='1'
		set $cfgname.config.DISABLE_IPV4='0'
		set $cfgname.config.DISABLE_IPV6='1'
		set $cfgname.config.MODE_FILTER='hostlist'
		# autohostlist options
		set $cfgname.config.AUTOHOSTLIST_RETRANS_THRESHOLD='3'
		set $cfgname.config.AUTOHOSTLIST_FAIL_THRESHOLD='3'
		set $cfgname.config.AUTOHOSTLIST_FAIL_TIME='60'
		set $cfgname.config.AUTOHOSTLIST_DEBUGLOG='0'
		# nfqws options
		set $cfgname.config.NFQWS_ENABLE='1'
		set $cfgname.config.DESYNC_MARK='0x40000000'
		set $cfgname.config.DESYNC_MARK_POSTNAT='0x20000000'
		set $cfgname.config.NFQWS_PORTS_TCP='80,443'
		set $cfgname.config.NFQWS_PORTS_UDP='443'
		set $cfgname.config.NFQWS_TCP_PKT_OUT='9'
		set $cfgname.config.NFQWS_TCP_PKT_IN='3'
		set $cfgname.config.NFQWS_UDP_PKT_OUT='9'
		set $cfgname.config.NFQWS_UDP_PKT_IN='0'
		set $cfgname.config.NFQWS_PORTS_TCP_KEEPALIVE='0'
		set $cfgname.config.NFQWS_PORTS_UDP_KEEPALIVE='0'
		set $cfgname.config.NFQWS_OPT="
			--filter-tcp=80 <HOSTLIST>
			--dpi-desync=fake,split2
			--dpi-desync-autottl=2
			--dpi-desync-fooling=md5sig
			--new
			--filter-tcp=443 --hostlist=/opt/zapret/ipset/zapret-hosts-google.txt
			--dpi-desync=fake,split2
			--dpi-desync-repeats=11
			--dpi-desync-fooling=md5sig
			--dpi-desync-fake-tls=/opt/zapret/files/fake/tls_clienthello_www_google_com.bin
			--new
			--filter-udp=443 --hostlist=/opt/zapret/ipset/zapret-hosts-google.txt
			--dpi-desync=fake
			--dpi-desync-repeats=11
			--dpi-desync-fake-quic=/opt/zapret/files/fake/quic_initial_www_google_com.bin
			--new
			--filter-udp=443 <HOSTLIST_NOAUTO>
			--dpi-desync=fake
			--dpi-desync-repeats=11
			--new
			<HOSTLIST>
			--dpi-desync=fake,disorder2
			--dpi-desync-autottl=2
			--dpi-desync-fooling=md5sig
		"
		# save changes
		commit $cfgname
	EOF
	return 0
}

function create_default_config
{
	local cfgname=${1:-$ZAPRET_CFG_NAME}
	local cfgfile=/etc/config/$cfgname
	rm -f $cfgfile
	touch $cfgfile
	uci set $cfgname.config=main
	set_default_values $cfgname
	return 0
}

function merge_config_with_def_values
{
	local cfgname=${1:-$ZAPRET_CFG_NAME}
	local force=$2
	local cfgfile=/etc/config/$cfgname
	local NEWCFGNAME="zapret-default"
	local NEWCFGFILE="/etc/config/$NEWCFGNAME"

	create_default_config "$NEWCFGNAME"
	[ ! -f "$NEWCFGFILE" ] && return 1 

	uci -m -f $cfgfile import "$NEWCFGNAME"
	uci commit "$NEWCFGNAME"
	uci -m -f "$NEWCFGFILE" import $cfgname
	uci commit $cfgname
	rm -f "$NEWCFGFILE"	
	return 0
}


if [ "$SCRIPT_SOURCED" != "1" ]; then
	while getopts "fms" SCRIPT_OPT; do
		case $SCRIPT_OPT in
			f) CFG_OPT_FORCE=1;;
			m) CFG_OPT_MERGE=1;;
			s) CFG_OPT_SYNC_CFG=1;;
		esac
	done

	if [ ! -f "$ZAPRET_CFG_FILE" ]; then
		CFG_OPT_FORCE=1
	fi

	if [ "$CFG_OPT_FORCE" = "1" ]; then
		create_default_config
		[ "$CFG_OPT_SYNC_CFG" = "1" ] && /opt/zapret/sync_config.sh
		return 0
	fi
fi


CFG_OPT_MERGE=1
merge_config_with_def_values

if [ ! -f "$ZAPRET_CONFIG" ]; then
	# create main config
	/opt/zapret/sync_config.sh
fi

return 0
