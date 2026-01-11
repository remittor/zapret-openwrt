#!/bin/sh
# Copyright (c) 2026 remittor

. /opt/zapret2/comfunc.sh

ZAP_TMP_DIR=/tmp/zapret_dwc

rm -rf $ZAP_TMP_DIR

CURL_TIMEOUT=5
CURL_RANGETO=65535

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
  { id: "US.FST-01", provider: "🇺🇸 Fastly", times: 1, url: "https://www.jetblue.com/main.c7b61d59416f714f.js" },
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

mkdir -p $ZAP_TMP_DIR

ID=0
while IFS='|' read -r TAG PROVIDER TIMES URL; do
	[ -z "$TAG" ] && continue
	ID=$((ID+1))
	ID3=$(printf '%03d' "$ID")
	COUNTRY="$(echo "$TAG" | cut -d. -f1)"
	CNTFLAG="$(echo "$PROVIDER" | awk '{print $1}')"
	PROVIDER="$(echo "$PROVIDER" | cut -d' ' -f2-)"
	URL_NO_PROTO="${URL#*://}"
	DOMAIN="${URL_NO_PROTO%%/*}"
	URLPATH="/${URL_NO_PROTO#*/}"
	[ "$URLPATH" = "/$URL_NO_PROTO" ] && URLPATH="/"
	#echo "TAG=$TAG , COUNTRY=$COUNTRY , PROVIDER=$PROVIDER , TIMES=$TIMES , URL=$URL"
	(
		DST_IP=$( curl -4 -s -o /dev/null -w '%{remote_ip}\n' $DOMAIN )
		if [ -z "$DST_IP" ]; then
			DST_IP="$( ping -c1 "$DOMAIN" 2>/dev/null | sed -n '1s/.*(\([0-9.]*\)).*/\1/p')"
		fi
		curl -k $URL --resolve $DOMAIN:443:$DST_IP -o /dev/null -s -w '%{size_download}\n' --max-time $CURL_TIMEOUT --range 0-$CURL_RANGETO
	) >"$ZAP_TMP_DIR/$ID3.$TAG.txt" 2>&1 &
done <<EOF
$(printf '%s\n' "$TEST_SUITE" | sed -n '
s/.*id:[[:space:]]*"\([^"]*\)".*provider:[[:space:]]*"\([^"]*\)".*times:[[:space:]]*\([0-9]\+\).*url:[[:space:]]*"\([^"]*\)".*/\1|\2|\3|\4/p
')
EOF

wait

for file in $(ls "$ZAP_TMP_DIR"/*.txt | sort); do
	[ -f "$file" ] || continue
	tag="${file##*/}"
	tag="${tag%.txt}"
	tag="${tag#*.}"
	res=$( cat "$file" )
	res=$( trim "$res" )
	status=
	case "$res" in
		''|*[!0-9]*)
			status="Error (incorrect value)"
			;;
	esac
	if [ -z "$status" ]; then
		if [ "$res" = 0 ]; then
			status="Possibly detected"
		elif [ "$res" -lt $CURL_RANGETO ]; then
			status="Failed to complete detection"
		else
			status="[ OK ]"
		fi
	fi
	printf '%12s: %s \n' "$tag" "$status"
done

return 0 
