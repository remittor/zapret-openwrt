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
    disableButtons: function(flag, btn, elems = [ ]) {
        let btn_start   = elems[1] || document.getElementById("btn_start");
        //let btn_destroy = elems[4] || document.getElementById("btn_destroy");
        let btn_enable  = elems[2] || document.getElementById("btn_enable");
        let btn_update  = elems[3] || document.getElementById("btn_update");

        btn_start.disabled   = flag;
        btn_update.disabled  = true; // TODO
        //btn_destroy.disabled = flag;
        if (btn === btn_update) {
            btn_enable.disabled = false;
        } else {
            btn_enable.disabled = flag;
        }
    },

    getAppStatus: function() {
        return Promise.all([
            { code: -1 }, //fs.exec(tools.execPath, [ 'raw-status' ]),
            { code: -1 }, //fs.exec(tools.execPath, [ 'vpn-route-status' ]),
            tools.getInitStatus(tools.appName),
            //L.resolveDefault(fs.read(tools.tokenFile), 0),
            uci.load(tools.appName),
        ]).catch(e => {
            ui.addNotification(null, E('p', _('Unable to execute or read contents')
                + ': %s [ %s | %s | %s ]'.format(
                    e.message, tools.execPath, 'tools.getInitStatus', 'uci.zapret'
            )));
        });
    },

    setAppStatus: function(status_array, elems = [ ], force_app_code = 0) {
        let section = uci.get(tools.appName, 'config');
        if (!status_array || section == null || typeof(section) !== 'object') {
            (elems[0] || document.getElementById("status")).innerHTML = tools.makeStatusString(1);
            ui.addNotification(null, E('p', _('Unable to read the contents') + ': setAppStatus()'));
            this.disableButtons(true, null, elems);
            return;
        }

        let app_status_code       = (force_app_code) ? force_app_code : status_array[0].code;
        let vpn_route_status_code = status_array[1].code;
        let enabled_flag          = status_array[2];
        let z_fwtype              = section.FWTYPE;
        let z_mode                = section.MODE;
        let bllist_preset         = 'user_only';

        let btn_enable = elems[2] || document.getElementById('btn_enable');
        /*
        if (enabled_flag == true) {
            btn_enable.onclick     = ui.createHandlerFn(this, this.serviceAction, 'disable', 'btn_enable');
            btn_enable.textContent = _('Enabled');
            btn_enable.className   = btn_style_positive;
        } else {
            btn_enable.onclick     = ui.createHandlerFn(this, this.serviceAction, 'enable', 'btn_enable');
            btn_enable.textContent = _('Disabled');
            btn_enable.className   = btn_style_negative;
        }
        */
        let btn_start   = elems[1] || document.getElementById('btn_start');
        let btn_update  = elems[3] || document.getElementById('btn_update');
        //let btn_destroy = elems[4] || document.getElementById('btn_destroy');

        let btnStartStateOn = () => {
            //btn_start.onclick     = ui.createHandlerFn(this, this.appAction, 'stop', 'btn_start');
            //btn_start.textContent = _('Enabled');
            //btn_start.className   = btn_style_positive;
        };

        let btnStartStateOff = () => {
            //btn_start.onclick     = ui.createHandlerFn(this, this.appAction, 'start', 'btn_start');
            //btn_start.textContent = _('Disabled');
            //btn_start.className   = btn_style_negative;
        };

        if (app_status_code == -1) {
            this.disableButtons(false, null, elems);
            btnStartStateOn();
        }
        else if (app_status_code == 0) {
            this.disableButtons(false, null, elems);
            btnStartStateOn();
            //btn_destroy.disabled = false;
            btn_update.disabled  = false;
        }
        else if (app_status_code == 2) {
            this.disableButtons(false, null, elems);
            btnStartStateOff();
            btn_update.disabled = true;
        }
        else if (app_status_code == 3) {
            btnStartStateOff();
            this.disableButtons(true, btn_start, elems);
        }
        else if (app_status_code == 4) {
            btnStartStateOn();
            this.disableButtons(true, btn_update, elems);
        }
        else {
            ui.addNotification(null, E('p', _('Error')
                + ' %s: return code = %s'.format(tools.execPath, app_status_code)));
            this.disableButtons(true, null, elems);
        }

        (elems[0] || document.getElementById("status")).innerHTML = tools.makeStatusString(app_status_code, z_fwtype, bllist_preset);
        
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
        
        let res = fs.exec('/opr/zapret/sync_config.sh');
        if (res.code != 0) {
            ui.addNotification(null, E('p', _('Unable to run sync_config.sh') + '  [code: '+res.code+']'));
            return res;
        }
        return tools.handleServiceAction(tools.appName, action).then(() => {
            return this.getAppStatus().then(
                (status_array) => {
                    this.setAppStatus(status_array);
                }
            );
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

        let section = uci.get(tools.appName, 'config');

        let status_string = E('div', {
            'id'   : 'status',
            'name' : 'status',
            'class': 'cbi-section-node',
        });

        let layout = E('div', { 'class': 'cbi-section-node' });

        function layout_append(title, descr, elem) {
            descr = (descr) ? E('div', { 'class': 'cbi-value-description' }, descr) : '';
            let elist;
            if (elem instanceof E) {
                elist = [ elem ];
            } else {
                elist = elem;
            }
            let vlist = [ E('div', {}, elist ) ];
            for (let i = 0; i < elist.length; i++) {
                let input = E('input', {
                    'id'  : elist[i].id + '_hidden',
                    'type': 'hidden',
                });
                vlist.push(input);
            }
            layout.append(
                E('div', { 'class': 'cbi-value' }, [
                    E('label', { 'class': 'cbi-value-title', 'for': elem.id + '_hidden' || null }, title),
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
        layout_append(_('Service Status'), null, [ btn_enable, btn_disable ] );

        let btn_start       = create_btn('btn_start',   btn_style_action, _('Start'));
        btn_start.onclick   = ui.createHandlerFn(this, this.serviceAction, 'start', 'btn_start');
        let btn_restart     = create_btn('btn_restart', btn_style_action, _('Restart'));
        btn_restart.onclick = ui.createHandlerFn(this, this.serviceAction, 'restart', 'btn_restart');
        let btn_stop        = create_btn('btn_stop',    btn_style_warning, _('Stop'));
        btn_stop.onclick    = ui.createHandlerFn(this, this.serviceAction, 'stop', 'btn_stop');
        layout_append(_('Service Control'), null, [ btn_start, btn_restart, btn_stop ] );

        let btn_update      = create_btn('btn_update',  btn_style_action, _('Update'));
        btn_update.onclick  = ui.createHandlerFn(this, () => { this.appAction('update', 'btn_update') });
        layout_append(_('Update blacklist'), null, btn_update);
        
        let btn_destroy     = create_btn('btn_destroy', btn_style_negative, _('Shutdown'));
        btn_destroy.onclick = L.bind(this.dialogDestroy, this);
        //layout_append(_('Shutdown'), _('Complete service shutdown'), btn_destroy);

        //let elems = [ status_string, btn_start, btn_enable, btn_update, btn_destroy ];
        let elems = [ status_string, btn_start, btn_enable, btn_update ];
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
                E('hr'),
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
