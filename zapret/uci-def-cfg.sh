#!/bin/sh
# Copyright (c) 2024 remittor

[ ! -f /opt/zapret/comfunc.sh ] && exit 0

. /opt/zapret/comfunc.sh

mkdir -p $ZAPRET_BASE/ipset

# create empty txt files into ipset directory
[ ! -f "$ZAPRET_BASE/ipset/zapret-hosts-google.txt"     ] && touch "$ZAPRET_BASE/ipset/zapret-hosts-google.txt"
[ ! -f "$ZAPRET_BASE/ipset/zapret-hosts-auto.txt"       ] && touch "$ZAPRET_BASE/ipset/zapret-hosts-auto.txt"
[ ! -f "$ZAPRET_BASE/ipset/zapret-hosts-user.txt"       ] && touch "$ZAPRET_BASE/ipset/zapret-hosts-user.txt"
[ ! -f "$ZAPRET_BASE/ipset/zapret-hosts-user-ipban.txt" ] && touch "$ZAPRET_BASE/ipset/zapret-hosts-user-ipban.txt"
#[ ! -f "$ZAPRET_BASE/ipset/zapret-ip.txt"              ] && touch "$ZAPRET_BASE/ipset/zapret-ip.txt"
[ ! -f "$ZAPRET_BASE/ipset/zapret-ip-user.txt"          ] && touch "$ZAPRET_BASE/ipset/zapret-ip-user.txt"
[ ! -f "$ZAPRET_BASE/ipset/zapret-ip-user-exclude.txt"  ] && touch "$ZAPRET_BASE/ipset/zapret-ip-user-exclude.txt"
[ ! -f "$ZAPRET_BASE/ipset/zapret-ip-user-ipban.txt"    ] && touch "$ZAPRET_BASE/ipset/zapret-ip-user-ipban.txt"

# create or merge uci-config
[ ! -f "$ZAPRET_BASE/renew-cfg.sh" ] && exit 0
$ZAPRET_BASE/renew-cfg.sh
	