'use strict';
'require baseclass';

return baseclass.extend({
    packager          : { },
    appName           : 'zapret',
    AppName           : 'Zapret',
    execPath          : '/etc/init.d/zapret',
    appDir            : '/opt/zapret',
    syncCfgPath       : '/opt/zapret/sync_config.sh',
    defCfgPath        : '/opt/zapret/def-cfg.sh',
    defaultCfgPath    : '/opt/zapret/restore-def-cfg.sh',

    hostsGoogleFN     : '/opt/zapret/ipset/zapret-hosts-google.txt',
    hostsUserFN       : '/opt/zapret/ipset/zapret-hosts-user.txt',
    hostsUserExcludeFN: '/opt/zapret/ipset/zapret-hosts-user-exclude.txt',
    iplstExcludeFN    : '/opt/zapret/ipset/zapret-ip-exclude.txt',
    iplstUserFN       : '/opt/zapret/ipset/zapret-ip-user.txt',
    iplstUserExcludeFN: '/opt/zapret/ipset/zapret-ip-user-exclude.txt',
    custFileMax       : 4,
    custFileTemplate  : '/opt/zapret/ipset/cust%s.txt',
    customdPrefixList : [ 10, 20, 50, 60, 90 ] ,
    customdFileFormat : '/opt/zapret/init.d/openwrt/custom.d/%s-script.sh',
    discord_num       : 50,
    discord_url       : [ 'https://github.com/bol-van/zapret/blob/4e8e3a9ed9dbeb1156db68dfaa7b353051c13797/init.d/custom.d.examples.linux/50-discord',
                          'https://github.com/bol-van/zapret/blob/b251ea839cc8f04c45090314ef69fce69f2c00f2/init.d/custom.d.examples.linux/50-discord-media',
                          'https://github.com/bol-van/zapret/blob/b251ea839cc8f04c45090314ef69fce69f2c00f2/init.d/custom.d.examples.linux/50-stun4all',
                          'https://github.com/bol-van/zapret/tree/master/init.d/custom.d.examples.linux'
                        ],
    nfqws_opt_url     : 'https://github.com/remittor/zapret-openwrt/discussions/168',

    autoHostListFN    : '/opt/zapret/ipset/zapret-hosts-auto.txt',
    autoHostListDbgFN : '/opt/zapret/ipset/zapret-hosts-auto-debug.log',

    load_env: function(ctx)
    {
        let env_proto = Object.getPrototypeOf(this);
        Object.getOwnPropertyNames(env_proto).forEach(function(key) {
            if (key === 'constructor' || key.startsWith('__')) {
                return;
            }
            if (key === 'load_env' || key === 'load_feat_env') {
                return;
            }
            ctx[key] = env_proto[key];
        });
        ctx.skey_pkg_dict = this.appName + '-pkg-dict';
        ctx.skey_deffered_action = this.appName + '-deffered-action';
        try {
            L.hasSystemFeature('opkg');
            this.load_feat_env(ctx);
        } catch(e) {
            // nothing
        }
    },
    
    load_feat_env: function(ctx)
    {
        ctx.packager = { };
        if (L.hasSystemFeature('apk')) {
            ctx.packager.name = 'apk';
            ctx.packager.path = '/usr/bin/apk';
            ctx.packager.args = [ 'list', '-I', '*'+this.appName+'*' ];
        } else {
            ctx.packager.name = 'opkg';
            ctx.packager.path = '/bin/opkg';
            ctx.packager.args = [ 'list-installed', '*'+this.appName+'*' ];
        }
    },
});
