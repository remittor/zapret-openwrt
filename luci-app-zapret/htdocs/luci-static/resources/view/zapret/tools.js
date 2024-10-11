'use strict';
'require baseclass';
'require fs';
'require rpc';
'require ui';
'require uci';

document.head.append(E('style', {'type': 'text/css'},
`
.label-status {
    display: inline;
    margin: 0 2px 0 0 !important;
    padding: 2px 4px;
    -webkit-border-radius: 3px;
    -moz-border-radius: 3px;
    border-radius: 3px;
    font-weight: bold;
    color: #fff !important;
}
.starting {
    background-color: #9c994c !important;
}
.running {
    background-color: #2ea256 !important;
}
.updating {
    background-color: #1e82ff !important;
}
.stopped {
    background-color: #8a8a8a !important;
}
.error {
    background-color: #ff4e54 !important;
}
`));

return baseclass.extend({
    appName           : 'zapret',
    execPath          : '/opt/zapret/init.d/openwrt/zapret',
    parsersDir        : '/usr/libexec/ruantiblock',
    userEntriesFile   : '/opt/zapret/ipset/zapret-hosts-user.txt',
    ipFilterFile      : '/opt/zapret/ipset/zapret-ip-user.txt',

    infoLabelStarting : '<span class="label-status starting">' + _('Starting') + '</span>',
    infoLabelRunning  : '<span class="label-status running">' + _('Enabled') + '</span>',
    infoLabelUpdating : '<span class="label-status updating">' + _('Updating') + '</span>',
    infoLabelStopped  : '<span class="label-status stopped">' + _('Disabled') + '</span>',
    infoLabelError    : '<span class="label-status error">' + _('Error') + '</span>',

    callInitStatus: rpc.declare({
        object: 'luci',
        method: 'getInitList',
        params: [ 'name' ],
        expect: { '': {} }
    }),

    callInitAction: rpc.declare({
        object: 'luci',
        method: 'setInitAction',
        params: [ 'name', 'action' ],
        expect: { result: false }
    }),

    getInitStatus: function(name) {
        return this.callInitStatus(name).then(res => {
            if (res) {
                return res[name].enabled;
            } else {
                throw _('Command failed');
            }
        }).catch(e => {
            ui.addNotification(null, E('p', _('Failed to get %s init status: %s').format(name, e)));
        });
    },

    handleServiceAction: function(name, action) {
        return this.callInitAction(name, action).then(success => {
            if (!success) {
                throw _('Command failed');
            }
            return true;
        }).catch(e => {
            ui.addNotification(null, E('p', _('Service action failed "%s %s": %s').format(name, action, e)));
        });
    },

    normalizeValue: function(v) {
        return (v && typeof(v) === 'string') ? v.trim().replace(/\r?\n/g, '') : v;
    },

    makeStatusString: function(app_status_code, fwtype, bllist_preset) {
        let app_status_label;
        let spinning = '';

        switch(app_status_code) {
            case 0:
                app_status_label = this.infoLabelRunning;
                break;
            case 2:
                app_status_label = this.infoLabelStopped;
                break;
            case 3:
                app_status_label = this.infoLabelStarting;
                spinning = ' spinning';
                break;
            case 4:
                app_status_label = this.infoLabelUpdating;
                spinning = ' spinning';
                break;
            default:
                app_status_label = this.infoLabelError;
                return `<table class="table">
                            <tr class="tr">
                                <td class="td left" style="min-width:33%%">
                                    ${_('Status')}:
                                </td>
                                <td class="td left">
                                    ${app_status_label}
                                </td>
                            </tr>
                        </table>`;
        }

        return `<table class="table">
                    <tr class="tr">
                        <td class="td left" style="min-width:33%%">
                            ${_('Status')}:
                        </td>
                        <td class="td left%s">
                            %s %s
                        </td>
                    </tr>
                    <tr class="tr">
                        <td class="td left">
                            ${_('FW type')}:
                        </td>
                        <td class="td left">
                            %s
                        </td>
                    </tr>
                    <tr class="tr">
                        <td class="td left">
                            ${_('Blacklist update mode')}:
                        </td>
                        <td class="td left">
                            %s
                        </td>
                    </tr>
                </table>
        `.format(
            spinning,
            app_status_label,
            '',
            fwtype,
            _('user entries only')
        );
    },

    fileEditDialog: baseclass.extend({
        __init__: function(file, title, desc, aux = null, rows = 10, callback, file_exists = false) {
            this.file        = file;
            this.title       = title;
            this.desc        = desc;
            this.aux         = aux;
            this.rows        = rows,
            this.callback    = callback;
            this.file_exists = file_exists;
        },

        load: function() {
            return L.resolveDefault(fs.read(this.file), '');
        },

        render: function(content) {
            let descr = this.desc;
            if (this.aux)
                descr += '<br />' + this.aux;
            ui.showModal(this.title, [
                E('div', { 'class': 'cbi-section' }, [
                    E('div', { 'class': 'cbi-section-descr' }, descr),
                    E('div', { 'class': 'cbi-section' },
                        E('p', {},
                            E('textarea', {
                                'id': 'widget.modal_content',
                                'class': 'cbi-input-textarea',
                                'style': 'width:100% !important',
                                'rows': this.rows,
                                'wrap': 'off',
                                'spellcheck': 'false',
                            },
                            content)
                        )
                    ),
                ]),
                E('div', { 'class': 'right' }, [
                    E('button', {
                        'class': 'btn',
                        'click': ui.hideModal,
                    }, _('Dismiss')),
                    ' ',
                    E('button', {
                        'id': 'btn_save',
                        'class': 'btn cbi-button-positive important',
                        'click': ui.createHandlerFn(this, this.handleSave),
                    }, _('Save')),
                ]),
            ]);
        },

        handleSave: function(ev) {
            let txt = document.getElementById('widget.modal_content');
            let value = txt.value.trim().replace(/\r\n/g, '\n') + '\n';

            return fs.write(this.file, value).then(async rc => {
                txt.value = value;
                ui.addNotification(null, E('p', _('Contents have been saved.')), 'info');
                if (this.callback) {
                    return this.callback(rc);
                }
            }).catch(e => {
                ui.addNotification(null, E('p', _('Unable to save the contents') + ': %s'.format(e.message)));
            }).finally(() => {
                ui.hideModal();
            });
        },

        error: function(e) {
            if (!this.file_exists && e instanceof Error && e.name === 'NotFoundError') {
                return this.render();
            } else {
                ui.showModal(this.title, [
                    E('div', { 'class': 'cbi-section' },
                        E('p', {}, _('Unable to read the contents') + ': %s'.format(e.message))
                    ),
                    E('div', { 'class': 'right' },
                        E('button', {
                            'class': 'btn',
                            'click': ui.hideModal,
                        }, _('Dismiss'))
                    ),
                ]);
            }
        },

        show: function() {
            ui.showModal(null,
                E('p', { 'class': 'spinning' }, _('Loading'))
            );
            this.load().then(content => {
                ui.hideModal();
                return this.render(content);
            }).catch(e => {
                ui.hideModal();
                return this.error(e);
            });
        },
    }),

    longstrEditDialog: baseclass.extend({
        __init__: function(cfgsec, cfgparam, title, desc, rows = 10) {
            this.cfgsec      = cfgsec;
            this.cfgparam    = cfgparam;
            this.title       = title;
            this.desc        = desc;
            this.rows        = rows;
        },

        load: function() {
            return uci.get('zapret', this.cfgsec, this.cfgparam);
        },

        render: function(content) {
            ui.showModal(this.title, [
                E('div', { 'class': 'cbi-section' }, [
                    E('div', { 'class': 'cbi-section-descr' }, this.desc),
                    E('div', { 'class': 'cbi-section' },
                        E('p', {},
                            E('textarea', {
                                'id': 'widget.modal_content',
                                'class': 'cbi-input-textarea',
                                'style': 'width:100% !important',
                                'rows': this.rows,
                                'wrap': 'on',
                                'spellcheck': 'false',
                            },
                            content)
                        )
                    ),
                ]),
                E('div', { 'class': 'right' }, [
                    E('button', {
                        'class': 'btn',
                        'click': ui.hideModal,
                    }, _('Dismiss')),
                    ' ',
                    E('button', {
                        'id': 'btn_save',
                        'class': 'btn cbi-button-positive important',
                        'click': ui.createHandlerFn(this, this.handleSave),
                    }, _('Save')),
                ]),
            ]);
        },

        handleSave: function(ev) {
            let txt = document.getElementById('widget.modal_content');
            let value = txt.value.trim().replace(/\r\n/g, ' ').replace(/\r/g, ' ').replace(/\n/g, ' ').trim();

            uci.set('zapret', this.cfgsec, this.cfgparam, value);
            
            return uci.save()
            .then(L.bind(ui.changes.init, ui.changes))
            //.then(L.bind(ui.changes.apply, ui.changes))
            .then(ui.addNotification(null, E('p', _('Contents have been saved.')), 'info'))
            .catch(e => {
                ui.addNotification(null, E('p', _('Unable to save the contents') + ': %s'.format(e.message)));
            }).finally(() => {
                ui.hideModal();
            });
        },

        error: function(e) {
            let msg = (typeof(e) == 'object') ? e.message : ''+e;
            ui.showModal(this.title, [
                E('div', { 'class': 'cbi-section' },
                    E('p', {}, _('Unable to read the contents') + ': %s'.format(msg))
                ),
                E('div', { 'class': 'right' },
                    E('button', {
                        'class': 'btn',
                        'click': ui.hideModal,
                    }, _('Dismiss'))
                ),
            ]);
        },

        show: function() {
            ui.showModal(null, E('p', { 'class': 'spinning' }, _('Loading')) );
            let content = this.load();
            ui.hideModal();
            if (content == null) {
                return this.error('Cannot load parameter');
            }    
            return this.render(content);
        },
    }),

});
