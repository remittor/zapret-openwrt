'use strict';
'require fs';
'require poll';
'require uci';
'require ui';
'require view';
'require view.zapret.tools as tools';
'require view.zapret.diagnost as diagnost';
'require view.zapret.updater as updater';

const btn_style_neutral  = 'btn';
const btn_style_action   = 'btn cbi-button-action';
const btn_style_positive = 'btn cbi-button-save important';
const btn_style_negative = 'btn cbi-button-reset important';
const btn_style_warning  = 'btn cbi-button-negative';
const btn_style_success  = 'btn cbi-button-success important';

return view.extend({
    get_svc_buttons: function(elems = { }) {
        return {
            "enable"  : elems.btn_enable  || document.getElementById('btn_enable'),
            "disable" : elems.btn_disable || document.getElementById('btn_disable'),
            "start"   : elems.btn_start   || document.getElementById('btn_start'),
            "restart" : elems.btn_restart || document.getElementById('btn_restart'),
            "stop"    : elems.btn_stop    || document.getElementById('btn_stop'),
            "reset"   : elems.btn_reset   || document.getElementById('btn_reset'),
            "diag"    : elems.btn_diag    || document.getElementById('btn_diag'),
            "update"  : elems.btn_update  || document.getElementById('btn_update'),
        };
    },
    
    disableButtons: function(flag, button, elems = { }) {
        let error_code = 0;
        if (Number.isInteger(button) && button < 0) {
            error_code = button;
        }
        let btn = this.get_svc_buttons(elems);
        btn.enable.disabled  = flag;
        btn.disable.disabled = flag;
        btn.start.disabled   = flag;
        btn.restart.disabled = flag;
        btn.stop.disabled    = flag;
        btn.reset.disabled   = (error_code == 0) ? flag : false;
        btn.update.disabled  = (error_code == 0) ? flag : false;
    },

    getAppStatus: function() {
        return Promise.all([
            tools.getInitState(tools.appName),      // svc_boot
            fs.exec(tools.execPath, [ 'enabled' ]), // svc_en
            tools.getSvcInfo(),                     // svc_info
            fs.exec('/bin/busybox', [ 'ps' ]),      // process list
            tools.getPackageDict(),                 // installed packages
            tools.getStratList(),                   // nfqws strategy list
            fs.exec('/bin/cat', [ '/etc/openwrt_release' ]),  // CPU arch
            uci.load(tools.appName),              // config
        ]).catch(e => {
            ui.addNotification(null, E('p', _('Unable to execute or read contents')
                + ': %s [ %s | %s | %s ]'.format(
                    e.message, tools.execPath, 'tools.getInitState', 'uci.'+tools.appName
            )));
        });
    },

    setAppStatus: function(status_array, elems = { }, force_app_status = 0) {
        let cfg = uci.get(tools.appName, 'config');
        if (!status_array || cfg == null || typeof(cfg) !== 'object') {
            let elem_status = elems.status || document.getElementById("status");
            elem_status.innerHTML = tools.makeStatusString(null, '', '');
            ui.addNotification(null, E('p', _('Unable to read the contents') + ': setAppStatus()'));
            this.disableButtons(true, -1, elems);
            return;
        }
        let svc_boot  = status_array[0] ? true : false;
        let svc_en    = status_array[1];   // stdout: empty or error text
        let svc_info  = status_array[2];   // dict for services
        let proc_list = status_array[3];   // stdout: multiline text
        let pkg_dict  = status_array[4];   // stdout: installed packages
        let stratlist = status_array[5];   // array of strat names
        let sys_info  = status_array[6];   // stdout: openwrt distrib info
        
        this.nfqws_strat_list = stratlist;
        this.pkg_arch = tools.getConfigPar(sys_info.stdout, 'DISTRIB_ARCH', 'unknown');
        
        //console.log('svc_en: ' + svc_en.code);
        svc_en = (svc_en.code == 0) ? true : false;
        
        if (typeof(svc_info) !== 'object') {
            ui.addNotification(null, E('p', _('Unable to read the service info') + ': setAppStatus()'));
            this.disableButtons(true, -1, elems);
            return;
        }
        if (proc_list.code != 0) {
            ui.addNotification(null, E('p', _('Unable to read process list') + ': setAppStatus()'));
            this.disableButtons(true, -1, elems);
            return;
        }
        if (!pkg_dict) {
            ui.addNotification(null, E('p', _('Unable to enumerate installed packages') + ': getPackageDict()'));
            this.disableButtons(true, -1, elems);
            return;
        }
        let svcinfo;
        if (force_app_status) {
            svcinfo = force_app_status;
        } else {
            svcinfo = tools.decode_svc_info(svc_en, svc_info, proc_list, cfg);
        }
        let btn = this.get_svc_buttons(elems);
        btn.reset.disabled = false;
        btn.update.disabled = false;

        if (Number.isInteger(svcinfo)) {
            ui.addNotification(null, E('p', _('Error')
                + ' %s: return code = %s'.format('decode_svc_info', svcinfo + ' ')));
            this.disableButtons(true, -1, elems);
        } else {
            btn.enable.disabled  = (svc_en) ? true : false;
            btn.disable.disabled = (svc_en) ? false : true;
            if (!svcinfo.dmn.inited) {
                btn.start.disabled = false;
                btn.restart.disabled = true;
                btn.stop.disabled = true;
            } else {
                btn.start.disabled = true;
                btn.restart.disabled = false;
                btn.stop.disabled = false;
            }
        }
        let elem_status = elems.status || document.getElementById("status");
        elem_status.innerHTML = tools.makeStatusString(svcinfo, this.pkg_arch, '');
        
        if (!poll.active()) {
            poll.start();
        }
    },

    serviceActionEx: async function(action, button, args = [ ], hide_modal = false, btn_dis = true)
    {
        let btn = document.getElementById(button);
        this.disableButtons(true, btn);
        poll.stop();
        try {
            await tools.serviceActionEx(action, args, false);
            if (hide_modal) {
                ui.hideModal();
            }
        } catch(e) { 
            //ui.addNotification(null, E('p', 'Error: ' + e.message));
        } finally {
            if (btn && btn_dis) {
                setTimeout(() => { btn.disabled = true; }, 0);
            }
            if (!poll.active()) {
                await new Promise(resolve => setTimeout(resolve, 10));
                poll.start();
            }
        }
    },

    statusPoll: function() {
        this.getAppStatus().then(
            L.bind(this.setAppStatus, this)
        );
    },

    dialogResetCfg: function(ev)
    {
        if (tools.checkUnsavedChanges()) {
            ui.addNotification(null, E('p', _('You have unapplied changes')));
            return;
        }
        ev.target.blur();

        let reset_base = E('label', [
            E('input', { type: 'checkbox', id: 'cfg_reset_base',  checked: true }),
            ' ', _('Restore all base settings')
        ]);
        
        let reset_ipset = E('label', [
            E('input', { type: 'checkbox', id: 'cfg_reset_ipset',  checked: true }),
            ' ', _('Restore ipset configs')
        ]);

        let set_autohostlist = E('label', [
            E('input', { type: 'checkbox', id: 'cfg_autohostlist',  checked: true }),
            ' ', _('Set AutoHostList mode')
        ]);

        let erase_autohostlist = E('label', [
            E('input', { type: 'checkbox', id: 'cfg_erase_autohostlist' }),
            ' ', _('Erase AutoHostList (ipset)')
        ]);

        let enable_custom_d = E('label', [
            E('input', { type: 'checkbox', id: 'cfg_enable_custom_d' }),
            ' ', _('Enable use  custom.d scripts')
        ]);

        let strat_list = [ ];
        strat_list.push( E('option', { value: 'strat__skip__' }, [ 'not change' ] ) );
        for (let id = 0; id < this.nfqws_strat_list.length; id++) {
            let strat = '' + this.nfqws_strat_list[id];
            strat_list.push( E('option', { value: 'strat_' + id }, [ strat ] ) );
        }
        let label_nfqws = (tools.appName == 'zapret2') ? _('NFQWS2_OPT strategy: ') : _('NFQWS_OPT strategy: ');
        let nfqws_strat = E('label', [
            label_nfqws,
            E('select', { id: 'cfg_nfqws_strat' }, strat_list)
        ]);

        let cancel_button = E('button', {
            'class': btn_style_neutral,
            'click': ui.hideModal,
        }, _('Cancel'));

        let resetcfg_btn = E('button', {
            'class': btn_style_action,
        }, _('Reset settings'));
        resetcfg_btn.onclick = ui.createHandlerFn(this, async () => {
            //cancel_button.disabled = true;
            let opt_flags = '';
            if (document.getElementById('cfg_reset_base').checked == false) {
                opt_flags += '(skip_base)';
            };
            if (document.getElementById('cfg_reset_ipset').checked) {
                opt_flags += '(reset_ipset)';
            };
            if (document.getElementById('cfg_autohostlist').checked) {
                opt_flags += '(set_mode_autohostlist)';
            };
            if (document.getElementById('cfg_erase_autohostlist').checked) {
                opt_flags += '(erase_autohostlist)';
            };
            if (document.getElementById('cfg_enable_custom_d').checked) {
                opt_flags += '(enable_custom_d)';
            };
            //console.log('RESET: opt_flags = ' + opt_flags);
            let sel_strat = document.getElementById('cfg_nfqws_strat');
            let opt_strat = sel_strat.options[sel_strat.selectedIndex].text;
            //console.log('RESET: strat = ' + opt_strat);
            if (opt_strat == 'not change') {
                opt_strat = '-';
            }
            opt_flags += '(sync)';
            let args = [ opt_flags, opt_strat ];
            return this.serviceActionEx('reset', resetcfg_btn, args, true);
        });

        ui.showModal(_('Reset settings to default'), [
            E('div', { 'class': 'cbi-section' }, [
                reset_base,
                E('br'), E('br'),
                reset_ipset,
                E('br'), E('br'),
                set_autohostlist,
                E('br'), E('br'),
                erase_autohostlist,
                E('br'), E('br'),
                enable_custom_d,
                E('br'), E('br'),
                nfqws_strat,
                E('br'), E('br')
            ]),
            E('div', { 'class': 'right' }, [
                cancel_button,
                ' ',
                resetcfg_btn,
            ])
        ]);
    },

    load: function() {
        var _this = this;
        return Promise.all([
            L.resolveDefault(fs.stat('/bin/cat'), null),
        ]).then(function(data) {
            return _this.getAppStatus();
        });
    },

    render: function(status_array) {
        if (!status_array) {
            return;
        }
        let cfg = uci.get(tools.appName, 'config');

        tools.checkAndRestartSvc(status_array[2]);  // svc_info

        let pkgdict = status_array[4];
        if (pkgdict == null) {
            ui.addNotification(null, E('p', _('Unable to enumerate installed packages') + ': render()'));
            return;
        }

        let status_string = E('div', {
            'id'   : 'status',
            'name' : 'status',
            'class': 'cbi-section-node',
        });

        let layout = E('div', { 'class': 'cbi-section-node' });

        function layout_append(title, descr, elems) {
            descr = (descr) ? E('div', { 'class': 'cbi-value-description' }, descr) : '';
            let elist = elems;
            let elem_list = [ ];
            for (let i = 0; i < elist.length; i++) {
                elem_list.push(elist[i]);
                elem_list.push(' ');
            }
            let vlist = [ E('div', {}, elem_list ) ];
            for (let i = 0; i < elist.length; i++) {
                let input = E('input', {
                    'id'  : elist[i].id + '_hidden',
                    'type': 'hidden',
                });
                vlist.push(input);
            }
            let elem_name = (elist.length == 1) ? elist[0].id + '_hidden' : null;
            layout.append(
                E('div', { 'class': 'cbi-value' }, [
                    E('label', { 'class': 'cbi-value-title', 'for': elem_name }, title),
                    E('div', { 'class': 'cbi-value-field' }, vlist),
                ])
            );
        }

        let create_btn = function(name, _class, locname) {
            return E('button', {
                'id'   : name,
                'name' : name,
                'class': _class,
            }, locname);
        };
        
        let btn_enable      = create_btn('btn_enable',  btn_style_success, _('Enable'));
        btn_enable.onclick  = ui.createHandlerFn(this, this.serviceActionEx, 'enable', 'btn_enable');
        let btn_disable     = create_btn('btn_disable', btn_style_warning, _('Disable'));
        btn_disable.onclick = ui.createHandlerFn(this, this.serviceActionEx, 'disable', 'btn_disable');
        layout_append(_('Service autorun control'), null, [ btn_enable, btn_disable ] );

        let btn_start       = create_btn('btn_start',   btn_style_action, _('Start'));
        btn_start.onclick   = ui.createHandlerFn(this, this.serviceActionEx, 'start', 'btn_start');
        let btn_restart     = create_btn('btn_restart', btn_style_action, _('Restart'));
        btn_restart.onclick = ui.createHandlerFn(this, this.serviceActionEx, 'restart', 'btn_restart');
        let btn_stop        = create_btn('btn_stop',    btn_style_warning, _('Stop'));
        btn_stop.onclick    = ui.createHandlerFn(this, this.serviceActionEx, 'stop', 'btn_stop');
        layout_append(_('Service daemons control'), null, [ btn_start, btn_restart, btn_stop ] );

        let btn_reset       = create_btn('btn_reset', btn_style_action, _('Reset settings'));
        btn_reset.onclick   = L.bind(this.dialogResetCfg, this);
        layout_append(_('Reset settings to default'), null, [ btn_reset ] );

        let btn_diag        = create_btn('btn_diag',  btn_style_action, _('Diagnostics'));
        btn_diag.onclick    = ui.createHandlerFn(this, () => { diagnost.openDiagnostDialog(this.pkg_arch) });
        layout_append('Diagnostic tools', null, [ btn_diag ] );

        let btn_update      = create_btn('btn_update',  btn_style_action, _('Update'));
        btn_update.onclick  = ui.createHandlerFn(this, () => { updater.openUpdateDialog(this.pkg_arch) });
        layout_append(_('Update package'), null, [ btn_update ] );

        let elems = {
            "status": status_string,
            "btn_enable": btn_enable,
            "btn_disable": btn_disable,
            "btn_start": btn_start,
            "btn_restart": btn_restart,
            "btn_stop": btn_stop,
            "btn_reset": btn_reset,
            "btn_diag": btn_diag,
            "btn_update": btn_update,
        };
        this.setAppStatus(status_array, elems);

        poll.add(L.bind(this.statusPoll, this), 2);  // interval 2 sec

        let page_title = tools.AppName;
        page_title += ' &nbsp ';
        if (pkgdict[tools.appName] === undefined || pkgdict[tools.appName] == '') {
            page_title += 'unknown version';
        } else {
            page_title += 'v' + pkgdict[tools.appName];
            page_title = page_title.replace(/-r1$/, '');
        }
        let aux1 = E('em');
        let aux2 = E('em');
        if (pkgdict[tools.appName] != pkgdict['luci-app-'+tools.appName]) {
            let errtxt = 'LuCI APP v' + pkgdict['luci-app-'+tools.appName] + ' [ incorrect version! ]';
            aux1 = E('div', { 'class': 'label-status error' }, errtxt);
            aux2 = E('div', { }, '&nbsp');
        }
        
        let url1 = 'https://github.com/bol-van/'+tools.appName;
        let url2 = 'https://github.com/remittor/zapret-openwrt';

        return E([
            E('h2', { 'class': 'fade-in' }, page_title),
            aux1,
            aux2,
            E('div', { 'class': 'cbi-section-descr fade-in' },
                E('a', { 'href': url1, 'target': '_blank' }, url1),
            ),
            E('div', { 'class': 'cbi-section-descr fade-in' },
                E('a', { 'href': url2, 'target': '_blank' }, url2),
            ),
            E('div', { 'class': 'cbi-section fade-in' }, [
                status_string,
            ]),
            E('div', { 'class': 'cbi-section fade-in' },
                layout
            ),
        ]);
    },

    handleSave     : null,
    handleSaveApply: null,
    handleReset    : null,
});
