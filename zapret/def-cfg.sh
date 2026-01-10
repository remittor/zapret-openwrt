#!/bin/sh
# Copyright (c) 2024 remittor

function set_cfg_reset_values
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
		# save changes
		commit $cfgname
	EOF
	return 0
}

function clear_nfqws_strat
{
	local cfgname=${1:-$ZAPRET_CFG_NAME}
	local TAB="$( echo -n -e '\t' )"
	uci batch <<-EOF
		set $cfgname.config.MODE_FILTER='hostlist'
		set $cfgname.config.NFQWS_PORTS_TCP='80,443'
		set $cfgname.config.NFQWS_PORTS_UDP='443'
		set $cfgname.config.NFQWS_OPT='$TAB'
		commit $cfgname
	EOF
}

function set_cfg_nfqws_strat
{
	local strat=${1:--}
	local cfgname=${2:-$ZAPRET_CFG_NAME}
	local TAB="$( echo -n -e '\t' )"
    
	uci batch <<-EOF
		set $cfgname.config.MODE_FILTER='hostlist'
		commit $cfgname
	EOF
	if [ "$strat" = "empty" ]; then
		clear_nfqws_strat $cfgname
	fi
	if [ "$strat" = "v1_by_StressOzz" ]; then
		uci batch <<-EOF
			set $cfgname.config.NFQWS_PORTS_TCP='80,443'
			set $cfgname.config.NFQWS_PORTS_UDP='443'
			set $cfgname.config.NFQWS_OPT="
				# Strategy $strat
				
				--filter-tcp=443 <HOSTLIST>
				--hostlist=/opt/zapret/ipset/zapret-hosts-google.txt
				--dpi-desync=fake,multidisorder
				--dpi-desync-split-seqovl=681
				--dpi-desync-split-pos=1
				--dpi-desync-fooling=badseq
				--dpi-desync-badseq-increment=10000000
				--dpi-desync-repeats=2
				--dpi-desync-split-seqovl-pattern=/opt/zapret/files/fake/tls_clienthello_www_google_com.bin
				--dpi-desync-fake-tls-mod=rnd,dupsid,sni=fonts.google.com
				
				--new
				--filter-udp=443
				--hostlist=/opt/zapret/ipset/zapret-hosts-google.txt
				--hostlist-exclude=/opt/zapret/ipset/zapret-hosts-user-exclude.txt
				--dpi-desync=fake
				--dpi-desync-repeats=6
				--dpi-desync-fake-quic=/opt/zapret/files/fake/quic_initial_www_google_com.bin
			"
			commit $cfgname
		EOF
	fi
	if [ "$strat" = "v2_by_StressOzz" ]; then
		uci batch <<-EOF
			set $cfgname.config.NFQWS_PORTS_TCP='80,443'
			set $cfgname.config.NFQWS_PORTS_UDP='443'
			set $cfgname.config.NFQWS_OPT="
				# Strategy $strat
				
				--filter-tcp=443 <HOSTLIST>
				--hostlist=/opt/zapret/ipset/zapret-hosts-google.txt
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
				--hostlist-exclude=/opt/zapret/ipset/zapret-hosts-user-exclude.txt
				--dpi-desync=fake
				--dpi-desync-repeats=6
				--dpi-desync-fake-quic=/opt/zapret/files/fake/quic_initial_www_google_com.bin
			"
			commit $cfgname
		EOF
	fi
	if [ "$strat" = "v3_by_StressOzz" ]; then
		uci batch <<-EOF
			set $cfgname.config.NFQWS_PORTS_TCP='80,443'
			set $cfgname.config.NFQWS_PORTS_UDP='443'
			set $cfgname.config.NFQWS_OPT="
				# Strategy $strat
				
				--filter-tcp=443 <HOSTLIST>
				--hostlist=/opt/zapret/ipset/zapret-hosts-google.txt
				--hostlist-exclude-domains=openwrt.org
				--dpi-desync=fake,fakeddisorder
				--dpi-desync-split-pos=10,midsld
				--dpi-desync-fake-tls=/opt/zapret/files/fake/t2.bin
				--dpi-desync-fake-tls-mod=rnd,dupsid,sni=m.ok.ru
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
				--hostlist-exclude=/opt/zapret/ipset/zapret-hosts-user-exclude.txt
				--dpi-desync=fake
				--dpi-desync-repeats=6
				--dpi-desync-fake-quic=/opt/zapret/files/fake/quic_initial_www_google_com.bin
			"
			commit $cfgname
		EOF
	fi
	if [ "$strat" = "v4_by_StressOzz" ]; then
		uci batch <<-EOF
			set $cfgname.config.NFQWS_PORTS_TCP='80,443'
			set $cfgname.config.NFQWS_PORTS_UDP='443'
			set $cfgname.config.NFQWS_OPT="
				# Strategy $strat
				
				--filter-tcp=443
				--hostlist=/opt/zapret/ipset/zapret-hosts-google.txt
				--hostlist-exclude=/opt/zapret/ipset/zapret-hosts-user-exclude.txt
				--hostlist-exclude-domains=openwrt.org
				--dpi-desync=fake,multisplit
				--dpi-desync-split-pos=2,sld
				--dpi-desync-fake-tls=0x0F0F0F0F
				--dpi-desync-fake-tls=/opt/zapret/files/fake/tls_clienthello_www_google_com.bin
				--dpi-desync-fake-tls-mod=rnd,dupsid,sni=google.com
				--dpi-desync-split-seqovl=2108
				--dpi-desync-split-seqovl-pattern=/opt/zapret/files/fake/tls_clienthello_www_google_com.bin
				--dpi-desync-fooling=badseq
				
				--new
				--filter-tcp=443 <HOSTLIST>
				--hostlist-exclude-domains=openwrt.org
				--dpi-desync-any-protocol=1
				--dpi-desync-cutoff=n5
				--dpi-desync=multisplit
				--dpi-desync-split-seqovl=582
				--dpi-desync-split-pos=1
				--dpi-desync-split-seqovl-pattern=/opt/zapret/files/fake/4pda.bin
				
				--new
				--filter-udp=443
				--hostlist=/opt/zapret/ipset/zapret-hosts-google.txt
				--hostlist-exclude=/opt/zapret/ipset/zapret-hosts-user-exclude.txt
				--dpi-desync=fake
				--dpi-desync-repeats=6
				--dpi-desync-fake-quic=/opt/zapret/files/fake/quic_initial_www_google_com.bin
			"
			commit $cfgname
		EOF
	fi
	if [ "$strat" = "v5_by_StressOzz" ]; then
		uci batch <<-EOF
			set $cfgname.config.NFQWS_PORTS_TCP='80,443'
			set $cfgname.config.NFQWS_PORTS_UDP='443'
			set $cfgname.config.NFQWS_OPT="
				# Strategy $strat
				
				--filter-tcp=443
				--hostlist=/opt/zapret/ipset/zapret-hosts-google.txt
				--hostlist-exclude=/opt/zapret/ipset/zapret-hosts-user-exclude.txt
				--hostlist-exclude-domains=openwrt.org
				--ip-id=zero
				--dpi-desync=multisplit
				--dpi-desync-split-seqovl=681
				--dpi-desync-split-pos=1
				--dpi-desync-split-seqovl-pattern=/opt/zapret/files/fake/tls_clienthello_www_google_com.bin
				
				--new
				--filter-tcp=443 <HOSTLIST>
				--hostlist-exclude-domains=openwrt.org
				--dpi-desync=fake,fakeddisorder
				--dpi-desync-split-pos=10,midsld
				--dpi-desync-fake-tls=/opt/zapret/files/fake/max.bin
				--dpi-desync-fake-tls-mod=rnd,dupsid
				--dpi-desync-fake-tls=0x0F0F0F0F
				--dpi-desync-fake-tls-mod=none
				--dpi-desync-fakedsplit-pattern=/opt/zapret/files/fake/tls_clienthello_vk_com.bin
				--dpi-desync-fooling=badseq,badsum
				--dpi-desync-badseq-increment=0
				
				--new
				--filter-udp=443
				--hostlist=/opt/zapret/ipset/zapret-hosts-google.txt
				--hostlist-exclude=/opt/zapret/ipset/zapret-hosts-user-exclude.txt
				--dpi-desync=fake
				--dpi-desync-repeats=6
				--dpi-desync-fake-quic=/opt/zapret/files/fake/quic_initial_www_google_com.bin
			"
			commit $cfgname
		EOF
	fi
	if [ "$strat" = "v6_by_StressOzz" ]; then
		uci batch <<-EOF
			set $cfgname.config.NFQWS_PORTS_TCP='80,443,2053,2083,2087,2096,8443'
			set $cfgname.config.NFQWS_PORTS_UDP='443,19294-19344,50000-50100'
			set $cfgname.config.NFQWS_OPT="
				# Strategy $strat
				
				--filter-tcp=443
				--hostlist=/opt/zapret/ipset/zapret-hosts-google.txt
				--dpi-desync=multisplit
				--dpi-desync-split-pos=1,sniext+1
				--dpi-desync-split-seqovl=1

				--new
				--filter-tcp=443 <HOSTLIST>
				--dpi-desync=hostfakesplit
				--dpi-desync-hostfakesplit-mod=host=rzd.ru
				--dpi-desync-hostfakesplit-midhost=host-2
				--dpi-desync-split-seqovl=726
				--dpi-desync-fooling=badsum,badseq
				--dpi-desync-badseq-increment=0

				--new
				--filter-udp=443 ˂HOSTLIST_NOAUTO˃
				--dpi-desync=fake
				--dpi-desync-repeats=6
				--dpi-desync-fake-quic=/opt/zapret/files/fake/quic_initial_www_google_com.bin

				--new
				--filter-udp=19294-19344,50000-50100
				--filter-l7=discord,stun
				--dpi-desync=fake
				--dpi-desync-repeats=6

				--new
				--filter-tcp=2053,2083,2087,2096,8443
				--hostlist-domains=discord.media
				--dpi-desync=multisplit
				--dpi-desync-split-seqovl=652
				--dpi-desync-split-pos=2
				--dpi-desync-split-seqovl-pattern=/opt/zapret/files/fake/tls_clienthello_www_google_com.bin
			"
			commit $cfgname
		EOF
	fi
	if [ "$strat" = "ALT7_by_Flowseal" ]; then
		uci batch <<-EOF
			set $cfgname.config.NFQWS_PORTS_TCP='80,443'
			set $cfgname.config.NFQWS_PORTS_UDP='443'
			set $cfgname.config.NFQWS_OPT="
				# Strategy $strat
				
				--filter-tcp=443
				--hostlist=/opt/zapret/ipset/zapret-hosts-google.txt
				--hostlist-exclude=/opt/zapret/ipset/zapret-hosts-user-exclude.txt
				--hostlist-exclude-domains=openwrt.org
				--ip-id=zero
				--dpi-desync=multisplit
				--dpi-desync-split-pos=2,sniext+1
				--dpi-desync-split-seqovl=679
				--dpi-desync-split-seqovl-pattern=/opt/zapret/files/fake/tls_clienthello_www_google_com.bin
				
				--new
				--filter-tcp=80,443 <HOSTLIST>
				--hostlist-exclude-domains=openwrt.org
				--dpi-desync=multisplit
				--dpi-desync-split-pos=2,sniext+1
				--dpi-desync-split-seqovl=679
				--dpi-desync-split-seqovl-pattern=/opt/zapret/files/fake/tls_clienthello_www_google_com.bin
				
				--new
				--filter-udp=443
				--hostlist=/opt/zapret/ipset/zapret-hosts-google.txt
				--hostlist-exclude=/opt/zapret/ipset/zapret-hosts-user-exclude.txt
				--dpi-desync=fake
				--dpi-desync-repeats=6
				--dpi-desync-fake-quic=/opt/zapret/files/fake/quic_initial_www_google_com.bin
			"
			commit $cfgname
		EOF
	fi
	if [ "$strat" = "TLS_AUTO_ALT3_by_Flowseal" ]; then
		uci batch <<-EOF
			set $cfgname.config.NFQWS_PORTS_TCP='80,443'
			set $cfgname.config.NFQWS_PORTS_UDP='443'
			set $cfgname.config.NFQWS_OPT="
				# Strategy $strat
				
				--filter-tcp=443
				--hostlist=/opt/zapret/ipset/zapret-hosts-google.txt
				--hostlist-exclude=/opt/zapret/ipset/zapret-hosts-user-exclude.txt
				--hostlist-exclude-domains=openwrt.org
				--ip-id=zero
				--dpi-desync=fake,multisplit
				--dpi-desync-split-seqovl=681
				--dpi-desync-split-pos=1
				--dpi-desync-fooling=ts
				--dpi-desync-repeats=8
				--dpi-desync-split-seqovl-pattern=/opt/zapret/files/fake/tls_clienthello_www_google_com.bin
				--dpi-desync-fake-tls-mod=rnd,dupsid,sni=www.google.com
				
				--new
				--filter-tcp=80,443 <HOSTLIST>
				--hostlist-exclude-domains=openwrt.org
				--dpi-desync=fake,multisplit
				--dpi-desync-split-seqovl=681
				--dpi-desync-split-pos=1
				--dpi-desync-fooling=ts
				--dpi-desync-repeats=8
				--dpi-desync-split-seqovl-pattern=/opt/zapret/files/fake/tls_clienthello_www_google_com.bin
				--dpi-desync-fake-tls-mod=rnd,dupsid,sni=www.google.com
				
				--new
				--filter-udp=443
				--hostlist=/opt/zapret/ipset/zapret-hosts-google.txt
				--hostlist-exclude=/opt/zapret/ipset/zapret-hosts-user-exclude.txt
				--dpi-desync=fake
				--dpi-desync-repeats=11
				--dpi-desync-fake-quic=/opt/zapret/files/fake/quic_initial_www_google_com.bin
			"
			commit $cfgname
		EOF
	fi
	return 0
}

function set_cfg_default_values
{
	local opt_flags=${1:--}
	local opt_strat=${2:-v6_by_StressOzz}
	local cfgname=${3:-$ZAPRET_CFG_NAME}

	if ! echo "$opt_flags" | grep -q "(skip_base)"; then
		set_cfg_reset_values $cfgname
	fi
	if [ "$opt_strat" != "-" ]; then
		set_cfg_nfqws_strat "$opt_strat" $cfgname
	fi
	if echo "$opt_flags" | grep -q "(set_mode_autohostlist)"; then
		uci batch <<-EOF
			set $cfgname.config.MODE_FILTER='autohostlist'
			commit $cfgname
		EOF
	fi
	return 0
}
