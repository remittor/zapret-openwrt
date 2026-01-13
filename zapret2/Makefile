#
# Copyright (c) 2025 remittor
#

include $(TOPDIR)/rules.mk

PKG_NAME:=zapret2
PKG_VERSION:=0.8.20260111
PKG_RELEASE:=1

PKG_MAINTAINER:=bol-van
PKG_LICENSE:=MIT
PKG_LICENSE_FILES:=docs/LICENSE.txt

PKG_SOURCE_URL:=https://github.com/bol-van/zapret2.git
PKG_SOURCE_PROTO:=git
PKG_SOURCE_VERSION:=3aad1f9ed9ada87877da683ebec08dfa98807948
PKG_SOURCE_DATE:=2026-01-11

#PKG_SOURCE:=$(PKG_NAME)-$(PKG_VERSION).tar.gz
#PKG_SOURCE_URL:=https://github.com/bol-van/zapret2/archive/refs/tags/v$(PKG_VERSION).tar.gz?
#PKG_HASH:=skip

LUA_JIT?=1

ifeq ($(LUA_JIT),1)
	LUAJIT_VER?=2.1
	LUA_VER?=5.1
	LUA_DEPEND:=luajit
	LUA_INCLUDE:=-I$(STAGING_DIR)/usr/include/luajit-$(LUAJIT_VER)
	LUA_LIBRARY:=-L$(STAGING_DIR)/usr/lib -lluajit-$(LUA_VER)
else
	LUA_VER?=5.3
	LUA_DEPEND:=lua$(LUA_VER)
	LUA_INCLUDE:=-I$(STAGING_DIR)/usr/include/lua$(LUA_VER)
	LUA_LIBRARY:=-L$(STAGING_DIR)/usr/lib -llua$(LUA_VER)
endif

include $(INCLUDE_DIR)/package.mk

#TAR_OPTIONS:=--strip-components 1 $(TAR_OPTIONS)
#TAR_CMD=$(HOST_TAR) -C $(1) $(TAR_OPTIONS)

MAKE_PATH:=nfq2

define Package/$(PKG_NAME)
	SECTION:=net
	CATEGORY:=Network
	TITLE:=$(PKG_NAME)
	SUBMENU:=Zapret2
	URL:=https://github.com/bol-van/zapret2
	DEPENDS:= +nftables +curl +gzip +$(LUA_DEPEND)
	DEPENDS+= +coreutils +coreutils-sort +coreutils-sleep
	DEPENDS+= +kmod-nft-nat +kmod-nft-offload +kmod-nft-queue
	DEPENDS+= +libnetfilter-queue +libcap +zlib
endef

define Build/Prepare
	$(Build/Prepare/Default)
	rm -f $(PKG_BUILD_DIR)/$(MAKE_PATH)/nfqws2
	rm -f $(PKG_BUILD_DIR)/ip2net/ip2net
	rm -f $(PKG_BUILD_DIR)/mdig/mdig
endef

#define Build/Configure
#endef

define Build/Compile
	$(MAKE) -C $(PKG_BUILD_DIR)/$(MAKE_PATH) $(TARGET_CONFIGURE_OPTS) LUA_JIT=$(LUA_JIT) LUA_CFLAGS="$(LUA_INCLUDE)" LUA_LIB="$(LUA_LIBRARY)"
	$(MAKE) -C $(PKG_BUILD_DIR)/ip2net $(TARGET_CONFIGURE_OPTS)
	$(MAKE) -C $(PKG_BUILD_DIR)/mdig $(TARGET_CONFIGURE_OPTS)
endef

define Package/$(PKG_NAME)/conffiles
/opt/zapret2/config
/opt/zapret2/ipset/zapret-hosts-google.txt
/opt/zapret2/ipset/zapret-hosts-user.txt
/opt/zapret2/ipset/zapret-hosts-user-exclude.txt
/opt/zapret2/ipset/zapret-ip-exclude.txt
/opt/zapret2/ipset/zapret-hosts-auto.txt
/opt/zapret2/init.d/openwrt/custom.d/10-script.sh
/opt/zapret2/init.d/openwrt/custom.d/20-script.sh
/opt/zapret2/init.d/openwrt/custom.d/50-script.sh
/opt/zapret2/init.d/openwrt/custom.d/60-script.sh
/opt/zapret2/init.d/openwrt/custom.d/90-script.sh
endef

define Package/$(PKG_NAME)/install
	$(INSTALL_DIR) $(1)/opt/zapret2
	$(INSTALL_DIR) $(1)/opt/zapret2/$(MAKE_PATH)
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/$(MAKE_PATH)/nfqws2 $(1)/opt/zapret2/$(MAKE_PATH)/
	$(INSTALL_DIR) $(1)/opt/zapret2/ip2net
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/ip2net/ip2net $(1)/opt/zapret2/ip2net/
	$(INSTALL_DIR) $(1)/opt/zapret2/mdig
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/mdig/mdig $(1)/opt/zapret2/mdig/
	$(INSTALL_DIR) $(1)/opt/zapret2/common
	$(CP) $(PKG_BUILD_DIR)/common/* $(1)/opt/zapret2/common/
	$(INSTALL_DIR) $(1)/opt/zapret2/lua
	$(CP) $(PKG_BUILD_DIR)/lua/* $(1)/opt/zapret2/lua/
	#$(INSTALL_DIR) $(1)/opt/zapret2/docs
	#$(CP) $(PKG_BUILD_DIR)/docs/* $(1)/opt/zapret2/docs/
	$(INSTALL_DIR) $(1)/opt/zapret2/files
	$(CP) $(PKG_BUILD_DIR)/files/* $(1)/opt/zapret2/files/
	$(CP)                ./files/* $(1)/opt/zapret2/files/
	$(INSTALL_DIR) $(1)/opt/zapret2/ipset
	$(CP) $(PKG_BUILD_DIR)/ipset/* $(1)/opt/zapret2/ipset/
	$(INSTALL_DIR) $(1)/opt/zapret2/blockcheck2.d
	$(CP) $(PKG_BUILD_DIR)/blockcheck2.d/* $(1)/opt/zapret2/blockcheck2.d/
	$(INSTALL_BIN)  $(PKG_BUILD_DIR)/blockcheck2.sh  $(1)/opt/zapret2/blockcheck2.sh
	#$(INSTALL_DATA) $(PKG_BUILD_DIR)/config.default $(1)/opt/zapret2/config.default
	$(INSTALL_DIR) $(1)/opt/zapret2/tmp
	$(INSTALL_DIR) $(1)/opt/zapret2/init.d/openwrt
	$(CP) $(PKG_BUILD_DIR)/init.d/openwrt/* $(1)/opt/zapret2/init.d/openwrt/
	$(INSTALL_DIR) $(1)/etc/hotplug.d/iface
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/init.d/openwrt/90-zapret2 $(1)/etc/hotplug.d/iface/90-zapret2
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./init.d.sh $(1)/etc/init.d/zapret2
	$(INSTALL_DATA) ./config.default $(1)/opt/zapret2/config.default
	$(INSTALL_DATA) ./config.default $(1)/opt/zapret2/config
	$(INSTALL_DATA) ./ipset/zapret-hosts-google.txt       $(1)/opt/zapret2/ipset/zapret-hosts-google.txt
	$(INSTALL_DATA) ./ipset/zapret-hosts-user.txt         $(1)/opt/zapret2/ipset/zapret-hosts-user.txt
	$(INSTALL_DATA) ./ipset/zapret-hosts-user-exclude.txt $(1)/opt/zapret2/ipset/zapret-hosts-user-exclude.txt
	$(INSTALL_DATA) ./ipset/zapret-ip-exclude.txt         $(1)/opt/zapret2/ipset/zapret-ip-exclude.txt
	$(INSTALL_DIR) $(1)/opt/zapret2/ipset_def
	$(INSTALL_DATA) ./ipset/zapret-hosts-google.txt       $(1)/opt/zapret2/ipset_def/zapret-hosts-google.txt
	$(INSTALL_DATA) ./ipset/zapret-hosts-user.txt         $(1)/opt/zapret2/ipset_def/zapret-hosts-user.txt
	$(INSTALL_DATA) ./ipset/zapret-hosts-user-exclude.txt $(1)/opt/zapret2/ipset_def/zapret-hosts-user-exclude.txt
	$(INSTALL_DATA) ./ipset/zapret-ip-exclude.txt         $(1)/opt/zapret2/ipset_def/zapret-ip-exclude.txt
	$(INSTALL_DIR) $(1)/opt/zapret2/init.d
	$(INSTALL_DIR) $(1)/opt/zapret2/init.d/openwrt
	$(INSTALL_DIR) $(1)/opt/zapret2/init.d/openwrt/custom.d
	$(CP) ./custom.d/* $(1)/opt/zapret2/init.d/openwrt/custom.d/
	$(INSTALL_DIR) $(1)/etc/uci-defaults
	$(INSTALL_BIN) ./uci-def-cfg.sh     $(1)/etc/uci-defaults/zapret2-uci-def-cfg.sh
	# install all sh-scripts
	$(CP) ./*.sh $(1)/opt/zapret2/
	rm -f $(1)/opt/zapret2/init.d.sh
	# Create empty conf files
	$(INSTALL_DATA) /dev/null $(1)/opt/zapret2/ipset/zapret-hosts-auto.txt
	$(INSTALL_DATA) /dev/null $(1)/opt/zapret2/ipset/cust1.txt
	$(INSTALL_DATA) /dev/null $(1)/opt/zapret2/ipset/cust2.txt
	$(INSTALL_DATA) /dev/null $(1)/opt/zapret2/ipset/cust3.txt
	$(INSTALL_DATA) /dev/null $(1)/opt/zapret2/ipset/cust4.txt
	$(INSTALL_DATA) /dev/null $(1)/opt/zapret2/init.d/openwrt/custom.d/10-script.sh
	$(INSTALL_DATA) /dev/null $(1)/opt/zapret2/init.d/openwrt/custom.d/20-script.sh
	$(INSTALL_DATA) /dev/null $(1)/opt/zapret2/init.d/openwrt/custom.d/60-script.sh
	$(INSTALL_DATA) /dev/null $(1)/opt/zapret2/init.d/openwrt/custom.d/90-script.sh
	# Fix permissions
	chmod 644 $(1)/opt/zapret2/ipset/*.txt
	chmod 644 $(1)/opt/zapret2/ipset_def/*.txt
	chmod 644 $(1)/opt/zapret2/init.d/openwrt/custom.d/*.sh
	chmod 644 $(1)/opt/zapret2/config*
	chmod 755 $(1)/opt/zapret2/*.sh
	chmod 755 $(1)/opt/zapret2/$(MAKE_PATH)/*
	chmod 755 $(1)/opt/zapret2/ip2net/*
	chmod 755 $(1)/opt/zapret2/mdig/*
endef

define Package/$(PKG_NAME)/preinst
#!/bin/sh
# check if we are on real system
if [ -z "$${IPKG_INSTROOT}" ]; then
	ZAPRET_DIR=/opt/zapret2
	ZAPRET_INITD=/etc/init.d/zapret2
	ZAPRET_CFG=/etc/config/zapret2
	if [ -f "$${ZAPRET_INITD}" ]; then
		SCRIPT=$$( readlink "$${ZAPRET_INITD}" )
		if [ -n "$${SCRIPT}" ]; then
			echo "Please uninstall incompatible \"zapret2\" service!"
			exit 44
		fi
	fi
	if command -v apk >/dev/null; then
		PKG_MGR="apk"
		PKG_CHECK="apk info -e "
		PKG_REMOVE="apk del --force "
	else
		PKG_MGR="opkg"
		PKG_CHECK="opkg status "
		PKG_REMOVE="opkg remove --force-remove "
	fi
	if [ "$${PKG_UPGRADE}" = "1" ]; then
		# stop service if PKG_UPGRADE
		if [ -x "$${ZAPRET_INITD}" ]; then
			$${ZAPRET_INITD} running && $${ZAPRET_INITD} stop >/dev/null 2>&1
		fi
	fi
	if $${PKG_CHECK} zapret2 >/dev/null 2>&1; then
		if [ ! -f "/opt/zapret2/sync_config.sh" ]; then
			echo "Please uninstall incompatible \"zapret2\" package!"
			exit 47
		fi
		if [ -f "$${ZAPRET_CFG}" ] && ! grep -q "run_on_boot" "$${ZAPRET_CFG}"; then
			echo "Please uninstall incompatible \"zapret2\" package!"
			exit 48
		fi
	fi
	if $${PKG_CHECK} luci-app-zapret2 >/dev/null 2>&1; then
		SVC_FILE=/www/luci-static/resources/view/zapret2/service.js
		if [ ! -f "$${SVC_FILE}" ] || ! grep -Fq "/remittor/zapret-openwrt" "$${SVC_FILE}"; then
			echo "Please uninstall incompatible \"luci-app-zapret2\" package!"
			exit 55
		fi
	fi
	if [ -f "$${ZAPRET_CFG}" ] && ! grep -q "run_on_boot" "$${ZAPRET_CFG}"; then
		if [ -x "$${ZAPRET_INITD}" ]; then
			$${ZAPRET_INITD} running && $${ZAPRET_INITD} stop >/dev/null 2>&1
		fi
		rm -f $${ZAPRET_CFG}
		rm -f $${ZAPRET_INITD}
		[ -d "$${ZAPRET_DIR}" ] && rm -rf $${ZAPRET_DIR}
		echo "All files of the previously installed package have been removed!"
	fi
	if $${PKG_CHECK} zapret2-mdig >/dev/null 2>&1; then
		$${PKG_REMOVE} zapret2-mdig
	fi
	if $${PKG_CHECK} zapret2-ip2net >/dev/null 2>&1; then
		$${PKG_REMOVE} zapret2-ip2net
	fi
	if [ ! -d "$${ZAPRET_DIR}" ]; then
		mkdir -p $${ZAPRET_DIR}
	fi
fi
exit 0
endef

define Package/$(PKG_NAME)/postinst
#!/bin/sh
# check if we are on real system
if [ -z "$${IPKG_INSTROOT}" ]; then
	ZAPRET_DIR=/opt/zapret2
	ZAPRET_INITD=/etc/init.d/zapret2
	ZAPRET_CFG=/etc/config/zapret2
	ZAPRET_CONFIG=/opt/zapret2/config
	ZAPRET_CONFIG_DEF="/opt/zapret2/config.default"
	# Fix permissions
	chmod 644 $${ZAPRET_CFG} >/dev/null 2>&1
	chmod 644 $${ZAPRET_DIR}/ipset/*.txt >/dev/null 2>&1
	chmod 644 $${ZAPRET_DIR}/ipset_def/*.txt >/dev/null 2>&1
	chmod 644 $${ZAPRET_DIR}/init.d/openwrt/custom.d/*.sh >/dev/null 2>&1
	chmod 644 $${ZAPRET_DIR}/config* >/dev/null 2>&1
	# creating main config if its not exists
	if [ ! -f "$${ZAPRET_CONFIG}" ]; then
		cp -f "$${ZAPRET_CONFIG_DEF}" "$${ZAPRET_CONFIG}"
	fi
	# remove fake uci-config
	[ -f "$${ZAPRET_CFG}" ] && [ ! -s "$${ZAPRET_CFG}" ] && rm -f "$${ZAPRET_CFG}"
	# check existing uci-config
	[ -f "$${ZAPRET_CFG}" ] && ZAPRET_CFG_EXISTS=1 || ZAPRET_CFG_EXISTS=0
	# create or merge uci-config
	/opt/zapret2/uci-def-cfg.sh
	[ "$${ZAPRET_CFG_EXISTS}" = "1" ] && echo "Config /etc/config/zapret2 merged with default uci-config"
	# remove uci-default script from system dir (used into /etc/init.d/boot)
	rm -f /etc/uci-defaults/zapret2-uci-def-cfg.sh
	# copy (sync) all params from uci-config to main config
	/opt/zapret2/sync_config.sh
	# check main config
	sh -n "$${ZAPRET_CONFIG}" 2>/dev/null || cp -f "$${ZAPRET_CONFIG_DEF}" "$${ZAPRET_CONFIG}"
	sh -n "$${ZAPRET_CONFIG}" 2>/dev/null || exit 58
	# enable main service
	$${ZAPRET_INITD} enable
	# stop all
	$${ZAPRET_INITD} stop_fw >/dev/null 2>&1
	$${ZAPRET_INITD} stop_daemons >/dev/null 2>&1
	ps w | grep '/opt/zapret2/nfq2/nfqws2' | grep -v grep | awk '{print $$1}' | xargs -r kill -9
	# start main service
	$${ZAPRET_INITD} start
	# restart firewall
	[ -x /sbin/fw4 ] && fw4 -q restart || fw3 -q restart
fi
exit 0
endef

define Package/$(PKG_NAME)/prerm
#!/bin/sh
# check if we are on real system
if [ -z "$${IPKG_INSTROOT}" ]; then
	ZAPRET_DIR=/opt/zapret2
	ZAPRET_BASE=/opt/zapret2
	ZAPRET_INITD=/etc/init.d/zapret2
	ZAPRET_CFG=/etc/config/zapret2
	ZAPRET_CONFIG=/opt/zapret2/config
	ZAPRET_CONFIG_DEF="/opt/zapret2/config.default"
	OPENWRT_FW_INCLUDE=/etc/firewall.zapret2
	# check main config
	sh -n "$${ZAPRET_CONFIG}" 2>/dev/null || cp -f "$${ZAPRET_CONFIG_DEF}" "$${ZAPRET_CONFIG}"
	if ! sh -n "$${ZAPRET_CONFIG}" 2>/dev/null ; then
		ps w | grep '/opt/zapret2/nfq2/nfqws2' | grep -v grep | awk '{print $$1}' | xargs -r kill -9
		exit 0
	fi
	. "$${ZAPRET_CONFIG}"
	. "$${ZAPRET_BASE}/common/base.sh"
	. "$${ZAPRET_BASE}/common/fwtype.sh"
	. "$${ZAPRET_BASE}/common/nft.sh"
	. "$${ZAPRET_BASE}/common/installer.sh"
	$${ZAPRET_INITD} running && $${ZAPRET_INITD} stop >/dev/null 2>&1
	$${ZAPRET_INITD} disable >/dev/null 2>&1
	ps w | grep '/opt/zapret2/nfq2/nfqws2' | grep -v grep | awk '{print $$1}' | xargs -r kill -9
	remove_openwrt_firewall
	nft_del_table
	restart_openwrt_firewall
fi
exit 0
endef

define Package/$(PKG_NAME)/postrm
#!/bin/sh
# check if we are on real system
if [ -z "$${IPKG_INSTROOT}" ]; then
	rm -f /etc/config/zapret2-opkg*
	rm -f /etc/config/zapret2.opkg*
	rm -f /etc/config/zapret2.apk*
	[ -f "/opt/zapret2/config" ] && cp -f /opt/zapret2/config "/opt/zapret2/config.backup"
	#rm -rf /opt/zapret2
	#echo "Directory /opt/zapret2 removed!"
fi
exit 0
endef

$(eval $(call BuildPackage,$(PKG_NAME)))
