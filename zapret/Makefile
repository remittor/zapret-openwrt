#
# Copyright (c) 2024 remittor
#

include $(TOPDIR)/rules.mk

PKG_NAME:=zapret
PKG_VERSION:=71.20250822

PKG_MAINTAINER:=bol-van
PKG_LICENSE:=MIT
PKG_LICENSE_FILES:=docs/LICENSE.txt

PKG_SOURCE_URL:=https://github.com/bol-van/zapret.git
PKG_SOURCE_PROTO:=git
PKG_SOURCE_VERSION:=7364bab8a78426c84b995e36cd08d542ef6f73a8
PKG_SOURCE_DATE:=2025-08-22

#PKG_SOURCE:=$(PKG_NAME)-$(PKG_VERSION).tar.gz
#PKG_SOURCE_URL:=https://github.com/bol-van/zapret/archive/refs/tags/v$(PKG_VERSION).tar.gz?
#PKG_HASH:=skip

include $(INCLUDE_DIR)/package.mk

#TAR_OPTIONS:=--strip-components 1 $(TAR_OPTIONS)
#TAR_CMD=$(HOST_TAR) -C $(1) $(TAR_OPTIONS)

MAKE_PATH:=nfq

define Package/$(PKG_NAME)
	SECTION:=net
	CATEGORY:=Network
	TITLE:=$(PKG_NAME)
	SUBMENU:=Zapret
	URL:=https://github.com/bol-van/zapret
	DEPENDS:= +nftables +curl +gzip
	DEPENDS+= +coreutils +coreutils-sort +coreutils-sleep
	DEPENDS+= +kmod-nft-nat +kmod-nft-offload +kmod-nft-queue
	DEPENDS+= +libnetfilter-queue +libcap +zlib
endef

define Build/Prepare
	$(Build/Prepare/Default)
	rm -f $(PKG_BUILD_DIR)/$(MAKE_PATH)/nfqws
endef

#define Build/Configure
#endef

#define Build/Compile
#endef

define Package/$(PKG_NAME)/conffiles
/etc/config/zapret
/opt/zapret/config
/opt/zapret/ipset/
endef

define Package/$(PKG_NAME)/install
	$(INSTALL_DIR) $(1)/opt/zapret
	$(INSTALL_DIR) $(1)/opt/zapret/$(MAKE_PATH)
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/$(MAKE_PATH)/nfqws $(1)/opt/zapret/$(MAKE_PATH)/	
	$(INSTALL_DIR) $(1)/opt/zapret/common
	$(CP) $(PKG_BUILD_DIR)/common/* $(1)/opt/zapret/common/
	#$(INSTALL_DIR) $(1)/opt/zapret/docs
	#$(CP) $(PKG_BUILD_DIR)/docs/* $(1)/opt/zapret/docs/
	$(INSTALL_DIR) $(1)/opt/zapret/files
	$(CP) $(PKG_BUILD_DIR)/files/* $(1)/opt/zapret/files/
	$(INSTALL_DIR) $(1)/opt/zapret/ipset
	$(CP) $(PKG_BUILD_DIR)/ipset/* $(1)/opt/zapret/ipset/
	$(INSTALL_BIN)  $(PKG_BUILD_DIR)/blockcheck.sh  $(1)/opt/zapret/blockcheck.sh
	#$(INSTALL_DATA) $(PKG_BUILD_DIR)/config.default $(1)/opt/zapret/config.default
	$(INSTALL_DIR) $(1)/opt/zapret/tmp
	$(INSTALL_DIR) $(1)/opt/zapret/init.d/openwrt
	$(CP) $(PKG_BUILD_DIR)/init.d/openwrt/* $(1)/opt/zapret/init.d/openwrt/
	$(INSTALL_DIR) $(1)/etc/hotplug.d/iface
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/init.d/openwrt/90-zapret $(1)/etc/hotplug.d/iface/90-zapret
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./init.d.sh $(1)/etc/init.d/zapret
	$(INSTALL_DATA) ./config.default $(1)/opt/zapret/config.default
	$(INSTALL_DATA) ./ipset/zapret-hosts-google.txt       $(1)/opt/zapret/ipset/zapret-hosts-google.txt
	$(INSTALL_DATA) ./ipset/zapret-hosts-user-exclude.txt $(1)/opt/zapret/ipset/zapret-hosts-user-exclude.txt
	$(INSTALL_DATA) ./ipset/zapret-ip-exclude.txt         $(1)/opt/zapret/ipset/zapret-ip-exclude.txt
	$(INSTALL_DIR) $(1)/etc/uci-defaults
	$(INSTALL_BIN) ./uci-def-cfg.sh     $(1)/etc/uci-defaults/zapret-uci-def-cfg.sh
	$(INSTALL_BIN) ./uci-def-cfg.sh     $(1)/opt/zapret/uci-def-cfg.sh
	$(INSTALL_BIN) ./comfunc.sh         $(1)/opt/zapret/comfunc.sh
	$(INSTALL_BIN) ./def-cfg.sh         $(1)/opt/zapret/def-cfg.sh
	$(INSTALL_BIN) ./renew-cfg.sh       $(1)/opt/zapret/renew-cfg.sh
	$(INSTALL_BIN) ./restore-def-cfg.sh $(1)/opt/zapret/restore-def-cfg.sh
	$(INSTALL_BIN) ./sync_config.sh     $(1)/opt/zapret/sync_config.sh
	# Fix permisions
	chmod 644 $(1)/opt/zapret/ipset/*.txt
	chmod 644 $(1)/opt/zapret/config.default
	chmod 755 $(1)/opt/zapret/*.sh
endef

define Package/$(PKG_NAME)/preinst
#!/bin/sh
# check if we are on real system
if [ -z "$${IPKG_INSTROOT}" ]; then
	if [ -f "/etc/init.d/zapret" ]; then
		SCRIPT=$$( readlink /etc/init.d/zapret )
		if [ -n "$${SCRIPT}" ]; then
			echo "Please uninstall original zapret utility!"
			exit 44
		fi
	fi
	if [ "$${PKG_UPGRADE}" = "1" ]; then
		# stop service if PKG_UPGRADE
		if [ -x "/etc/init.d/zapret" ]; then
			/etc/init.d/zapret running && /etc/init.d/zapret stop >/dev/null 2>&1
		fi
	fi
	if [ ! -f "/opt/zapret/ipset/zapret-hosts-google.txt" ]; then
		if [ -f "/opt/zapret/ipset/zapret-hosts-user.txt" ]; then
			CFGLISTHASH=$$( md5sum "/opt/zapret/ipset/zapret-hosts-user.txt" | awk '{print $$1;}' )
			if [ "$${CFGLISTHASH}" = "79e35df62b0d1ae455d0a7e04c4cecac" ]; then
				rm -f "/opt/zapret/ipset/zapret-hosts-user.txt"
			fi
		fi
	fi
fi
exit 0
endef

define Package/$(PKG_NAME)/postinst
#!/bin/sh
# check if we are on real system
if [ -z "$${IPKG_INSTROOT}" ]; then
	ZAPRET_CONFIG=/opt/zapret/config
	ZAPRET_CONFIG_DEF="/opt/zapret/config.default"
	# creating main config if its not exists
	if [ ! -f "$${ZAPRET_CONFIG}" ]; then
		cp -f "$${ZAPRET_CONFIG_DEF}" "$${ZAPRET_CONFIG}"
	fi
	# check obsolete format for main config
	if grep -qE "^NFQWS_OPT_DESYNC=|^MODE_HTTP=|^MODE_HTTPS=|^MODE_QUIC=|^MODE=" "$${ZAPRET_CONFIG}" ; then
		echo "Detect obsolute format for main config!"
		ZAPRET_CONFIG_BACKUP="$${ZAPRET_CONFIG}.backup"
		cp -f "$${ZAPRET_CONFIG}" "$${ZAPRET_CONFIG_BACKUP}"
		echo "Current file $${ZAPRET_CONFIG} backuped to $${ZAPRET_CONFIG_BACKUP}"
		cp -f "$${ZAPRET_CONFIG_DEF}" "$${ZAPRET_CONFIG}"
	fi
	# check existing uci-config
	[ -f "/etc/config/zapret" ] && ZAPRET_CFG_EXISTS=1 || ZAPRET_CFG_EXISTS=0
	# create or merge uci-config
	/opt/zapret/uci-def-cfg.sh
	[ "$${ZAPRET_CFG_EXISTS}" = "1" ] && echo "Config /etc/config/zapret merged with default uci-config"
	# remove uci-default script from system dir (used into /etc/init.d/boot)
	rm -f /etc/uci-defaults/zapret-uci-def-cfg.sh
	# copy (sync) all params from uci-config to main config
	/opt/zapret/sync_config.sh
	# check main config
	sh -n "$${ZAPRET_CONFIG}" 2>/dev/null || cp -f "$${ZAPRET_CONFIG_DEF}" "$${ZAPRET_CONFIG}"
	sh -n "$${ZAPRET_CONFIG}" 2>/dev/null || exit 58
	# enable main service
	/etc/init.d/zapret enable
	# stop all
	/etc/init.d/zapret stop_fw
	/etc/init.d/zapret stop_daemons
	ps w | grep '/opt/zapret/nfq/nfqws' | grep -v grep | awk '{print $$1}' | xargs -r kill -9
	# start main service
	/etc/init.d/zapret start
	# restart firewall
	[ -x /sbin/fw4 ] && fw4 -q restart || fw3 -q restart
fi
exit 0
endef

define Package/$(PKG_NAME)/prerm
#!/bin/sh
# check if we are on real system
if [ -z "$${IPKG_INSTROOT}" ]; then
	EXEDIR=/opt/zapret
	ZAPRET_BASE=/opt/zapret
	ZAPRET_CONFIG=/opt/zapret/config
	ZAPRET_CONFIG_DEF="/opt/zapret/config.default"
	OPENWRT_FW_INCLUDE=/etc/firewall.zapret
	# check main config
	sh -n "$${ZAPRET_CONFIG}" 2>/dev/null || cp -f "$${ZAPRET_CONFIG_DEF}" "$${ZAPRET_CONFIG}"
	if ! sh -n "$${ZAPRET_CONFIG}" 2>/dev/null ; then
		ps w | grep '/opt/zapret/nfq/nfqws' | grep -v grep | awk '{print $$1}' | xargs -r kill -9
		exit 0
	fi
	. "$${ZAPRET_CONFIG}"
	. "$${ZAPRET_BASE}/common/base.sh"
	. "$${ZAPRET_BASE}/common/fwtype.sh"
	. "$${ZAPRET_BASE}/common/nft.sh"
	. "$${ZAPRET_BASE}/common/installer.sh"
	/etc/init.d/zapret running && /etc/init.d/zapret stop
	/etc/init.d/zapret disable
	ps w | grep '/opt/zapret/nfq/nfqws' | grep -v grep | awk '{print $$1}' | xargs -r kill -9
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
	[ -f "/etc/config/zapret-opkg" ] && rm -f "/etc/config/zapret-opkg"
	[ -f "/opt/zapret/config" ] && cp -f /opt/zapret/config "/opt/zapret/config.backup"
	#rm -rf /opt/zapret
	#echo "Directory /opt/zapret removed!"
fi
exit 0
endef

$(eval $(call BuildPackage,$(PKG_NAME)))
