include $(TOPDIR)/rules.mk

PKG_NAME:=zapret-mdig
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

MAKE_PATH:=mdig

define Package/$(PKG_NAME)
	SECTION:=net
	CATEGORY:=Network
	TITLE:=mdig
	SUBMENU:=Zapret
	DEPENDS:=+zlib +zapret
endef

define Build/Prepare
	$(Build/Prepare/Default)
	rm -f $(PKG_BUILD_DIR)/$(MAKE_PATH)/mdig
endef

define Package/$(PKG_NAME)/install
	$(INSTALL_DIR) $(1)/opt/zapret/mdig
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/$(MAKE_PATH)/mdig $(1)/opt/zapret/mdig/
endef

$(eval $(call BuildPackage,$(PKG_NAME)))
