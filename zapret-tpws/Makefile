include $(TOPDIR)/rules.mk

PKG_NAME:=zapret-tpws
PKG_VERSION:=65
PKG_RELEASE:=20241018

PKG_MAINTAINER:=bol-van
PKG_LICENSE:=MIT
PKG_LICENSE_FILES:=docs/LICENSE.txt

PKG_SOURCE_URL:=https://github.com/bol-van/zapret.git
PKG_SOURCE_PROTO:=git
PKG_SOURCE_VERSION:=d97e7920cc79ff93a46a0ad30d8803a8e635157c
PKG_SOURCE_DATE:=2024-10-18

#PKG_SOURCE:=$(PKG_NAME)-$(PKG_VERSION).tar.gz
#PKG_SOURCE_URL:=https://github.com/bol-van/zapret/archive/refs/tags/v$(PKG_VERSION).tar.gz?
#PKG_HASH:=skip

include $(INCLUDE_DIR)/package.mk

#TAR_OPTIONS:=--strip-components 1 $(TAR_OPTIONS)
#TAR_CMD=$(HOST_TAR) -C $(1) $(TAR_OPTIONS)

MAKE_PATH:=tpws

define Package/$(PKG_NAME)
	SECTION:=net
	CATEGORY:=Network
	TITLE:=tpws
	SUBMENU:=Zapret
	DEPENDS:=+zlib +libcap +zapret
endef

define Build/Prepare
	$(Build/Prepare/Default)
	rm -f $(PKG_BUILD_DIR)/$(MAKE_PATH)/tpws
endef

define Package/$(PKG_NAME)/install
	$(INSTALL_DIR) $(1)/opt/zapret/tpws
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/$(MAKE_PATH)/tpws $(1)/opt/zapret/tpws/
endef

$(eval $(call BuildPackage,$(PKG_NAME)))
