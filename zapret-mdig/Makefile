include $(TOPDIR)/rules.mk

PKG_NAME:=zapret2-mdig
PKG_VERSION:=0.7.20251224
PKG_RELEASE:=1

PKG_MAINTAINER:=bol-van
PKG_LICENSE:=MIT
PKG_LICENSE_FILES:=docs/LICENSE.txt

PKG_SOURCE_URL:=https://github.com/bol-van/zapret2.git
PKG_SOURCE_PROTO:=git
PKG_SOURCE_VERSION:=505e8ff82ca92457d18daf90671d0f589929405b
PKG_SOURCE_DATE:=2025-12-24

#PKG_SOURCE:=$(PKG_NAME)-$(PKG_VERSION).tar.gz
#PKG_SOURCE_URL:=https://github.com/bol-van/zapret2/archive/refs/tags/v$(PKG_VERSION).tar.gz?
#PKG_HASH:=skip

include $(INCLUDE_DIR)/package.mk

#TAR_OPTIONS:=--strip-components 1 $(TAR_OPTIONS)
#TAR_CMD=$(HOST_TAR) -C $(1) $(TAR_OPTIONS)

MAKE_PATH:=mdig

define Package/$(PKG_NAME)
	SECTION:=net
	CATEGORY:=Network
	TITLE:=mdig
	SUBMENU:=Zapret2
	DEPENDS:=+zlib +zapret2
endef

define Build/Prepare
	$(Build/Prepare/Default)
	rm -f $(PKG_BUILD_DIR)/$(MAKE_PATH)/mdig
endef

define Package/$(PKG_NAME)/install
	$(INSTALL_DIR) $(1)/opt/zapret2/mdig
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/$(MAKE_PATH)/mdig $(1)/opt/zapret2/mdig/
endef

$(eval $(call BuildPackage,$(PKG_NAME)))
