#!/bin/sh
# Copyright (c) 2026 remittor

ZAP_TMP_DIR=/tmp/zapret_dwc

opt_dig=
opt_test=

while getopts "d:t" opt; do
	case $opt in
		d) opt_dig="$OPTARG";;
		t) opt_test="true";;
	esac
done 

rm -rf $ZAP_TMP_DIR

CURL_TIMEOUT=5
CURL_RANGETO=65535
CURL_NOCACHE='cache-control: no-cache'
CURL_NOCACHE2='pragma: no-cache'
CURL_USERAGENT='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'

if ! command -v curl >/dev/null 2>&1; then
	echo "ERROR: package \"curl\" not installed!"
	return 10
fi
CURL_INFO=$( curl -V )
if ! echo "$CURL_INFO" | grep -q 'https'; then
	echo "------- package curl"
	echo "$CURL_INFO"
	echo "-------"
	echo "ERROR: package \"curl\" not supported HTTPS protocol!"
	echo "NOTE: Please install package \"curl-ssl\""
	return 11
fi

if [ "$opt_dig" != "" ]; then
	if ! command -v dig >/dev/null 2>&1; then
		echo "ERROR: package \"bind-dig\" not installed!"
		return 12
	fi
	[ "$opt_dig" = "@" ] && opt_dig='8.8.8.8'
	[ "$opt_dig" = "8" ] && opt_dig='8.8.8.8'
	[ "$opt_dig" = "1" ] && opt_dig='1.1.1.1'
fi

#echo 'Original sources: https://github.com/hyperion-cs/dpi-checkers'
#echo 'WEB-version: https://hyperion-cs.github.io/dpi-checkers/ru/tcp-16-20/'

TEST_SUITE='[
  { id: "US.CF-01", provider: "🇺🇸 Cloudflare", times: 1, url: "https://img.wzstats.gg/cleaver/gunFullDisplay" },
  { id: "US.CF-02", provider: "🇺🇸 Cloudflare", times: 1, url: "https://genshin.jmp.blue/characters/all#" },
  { id: "US.CF-03", provider: "🇺🇸 Cloudflare", times: 1, url: "https://api.frankfurter.dev/v1/2000-01-01..2002-12-31" },
  { id: "US.CF-04", provider: "🇨🇦 Cloudflare", times: 1, url: "https://www.bigcartel.com/" },
  { id: "US.DO-01", provider: "🇺🇸 DigitalOcean", times: 2, url: "https://genderize.io/" },
  { id: "DE.HE-01", provider: "🇩🇪 Hetzner", times: 1, url: "https://j.dejure.org/jcg/doctrine/doctrine_banner.webp" },
  { id: "DE.HE-02", provider: "🇩🇪 Hetzner", times: 1, url: "https://maps.gnosis.earth/ogcapi/api/swagger-ui/swagger-ui-standalone-preset.js#" },
  { id: "FI.HE-01", provider: "🇫🇮 Hetzner", times: 1, url: "https://251b5cd9.nip.io/1MB.bin" },
  { id: "FI.HE-02", provider: "🇫🇮 Hetzner", times: 1, url: "https://5fd8c176.nip.io/1MB.bin" },
  { id: "FI.HE-03", provider: "🇫🇮 Hetzner", times: 1, url: "https://5fd8bdae.nip.io/1MB.bin" },
  { id: "FI.HE-04", provider: "🇫🇮 Hetzner", times: 1, url: "https://5fd8bca5.nip.io/1MB.bin" },
  { id: "FR.OVH-01", provider: "🇫🇷 OVH", times: 1, url: "https://eu.api.ovh.com/console/rapidoc-min.js" },
  { id: "FR.OVH-02", provider: "🇫🇷 OVH", times: 1, url: "https://ovh.sfx.ovh/10M.bin" },
  { id: "SE.OR-01", provider: "🇸🇪 Oracle", times: 1, url: "https://oracle.sfx.ovh/10M.bin" },
  { id: "DE.AWS-01", provider: "🇩🇪 AWS", times: 1, url: "https://www.getscope.com/assets/fonts/fa-solid-900.woff2" },
  { id: "US.AWS-01", provider: "🇺🇸 AWS", times: 1, url: "https://corp.kaltura.com/wp-content/cache/min/1/wp-content/themes/airfleet/dist/styles/theme.css" },
  { id: "US.GC-01", provider: "🇺🇸 Google Cloud", times: 1, url: "https://api.usercentrics.eu/gvl/v3/en.json" },
  { id: "US.FST-01", provider: "🇺🇸 Fastly", times: 1, url: "https://www.jetblue.com/footer/footer-element-es2015.js" },
  { id: "CA.FST-01", provider: "🇨🇦 Fastly", times: 1, url: "https://www.cnn10.com/" },
  { id: "US.AKM-01", provider: "🇺🇸 Akamai", times: 1, url: "https://www.roxio.com/static/roxio/images/products/creator/nxt9/call-action-footer-bg.jpg" },
  { id: "PL.AKM-01", provider: "🇵🇱 Akamai", times: 1, url: "https://media-assets.stryker.com/is/image/stryker/gateway_1?$max_width_1410$" },
  { id: "US.CDN77-01", provider: "🇺🇸 CDN77", times: 1, url: "https://cdn.eso.org/images/banner1920/eso2520a.jpg" },
  { id: "FR.CNTB-01", provider: "🇫🇷 Contabo", times: 1, url: "https://airsea.no/images/main_logo.png" },
  { id: "NL.SW-01", provider: "🇳🇱 Scaleway", times: 1, url: "https://www.velivole.fr/img/header.jpg" },
  { id: "US.CNST-01", provider: "🇺🇸 Constant", times: 1, url: "https://cdn.xuansiwei.com/common/lib/font-awesome/4.7.0/fontawesome-webfont.woff2?v=4.7.0" }
]'

function trim
{
	echo "$1" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
}

mkdir -p "$ZAP_TMP_DIR"

TARGET_LIST_FILE="$ZAP_TMP_DIR/targets"
: > "$TARGET_LIST_FILE"
IDX=0
while IFS= read -r line; do
	case "$line" in
		*id:*provider:*url:*)
			IDX=$((IDX + 1))
			TAG=$( printf '%s\n' "$line" | cut -d'"' -f2 )
			COUNTRY="${TAG%%.*}"
			PROVIDER_RAW=$( printf '%s\n' "$line" | cut -d'"' -f4 )
			PROVIDER="${PROVIDER_RAW#* }"
			TIMES=$( printf '%s\n' "$line" | cut -d':' -f4 | cut -d',' -f1 | tr -d ' ')
			URL=$( printf '%s\n' "$line" | cut -d'"' -f6 )
			echo "${IDX}|${TAG}|${COUNTRY}|${PROVIDER}|${TIMES}|${URL}" >> "$TARGET_LIST_FILE"
		;;
	esac
done <<EOF
$TEST_SUITE
EOF

CURL_CON_TIMEOUT=$((CURL_TIMEOUT-2))
CURL_SPEED_TIME=$((CURL_TIMEOUT-2))
CURL_SPEED_LIMIT=1

while IFS='|' read -r ID TAG COUNTRY PROVIDER TIMES URL; do
	[ -z "$TAG" ] && continue
	ID=$((ID+1))
	ID3=$( printf '%03d' "$ID" )
	COUNTRY=$( echo "$TAG" | cut -d. -f1 )
	CNTFLAG=$( echo "$PROVIDER" | awk '{print $1}' )
	URL_NO_PROTO="${URL#*://}"
	DOMAIN="${URL_NO_PROTO%%/*}"
	URLPATH="/${URL_NO_PROTO#*/}"
	[ "$URLPATH" = "/$URL_NO_PROTO" ] && URLPATH="/"
	#echo "TAG=$TAG , COUNTRY=$COUNTRY , PROVIDER=$PROVIDER , DOMAIN=$DOMAIN , URL=$URL"
	FNAME="$ZAP_TMP_DIR/$ID3=$TAG=$PROVIDER"
	(
		DST_IP=
		RESOLVE_OPT=
		if [ "$opt_dig" != "" ]; then
			DST_IP=$( dig +time=2 +retry=1 @$opt_dig +short "$DOMAIN" 2>/dev/null | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' | head -n1 )
		else
			CURL_TIMEOUTS="--connect-timeout 5 --max-time 6 --speed-time 5 --speed-limit 1"
			DST_IP=$( curl -4 -I -s $CURL_TIMEOUTS -o /dev/null -w '%{remote_ip}\n' "$URL" )
			if [ -z "$DST_IP" ]; then
				DST_IP=$( curl -4 -s $CURL_TIMEOUTS -o /dev/null -r 0-0 -w '%{remote_ip}\n' "$URL" )
			fi
		fi
		if [ "$DST_IP" = "" ]; then
			DST_IP=$( ping -c1 "$DOMAIN" 2>/dev/null | sed -n '1s/.*(\([0-9.]*\)).*/\1/p' )
		fi
		[ "$DST_IP" != "" ] && RESOLVE_OPT="--resolve $DOMAIN:443:$DST_IP"
		echo "$DST_IP" > "$FNAME.ip"
		echo "$URL" > "$FNAME.url"
		curl "$URL" \
			$RESOLVE_OPT \
			--connect-timeout $CURL_CON_TIMEOUT \
			--max-time $CURL_TIMEOUT \
			--speed-time $CURL_SPEED_TIME \
			--speed-limit $CURL_SPEED_LIMIT	\
			--range 0-$CURL_RANGETO \
			-A "$CURL_USERAGENT" \
			-D "$FNAME.hdr" \
			-o "$FNAME.body"
	) > "$FNAME.txt" 2>&1 &
done < "$TARGET_LIST_FILE"

wait

printf '%s\n' "$ZAP_TMP_DIR"/*.txt | sort | while IFS= read -r file; do
	[ -f "$file" ] || continue
	FNAME="${file##*/}"
	FNAME="${FNAME%.txt}" 
	ID=$( echo "$FNAME" | cut -d= -f1)
	TAG=$( echo "$FNAME" | cut -d= -f2)
	PROVIDER=$(echo "$FNAME" | cut -d= -f3 )
	FNAME="$ZAP_TMP_DIR/$FNAME"
	BODY_SIZE=0
	[ -f "$FNAME.body" ] && BODY_SIZE=$( wc -c < "$FNAME.body" )
	IPADDR="x.x.x.x"
	[ -s "$FNAME.ip" ] && IPADDR=$( cat "$FNAME.ip" )
	status=
	if [ ! -f "$FNAME.hdr" ]; then
		status="ERROR: cannot Get Headers"
	elif [ ! -s "$FNAME.hdr" ]; then
		status="ERROR: cannot get headers"
	elif [ ! -f "$FNAME.body" ]; then
		status="ERROR: cannot get body"
	elif [ ! -s "$FNAME.body" ]; then
		status="Possibly detected"
	else
		if [ "$BODY_SIZE" -le $CURL_RANGETO ]; then
			status="Failed to complete detection (recv $BODY_SIZE bytes)"
		else
			status="[ OK ]"
		fi
	fi
	printf '%12s / %-15s / %-13s: %s \n' "$TAG" "$IPADDR" "$PROVIDER" "$status"
	echo "$BODY_SIZE" > "$FNAME.size"
done

rm -f "$ZAP_TMP_DIR"/*.body >/dev/null 2>&1

return 0 
