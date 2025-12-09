#!/bin/sh
# Copyright (c) 2024 remittor

EXEDIR=/opt/zapret
ZAPRET_BASE=/opt/zapret

ZAPRET_INITD=/etc/init.d/zapret
ZAPRET_ORIG_INITD="$ZAPRET_BASE/init.d/openwrt/zapret"

ZAPRET_CONFIG="$ZAPRET_BASE/config"
ZAPRET_CONFIG_NEW="$ZAPRET_BASE/config.new"
ZAPRET_CONFIG_DEF="$ZAPRET_BASE/config.default"

ZAPRET_CFG=/etc/config/zapret
ZAPRET_CFG_NAME=zapret
ZAPRET_CFG_SEC_NAME="$( uci -q get $ZAPRET_CFG_NAME.config )"

. $ZAPRET_BASE/def-cfg.sh

CRONTAB_FILE="/etc/crontabs/root"

function adapt_for_sed
{
	echo -n "$1" | tr '\r' ' ' | tr '\n' ' ' | tr '\t' ' ' | sed -r 's/([\$\.\*\/\[\\^])/\\\1/g' | sed 's/[]]/\\]/g'
}

function is_valid_config
{
	local fname=${1:-$ZAPRET_CONFIG}
	sh -n "$fname" &>/dev/null
	return $?
}

function get_ppid_by_pid
{
	local pid=$1
	local ppid="$( cat /proc/$pid/status 2>/dev/null | grep '^PPid:' | awk '{print $2}' )"
	echo "$ppid"
}

function get_proc_path_by_pid
{
	local pid=$1
	local path=$( cat /proc/$pid/cmdline 2>/dev/null | tr '\0' '\n' | head -n1 )
	echo "$path"
}

function get_proc_cmd_by_pid
{
	local pid=$1
	local delim="$2"
	local cmdline
	if [ "$delim" = "" ]; then
		cmdline="$( cat /proc/$pid/cmdline 2>/dev/null | tr '\0' '\n' )"
	else
		cmdline="$( cat /proc/$pid/cmdline 2>/dev/null | tr '\0' "$delim" )"
	fi
	echo "$cmdline"
}

function is_run_via_procd
{
	local pname
	[ "$$" = "1" ] && return 0	
	pname="$( get_proc_path_by_pid $$ )"
	[ "$pname" = "/sbin/procd" ] && return 0
	[ "$PPID" = "1" ] && return 0
	pname="$( get_proc_path_by_pid $PPID )"
	[ "$pname" = "/sbin/procd" ] && return 0
	return 1
}

function is_run_on_boot
{
	local cmdline="$( get_proc_cmd_by_pid $$ ' ' )"
	if echo "$cmdline" | grep -q " /etc/rc.d/S" ; then
		if echo "$cmdline" | grep -q " boot $" ; then
			return 0
		fi
	fi
	return 1
}

function get_run_on_boot_option
{
	if [ "$( uci -q get $ZAPRET_CFG_NAME.config.run_on_boot )" = "1" ]; then
		echo 1
	else
		echo 0
	fi
}

function restore_ipset_txt
{
	local cfgname=$1
	if [ -f "$ZAPRET_BASE/ipset_def/$cfgname" ]; then
		cp -f "$ZAPRET_BASE/ipset_def/$cfgname" "$ZAPRET_BASE/ipset/$cfgname"
	fi
}

function restore_all_ipset_cfg
{
	restore_ipset_txt zapret-hosts-google.txt
	restore_ipset_txt zapret-hosts-user.txt
	restore_ipset_txt zapret-hosts-user-exclude.txt
	restore_ipset_txt zapret-ip-exclude.txt.txt
}

function create_default_cfg
{
	local cfgname=${1:-$ZAPRET_CFG_NAME}
	local cfgfile=/etc/config/$cfgname
	rm -f $cfgfile
	touch $cfgfile
	uci set $cfgname.config=main
	set_cfg_default_values $cfgname
	return 0
}

function merge_cfg_with_def_values
{
	local cfgname=${1:-$ZAPRET_CFG_NAME}
	local force=$2
	local cfgfile=/etc/config/$cfgname
	local NEWCFGNAME="zapret-default"
	local NEWCFGFILE="/etc/config/$NEWCFGNAME"

	local cfg_sec_name="$( uci -q get $ZAPRET_CFG_NAME.config )"
	[ -z "$cfg_sec_name" ] && create_default_cfg

	create_default_cfg "$NEWCFGNAME"
	[ ! -f "$NEWCFGFILE" ] && return 1 

	uci -m -f $cfgfile import "$NEWCFGNAME"
	uci commit "$NEWCFGNAME"
	uci -m -f "$NEWCFGFILE" import $cfgname
	uci commit $cfgname
	rm -f "$NEWCFGFILE"	
	return 0
}

function remove_cron_task_logs
{
	if [ -f "$CRONTAB_FILE" ]; then
		sed -i "/-name 'zapret\*.log' -size +/d" "$CRONTAB_FILE"
	fi
}

function insert_cron_task_logs
{
	[ ! -f "$CRONTAB_FILE" ] && touch "$CRONTAB_FILE"
	[ ! -f "$CRONTAB_FILE" ] && return 1
	if ! grep -q -e "-name 'zapret\*\.log' -size \+" "$CRONTAB_FILE"; then
		echo "*/2 * * * * /usr/bin/find /tmp -maxdepth 1 -type f -name 'zapret*.log' -size +2600k -exec rm -f {} \;" >> "$CRONTAB_FILE"
		/etc/init.d/cron restart 2> /dev/null
	fi
	return 0
}

function init_before_start
{
	local DAEMON_LOG_ENABLE=$1
	local HOSTLIST_FN="$ZAPRET_BASE/ipset/zapret-hosts-user.txt"
	[ ! -f "$HOSTLIST_FN" ] && touch "$HOSTLIST_FN"
	chmod 644 $ZAPRET_BASE/ipset/*.txt
	chmod 666 $ZAPRET_BASE/ipset/*.log
	rm -f /tmp/zapret*.log
	#*/
	if [ "$DAEMON_LOG_ENABLE" = "1" ]; then
		insert_cron_task_logs
	else
		remove_cron_task_logs
	fi
	return 0
}

function patch_luci_header_ut
{
	# INFO: https://github.com/openwrt/luci/pull/7725
	local header_ut=/usr/share/ucode/luci/template/header.ut
	local runtime_uc=/usr/share/ucode/luci/runtime.uc
	local newenv
	[ ! -f $header_ut ] && return 0
	[ ! -f $runtime_uc ] && return 0
	if grep -q "pkgs_update_time" $runtime_uc; then
		return 0
	fi
	if grep -q "pkgs_update_time" $header_ut; then
		return 0
	fi
	sed -i "/^import { access/i import { stat } from 'fs';" $runtime_uc
	if ! grep -q "{ stat }" $runtime_uc; then
		return 1
	fi
	newenv="self.env.pkgs_update_time = stat('/lib/apk/db/installed')?.mtime ?? stat('/usr/lib/opkg/status')?.mtime ?? 0;"
	newenv=`adapt_for_sed "$newenv"`
	sed -i "/self.env.include =/i $newenv" $runtime_uc
	if ! grep -q "pkgs_update_time" $runtime_uc; then
		return 1
	fi
	sed -i 's/luci.js?v=\(.*\)"><\/script>/luci.js?v=\1-{{ pkgs_update_time }}"><\/script>/g' $header_ut
	if ! grep -q "pkgs_update_time" $header_ut; then
		return 1
	fi
	logger -p notice -t ZAPRET "patch_luci_header_ut: OK"
	return 0
}
