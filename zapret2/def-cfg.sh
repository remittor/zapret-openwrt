#!/bin/sh
# Copyright (c) 2025 remittor

function set_cfg_reset_values
{
	local cfgname=${1:-$ZAPRET_CFG_NAME}
	local TAB="$( printf '\t' )"
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
		set $cfgname.config.DAEMON_LOG_FILE='/tmp/zapret2+<DAEMON_NAME>+<DAEMON_IDNUM>+<DAEMON_CFGNAME>.log'
		# autohostlist options
		set $cfgname.config.AUTOHOSTLIST_INCOMING_MAXSEQ='4096'
		set $cfgname.config.AUTOHOSTLIST_RETRANS_MAXSEQ='32768'
		set $cfgname.config.AUTOHOSTLIST_RETRANS_RESET='1'
		set $cfgname.config.AUTOHOSTLIST_RETRANS_THRESHOLD='3'
		set $cfgname.config.AUTOHOSTLIST_FAIL_THRESHOLD='3'
		set $cfgname.config.AUTOHOSTLIST_FAIL_TIME='60'
		set $cfgname.config.AUTOHOSTLIST_UDP_IN='1'
		set $cfgname.config.AUTOHOSTLIST_UDP_OUT='4'
		set $cfgname.config.AUTOHOSTLIST_DEBUGLOG='0'
		# nfqws options
		set $cfgname.config.NFQWS2_ENABLE='1'
		set $cfgname.config.DESYNC_MARK='0x40000000'
		set $cfgname.config.DESYNC_MARK_POSTNAT='0x20000000'
		set $cfgname.config.FILTER_MARK='$TAB'
		set $cfgname.config.NFQWS2_PORTS_TCP='80,443'
		set $cfgname.config.NFQWS2_PORTS_UDP='443'
		set $cfgname.config.NFQWS2_TCP_PKT_OUT='20'
		set $cfgname.config.NFQWS2_TCP_PKT_IN='10'
		set $cfgname.config.NFQWS2_UDP_PKT_OUT='5'
		set $cfgname.config.NFQWS2_UDP_PKT_IN='3'
		set $cfgname.config.NFQWS2_PORTS_TCP_KEEPALIVE='0'
		set $cfgname.config.NFQWS2_PORTS_UDP_KEEPALIVE='0'
		# save changes
		commit $cfgname
	EOF
	return 0
}

function clear_nfqws_strat
{
	local cfgname=${1:-$ZAPRET_CFG_NAME}
	local TAB="$( printf '\t' )"
	uci batch <<-EOF
		set $cfgname.config.MODE_FILTER='hostlist'
		set $cfgname.config.NFQWS2_PORTS_TCP='80,443'
		set $cfgname.config.NFQWS2_PORTS_UDP='443'
		set $cfgname.config.NFQWS2_OPT='$TAB'
		commit $cfgname
	EOF
}

function set_cfg_nfqws_strat
{
	local strat=${1:--}
	local cfgname=${2:-$ZAPRET_CFG_NAME}
	local TAB="$( printf '\t' )"
    
	uci batch <<-EOF
		set $cfgname.config.MODE_FILTER='hostlist'
		commit $cfgname
	EOF
	if [ "$strat" = "empty" ]; then
		clear_nfqws_strat $cfgname
	fi
	if [ "$strat" = "default" ]; then
		uci batch <<-EOF
			set $cfgname.config.NFQWS2_PORTS_TCP='80,443'
			set $cfgname.config.NFQWS2_PORTS_UDP='443'
			set $cfgname.config.NFQWS2_OPT="
				# Strategy $strat
				
				--filter-tcp=80
				--filter-l7=http <HOSTLIST>
				--payload=http_req
				--lua-desync=fake:blob=fake_default_http:tcp_md5
				--lua-desync=multisplit:pos=method+2
				
				--new
				--filter-tcp=443
				--filter-l7=tls <HOSTLIST>
				--payload=tls_client_hello
				--lua-desync=fake:blob=fake_default_tls:tcp_md5:tcp_seq=-10000
				--lua-desync=multidisorder:pos=1,midsld
				
				--new
				--filter-udp=443
				--filter-l7=quic <HOSTLIST_NOAUTO>
				--payload=quic_initial
				--lua-desync=fake:blob=fake_default_quic:repeats=6
			"
			commit $cfgname
		EOF
	fi
	if [ "$strat" = "v1_by_Schiz23" ]; then
		uci batch <<-EOF
			set $cfgname.config.NFQWS2_PORTS_TCP='80,443'
			set $cfgname.config.NFQWS2_PORTS_UDP='443'
			set $cfgname.config.NFQWS2_OPT="
				# Strategy $strat
				
				--filter-tcp=80
				--filter-l7=http <HOSTLIST>
				--payload=http_req
				--lua-desync=fake:blob=fake_default_http:tcp_md5
				--lua-desync=multisplit:pos=method+2
				
				--new
				--filter-tcp=443
				--filter-l7=tls <HOSTLIST>
				--lua-desync=fake:blob=fake_default_tls:ip_ttl=1:ip6_ttl=1:tls_mod=rnd,rndsni,padencap
				--lua-desync=multidisorder:payload=tls_client_hello:pos=3
				
				--new
				--filter-udp=443
				--filter-l7=quic <HOSTLIST_NOAUTO>
				--lua-desync=fake:blob=fake_default_quic:repeats=11:payload=all:out_range=-d10
			"
			commit $cfgname
		EOF
	fi
	if [ "$strat" = "v2_by_Schiz23" ]; then
		uci batch <<-EOF
			set $cfgname.config.NFQWS2_PORTS_TCP='80,443'
			set $cfgname.config.NFQWS2_PORTS_UDP='443'
			set $cfgname.config.NFQWS2_OPT="
				# Strategy $strat
				
				--filter-tcp=80
				--filter-l7=http <HOSTLIST>
				--payload=http_req
				--lua-desync=fake:blob=fake_default_http:tcp_md5
				--lua-desync=multisplit:pos=method+2
				
				--new
				--filter-tcp=443
				--filter-l7=tls <HOSTLIST>
				--payload=tls_client_hello
				--lua-desync=multidisorder:payload=tls_client_hello:pos=100,midsld,sniext+1,endhost-2,-10
				--lua-desync=send:sni=.microsoft
				
				--new
				--filter-udp=443
				--filter-l7=quic <HOSTLIST_NOAUTO>
				--payload=quic_initial
				--lua-desync=fake:blob=fake_default_quic:repeats=4
			"
			commit $cfgname
		EOF
	fi
	return 0
}

function set_cfg_default_values
{
	local opt_flags=${1:--}
	local opt_strat=${2:-default}
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
