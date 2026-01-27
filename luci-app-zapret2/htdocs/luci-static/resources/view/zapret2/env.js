'use strict';
'require baseclass';

return baseclass.extend({
    packager          : { },
    appName           : 'zapret2',
    AppName           : 'Zapret2',
    execPath          : '/etc/init.d/zapret2',
    appDir            : '/opt/zapret2',
    syncCfgPath       : '/opt/zapret2/sync_config.sh',
    defCfgPath        : '/opt/zapret2/def-cfg.sh',
    defaultCfgPath    : '/opt/zapret2/restore-def-cfg.sh',

    hostsGoogleFN     : '/opt/zapret2/ipset/zapret-hosts-google.txt',
    hostsUserFN       : '/opt/zapret2/ipset/zapret-hosts-user.txt',
    hostsUserExcludeFN: '/opt/zapret2/ipset/zapret-hosts-user-exclude.txt',
    iplstExcludeFN    : '/opt/zapret2/ipset/zapret-ip-exclude.txt',
    iplstUserFN       : '/opt/zapret2/ipset/zapret-ip-user.txt',
    iplstUserExcludeFN: '/opt/zapret2/ipset/zapret-ip-user-exclude.txt',
    custFileMax       : 4,
    custFileTemplate  : '/opt/zapret2/ipset/cust%s.txt',
    customdPrefixList : [ 10, 20, 50, 60, 90 ] ,
    customdFileFormat : '/opt/zapret2/init.d/openwrt/custom.d/%s-script.sh',
    discord_num       : 50,
    discord_url       : [ 'https://github.com/bol-van/zapret2/blob/master/init.d/custom.d.examples.linux/50-discord-media',
                          'https://github.com/bol-van/zapret2/blob/master/init.d/custom.d.examples.linux/50-stun4all',
                          'https://github.com/bol-van/zapret2/tree/master/init.d/custom.d.examples.linux'
                        ],
    nfqws_opt_url     : 'https://github.com/remittor/zapret-openwrt/discussions/',

    autoHostListFN    : '/opt/zapret2/ipset/zapret-hosts-auto.txt',
    autoHostListDbgFN : '/opt/zapret2/ipset/zapret-hosts-auto-debug.log',

    load_env: function(dst_obj) {
        let env_proto = Object.getPrototypeOf(this);
        Object.getOwnPropertyNames(env_proto).forEach(function(key) {
            if (key === 'constructor' || key === 'load_env' || key.startsWith('__'))
                return;
            dst_obj[key] = env_proto[key];
        });
        dst_obj.packager = { };
        if (L.hasSystemFeature('apk')) {
            dst_obj.packager.name = 'apk';
            dst_obj.packager.path = '/usr/bin/apk';
            dst_obj.packager.args = [ 'list', '-I', '*'+this.appName+'*' ];
        } else {
            dst_obj.packager.name = 'opkg';
            dst_obj.packager.path = '/bin/opkg';
            dst_obj.packager.args = [ 'list-installed', '*'+this.appName+'*' ];
        }
        dst_obj.skey_pkg_dict = this.appName + '-pkg-dict';
        dst_obj.skey_deffered_action = this.appName + '-deffered-action';
    }
});
