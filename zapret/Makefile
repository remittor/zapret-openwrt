#
# Copyright (c) 2024 remittor
#

include $(TOPDIR)/rules.mk

PKG_NAME:=zapret
PKG_VERSION:=1.63
PKG_RELEASE:=20241008

PKG_MAINTAINER:=bol-van
PKG_LICENSE:=MIT
PKG_LICENSE_FILES:=opt/zapret/docs/LICENSE.txt

PKG_SOURCE_URL:=https://github.com/bol-van/zapret.git
PKG_SOURCE_PROTO:=git
PKG_SOURCE_VERSION:=2cd6db3ba5ac2fa1494bed1c1903bc3531c76bc5
PKG_SOURCE_DATE:=2024-10-08

#PKG_SOURCE:=zapret-master.tar.gz
#PKG_HASH:=skip

#PKG_BUILD_DEPENDS:=secilc/host policycoreutils/host

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
	DEPENDS:= +nftables +curl +gzip +coreutils +coreutils-sort +coreutils-sleep
	DEPENDS+= +kmod-nft-nat +kmod-nft-offload +kmod-nft-queue
	DEPENDS+= +libnetfilter-queue +libcap +zlib
	#DEPENDS+= +zapret-nfqws
	#DEPENDS+= +zapret-ip2set
	#DEPENDS+= +zapret-mdig
	#DEPENDS+= +zapret-tpws
endef

define Build/Prepare
	$(Build/Prepare/Default)
	rm -f $(PKG_BUILD_DIR)/$(MAKE_PATH)/nfqws
endef

define Package/$(PKG_NAME)/conffiles
/etc/config/zapret
/opt/zapret/config
/opt/zapret/ipset/zapret-hosts-user.txt
/opt/zapret/ipset/zapret-hosts-user-exclude.txt
/opt/zapret/ipset/zapret-hosts-user-ipban.txt
/opt/zapret/ipset/zapret-ip-user.txt
/opt/zapret/ipset/zapret-ip-user-exclude.txt
/opt/zapret/ipset/zapret-ip-user-ipban.txt
endef

#define Build/Configure
#endef

#define Build/Compile
#endef

define Package/$(PKG_NAME)/install
	$(INSTALL_DIR) $(1)/opt/zapret
	$(INSTALL_DIR) $(1)/opt/zapret/$(MAKE_PATH)
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/$(MAKE_PATH)/nfqws $(1)/opt/zapret/$(MAKE_PATH)/	
	$(INSTALL_DIR) $(1)/opt/zapret/common
	$(CP) $(PKG_BUILD_DIR)/common/* $(1)/opt/zapret/common/
	$(INSTALL_DIR) $(1)/opt/zapret/docs
	$(CP) $(PKG_BUILD_DIR)/docs/* $(1)/opt/zapret/docs/
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
	$(INSTALL_BIN) ./sync_config.sh $(1)/opt/zapret/sync_config.sh
endef

define Package/$(PKG_NAME)/postinst
#!/bin/sh
# check if we are on real system
if [ -z "$${IPKG_INSTROOT}" ]; then
	/etc/init.d/zapret enable
	/etc/init.d/zapret stop_fw
	/etc/init.d/zapret stop_daemons
	/etc/init.d/zapret start
	[ -x /sbin/fw4 ] && fw4 -q restart || fw3 -q restart
fi
exit 0
endef

define Package/$(PKG_NAME)/prerm
#!/bin/sh
# check if we are on real system
if [ -n "$${IPKG_INSTROOT}" ]; then
	EXEDIR=/opt/zapret
	ZAPRET_BASE=/opt/zapret
	ZAPRET_CONFIG=/opt/zapret/config
	OPENWRT_FW_INCLUDE=/etc/firewall.zapret
	. "$ZAPRET_CONFIG"
	. "$ZAPRET_BASE/common/base.sh"
	. "$ZAPRET_BASE/common/fwtype.sh"
	. "$ZAPRET_BASE/common/installer.sh"
	/etc/init.d/zapret disable
	/etc/init.d/zapret stop
	remove_openwrt_firewall
	nft_del_table
	restart_openwrt_firewall
fi
exit 0
endef

$(eval $(call BuildPackage,$(PKG_NAME)))
