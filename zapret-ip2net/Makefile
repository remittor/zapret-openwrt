include $(TOPDIR)/rules.mk

PKG_NAME:=zapret-ip2net
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

MAKE_PATH:=ip2net

define Package/$(PKG_NAME)
	SECTION:=net
	CATEGORY:=Network
	TITLE:=ip2net
	SUBMENU:=Zapret
	DEPENDS:=+zlib +zapret
endef

define Build/Prepare
	$(Build/Prepare/Default)
	rm -f $(PKG_BUILD_DIR)/$(MAKE_PATH)/ip2net
endef

define Package/$(PKG_NAME)/install
	$(INSTALL_DIR) $(1)/opt/zapret/ip2net
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/$(MAKE_PATH)/ip2net $(1)/opt/zapret/ip2net/
endef

$(eval $(call BuildPackage,$(PKG_NAME)))
