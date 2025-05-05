'use strict';
'require fs';
'require form';
'require tools.widgets as widgets';
'require uci';
'require ui';
'require view';
'require view.zapret.tools as tools';

return view.extend({
    parsers: { },

    appStatusCode: null,

    depends: function(elem, key, array, empty=true) {
        if (empty && array.length === 0) {
            elem.depends(key, '_dummy');
        } else {
            array.forEach(e => elem.depends(key, e));
        }
    },

    validateIpPort: function(section, value) {
        return (/^$|^([0-9]{1,3}\.){3}[0-9]{1,3}(#[\d]{2,5})?$/.test(value)) ? true : _('Expecting:')
            + ` ${_('One of the following:')}\n - ${_('valid IP address')}\n - ${_('valid address#port')}\n`;
    },

    validateUrl: function(section, value) {
        return (/^$|^https?:\/\/[\w.-]+(:[0-9]{2,5})?[\w\/~.&?+=-]*$/.test(value)) ? true : _('Expecting:')
            + ` ${_('valid URL')}\n`;
    },

    load: function() {
        return Promise.all([
            { code: -1}, // L.resolveDefault(fs.exec(tools.execPath, [ 'raw-status' ]), 1),
            null, // L.resolveDefault(fs.list(tools.parsersDir), null),
            uci.load(tools.appName),
        ]).catch(e => {
            ui.addNotification(null, E('p', _('Unable to read the contents') + ': %s '.format(e.message) ));
        });
    },

    render: function(data) {
        if (!data) {
            return;
        }
        this.appStatusCode = data[0].code;

        let m, s, o, tabname;

        m = new form.Map(tools.appName, _('Zapret') + ' - ' + _('Settings'));

        s = m.section(form.NamedSection, 'config');
        s.anonymous = true;
        s.addremove = false;

        /* Main settings tab */

        tabname = 'main_settings'; 
        s.tab(tabname, _('Main settings'));

        o = s.taboption(tabname, form.ListValue, 'FWTYPE', _('FWTYPE'));
        o.value('nftables', 'nftables');
        //o.value('iptables', 'iptables');
        //o.value('ipfw',     'ipfw');

        o = s.taboption(tabname, form.Flag, 'POSTNAT', _('POSTNAT'));
        o.rmempty = false;
        o.default = 1;

        o = s.taboption(tabname, form.ListValue, 'FLOWOFFLOAD', _('FLOWOFFLOAD'));
        o.value('donttouch', 'donttouch');
        o.value('none',      'none');
        o.value('software',  'software');
        o.value('hardware',  'hardware');

        o = s.taboption(tabname, form.Flag, 'INIT_APPLY_FW', _('INIT_APPLY_FW'));
        o.rmempty = false;
        o.default = 0;

        o = s.taboption(tabname, form.Flag, 'DISABLE_IPV4', _('DISABLE_IPV4'));
        o.rmempty = false;
        o.default = 1;

        o = s.taboption(tabname, form.Flag, 'DISABLE_IPV6', _('DISABLE_IPV6'));
        o.rmempty = false;
        o.default = 0;

        o = s.taboption(tabname, form.Flag, 'FILTER_TTL_EXPIRED_ICMP', 'FILTER_TTL_EXPIRED_ICMP');
        o.rmempty = false;
        o.default = 1;

        o = s.taboption(tabname, form.ListValue, 'MODE_FILTER', _('MODE_FILTER'));
        //o.value('none',         'none');
        //o.value('ipset',        'ipset');
        o.value('hostlist',     'hostlist');
        o.value('autohostlist', 'autohostlist');

        o = s.taboption(tabname, form.Value, 'WS_USER', _('WS_USER'));
        o.rmempty  = false;
        o.datatype = 'string';

        o = s.taboption(tabname, form.Flag, 'DAEMON_LOG_ENABLE', _('DAEMON_LOG_ENABLE'));
        o.rmempty = false;
        o.default = 0;

        /* NFQWS_OPT_DESYNC tab */

        tabname = 'nfqws_params';
        s.tab(tabname, _('NFQWS options'));

        let add_delim = function(sec, url = null) {
            let o = sec.taboption(tabname, form.DummyValue, '_hr');
            o.rawhtml = true;
            o.default = '<hr style="width: 620px; height: 1px; margin: 1px 0 1px; border-top: 1px solid;">';
            if (url) {
                o.default += '<br/>' + _('Help') + ': <a href=%s>%s</a>'.format(url);
            }
        };

        let add_param = function(sec, param, locname = null, rows = 10, multiline = false) {
            if (!locname)
                locname = param;
            let btn = sec.taboption(tabname, form.Button, '_' + param + '_btn', locname);
            btn.inputtitle = _('Edit');
            btn.inputstyle = 'edit btn';
            let val = sec.taboption(tabname, form.DummyValue, '_' + param);
            val.rawhtml = multiline ? true : false;
            val.cfgvalue = function(section_id) {
                let value = uci.get(tools.appName, section_id, param);
                if (value == null) {
                    return "";
                }
                value = value.trim();
                if (multiline == 2) {
                    value = value.replace(/\n  --/g, "\n--");
                    value = value.replace(/\n --/g, "\n--");
                    value = value.replace(/ --/g, "\n--");
                }
                if (val.rawhtml) {
                    value = value.replace(/</g, '˂');
                    value = value.replace(/>/g, '˃');
                    value = value.replace(/\n/g, '<br/>');
                }
                return value;
            };
            val.validate = function(section_id, value) {
                return (value) ? value.trim() : "";
            };
            let desc = locname;
            if (multiline == 2) {
                desc += '<br/>' + _('Example') + ': <a href=%s>%s</a>'.format(tools.nfqws_opt_url);
            }
            btn.onclick = () => new tools.longstrEditDialog('config', param, param, desc, rows, multiline).show();
        };

        o = s.taboption(tabname, form.Flag, 'NFQWS_ENABLE', _('NFQWS_ENABLE'));
        o.rmempty = false;
        o.default = 1;

        o = s.taboption(tabname, form.Value, 'DESYNC_MARK', _('DESYNC_MARK'));
        //o.description = _("nfqws option for DPI desync attack");
        o.rmempty     = false;
        o.datatype    = 'string';

        o = s.taboption(tabname, form.Value, 'DESYNC_MARK_POSTNAT', _('DESYNC_MARK_POSTNAT'));
        //o.description = _("nfqws option for DPI desync attack");
        o.rmempty     = false;
        o.datatype    = 'string';
        
        o = s.taboption(tabname, form.Value, 'NFQWS_PORTS_TCP', _('NFQWS_PORTS_TCP'));
        o.rmempty     = false;
        o.datatype    = 'string';

        o = s.taboption(tabname, form.Value, 'NFQWS_PORTS_UDP', _('NFQWS_PORTS_UDP'));
        o.rmempty     = false;
        o.datatype    = 'string';

        o = s.taboption(tabname, form.Value, 'NFQWS_TCP_PKT_OUT', _('NFQWS_TCP_PKT_OUT'));
        o.rmempty     = false;
        o.datatype    = 'string';

        o = s.taboption(tabname, form.Value, 'NFQWS_TCP_PKT_IN', _('NFQWS_TCP_PKT_IN'));
        o.rmempty     = false;
        o.datatype    = 'string';

        o = s.taboption(tabname, form.Value, 'NFQWS_UDP_PKT_OUT', _('NFQWS_UDP_PKT_OUT'));
        o.rmempty     = false;
        o.datatype    = 'string';

        o = s.taboption(tabname, form.Value, 'NFQWS_UDP_PKT_IN', _('NFQWS_UDP_PKT_IN'));
        o.rmempty     = false;
        o.datatype    = 'string';

        o = s.taboption(tabname, form.Value, 'NFQWS_PORTS_TCP_KEEPALIVE', _('NFQWS_PORTS_TCP_KEEPALIVE'));
        o.rmempty     = false;
        o.datatype    = 'uinteger';

        o = s.taboption(tabname, form.Value, 'NFQWS_PORTS_UDP_KEEPALIVE', _('NFQWS_PORTS_UDP_KEEPALIVE'));
        o.rmempty     = false;
        o.datatype    = 'uinteger';

        add_delim(s, tools.nfqws_opt_url);
        add_param(s, 'NFQWS_OPT', null, 21, 2);

        /* AutoHostList settings */

        tabname = 'autohostlist_tab'; 
        s.tab(tabname, _('AutoHostList'));
        
        o = s.taboption(tabname, form.Value, 'AUTOHOSTLIST_RETRANS_THRESHOLD', _('RETRANS_THRESHOLD'));
        o.rmempty     = false;
        o.datatype    = 'uinteger';

        o = s.taboption(tabname, form.Value, 'AUTOHOSTLIST_FAIL_THRESHOLD', _('FAIL_THRESHOLD'));
        o.rmempty     = false;
        o.datatype    = 'uinteger';

        o = s.taboption(tabname, form.Value, 'AUTOHOSTLIST_FAIL_TIME', _('FAIL_TIME'));
        o.rmempty     = false;
        o.datatype    = 'uinteger';

        o = s.taboption(tabname, form.Button, '_auto_host_btn', _('Auto host list entries'));
        o.inputtitle = _('Edit');
        o.inputstyle = 'edit btn';
        o.description = tools.autoHostListFN;
        o.onclick = () => new tools.fileEditDialog(
            tools.autoHostListFN,
            _('Auto host list'),
            '',
            '',
            15
        ).show();

        o = s.taboption(tabname, form.Flag, 'AUTOHOSTLIST_DEBUGLOG', _('DEBUGLOG'));
        o.rmempty     = false;
        o.default     = 0;

        o = s.taboption(tabname, form.Button, '_auto_host_debug_btn', _('Auto host debug list entries'));
        o.inputtitle = _('Edit');
        o.inputstyle = 'edit btn';
        o.description = tools.autoHostListDbgFN;
        o.onclick = () => new tools.fileEditDialog(
            tools.autoHostListDbgFN,
            _('Auto host debug list'),
            '',
            '',
            15
        ).show();
        
        /* HostList settings */

        tabname = 'hostlist_tab'; 
        s.tab(tabname, _('Host lists'));

        o = s.taboption(tabname, form.Button, '_google_entries_btn', _('Google hostname entries'));
        o.inputtitle = _('Edit');
        o.inputstyle = 'edit btn';
        o.description = tools.hostsGoogleFN;
        o.onclick = () => new tools.fileEditDialog(
            tools.hostsGoogleFN,
            _('Google hostname entries'),
            _('One hostname per line.<br />Examples:'),
            '<code>youtube.com<br />googlevideo.com</code>',
            15
        ).show();

        o = s.taboption(tabname, form.Button, '_user_entries_btn', _('User hostname entries <HOSTLIST>'));
        o.inputtitle = _('Edit');
        o.inputstyle = 'edit btn';
        o.description = tools.hostsUserFN;
        o.onclick = () => new tools.fileEditDialog(
            tools.hostsUserFN,
            _('User entries'),
            _('One hostname per line.<br />Examples:'),
            '<code>domain.net<br />sub.domain.com<br />facebook.com</code>',
            15
        ).show();

        o = s.taboption(tabname, form.Button, '_user_excluded_entries_btn', _('User excluded hostname entries'));
        o.inputtitle = _('Edit');
        o.inputstyle = 'edit btn';
        o.description = tools.hostsUserExcludeFN;
        o.onclick = () => new tools.fileEditDialog(
            tools.hostsUserExcludeFN,
            _('User excluded entries'),
            _('One hostname per line.<br />Examples:'),
            '<code>domain.net<br />sub.domain.com<br />gosuslugi.ru</code>',
            15
        ).show();
        
        add_delim(s);

        o = s.taboption(tabname, form.Button, '_ip_exclude_filter_btn', _('Excluded IP entries'));
        o.inputtitle = _('Edit');
        o.inputstyle = 'edit btn';
        o.description = tools.iplstExcludeFN;
        o.onclick = () => new tools.fileEditDialog(
            tools.iplstExcludeFN,
            _('Excluded IP filter'),
            _('Patterns can be strings or regular expressions. Each pattern in a separate line<br />Examples:'),
            '<code>128.199.0.0/16<br />34.217.90.52<br />162.13.190.77</code>',
            15
        ).show();

        o = s.taboption(tabname, form.Button, '_user_ip_filter_btn', _('User IP entries'));
        o.inputtitle = _('Edit');
        o.inputstyle = 'edit btn';
        o.description = tools.iplstUserFN;
        o.onclick = () => new tools.fileEditDialog(
            tools.iplstUserFN,
            _('User IP filter'),
            _('Patterns can be strings or regular expressions. Each pattern in a separate line<br />Examples:'),
            '<code>128.199.0.0/16<br />34.217.90.52<br />162.13.190.77</code>',
            15
        ).show();

        o = s.taboption(tabname, form.Button, '_user_excluded_ip_filter_btn', _('User excluded IP entries'));
        o.inputtitle = _('Edit');
        o.inputstyle = 'edit btn';
        o.description = tools.iplstUserExcludeFN;
        o.onclick = () => new tools.fileEditDialog(
            tools.iplstUserExcludeFN,
            _('User excluded IP filter'),
            _('Patterns can be strings or regular expressions. Each pattern in a separate line<br />Examples:'),
            '<code>128.199.0.0/16<br />34.217.90.52<br />162.13.190.77</code>',
            15
        ).show();
        
        add_delim(s);
        
        for (let num = 1; num <= tools.custFileMax; num++) {
            let fn = tools.custFileTemplate.format(num.toString());
            let name = _('Custom file #' + num);
            o = s.taboption(tabname, form.Button, '_cust_file%d_btn'.format(num), name);
            o.inputtitle = _('Edit');
            o.inputstyle = 'edit btn';
            o.description = fn;
            o.onclick = () => new tools.fileEditDialog(fn, name, '', '', 15).show();
        }

        /* custom.d files */

        tabname = 'custom_d_tab'; 
        s.tab(tabname, 'custom.d');

        o = s.taboption(tabname, form.Flag, 'DISABLE_CUSTOM', _('DISABLE_CUSTOM'));
        o.rmempty = false;
        o.default = 0;

        add_delim(s);
        
        for (let i = 0; i < tools.customdPrefixList.length; i++) {
            let num = tools.customdPrefixList[i];
            let fn = tools.customdFileFormat.format(num.toString());
            let name = _('custom.d script #' + num);
            o = s.taboption(tabname, form.Button, '_customd_file%d_btn'.format(num), name);
            o.inputtitle = _('Edit');
            o.inputstyle = 'edit btn';
            o.description = fn;
            let desc = (num == tools.discord_num) ? _('Example') + ': <a href=%s>%s</a>'.format(tools.discord_url) : '';
            o.onclick = () => new tools.fileEditDialog(fn, name, desc, '', 15).show();
        }

        let map_promise = m.render();
        map_promise.then(node => node.classList.add('fade-in'));
        return map_promise;
    },

    handleSaveApply: function(ev, mode) {
        return this.handleSave(ev).then(() => {
            ui.changes.apply(mode == '0');
            //if (this.appStatusCode != 1 && this.appStatusCode != 2) {
            //    window.setTimeout(() => fs.exec(tools.execPath, [ 'restart' ]), 3000);
            //}
        });
    },
});
