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
		set $cfgname.config.DISABLE_CUSTOM='1'
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
		set $cfgname.config.FILTER_MARK='$TAB'
		set $cfgname.config.NFQWS_PORTS_TCP='80,443'
		set $cfgname.config.NFQWS_PORTS_UDP='443'
		set $cfgname.config.NFQWS_TCP_PKT_OUT='9'
		set $cfgname.config.NFQWS_TCP_PKT_IN='3'
		set $cfgname.config.NFQWS_UDP_PKT_OUT='9'
		set $cfgname.config.NFQWS_UDP_PKT_IN='0'
		set $cfgname.config.NFQWS_PORTS_TCP_KEEPALIVE='0'
		set $cfgname.config.NFQWS_PORTS_UDP_KEEPALIVE='0'
		set $cfgname.config.NFQWS_OPT="
			--filter-tcp=443
			--hostlist=/opt/zapret/ipset/zapret-hosts-google.txt
			--hostlist=/opt/zapret/ipset/zapret-hosts-user.txt
			--hostlist-exclude-domains=openwrt.org
			--dpi-desync=fake,fakeddisorder
			--dpi-desync-split-pos=10,midsld
			--dpi-desync-fake-tls=/opt/zapret/files/fake/tls_clienthello_www_google_com.bin
			--dpi-desync-fake-tls-mod=rnd,dupsid,sni=fonts.google.com
			--dpi-desync-fake-tls=0x0F0F0F0F
			--dpi-desync-fake-tls-mod=none
			--dpi-desync-fakedsplit-pattern=/opt/zapret/files/fake/tls_clienthello_vk_com.bin
			--dpi-desync-split-seqovl=336
			--dpi-desync-split-seqovl-pattern=/opt/zapret/files/fake/tls_clienthello_gosuslugi_ru.bin
			--dpi-desync-fooling=badseq,badsum
			--dpi-desync-badseq-increment=0
			--new
			--filter-udp=443
			--hostlist=/opt/zapret/ipset/zapret-hosts-google.txt
			--dpi-desync=fake
			--dpi-desync-repeats=6
			--dpi-desync-fake-quic=/opt/zapret/files/fake/quic_initial_www_google_com.bin
		"
		# save changes
		commit $cfgname
	EOF
	return 0
}
