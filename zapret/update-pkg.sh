#!/bin/sh
# Copyright (c) 2025 remittor

. /opt/zapret/comfunc.sh
. /usr/share/libubox/jshn.sh
. /etc/openwrt_release

opt_check=
opt_prerelease=
opt_update=
opt_forced=
opt_test=

while getopts "cu:pft" opt; do
	case $opt in
		c) opt_check=true;;
		p) opt_prerelease=true;;
		u) opt_update="$OPTARG";;
		f) opt_forced=true;;
		t) opt_test=true;;
	esac
done

ZAP_PKG_DIR=/tmp/zapret_pkg

if [ "$opt_test" = "true" ]; then
	echo 1; sleep 2;
	echo 2; sleep 2;
	echo 3; sleep 2;
	echo ' * resolve_conffiles 123456'; sleep 1;
	echo 4; sleep 2; 
	echo END
	return 0;
fi

ZAP_CPU_ARCH=$(get_cpu_arch)
ZAP_REL_URL="https://raw.githubusercontent.com/remittor/zapret-openwrt/gh-pages/releases/releases_zap1_$ZAP_CPU_ARCH.json"

CURL_TIMEOUT=5
CURL_HEADER1="Accept: application/json"
CURL_HEADER2="Cache-Control: no-cache"

REL_JSON=
REL_ACTUAL_TAG=
REL_ACTUAL_PRE=
REL_ACTUAL_URL=

ZAP_OUT=
ZAP_ERR=
ZAP_PKG_URL=

if command -v apk >/dev/null; then
	PKG_MGR=apk
	ZAP_PKG_EXT=apk
elif command -v opkg >/dev/null; then
	PKG_MGR=opkg
	ZAP_PKG_EXT=ipk
else
	echo "ERROR: No package manager found"
	return 1
fi

# -------------------------------------------------------------------------------------------------------

function download_json
{
	local url="$1"
	curl -s -L --max-time $CURL_TIMEOUT -H "$CURL_HEADER1" -H "$CURL_HEADER2" "$url" 2>/dev/null
	return $?
}

function get_pkg_version
{
	local pkg_name="$1"
	local ver line pkg_prefix
	if [ "$PKG_MGR" = opkg ]; then
		ver=$( opkg list-installed "$pkg_name" 2>/dev/null | awk -F' - ' '{print $2}' | tr -d '\r' )
		if [ -n "$ver" ]; then
			echo -n "$ver"
			return 0
		fi
	fi
	if [ "$PKG_MGR" = apk ]; then
		line=$( apk info -e "$pkg_name" 2>/dev/null || true )
		if [ -n "$line" ]; then
			pkg_prefix="${pkg_name}-"
			case "$line" in
				"$pkg_prefix"*)
					ver=${line#"$pkg_prefix"}
					;;
				*)
					ver=${line##*-}
					;;
			esac
			echo -n "$ver"
			return 0
		fi
	fi
	echo ""
	return 1
}

function normalize_version
{
	local ver="$1"
	local base
	local major minor rel
	case "$ver" in
		*-r*)
			rel="${ver##*-r}"
			base="${ver%-r*}"
			;;
		*)
			rel=1
			base="$ver"
			;;
	esac
	major="${base%%.*}"
	minor="${base#*.}"
	[ -z "$minor" ] && minor=0
	[ -z "$rel" ] && rel=1
	echo "$major.$minor.$rel"
}

function pkg_version_cmp
{
	local ver1=$( normalize_version "$1" )
	local ver2=$( normalize_version "$2" )
	local x1 x2
	# major
	x1=$( echo "$ver1" | cut -d. -f1 )
	x2=$( echo "$ver2" | cut -d. -f1 )
	[ "$x1" -gt "$x2" ] && { echo -n "G"; return 0; }
	[ "$x1" -lt "$x2" ] && { echo -n "L"; return 0; }
	# minor
	x1=$( echo "$ver1" | cut -d. -f2 )
	x2=$( echo "$ver2" | cut -d. -f2 )
	[ "$x1" -gt "$x2" ] && { echo -n "G"; return 0; }
	[ "$x1" -lt "$x2" ] && { echo -n "L"; return 0; }
	# release
	x1=$( echo "$ver1" | cut -d. -f3 )
	x2=$( echo "$ver2" | cut -d. -f3 )
	[ "$x1" -gt "$x2" ] && { echo -n "G"; return 0; }
	[ "$x1" -lt "$x2" ] && { echo -n "L"; return 0; }
	echo -n "E"
}

function download_releases_info
{
	local txt txtlen txtlines generated_at
	REL_JSON=
	echo "Download releases info..."
	txt=$(download_json $ZAP_REL_URL)
	txtlen=${#txt}
	txtlines=$(printf '%s\n' "$txt" | wc -l)
	if [[ $txtlen -lt 64 ]]; then
		echo "ERROR: Cannot download releases info!"
		return 104
	fi
	echo "Releases info downloaded! Size = $txtlen, Lines = $txtlines"
	generated_at=$(printf '%s\n' "$txt" | grep -m1 -o '"generated_at"[[:space:]]*:[[:space:]]*".*"' | cut -d'"' -f4)
	if [[ "$generated_at" = "" ]]; then
		echo "ERROR: Cannot download releases info! (incorrect generated_at)"
		return 105
	fi
	echo "Releases info generated_at = $generated_at"
	REL_JSON="$txt"
	return 0
}

function get_actual_release
{
	local tag url pre idx_list
	REL_ACTUAL_TAG=
	REL_ACTUAL_PRE=
	REL_ACTUAL_URL=
	json_load "$(printf '%s' "$REL_JSON")"
	if [ $? -ne 0 ]; then
		echo "ERROR: incorrect format of ${ZAP_REL_URL##*/}"
		json_cleanup
		return 151
	fi
	json_select releases
	if [ $? -ne 0 ]; then
		echo "ERROR: incorrect format of ${ZAP_REL_URL##*/}"
		json_cleanup
		return 157
	fi
	json_get_keys idx_list
	# array already sorted by created_at => take first elem
	for rel_id in $idx_list; do
		json_select "$rel_id"   # enter into releases[rel_id]
		json_get_var tag tag
		json_get_var pre prerelease
		#echo "rel_id = $rel_id    opt_prerelease = $opt_prerelease   pre = $pre"
		if [ "$opt_prerelease" != "true" ] && [ "$pre" = "1" ]; then
			json_select ..   # exit from releases[rel_id]
			continue
		fi
		json_select assets
		if [ $? -ne 0 ]; then
			echo "ERROR: release[$rel_id] has not include 'assets'"
			json_cleanup
			return 160
		fi
		json_select 0 > /dev/null
		if [ $? -ne 0 ]; then
			json_select 1 > /dev/null
			if [ $? -ne 0 ]; then
				echo "ERROR: release[$rel_id] include incorrect 'assets'"
				json_cleanup
				return 162
			fi
		fi
		json_get_var url browser_download_url
		json_select .. .. ..  # assets-elem -> assets -> releases[rel_id] -> releases
		json_cleanup
		REL_ACTUAL_TAG="$tag"
		REL_ACTUAL_PRE="$pre"
		REL_ACTUAL_URL="$url"
		return 0
	done
	json_cleanup
	echo "ERROR: latest release for arch \"$ZAP_CPU_ARCH\" not founded!"
	return 1  # release not founded
}

# -------------------------------------------------------------------------------------------------------

if [ "$opt_check" != "true" -a "$opt_update" = "" ]; then
	echo 'ERROR: Incorrect arguments'
	return 4
fi

if [ "$opt_update" = "@" ]; then
	opt_check="true"
fi

#echo "DISTRIB_ID: $DISTRIB_ID"
echo "DISTRIB_RELEASE: $DISTRIB_RELEASE"
echo "DISTRIB_DESCRIPTION:" $(get_distrib_param DISTRIB_DESCRIPTION)
echo "DISTRIB_ARCH:" $(get_distrib_param DISTRIB_ARCH)

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

if [ "$opt_check" = "true" ]; then
	download_releases_info
	ZAP_ERR=$?
	if [ $ZAP_ERR -ne 0 ]; then
		echo "ERROR: Func download_releases_info return error code: $ZAP_ERR"
		return $ZAP_ERR
	fi
	get_actual_release
	ZAP_ERR=$?
	if [ $ZAP_ERR -ne 0 ]; then
		echo "ERROR: Func get_actual_release return error code: $ZAP_ERR"
		return $ZAP_ERR
	fi
	echo "Latest package version: $REL_ACTUAL_TAG"
	echo "Latest package url: $REL_ACTUAL_URL"
fi

ZAP_PKG_SIZE=
ZAP_PKG_SZ=
ZAP_PKG_ZIP_NAME=
ZAP_PKG_FN=
ZAP_PKG_BASE_FN=
ZAP_PKG_LUCI_FN=

ZAP_CUR_PKG_VER=$( get_pkg_version zapret )
echo "Current installed version: $ZAP_CUR_PKG_VER"

if [ "$opt_update" = "" ]; then
	ZAP_PKG_URL="$REL_ACTUAL_URL"
	if [ "$ZAP_PKG_URL" = "" ]; then
		echo "ERROR: actual release not founded!"
		return 199
	fi
else
	ZAP_PKG_URL="$opt_update"
	if [ "$opt_update" = "@" ]; then
		ZAP_PKG_URL="$REL_ACTUAL_URL"
	fi
	if [ "$opt_update" = "@" -a "$ZAP_PKG_URL" = "" ]; then
		echo "ERROR: actual release not founded!"
		return 199
	fi
fi

ZAP_PKG_ZIP_NAME=${ZAP_PKG_URL##*/}
ZAP_PKG_ZIP_VER=${ZAP_PKG_ZIP_NAME#*_v}
ZAP_PKG_ZIP_VER=${ZAP_PKG_ZIP_VER%%_*}

if [ "$opt_update" != "" ]; then
	if [ "$opt_update" = "@" ]; then
		echo "Latest  available version: $ZAP_PKG_ZIP_VER"
	else
		echo "Target  requested version: $ZAP_PKG_ZIP_VER"
	fi
fi
echo "ZAP_PKG_URL = $ZAP_PKG_URL"

ZAP_VER_CMP=$( pkg_version_cmp "$ZAP_CUR_PKG_VER" "$ZAP_PKG_ZIP_VER" )
if [ "$opt_update" = "" ]; then
	if [ "$ZAP_VER_CMP" = "E" ]; then
		echo "RESULT: (E) No update required for this package!"
	elif [ "$ZAP_VER_CMP" = "G" ]; then
		echo "RESULT: (G) You have a newer version installed than the one on GitHub!"
	elif [ "$ZAP_VER_CMP" = "L" ]; then
		echo "RESULT: (L) You have an older version installed than the one on GitHub!"
	else
		echo "ERROR: ZAP_PKG_ZIP_VER='$ZAP_PKG_ZIP_VER' ZAP_VER_CMP='$ZAP_VER_CMP'"
		return 199
	fi
	return 0
fi

if [ "$opt_update" != "" ]; then
	if [ "$opt_forced" != "true" ]; then
		if [ "$ZAP_VER_CMP" = "E" ]; then
			echo "RESULT: (E) No update required for this package!"
			return 0
		fi
	fi
	ZAP_PKG_DIR=/tmp/zapret_pkg
	rm -rf $ZAP_PKG_DIR
	ZAP_PKG_HDRS=$( curl -s -I -L --max-time $CURL_TIMEOUT -H "$CURL_HEADER2" "$ZAP_PKG_URL" )
	ZAP_PKG_SIZE=$( echo "$ZAP_PKG_HDRS" | grep -i 'content-length: ' | tail -n1 | awk '{print $2}' | tr -d '\r' )
	echo "Downloded ZIP-file size = $ZAP_PKG_SIZE bytes"
	[ "$ZAP_PKG_SIZE" = "" ] || [[ $ZAP_PKG_SIZE -lt 256 ]] && {
		echo "ERROR: incorrect package size!"
		return 210
	}
	mkdir $ZAP_PKG_DIR
	ZAP_PKG_FN="$ZAP_PKG_DIR/${ZAP_PKG_URL##*/}"
	echo "Download ZIP-file..."
	curl -s -L --max-time 15 -H "$CURL_HEADER2" "$ZAP_PKG_URL" -o "$ZAP_PKG_FN"
	if [ $? -ne 0 ]; then
		echo "ERROR: cannot download package!"
		return 215
	fi
	ZAP_PKG_SZ=$( wc -c < "$ZAP_PKG_FN" )
	if [ "$ZAP_PKG_SZ" != "$ZAP_PKG_SIZE" ]; then
		echo "ERROR: downloaded package is incorrect! (size = $ZAP_PKG_SZ)"
		return 216
	fi
	unzip -q "$ZAP_PKG_FN" -d $ZAP_PKG_DIR
	rm -f "$ZAP_PKG_FN"
	if [ "$PKG_MGR" = "apk" ]; then
		if [ ! -d "$ZAP_PKG_DIR/apk" ]; then
			echo "ERROR: APK-files not founded"
			return 221
		fi
		rm -f "$ZAP_PKG_DIR/*.ipk"
		mv "$ZAP_PKG_DIR/apk/*" "$ZAP_PKG_DIR/"
	else
		rm -rf "$ZAP_PKG_DIR/apk"
	fi
	ZAP_PKG_LIST=$( ls -1 "$ZAP_PKG_DIR" )
	echo "------ Downloaded packages:"
	echo "$ZAP_PKG_LIST"
	echo "------"
	ZAP_PKG_BASE_FN=$( find "$ZAP_PKG_DIR" -maxdepth 1 -type f -name "zapret_*.${ZAP_PKG_EXT}" | head -n 1 )
	ZAP_PKG_LUCI_FN=$( find "$ZAP_PKG_DIR" -maxdepth 1 -type f -name "luci-app-*.${ZAP_PKG_EXT}" | head -n 1 )
	if [ ! -f "$ZAP_PKG_BASE_FN" ]; then
		echo "ERROR: File \"zapret_*.${ZAP_PKG_EXT}\" not found!"
		return 231
	fi
	echo "ZAP_PKG_BASE_FN = $ZAP_PKG_BASE_FN"
	if [ ! -f "$ZAP_PKG_LUCI_FN" ]; then
		echo "ERROR: File \"luci-app-*.${ZAP_PKG_EXT}\" not found!"
		return 232
	fi
	echo "ZAP_PKG_LUCI_FN = $ZAP_PKG_LUCI_FN"
	echo "Install downloaded packages..."
	if [ "$PKG_MGR" != "apk" ]; then
		opkg install --force-reinstall "$ZAP_PKG_BASE_FN"
	else
		apk add --allow-untrusted --upgrade "$ZAP_PKG_BASE_FN"
	fi
	if [ $? -ne 0 ]; then
		echo "ERROR: Failed to install package $ZAP_PKG_BASE_FN"
		return 245
	fi
	if [ "$PKG_MGR" != "apk" ]; then
		opkg install --force-reinstall "$ZAP_PKG_LUCI_FN"
	else
		apk add --allow-untrusted --upgrade "$ZAP_PKG_LUCI_FN"
	fi
	if [ $? -ne 0 ]; then
		echo "ERROR: Failed to install package $ZAP_PKG_LUCI_FN"
		return 247
	fi
	echo "RESULT: (+) Packages from $ZAP_PKG_ZIP_NAME successfully installed!"
fi
