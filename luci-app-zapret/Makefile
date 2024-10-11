#
# Copyright (c) 2024 remittor
#

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-zapret
PKG_RELEASE:=20241008
PKG_VERSION:=1.63-$(PKG_RELEASE)
PKG_LICENSE:=MIT

LUCI_TITLE:=LuCI support for zapret
LUCI_DEPENDS:=+zapret
LUCI_PKGARCH:=all

#include ../../luci.mk
include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
