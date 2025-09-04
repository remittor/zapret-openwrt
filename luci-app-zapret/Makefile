#
# Copyright (c) 2024 remittor
#

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-zapret
PKG_VERSION:=71.20250822
PKG_LICENSE:=MIT
PKG_MAINTAINER:=remittor <https://github.com/remittor>

LUCI_TITLE:=LuCI support for zapret
LUCI_DEPENDS:=+zapret
LUCI_PKGARCH:=all

define Package/$(PKG_NAME)/postinst
#!/bin/sh
if [ -z "$${IPKG_INSTROOT}" ]; then
	rm -f /tmp/luci-index*
	rm -rf /tmp/luci-modulecache/
	#killall -HUP rpcd 2>/dev/null
	/etc/init.d/rpcd reload
	[ -f "/sbin/luci-reload" ] && /sbin/luci-reload
	[ -f "/etc/init.d/uhttpd" ] && /etc/init.d/uhttpd reload
fi
exit 0
endef

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
