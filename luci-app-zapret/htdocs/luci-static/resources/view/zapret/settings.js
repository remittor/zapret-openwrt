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

        o = s.taboption(tabname, form.ListValue, 'MODE', _('MODE'));
        o.value('nfqws',   'nfqws');
        //o.value('tpws',    'tpws');
        
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

        o = s.taboption(tabname, form.ListValue, 'MODE_FILTER', _('MODE_FILTER'));
        //o.value('none',         'none');
        //o.value('ipset',        'ipset');
        o.value('hostlist',     'hostlist');
        o.value('autohostlist', 'autohostlist');

        o = s.taboption(tabname, form.Flag, 'MODE_HTTP', _('MODE_HTTP'));
        o.rmempty = false;
        o.default = 0;

        o = s.taboption(tabname, form.Flag, 'MODE_HTTP_KEEPALIVE', _('MODE_HTTP_KEEPALIVE'));
        o.rmempty = false;
        o.default = 0;

        o = s.taboption(tabname, form.Flag, 'MODE_HTTPS', _('MODE_HTTPS'));
        o.rmempty = false;
        o.default = 0;

        o = s.taboption(tabname, form.Flag, 'MODE_QUIC', _('MODE_QUIC'));
        o.rmempty = false;
        o.default = 0;

        o = s.taboption(tabname, form.Value, 'DESYNC_MARK', _('DESYNC_MARK'));
        //o.description = _("nfqws option for DPI desync attack");
        o.rmempty     = false;
        o.datatype    = 'string';

        o = s.taboption(tabname, form.Value, 'DESYNC_MARK_POSTNAT', _('DESYNC_MARK_POSTNAT'));
        //o.description = _("nfqws option for DPI desync attack");
        o.rmempty     = false;
        o.datatype    = 'string';

        /* NFQWS_OPT_DESYNC tab */

        tabname = 'nfqws_params';
        s.tab(tabname, _('NFQWS options'));

        let add_delim = function(sec) {
            let o = sec.taboption(tabname, form.DummyValue, '_hr');
            o.rawhtml = true;
            o.default = '<hr style="width: 620px; height: 1px; margin: 1px 0 1px; border-top: 1px solid;">';
        };

        let add_param = function(sec, param, locname = null, rows = 10) {
            if (!locname)
                locname = param;
            let btn = sec.taboption(tabname, form.Button, '_' + param + '_btn', locname);
            btn.inputtitle = _('Edit');
            btn.inputstyle = 'edit btn';
            let val = sec.taboption(tabname, form.DummyValue, '_' + param);
            val.rawhtml = false;
            val.cfgvalue = function(section_id) {
                let name = uci.get(tools.appName, section_id, param);
                if (name == null || name == "")
                    name = "";
                return name;
            };
            val.validate = function(section_id, value) {
                if (!value)
                    return "";
                return value.trim();
            };
            btn.onclick = () => new tools.longstrEditDialog('config', param, param, locname, rows).show();
        };

        add_delim(s);
        add_param(s, 'NFQWS_OPT_DESYNC');
        add_delim(s);
        add_param(s, 'NFQWS_OPT_DESYNC_SUFFIX');
        add_delim(s);
        add_param(s, 'NFQWS_OPT_DESYNC_HTTP');
        add_delim(s);
        add_param(s, 'NFQWS_OPT_DESYNC_HTTP_SUFFIX');
        add_delim(s);
        add_param(s, 'NFQWS_OPT_DESYNC_HTTPS');
        add_delim(s);
        add_param(s, 'NFQWS_OPT_DESYNC_HTTPS_SUFFIX');
        add_delim(s);
        add_param(s, 'NFQWS_OPT_DESYNC_HTTP6');
        add_delim(s);
        add_param(s, 'NFQWS_OPT_DESYNC_HTTP6_SUFFIX');
        add_delim(s);
        add_param(s, 'NFQWS_OPT_DESYNC_HTTPS6');
        add_delim(s);
        add_param(s, 'NFQWS_OPT_DESYNC_HTTPS6_SUFFIX');
        add_delim(s);
        add_param(s, 'NFQWS_OPT_DESYNC_QUIC');
        add_delim(s);
        add_param(s, 'NFQWS_OPT_DESYNC_QUIC_SUFFIX');
        add_delim(s);
        add_param(s, 'NFQWS_OPT_DESYNC_QUIC6');
        add_delim(s);
        add_param(s, 'NFQWS_OPT_DESYNC_QUIC6_SUFFIX');
        
        /* Blacklist settings */

        tabname = 'blacklist_tab'; 
        s.tab(tabname, _('Blacklist settings'));

        o = s.taboption(tabname, form.Button, '_user_entries_btn', _('User hostname entries'));
        o.inputtitle = _('Edit');
        o.inputstyle = 'edit btn';
        o.description = tools.hostsUserFN;
        o.onclick = () => new tools.fileEditDialog(            
            tools.hostsUserFN,
            _('User entries'),
            _('One hostname per line.<br />Examples:'),
            '<code>domain.net<br />sub.domain.com<br />googlevideo.com</code>',
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
            '<code>domain.net<br />sub.domain.com<br />googlevideo.com</code>',
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
