#
# Copyright (c) 2025 remittor
#

include $(TOPDIR)/rules.mk

PKG_NAME:=zapret2
PKG_VERSION:=0.7.20251225
PKG_RELEASE:=1

PKG_MAINTAINER:=bol-van
PKG_LICENSE:=MIT
PKG_LICENSE_FILES:=docs/LICENSE.txt

PKG_SOURCE_URL:=https://github.com/bol-van/zapret2.git
PKG_SOURCE_PROTO:=git
PKG_SOURCE_VERSION:=b0ce5c0c1bf1d3d75d5ca068d61650d1749bf2af
PKG_SOURCE_DATE:=2025-12-25

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
endef

#define Build/Configure
#endef

define Build/Compile
	$(MAKE) -C $(PKG_BUILD_DIR)/$(MAKE_PATH) $(TARGET_CONFIGURE_OPTS) LUA_CFLAGS="$(LUA_INCLUDE)" LUA_LIB="$(LUA_LIBRARY)"
endef

define Package/$(PKG_NAME)/conffiles
/etc/config/zapret2
/opt/zapret2/config
/opt/zapret2/ipset/
/opt/zapret2/init.d/openwrt/custom.d/
endef

define Package/$(PKG_NAME)/install
	$(INSTALL_DIR) $(1)/opt/zapret2
	$(INSTALL_DIR) $(1)/opt/zapret2/$(MAKE_PATH)
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/$(MAKE_PATH)/nfqws2 $(1)/opt/zapret2/$(MAKE_PATH)/	
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
	$(INSTALL_BIN) ./uci-def-cfg.sh     $(1)/opt/zapret2/uci-def-cfg.sh
	$(INSTALL_BIN) ./comfunc.sh         $(1)/opt/zapret2/comfunc.sh
	$(INSTALL_BIN) ./def-cfg.sh         $(1)/opt/zapret2/def-cfg.sh
	$(INSTALL_BIN) ./renew-cfg.sh       $(1)/opt/zapret2/renew-cfg.sh
	$(INSTALL_BIN) ./restore-def-cfg.sh $(1)/opt/zapret2/restore-def-cfg.sh
	$(INSTALL_BIN) ./sync_config.sh     $(1)/opt/zapret2/sync_config.sh
	$(INSTALL_BIN) ./script-exec.sh     $(1)/opt/zapret2/script-exec.sh
	$(INSTALL_BIN) ./update-pkg.sh      $(1)/opt/zapret2/update-pkg.sh
	# Fix permisions
	chmod 644 $(1)/opt/zapret2/ipset/*.txt
	chmod 644 $(1)/opt/zapret2/ipset_def/*.txt
	chmod 644 $(1)/opt/zapret2/init.d/openwrt/custom.d/*.sh
	chmod 644 $(1)/opt/zapret2/config.default
	chmod 755 $(1)/opt/zapret2/*.sh
endef

define Package/$(PKG_NAME)/preinst
#!/bin/sh
# check if we are on real system
if [ -z "$${IPKG_INSTROOT}" ]; then
	if [ -f "/etc/init.d/zapret2" ]; then
		SCRIPT=$$( readlink /etc/init.d/zapret2 )
		if [ -n "$${SCRIPT}" ]; then
			echo "Please uninstall original zapret2 utility!"
			exit 44
		fi
	fi
	if [ "$${PKG_UPGRADE}" = "1" ]; then
		# stop service if PKG_UPGRADE
		if [ -x "/etc/init.d/zapret2" ]; then
			/etc/init.d/zapret2 running && /etc/init.d/zapret2 stop >/dev/null 2>&1
		fi
	fi
fi
exit 0
endef

define Package/$(PKG_NAME)/postinst
#!/bin/sh
# check if we are on real system
if [ -z "$${IPKG_INSTROOT}" ]; then
	ZAPRET_CONFIG=/opt/zapret2/config
	ZAPRET_CONFIG_DEF="/opt/zapret2/config.default"
	# creating main config if its not exists
	if [ ! -f "$${ZAPRET_CONFIG}" ]; then
		cp -f "$${ZAPRET_CONFIG_DEF}" "$${ZAPRET_CONFIG}"
	fi
	# check existing uci-config
	[ -f "/etc/config/zapret2" ] && ZAPRET_CFG_EXISTS=1 || ZAPRET_CFG_EXISTS=0
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
	/etc/init.d/zapret2 enable
	# stop all
	/etc/init.d/zapret2 stop_fw
	/etc/init.d/zapret2 stop_daemons
	ps w | grep '/opt/zapret2/nfq2/nfqws2' | grep -v grep | awk '{print $$1}' | xargs -r kill -9
	# start main service
	/etc/init.d/zapret2 start
	# restart firewall
	[ -x /sbin/fw4 ] && fw4 -q restart || fw3 -q restart
fi
exit 0
endef

define Package/$(PKG_NAME)/prerm
#!/bin/sh
# check if we are on real system
if [ -z "$${IPKG_INSTROOT}" ]; then
	EXEDIR=/opt/zapret2
	ZAPRET_BASE=/opt/zapret2
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
	/etc/init.d/zapret2 running && /etc/init.d/zapret2 stop
	/etc/init.d/zapret2 disable
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
	[ -f "/etc/config/zapret2-opkg" ] && rm -f "/etc/config/zapret2-opkg"
	[ -f "/opt/zapret2/config" ] && cp -f /opt/zapret2/config "/opt/zapret2/config.backup"
	#rm -rf /opt/zapret2
	#echo "Directory /opt/zapret2 removed!"
fi
exit 0
endef

$(eval $(call BuildPackage,$(PKG_NAME)))
