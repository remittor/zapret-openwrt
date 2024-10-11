include $(TOPDIR)/rules.mk

PKG_NAME:=zapret-mdig
PKG_VERSION:=1.63
PKG_RELEASE:=20241008

PKG_MAINTAINER:=bol-van
PKG_LICENSE:=MIT
PKG_LICENSE_FILES:=docs/LICENSE.txt

PKG_SOURCE_URL:=https://github.com/bol-van/zapret.git
PKG_SOURCE_PROTO:=git
PKG_SOURCE_VERSION:=2cd6db3ba5ac2fa1494bed1c1903bc3531c76bc5
PKG_SOURCE_DATE:=2024-10-08

include $(INCLUDE_DIR)/package.mk

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
