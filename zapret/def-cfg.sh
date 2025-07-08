#!/bin/sh
# Copyright (c) 2024 remittor

function set_cfg_default_values
{
	local cfgname=${1:-$ZAPRET_CFG_NAME}
	local TAB="$( echo -n -e '\t' )"
	uci batch <<-EOF
		set $cfgname.config.run_on_boot='0'
		# settings for zapret service
		set $cfgname.config.FWTYPE='nftables'
		set $cfgname.config.POSTNAT='1'
		set $cfgname.config.FLOWOFFLOAD='none'
		set $cfgname.config.INIT_APPLY_FW='1'
		set $cfgname.config.DISABLE_IPV4='0'
		set $cfgname.config.DISABLE_IPV6='1'
		set $cfgname.config.FILTER_TTL_EXPIRED_ICMP='1'
		set $cfgname.config.MODE_FILTER='hostlist'
		set $cfgname.config.DISABLE_CUSTOM='0'
		set $cfgname.config.WS_USER='daemon'
		set $cfgname.config.DAEMON_LOG_ENABLE='0'
		set $cfgname.config.DAEMON_LOG_FILE='/tmp/zapret+<DAEMON_NAME>+<DAEMON_IDNUM>+<DAEMON_CFGNAME>.log'
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
			--dpi-desync=fake,fakedsplit
			--dpi-desync-autottl=2
			--dpi-desync-fooling=badsum
			--new
			--filter-tcp=443 --hostlist=/opt/zapret/ipset/zapret-hosts-google.txt
			--dpi-desync=fake,multidisorder
			--dpi-desync-split-pos=1,midsld
			--dpi-desync-repeats=11
			--dpi-desync-fooling=badsum
			--dpi-desync-fake-tls-mod=rnd,dupsid,sni=www.google.com
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
			--filter-tcp=443 <HOSTLIST>
			--dpi-desync=multidisorder
			--dpi-desync-split-pos=1,sniext+1,host+1,midsld-2,midsld,midsld+2,endhost-1
		"
		# save changes
		commit $cfgname
	EOF
	return 0
}
