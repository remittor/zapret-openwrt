#
# Copyright (c) 2024 remittor
#

include $(TOPDIR)/rules.mk

PKG_NAME:=zapret
PKG_VERSION:=65
PKG_RELEASE:=20241016

PKG_MAINTAINER:=bol-van
PKG_LICENSE:=MIT
PKG_LICENSE_FILES:=docs/LICENSE.txt

PKG_SOURCE_URL:=https://github.com/bol-van/zapret.git
PKG_SOURCE_PROTO:=git
PKG_SOURCE_VERSION:=fc0b8266e3e02c62af699b18c032800b0032866f
PKG_SOURCE_DATE:=2024-10-16

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
	$(INSTALL_CONF) $(PKG_BUILD_DIR)/config.default $(1)/opt/zapret/config.default
	$(INSTALL_DIR) $(1)/opt/zapret/tmp
	$(INSTALL_DIR) $(1)/opt/zapret/init.d/openwrt
	$(CP) $(PKG_BUILD_DIR)/init.d/openwrt/* $(1)/opt/zapret/init.d/openwrt/
	$(INSTALL_DIR) $(1)/etc/hotplug.d/iface
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/init.d/openwrt/90-zapret $(1)/etc/hotplug.d/iface/90-zapret
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/init.d/openwrt/zapret $(1)/etc/init.d/zapret
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) ./zapret.config $(1)/etc/config/zapret
	$(INSTALL_CONF) ./config        $(1)/opt/zapret/config
	#$(INSTALL_CONF) ./ipset/zapret-hosts-auto.txt         $(1)/opt/zapret/ipset/zapret-hosts-auto.txt
	$(INSTALL_CONF) ./ipset/zapret-hosts-user.txt         $(1)/opt/zapret/ipset/zapret-hosts-user.txt
	$(INSTALL_CONF) ./ipset/zapret-hosts-user-exclude.txt $(1)/opt/zapret/ipset/zapret-hosts-user-exclude.txt
	$(INSTALL_CONF) ./ipset/zapret-hosts-user-ipban.txt   $(1)/opt/zapret/ipset/zapret-hosts-user-ipban.txt
	#$(INSTALL_CONF) ./ipset/zapret-ip.txt                 $(1)/opt/zapret/ipset/zapret-ip.txt
	$(INSTALL_CONF) ./ipset/zapret-ip-exclude.txt         $(1)/opt/zapret/ipset/zapret-ip-exclude.txt
	$(INSTALL_CONF) ./ipset/zapret-ip-user.txt            $(1)/opt/zapret/ipset/zapret-ip-user.txt
	$(INSTALL_CONF) ./ipset/zapret-ip-user-exclude.txt    $(1)/opt/zapret/ipset/zapret-ip-user-exclude.txt
	$(INSTALL_CONF) ./ipset/zapret-ip-user-ipban.txt      $(1)/opt/zapret/ipset/zapret-ip-user-ipban.txt
	$(INSTALL_CONF) ./ipset/cust1.txt      $(1)/opt/zapret/ipset/cust1.txt
	$(INSTALL_CONF) ./ipset/cust2.txt      $(1)/opt/zapret/ipset/cust2.txt
	$(INSTALL_CONF) ./ipset/cust3.txt      $(1)/opt/zapret/ipset/cust3.txt
	$(INSTALL_CONF) ./ipset/cust4.txt      $(1)/opt/zapret/ipset/cust4.txt
	$(INSTALL_BIN) ./sync_config.sh $(1)/opt/zapret/sync_config.sh
endef

define Package/$(PKG_NAME)/preinst
#!/bin/sh
# check if we are on real system
if [ -z "$${IPKG_INSTROOT}" ]; then
	if [ "$${PKG_UPGRADE}" = "1" ]; then
		# stop service if PKG_UPGRADE
		[ -x "/etc/init.d/zapret" ] && /etc/init.d/zapret stop >/dev/null 2>&1
	fi
fi	
exit 0
endef

define Package/$(PKG_NAME)/postinst
#!/bin/sh
# check if we are on real system
if [ -z "$${IPKG_INSTROOT}" ]; then
	NEWCFGNAME=zapret-opkg
	NEWCFGFILE=/etc/config/$${NEWCFGNAME}
	if [ -f "$${NEWCFGFILE}" ]; then
		uci -m -f /etc/config/zapret import "$${NEWCFGNAME}"
		uci commit "$${NEWCFGNAME}"
		uci -m -f "$${NEWCFGFILE}" import zapret
		uci commit zapret
		rm -f "$${NEWCFGFILE}"
		echo "File /etc/config/zapret merged from IPK"
	fi
	NEWCONFIG=/opt/zapret/config-opkg
	if [ -f "$${NEWCONFIG}" ]; then
		# backup current main config
		mv -f /opt/zapret/config /opt/zapret/config.backup
		# renew main config
		mv -f "$${NEWCONFIG}" /opt/zapret/config
		echo "File /opt/zapret/config replaced from IPK"
	fi
	# synchnonize main config
	/opt/zapret/sync_config.sh
	# enable main service
	/etc/init.d/zapret enable
	# stop all
	/etc/init.d/zapret stop_fw
	/etc/init.d/zapret stop_daemons
	ps w | grep '/opt/zapret/nfq/nfqws' | grep -v grep | awk '{print $1}' | xargs -r kill -9
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
	OPENWRT_FW_INCLUDE=/etc/firewall.zapret
	. "$${ZAPRET_CONFIG}"
	. "$${ZAPRET_BASE}/common/base.sh"
	. "$${ZAPRET_BASE}/common/fwtype.sh"
	. "$${ZAPRET_BASE}/common/nft.sh"
	. "$${ZAPRET_BASE}/common/installer.sh"
	/etc/init.d/zapret disable
	/etc/init.d/zapret stop
	ps w | grep '/opt/zapret/nfq/nfqws' | grep -v grep | awk '{print $1}' | xargs -r kill -9
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
	[ -f "/opt/zapret/config" ] && cp -f /opt/zapret/config "/opt/zapret/config.backup2"
	#rm -rf /opt/zapret
	#echo "Directory /opt/zapret removed!"
fi
exit 0
endef

$(eval $(call BuildPackage,$(PKG_NAME)))
