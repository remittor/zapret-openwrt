'use strict';
'require fs';
'require poll';
'require uci';
'require ui';
'require view';
'require view.zapret.tools as tools';

const btn_style_neutral  = 'btn';
const btn_style_action   = 'btn cbi-button-action';
const btn_style_positive = 'btn cbi-button-save important';
const btn_style_negative = 'btn cbi-button-reset important';
const btn_style_warning  = 'btn cbi-button-negative';
const btn_style_success  = 'btn cbi-button-success important';

return view.extend({
    get_svc_buttons: function(elems = { }) {
        return {
            enable  : elems.btn_enable  || document.getElementById('btn_enable'),
            disable : elems.btn_disable || document.getElementById('btn_disable'),
            start   : elems.btn_start   || document.getElementById('btn_start'),
            restart : elems.btn_restart || document.getElementById('btn_restart'),
            stop    : elems.btn_stop    || document.getElementById('btn_stop'),
            update  : elems.btn_update  || document.getElementById('btn_update'),
        };
    },
    
    disableButtons: function(flag, button, elems = { }) {
        let btn = this.get_svc_buttons(elems);
        btn.enable.disabled  = flag;
        btn.disable.disabled = flag;
        btn.start.disabled   = flag;
        btn.restart.disabled = flag;
        btn.stop.disabled    = flag;
        btn.update.disabled  = true; // TODO
    },

    getAppStatus: function() {
        return Promise.all([
            tools.getInitState(tools.appName),    // svc_state
            fs.exec(tools.execPath, [ 'info' ]),  // svc_info
            fs.exec('/bin/ps'),                   // process list
            uci.load(tools.appName),              // config
        ]).catch(e => {
            ui.addNotification(null, E('p', _('Unable to execute or read contents')
                + ': %s [ %s | %s | %s ]'.format(
                    e.message, tools.execPath, 'tools.getInitState', 'uci.zapret'
            )));
        });
    },

    setAppStatus: function(status_array, elems = { }, force_app_status = 0) {
        let cfg = uci.get(tools.appName, 'config');
        if (!status_array || cfg == null || typeof(cfg) !== 'object') {
            let elem_status = elems.status || document.getElementById("status");
            elem_status.innerHTML = tools.makeStatusString(null);
            ui.addNotification(null, E('p', _('Unable to read the contents') + ': setAppStatus()'));
            this.disableButtons(true, null, elems);
            return;
        }
        let svc_autorun = status_array[0] ? true : false;
        let svc_info = status_array[1];   // stdout: JSON as text
        let proc_list = status_array[2];  // stdout: multiline text
        if (svc_info.code != 0) {
            ui.addNotification(null, E('p', _('Unable to read the service info') + ': setAppStatus()'));
            this.disableButtons(true, null, elems);
            return;
        }
        if (proc_list.code != 0) {
            ui.addNotification(null, E('p', _('Unable to read process list') + ': setAppStatus()'));
            this.disableButtons(true, null, elems);
            return;
        }
        let svcinfo;
        if (force_app_status) {
            svcinfo = force_app_status;
        } else {
            svcinfo = tools.decode_svc_info(svc_autorun, svc_info, proc_list, cfg);
        }
        let btn = this.get_svc_buttons(elems);
        btn.update.disabled = true;   // TODO

        if (Number.isInteger(svcinfo)) {
            ui.addNotification(null, E('p', _('Error')
                + ' %s: return code = %s'.format('decode_svc_info', svcinfo + ' ')));
            this.disableButtons(true, null, elems);
        } else {
            btn.enable.disabled  = (svc_autorun) ? true : false;
            btn.disable.disabled = (svc_autorun) ? false : true;
            if (svcinfo.dmn.total == 0) {
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
        elem_status.innerHTML = tools.makeStatusString(svcinfo, cfg.FWTYPE, 'user_only');
        
        if (!poll.active()) {
            poll.start();
        }
    },

    serviceAction: function(action, button) {
        if (button) {
            let elem = document.getElementById(button);
            this.disableButtons(true, elem);
        }
        poll.stop();
        
        let _this = this;
        
        return tools.handleServiceAction(tools.appName, action)
        .then(() => {
            return _this.getAppStatus().then(
                (status_array) => {
                    _this.setAppStatus(status_array);
                }
            );
        })
        .catch(e => { 
            ui.addNotification(null, E('p', _('Unable to run service action.') + ' Error: ' + e.message));
        });
    },

    serviceActionEx: function(action, button) {
        if (button) {
            let elem = document.getElementById(button);
            this.disableButtons(true, elem);
        }
        poll.stop();
        
        let _this = this;
        
        return fs.exec(tools.syncCfgPath)
        .then(function(res) { 
            if (res.code != 0) {
                ui.addNotification(null, E('p', _('Unable to run sync_config.sh script.') + ' res.code = ' + res.code));
                return _this.getAppStatus().then(
                    (status_array) => {
                        _this.setAppStatus(status_array);
                    }
                );
            }
            return _this.serviceAction(action, null);
        })
        .catch(e => { 
            ui.addNotification(null, E('p', _('Unable to run sync_config.sh script.') + ' Error: ' + e.message));
        });
    },

    appAction: function(action, button) {
        if (button) {
            let elem = document.getElementById(button);
            this.disableButtons(true, elem);
        }

        poll.stop();

        if (action === 'update') {
            this.getAppStatus().then(
                (status_array) => {
                    this.setAppStatus(status_array, [], 4);
                }
            );
        }

        return fs.exec_direct(tools.execPath, [ action ]).then(res => {
            return this.getAppStatus().then(
                (status_array) => {
                    this.setAppStatus(status_array);
                    ui.hideModal();
                }
            );
        });
    },

    statusPoll: function() {
        this.getAppStatus().then(
            L.bind(this.setAppStatus, this)
        );
    },

    dialogDestroy: function(ev) {
        ev.target.blur();
        let cancel_button = E('button', {
            'class': btn_style_neutral,
            'click': ui.hideModal,
        }, _('Cancel'));

        let shutdown_btn = E('button', {
            'class': btn_style_warning,
        }, _('Shutdown'));
        shutdown_btn.onclick = ui.createHandlerFn(this, () => {
            cancel_button.disabled = true;
            return this.appAction('destroy');
        });

        ui.showModal(_('Shutdown'), [
            E('div', { 'class': 'cbi-section' }, [
                E('p', _('The service will be disabled. Continue?')),
            ]),
            E('div', { 'class': 'right' }, [
                shutdown_btn,
                ' ',
                cancel_button,
            ])
        ]);
    },

    load: function() {
        return this.getAppStatus();
    },

    render: function(status_array) {
        if (!status_array) {
            return;
        }
        let cfg = uci.get(tools.appName, 'config');

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
        btn_enable.onclick  = ui.createHandlerFn(this, this.serviceAction, 'enable', 'btn_enable');
        let btn_disable     = create_btn('btn_disable', btn_style_warning, _('Disable'));
        btn_disable.onclick = ui.createHandlerFn(this, this.serviceAction, 'disable', 'btn_disable');
        layout_append(_('Service autorun control'), null, [ btn_enable, btn_disable ] );

        let btn_start       = create_btn('btn_start',   btn_style_action, _('Start'));
        btn_start.onclick   = ui.createHandlerFn(this, this.serviceActionEx, 'start', 'btn_start');
        let btn_restart     = create_btn('btn_restart', btn_style_action, _('Restart'));
        btn_restart.onclick = ui.createHandlerFn(this, this.serviceActionEx, 'restart', 'btn_restart');
        let btn_stop        = create_btn('btn_stop',    btn_style_warning, _('Stop'));
        btn_stop.onclick    = ui.createHandlerFn(this, this.serviceAction, 'stop', 'btn_stop');
        layout_append(_('Service daemons control'), null, [ btn_start, btn_restart, btn_stop ] );

        let btn_update      = create_btn('btn_update',  btn_style_action, _('Update'));
        btn_update.onclick  = ui.createHandlerFn(this, () => { this.appAction('update', 'btn_update') });
        layout_append(_('Update blacklist'), null, [ btn_update ] );
        
        let btn_destroy     = create_btn('btn_destroy', btn_style_negative, _('Shutdown'));
        btn_destroy.onclick = L.bind(this.dialogDestroy, this);

        let elems = {
            "status": status_string,
            "btn_enable": btn_enable,
            "btn_disable": btn_disable,
            "btn_start": btn_start,
            "btn_restart": btn_restart,
            "btn_stop": btn_stop,
            "btn_update": btn_update,
        };
        this.setAppStatus(status_array, elems);

        poll.add(L.bind(this.statusPoll, this));

        let url1 = 'https://github.com/bol-van/zapret';
        let url2 = 'https://github.com/remittor/zapret-openwrt';

        return E([
            E('h2', { 'class': 'fade-in' }, _('Zapret')),
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
