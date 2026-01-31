#!/bin/sh
# Copyright (c) 2026 remittor

ZAP_TMP_DIR=/tmp/zapret_dwc

opt_sites=
opt_dig=
opt_recom=
opt_tmp_dir=
opt_test=

while getopts "sd:RT:t" opt; do
	case $opt in
		s) opt_sites="true";;
		d) opt_dig="$OPTARG";;
		R) opt_recom="true";;     # Recommendations
		T) opt_tmp_dir="$OPTARG";;
		t) opt_test="true";;
	esac
done 

[ "$opt_tmp_dir" != "" ] && ZAP_TMP_DIR="$opt_tmp_dir"

TARGET_LIST_FILE="$ZAP_TMP_DIR/targets"

[ -f "$TARGET_LIST_FILE" ] && rm -rf "$ZAP_TMP_DIR"
[ -f "$TARGET_LIST_FILE" ] && exit 3

CURL_TIMEOUT=5
CURL_MAXBODY=65536
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
	OPT_DIG_DNS="@$opt_dig"
	[ "$opt_dig" = "@"  ] && OPT_DIG_DNS=''
	[ "$opt_dig" = "8"  ] && OPT_DIG_DNS='@8.8.8.8'
	[ "$opt_dig" = "1"  ] && OPT_DIG_DNS='@1.1.1.1'
	[ "$opt_dig" = "9"  ] && OPT_DIG_DNS='@9.9.9.9'
fi

if [ -f /etc/openwrt_release ]; then
	CA_CERTS=/etc/ssl/certs/ca-certificates.crt
	if [ ! -f $CA_CERTS ]; then
		echo "ERROR: package \"ca-bundle\" not installed!"
		return 15
	fi
fi
 
#echo 'Original sources: https://github.com/hyperion-cs/dpi-checkers'
#echo 'WEB-version: https://hyperion-cs.github.io/dpi-checkers/ru/tcp-16-20/'

TEST_SUITE='
  { id: "US.CF-01", provider: "🇺🇸 Cloudflare", times: 1, url: "https://img.wzstats.gg/cleaver/gunFullDisplay" },
  { id: "US.CF-02", provider: "🇺🇸 Cloudflare", times: 1, url: "https://genshin.jmp.blue/characters/all#" },
  { id: "US.CF-03", provider: "🇺🇸 Cloudflare", times: 1, url: "https://api.frankfurter.dev/v1/2000-01-01..2002-12-31" },
  { id: "US.CF-04", provider: "🇨🇦 Cloudflare", times: 1, url: "https://www.bigcartel.com/" },
  { id: "US.DO-01", provider: "🇺🇸 DigitalOcean", times: 2, url: "https://genderize.io/" },
  { id: "DE.HE-01", provider: "🇩🇪 Hetzner", times: 1, url: "https://j.dejure.org/jcg/doctrine/doctrine_banner.webp" },
  { id: "DE.HE-02", provider: "🇩🇪 Hetzner", times: 1, url: "https://accesorioscelular.com/tienda/css/plugins.css" },
  { id: "FI.HE-01", provider: "🇫🇮 Hetzner", times: 1, url: "https://251b5cd9.nip.io/1MB.bin" },
  { id: "FI.HE-02", provider: "🇫🇮 Hetzner", times: 1, url: "https://nioges.com/libs/fontawesome/webfonts/fa-solid-900.woff2" },
  { id: "FI.HE-03", provider: "🇫🇮 Hetzner", times: 1, url: "https://5fd8bdae.nip.io/1MB.bin" },
  { id: "FI.HE-04", provider: "🇫🇮 Hetzner", times: 1, url: "https://5fd8bca5.nip.io/1MB.bin" },
  { id: "FR.OVH-01", provider: "🇫🇷 OVH", times: 1, url: "https://eu.api.ovh.com/console/rapidoc-min.js" },
  { id: "FR.OVH-02", provider: "🇫🇷 OVH", times: 1, url: "https://ovh.sfx.ovh/10M.bin" },
  { id: "SE.OR-01", provider: "🇸🇪 Oracle", times: 1, url: "https://oracle.sfx.ovh/10M.bin" },
  { id: "DE.AWS-01", provider: "🇩🇪 AWS", times: 1, url: "https://www.getscope.com/assets/fonts/fa-solid-900.woff2" },
  { id: "US.AWS-01", provider: "🇺🇸 AWS", times: 1, url: "https://corp.kaltura.com/wp-content/cache/min/1/wp-content/themes/airfleet/dist/styles/theme.css" },
  { id: "US.GC-01", provider: "🇺🇸 Google Cloud", times: 1, url: "https://api.usercentrics.eu/gvl/v3/en.json" },
  { id: "US.FST-01", provider: "🇺🇸 Fastly", times: 1, url: "https://www.jetblue.com/footer/footer-element-es2015.js" },
  { id: "CA.FST-01", provider: "🇨🇦 Fastly", times: 1, url: "https://ssl.p.jwpcdn.com/player/v/8.40.5/bidding.js" },
  { id: "US.AKM-01", provider: "🇺🇸 Akamai", times: 1, url: "https://www.roxio.com/static/roxio/images/products/creator/nxt9/call-action-footer-bg.jpg" },
  { id: "PL.AKM-01", provider: "🇵🇱 Akamai", times: 1, url: "https://media-assets.stryker.com/is/image/stryker/gateway_1?$max_width_1410$" },
  { id: "US.CDN77-01", provider: "🇺🇸 CDN77", times: 1, url: "https://cdn.eso.org/images/banner1920/eso2520a.jpg" },
  { id: "FR.CNTB-01", provider: "🇫🇷 Contabo", times: 1, url: "https://xdmarineshop.gr/index.php?route=index" },
  { id: "NL.SW-01", provider: "🇳🇱 Scaleway", times: 1, url: "https://www.velivole.fr/img/header.jpg" },
  { id: "US.CNST-01", provider: "🇺🇸 Constant", times: 1, url: "https://cdn.xuansiwei.com/common/lib/font-awesome/4.7.0/fontawesome-webfont.woff2?v=4.7.0" }
'

if [ "$opt_sites" = true ]; then
	TEST_SUITE='
	gosuslugi.ru          | @  |  40000 | https://gosuslugi.ru/__jsch/static/script.js
	esia.gosuslugi.ru     | @  |  40000 | https://esia.gosuslugi.ru/__jsch/static/script.js
	gu-st.ru              |    |        | https://gu-st.ru/portal-st/lib-assets/fonts/Lato-Regular-v3.woff2
	nalog.ru              |    |        | https://data.nalog.ru/images/new/buttons/TSET-button.png
	lkfl2.nalog.ru        |    |        | https://lkfl2.nalog.ru/lkfl/static/assets/main-desktop-1920-CvJsHANg.jpg
	rutube.ru             | @  |  40000 | https://static.rutube.ru/static/wdp/fonts/Semibold/OpenSans-Semibold.woff2?20231026
	youtube.com           | @# | 300000 | https://youtube.com
	instagram.com         | @# | 300000 | https://instagram.com
	rutracker.org         | @# |  80000 | https://rutracker.org
	nnmclub.to            | @# | 120000 | https://nnmclub.to
	rutor.info            | @# | 110000 | https://rutor.info
	epidemz.net.co        | @# |  40000 | https://epidemz.net.co
	filmix.my             | @  |  23000 | https://filmix.my/templates/Filmix/media/fonts/Roboto/roboto-v20-latin_cyrillic-italic.woff2
	openwrt.org           | +  |  60000 | https://openwrt.org/lib/tpl/bootstrap3/assets/bootstrap/default/bootstrap.min.css
	ntc.party             | @# | 200000 | https://ntc.party
	sxyprn.net            | @# | 310000 | https://sxyprn.net
	pornhub.com           | @# | 700000 | https://pornhub.com
	spankbang.com         | @# |  80000 | https://spankbang.com
	discord.com           | @# | 120000 | https://discord.com
	x.com                 | @  |  39000 | https://abs.twimg.com/fonts/v1/chirp-extended-heavy-web.woff2
	flightradar24.com     | @  | 100000 | https://www.flightradar24.com/mobile/airlines?format=2&version=0
	cdn77.com             | @  |  24000 | https://cdn77.com/fonts/Eina01-Regular.woff2
	play.google.com       | @# | 100000 | https://gstatic.com/feedback/js/help/prod/service/lazy.min.js
	genderize.io          | @# | 210000 | https://genderize.io
	ottai.com             | @  |  70000 | https://seas.static.ottai.com/ottai-website/public/images/new/home/banner/uk/banner.webp
	'
	CURL_TIMEOUT=7
fi

function trim
{
	echo "$1" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
}

mkdir -p "$ZAP_TMP_DIR"

: > "$TARGET_LIST_FILE"
IDX=0
while IFS= read -r line; do
	if [ "$opt_sites" = true ]; then
		echo -n "$line" | grep -q ' | http' || continue
		IDX=$((IDX + 1))
		TAG=$( printf '%s\n' "$line" | cut -d'|' -f1 | awk '{$1=$1;print}' )
		FLAGS=$( printf '%s\n' "$line" | cut -d'|' -f2 | awk '{$1=$1;print}' )
		TSIZE=$( printf '%s\n' "$line" | cut -d'|' -f3 | awk '{$1=$1;print}' )
		URL=$( printf '%s\n' "$line" | cut -d'|' -f4 | awk '{$1=$1;print}' )
		COUNTRY="XX"
		echo "${IDX}|${TAG}|${COUNTRY}|${FLAGS}|${TSIZE}|${URL}" >> "$TARGET_LIST_FILE"
		continue
	fi
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
	ID3=$( printf '%03d' "$ID" )
	RANGETO=""
	REDIRECT=""
	USERAGENT="$CURL_USERAGENT"
	if [ "$opt_sites" = true ]; then
		FLAGS="$PROVIDER"
		TSIZE="$TIMES"
		[ "$TSIZE" = "" ] && TSIZE=$CURL_MAXBODY
		if echo "$FLAGS" | grep -q '@'; then
			RANGETO=""
		else
			RANGETO="--range 0-$((TSIZE - 1))"
		fi
		PROVIDER="$TSIZE"
		if echo "$FLAGS" | grep -q '#'; then
			REDIRECT="-L"
		fi
		if echo "$FLAGS" | grep -q '+'; then
			USERAGENT="curl/8.12"
		fi
	else
		RANGETO="--range 0-$((CURL_MAXBODY - 1))"
		COUNTRY=$( echo "$TAG" | cut -d. -f1 )
		CNTFLAG=$( echo "$PROVIDER" | awk '{print $1}' )
	fi
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
			DST_IP=$( dig +time=2 +retry=1 $OPT_DIG_DNS +short "$DOMAIN" 2>/dev/null | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' | head -n1 )
		else
			CURL_TIMEOUTS="--connect-timeout 2 --max-time 3 --speed-time 3 --speed-limit 1"
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
			$REDIRECT \
			--connect-timeout $CURL_CON_TIMEOUT \
			--max-time $CURL_TIMEOUT \
			--speed-time $CURL_SPEED_TIME \
			--speed-limit $CURL_SPEED_LIMIT	\
			$RANGETO \
			-A "$USERAGENT" \
			-D "$FNAME.hdr" \
			-o "$FNAME.body"
	) > "$FNAME.log" 2>&1 &
done < "$TARGET_LIST_FILE"

wait

FAIL_URL_LIST="$ZAP_TMP_DIR/FAIL_URL_LIST.txt"
rm -f "$FAIL_URL_LIST"

printf '%s\n' "$ZAP_TMP_DIR"/*.log | sort | while IFS= read -r file; do
	[ -f "$file" ] || continue
	FILENAME="${file##*/}"
	FILENAME="${FILENAME%.log}"
	ID=$( echo "$FILENAME" | cut -d= -f1)
	TAG=$( echo "$FILENAME" | cut -d= -f2)
	PROVIDER=$(echo "$FILENAME" | cut -d= -f3 )
	FNAME="$ZAP_TMP_DIR/$FILENAME"
	REQ_SIZE=$CURL_MAXBODY
	[ "$opt_sites" = true ] && REQ_SIZE="$PROVIDER"
	BODY_SIZE=0
	[ -f "$FNAME.body" ] && BODY_SIZE=$( wc -c < "$FNAME.body" )
	IPADDR="x.x.x.x"
	[ -s "$FNAME.ip" ] && IPADDR=$( cat "$FNAME.ip" )
	res=0
	status=
	if [ ! -f "$FNAME.hdr" ]; then
		status="ERROR: cannot Get Headers"
	elif [ ! -s "$FNAME.hdr" ]; then
		status="ERROR: cannot get headers"
	elif [ ! -f "$FNAME.body" ]; then
		status="Possibly detected*"
	elif [ ! -s "$FNAME.body" ]; then
		status="Possibly detected"
	else
		if [ $BODY_SIZE -lt $REQ_SIZE ]; then
			status="Failed (recv $BODY_SIZE bytes)"
			res=5
		else
			status="[ OK ]"
			res=100
		fi
	fi
	if [ "$opt_sites" = true ]; then
		printf '%18s / %-15s : %s \n' "$TAG" "$IPADDR" "$status"
	else
		printf '%12s / %-15s / %-13s: %s \n' "$TAG" "$IPADDR" "$PROVIDER" "$status"
	fi
	echo "$BODY_SIZE" > "$FNAME.size"
	if [ $res != 100 ]; then
		URL=$( cat "$FNAME.url" )
		echo "$FILENAME : $URL" >> "$FAIL_URL_LIST"
	fi
done

if [ "$opt_test" != true ]; then
	rm -f "$ZAP_TMP_DIR"/*.body >/dev/null 2>&1
fi

[ "$opt_recom" != "true" ] && return 0

[ ! -f "$FAIL_URL_LIST" ] && return 0

echo "==================================================="
echo "Recommendations:"
echo "Try adding the specified domains to the \"zapret-hosts-user.txt\" file:"

while IFS=' : ' read -r FILENAME URL; do
	[ -z "$FILENAME" ] && continue
	URL_NO_PROTO="${URL#*://}"
	DOMAIN="${URL_NO_PROTO%%/*}"
	URLPATH="/${URL_NO_PROTO#*/}"
	[ "$URLPATH" = "/$URL_NO_PROTO" ] && URLPATH="/"
	echo "$DOMAIN"
done < "$FAIL_URL_LIST"

return 0 
