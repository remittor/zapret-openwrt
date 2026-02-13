#!/bin/sh
# Copyright (c) 2026 remittor

ZAP_TMP_DIR=/tmp/zapret2_dwc

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

CURL_TIMEOUT=7
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

mkdir -p "$ZAP_TMP_DIR"

#echo 'Original sources: https://github.com/hyperion-cs/dpi-checkers'
#echo 'WEB-version: https://hyperion-cs.github.io/dpi-checkers/ru/tcp-16-20/'

TEST_SUITE_URL="https://hyperion-cs.github.io/dpi-checkers/ru/tcp-16-20/suite.json"
TEST_SUITE_FN="$ZAP_TMP_DIR/${TEST_SUITE_URL##*/}"
TEST_SUITE_HDR="$TEST_SUITE_FN.hdr"
rm -f "$TEST_SUITE_FN"
rm -f "$TEST_SUITE_HDR"

#echo "Download $TEST_SUITE_URL ..."
curl -s -L -D "$TEST_SUITE_HDR" -o "$TEST_SUITE_FN" --max-time 15 "$TEST_SUITE_URL" 2>/dev/null
if [ ! -f "$TEST_SUITE_HDR" ] || [ -z "$TEST_SUITE_HDR" ] ; then
	echo "ERROR: Cannot download file \"$TEST_SUITE_URL\" (connection problem)"
	return 17
fi
RESP_STATUS=$( cat "$TEST_SUITE_HDR" | head -n 1 | awk '{print $2}' )
if [ "$RESP_STATUS" != 200 ]; then
	echo "ERROR: Cannot download file \"$TEST_SUITE_URL\" (status = $RESP_STATUS)"
	return 18
fi
if [ ! -f "$TEST_SUITE_FN" ] || [ -z "$TEST_SUITE_FN" ] ; then
	echo "ERROR: Cannot download file \"$TEST_SUITE_URL\" (resp body empty)"
	return 19
fi
if [ "$(head -c 2 "$TEST_SUITE_FN" 2>/dev/null)" != "$(printf '[\n')" ]; then
	echo "ERROR: incorrect format of \"$TEST_SUITE_URL\""
	return 19
fi
if [ "$(tail -c 2 "$TEST_SUITE_FN" 2>/dev/null)" != "$(printf ']\n')" ]; then
	echo "ERROR: incorrect format of \"$TEST_SUITE_URL\""
	return 19
fi

TEST_SUITE='
	gosuslugi.ru          | @  |  40000 | https://gosuslugi.ru/__jsch/static/script.js
	esia.gosuslugi.ru     | @  |  40000 | https://esia.gosuslugi.ru/__jsch/static/script.js
	gu-st.ru              |    |        | https://gu-st.ru/portal-st/lib-assets/fonts/Lato-Regular-v3.woff2
	nalog.ru              |    |        | https://data.nalog.ru/images/new/buttons/TSET-button.png
	lkfl2.nalog.ru        |    |        | https://lkfl2.nalog.ru/lkfl/static/assets/main-desktop-1920-CvJsHANg.jpg
	rutube.ru             | @  |  40000 | https://static.rutube.ru/static/wdp/fonts/Semibold/OpenSans-Semibold.woff2?20231026
	youtube.com           | @# | 300000 | https://youtube.com
	googlevideo.com       |    | 210000 | https://redirector.googlevideo.com/report_mapping
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

if [ "$opt_sites" = true ]; then
	CURL_TIMEOUT=7
else
	CURL_TIMEOUT=7
	TEST_SUITE=$( cat "$TEST_SUITE_FN" )
fi

function trim
{
	echo "$1" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
}

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
		*id*provider*thresholdBytes*url*)
			IDX=$((IDX + 1))
			TAG=$( printf '%s\n' "$line" | cut -d'"' -f4 )
			COUNTRY="${TAG%%.*}"
			PROVIDER=$( printf '%s\n' "$line" | cut -d'"' -f8 )
			BYTES=$( printf '%s\n' "$line" | cut -d'"' -f15 | cut -d':' -f2 | cut -d',' -f1 | tr -d ' ')
			URL=$( printf '%s\n' "$line" | cut -d'"' -f20 )
			echo "${IDX}|${TAG}|${COUNTRY}|${PROVIDER}|${BYTES}|${URL}" >> "$TARGET_LIST_FILE"
		;;
	esac
done <<EOF
$TEST_SUITE
EOF

CURL_CON_TIMEOUT=$((CURL_TIMEOUT-2))
CURL_SPEED_TIME=$((CURL_TIMEOUT-2))
CURL_SPEED_LIMIT=1

while IFS='|' read -r ID TAG COUNTRY PROVIDER TSIZE URL; do
	[ -z "$TAG" ] && continue
	ID3=$( printf '%03d' "$ID" )
	RANGETO=""
	REDIRECT=""
	USERAGENT="$CURL_USERAGENT"
	if [ "$opt_sites" = true ]; then
		FLAGS="$PROVIDER"
		[ "$TSIZE" = "" ] && TSIZE=$CURL_MAXBODY
		if echo "$FLAGS" | grep -q '@'; then
			RANGETO=""
		else
			RANGETO="--range 0-$((TSIZE - 1))"
		fi
		PROVIDER="@"
		if echo "$FLAGS" | grep -q '#'; then
			REDIRECT="-L"
		fi
		if echo "$FLAGS" | grep -q '+'; then
			USERAGENT="curl/8.12"
		fi
	else
		RANGETO="--range 0-$((TSIZE - 1))"
		COUNTRY=$( echo "$TAG" | cut -d. -f1 )
	fi
	URL_NO_PROTO="${URL#*://}"
	DOMAIN="${URL_NO_PROTO%%/*}"
	URLPATH="/${URL_NO_PROTO#*/}"
	[ "$URLPATH" = "/$URL_NO_PROTO" ] && URLPATH="/"
	#echo "TAG=$TAG , COUNTRY=$COUNTRY , PROVIDER=$PROVIDER , DOMAIN=$DOMAIN , URL=$URL"
	FNAME="$ZAP_TMP_DIR/$ID3=$TAG=$PROVIDER=$TSIZE"
	(
		echo ">>>>> Request destination IP-addr"
		DST_IP=
		RESOLVE_OPT=
		if [ "$opt_dig" != "" ]; then
			RESP=$( dig +time=2 +retry=1 $OPT_DIG_DNS +short "$DOMAIN" 2>&1 )
			echo "$RESP"
			DST_IP=$( echo "$RESP" | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' | head -n1 )
		else
			CURL_TIMEOUTS="--connect-timeout 3 --max-time 4 --speed-time 4 --speed-limit 1"
			RESP=$( curl -4 -I --no-progress-meter $CURL_TIMEOUTS -w '%{remote_ip}\n' "$URL" 2>&1 )
			echo "$RESP"
			DST_IP=$( echo "$RESP" | grep -E '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' | tail -1 )
			if [ -z "$DST_IP" ]; then
				echo "----------------------------------"
				RESP=$( curl -4 --no-progress-meter $CURL_TIMEOUTS -r 0-0 -w '%{remote_ip}\n' "$URL" 2>&1 )
				echo "$RESP"
				DST_IP=$( echo "$RESP" | grep -E '[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' | tail -1 )
			fi
		fi
		if [ "$DST_IP" = "" ]; then
			echo ">>>>> PING"
			RESP=$( ping -c1 "$DOMAIN" 2>&1 )
			echo "$RESP"
			DST_IP=$( echo "$RESP" | sed -n '1s/.*(\([0-9.]*\)).*/\1/p' )
		fi
		echo ">>>>> Destination IP-addr:"
		echo "$DST_IP"
		[ "$DST_IP" != "" ] && RESOLVE_OPT="--resolve $DOMAIN:443:$DST_IP"
		echo "$DST_IP" > "$FNAME.ip"
		echo "$URL" > "$FNAME.url"
		echo ">>>>> Download target body"
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
	TSIZE=$(echo "$FILENAME" | cut -d= -f4 )
	FNAME="$ZAP_TMP_DIR/$FILENAME"
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
		if [ $BODY_SIZE -lt $TSIZE ]; then
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
