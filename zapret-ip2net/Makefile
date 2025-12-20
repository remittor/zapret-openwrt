include $(TOPDIR)/rules.mk

PKG_NAME:=zapret2-ip2net
PKG_VERSION:=0.7.20251220
PKG_RELEASE:=1

PKG_MAINTAINER:=bol-van
PKG_LICENSE:=MIT
PKG_LICENSE_FILES:=docs/LICENSE.txt

PKG_SOURCE_URL:=https://github.com/bol-van/zapret2.git
PKG_SOURCE_PROTO:=git
PKG_SOURCE_VERSION:=0c4ef51b2aa96ddb92cb4a5f1ae4811357270ecc
PKG_SOURCE_DATE:=2025-12-20

#PKG_SOURCE:=$(PKG_NAME)-$(PKG_VERSION).tar.gz
#PKG_SOURCE_URL:=https://github.com/bol-van/zapret2/archive/refs/tags/v$(PKG_VERSION).tar.gz?
#PKG_HASH:=skip

include $(INCLUDE_DIR)/package.mk

#TAR_OPTIONS:=--strip-components 1 $(TAR_OPTIONS)
#TAR_CMD=$(HOST_TAR) -C $(1) $(TAR_OPTIONS)

MAKE_PATH:=ip2net

define Package/$(PKG_NAME)
	SECTION:=net
	CATEGORY:=Network
	TITLE:=ip2net
	SUBMENU:=Zapret2
	DEPENDS:=+zlib +zapret2
endef

define Build/Prepare
	$(Build/Prepare/Default)
	rm -f $(PKG_BUILD_DIR)/$(MAKE_PATH)/ip2net
endef

define Package/$(PKG_NAME)/install
	$(INSTALL_DIR) $(1)/opt/zapret2/ip2net
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/$(MAKE_PATH)/ip2net $(1)/opt/zapret2/ip2net/
endef

$(eval $(call BuildPackage,$(PKG_NAME)))
