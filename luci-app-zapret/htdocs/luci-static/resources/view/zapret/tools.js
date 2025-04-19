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
    packager          : null,
    appName           : 'zapret',
    execPath          : '/etc/init.d/zapret',
    syncCfgPath       : '/opt/zapret/sync_config.sh',
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
    discord_url       : 'https://github.com/bol-van/zapret/blob/4e8e3a9ed9dbeb1156db68dfaa7b353051c13797/init.d/custom.d.examples.linux/50-discord',

    autoHostListFN    : '/opt/zapret/ipset/zapret-hosts-auto.txt',
    autoHostListDbgFN : '/opt/zapret/ipset/zapret-hosts-auto-debug.log',

    infoLabelRunning  : '<span class="label-status running">'  + _('Running')  + '</span>',
    infoLabelStarting : '<span class="label-status starting">' + _('Starting') + '</span>',
    infoLabelStopped  : '<span class="label-status stopped">'  + _('Stopped')  + '</span>',
    infoLabelDisabled : '<span class="label-status stopped">'  + _('Disabled') + '</span>',
    infoLabelError    : '<span class="label-status error">'    + _('Error')    + '</span>',

    infoLabelUpdating : '<span class="label-status updating">' + _('Updating') + '</span>',

    statusDict: {
        error    : { code: 0, name: _('Error')    , label: this.infoLabelError    },
        disabled : { code: 1, name: _('Disabled') , label: this.infoLabelDisabled },
        stopped  : { code: 2, name: _('Stopped')  , label: this.infoLabelStopped  },
        starting : { code: 3, name: _('Starting') , label: this.infoLabelStarting },
        running  : { code: 4, name: _('Running')  , label: this.infoLabelRunning  },
    },

    callInitState: rpc.declare({
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

    init_consts: function() {
        if (!this.packager) {
            this.packager = { };
            if (L.hasSystemFeature('apk')) {
                this.packager.name = 'apk';
                this.packager.path = '/usr/bin/apk';
                this.packager.args = [ 'list', '-I', '*zapret*' ];
            } else {
                this.packager.name = 'opkg';
                this.packager.path = '/bin/opkg';
                this.packager.args = [ 'list-installed', '*zapret*' ];
            }
            //console.log('PACKAGER: ' + this.packager.name);
        }
    },

    getInitState: function(name) {
        this.init_consts();
        return this.callInitState(name).then(res => {
            if (res) {
                return res[name].enabled ? true : false;
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

    decode_pkg_list: function(pkg_list) {
        let pkg_dict = { };
        let lines = pkg_list.trim().split('\n');
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            let name;
            let ver;
            if (this.packager.name == 'apk') {
                let fullname = line.split(' ')[0];
                let mpos = fullname.lastIndexOf("-");
                if (mpos <= 0)
                    continue;
                if (fullname.substring(mpos+1, mpos+2) == 'r') {
                    // release number
                    fullname = fullname.substring(0, mpos);
                }
                mpos = fullname.lastIndexOf("-");
                if (mpos <= 0)
                    continue;
                name = fullname.substring(0, mpos).trim();
                ver = fullname.substring(mpos+1).trim();
            } else {
                if (!line.includes(' - '))
                    continue;
                name = line.split(' - ')[0].trim();
                ver  = line.split(' - ')[1].trim();
                let spos = ver.indexOf(" ");
                if (spos > 0) {
                    ver = ver.substring(0, spos);
                }
                let mpos = ver.lastIndexOf("-");
                if (mpos > 0 && ver.substring(mpos+1, mpos+2) == 'r') {
                    // release number
                    ver = ver.substring(0, mpos);
                }
            }
            pkg_dict[name] = ver;
        }
        return pkg_dict;
    },

    get_pid_list: function(proc_list) {
        let plist = [ ];
        let lines = proc_list.trim().split('\n');
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line.length > 5) {
                let word_list = line.split(/\s+/);
                let pid = word_list[0];
                let isnum = /^\d+$/.test(pid);
                if (isnum) {
                    plist.push(parseInt(pid));
                }
            }
        }
        return plist;
    },

    decode_svc_info: function(svc_autorun, svc_info, proc_list, cfg) {
        let result = {
            "autorun": svc_autorun,
            "dmn": {
                inited: false,
                total: 0,
                running: 0,
                working: 0,
            },
            "status": this.statusDict.error,
        };
        if (svc_info.code != 0) {
            return -1;
        }
        if (proc_list.code != 0) {
            return -2;
        }        
        let plist = this.get_pid_list(proc_list.stdout);
        
        if (plist.length < 4) {
            return -3;
        }
        if (typeof(svc_info.stdout) !== 'string') {
            return -4;
        }
        if (svc_info.stdout.length < 3) {
            return -5;
        }
        let jdata;
        try {
            jdata = JSON.parse(svc_info.stdout);
        } catch (e) {
            console.log('Incorrect JSON: ' + svc_info.stdout);
            return -6;
        }
        if (typeof(jdata) !== 'object') {
            return -7;
        }
        if (typeof(jdata.zapret) == 'object') {
            result.dmn.inited = true;
            let dmn_list = jdata.zapret.instances;
            if (typeof(dmn_list) == 'object') {
                for (const [dmn_name, daemon] of Object.entries(dmn_list)) {
                    result.dmn.total += 1;
                    if (daemon.running) {
                        result.dmn.running += 1;
                    }
                    if (daemon.pid !== undefined && daemon.pid != null) {
                        if (plist.includes(daemon.pid)) {
                            result.dmn.working += 1;
                        }
                    }
                }
            }
        }
        //console.log('SVC_DAEMONS: ' + result.dmn.working + ' / ' + result.dmn.total);
        if (result.dmn.total == 0) {
            result.status = (!svc_autorun) ? this.statusDict.disabled : this.statusDict.stopped;
        } else {
            result.status = (result.dmn.inited) ? this.statusDict.started : this.statusDict.running;
        }
        return result;
    },

    makeStatusString: function(svcinfo, fwtype, bllist_preset) {
        let svc_autorun = _('Unknown');
        let svc_daemons = _('Unknown');
        
        if (typeof(svcinfo) == 'object') {
            svc_autorun = (svcinfo.autorun) ? _('Enabled') : _('Disabled');
            if (!svcinfo.dmn.inited) {
                svc_daemons = _('Stopped');
            } else {
                svc_daemons = (!svcinfo.dmn.working) ? _('Starting') : _('Running');
                svc_daemons += ' [' + svcinfo.dmn.working + '/' + svcinfo.dmn.total + ']';
            }
        }
        let update_mode = _('user entries only');
        
        let td_name_width = 40;
        let td_name_style = `style="width: ${td_name_width}%; min-width:${td_name_width}%; max-width:${td_name_width}%;"`;
        let out = `
                <table class="table">
                    <tr class="tr">
                        <td class="td left" ${td_name_style}>
                            ${_('Service autorun status')}:
                        </td>
                        <td class="td left">
                            ${svc_autorun}
                        </td>
                    </tr>
                    <tr class="tr">
                        <td class="td left" ${td_name_style}>
                            ${_('Service daemons status')}:
                        </td>
                        <td class="td left %s">
                            ${svc_daemons}
                        </td>
                    </tr>
                    <tr class="tr">
                        <td class="td left" ${td_name_style}>
                            ${_('FW type')}:
                        </td>
                        <td class="td left">
                            ${fwtype}
                        </td>
                    </tr>
                    <tr class="tr">
                        <td class="td left" ${td_name_style}>
                            ${_('HostLists update mode')}:
                        </td>
                        <td class="td left">
                            ${update_mode}
                        </td>
                    </tr>
                    <tr class="tr">
                        <td class="td left" ${td_name_style}>
                        </td>
                        <td class="td left">
                        </td>
                    </tr>
                </table>`;
        return out;
    },
    
    getLineCount: function(mstr) {
        let count = 0;
        let c = '\n'.charAt(0);
        for (let i = 0; i < mstr.length; ++i) {
            if (c === mstr.charAt(i)) {
                ++count;
            }
        }
        return count;
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
        __init__: function(cfgsec, cfgparam, title, desc, rows = 10, multiline = false) {
            this.cfgsec      = cfgsec;
            this.cfgparam    = cfgparam;
            this.title       = title;
            this.desc        = desc;
            this.rows        = rows;
            this.multiline   = multiline;
        },

        load: function() {
            let value = uci.get('zapret', this.cfgsec, this.cfgparam);
            if (typeof(value) === 'string') {
                value = value.trim();
                if (this.multiline == 2) {
                    value = value.replace(/\n\t\t\t--/g, "\n--");
                    value = value.replace(/\n\t\t--/g, "\n--");
                    value = value.replace(/\n\t--/g, "\n--");
                    value = value.replace(/\n  --/g, "\n--");
                    value = value.replace(/\n --/g, "\n--");
                    value = value.replace(/ --/g, "\n--");
                }
            }
            return value;
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
            let value = txt.value.trim();
            if (this.multiline) {
                value = value.replace(/\r/g, '');
                if (value != "" && value != "\t") {
                    value = '\n' + value + '\n';
                    if (this.multiline == 2) {
                        value = value.replace(/"/g, '');
                        value = value.replace(/'/g, '');
                    }
                }
            } else {
                value = value.replace(/\r\n/g, ' ');
                value = value.replace(/\r/g, ' ');
                value = value.replace(/\n/g, ' ');
                value = value.trim();
            }
            if (value == "") {
                value = "\t";
            }
            value = value.replace(/˂/g, '<');
            value = value.replace(/˃/g, '>');
            uci.set('zapret', this.cfgsec, this.cfgparam, value);
            uci.save();
            let elem = document.getElementById("cbi-zapret-" + this.cfgsec + "-_" + this.cfgparam);
            if (elem) {
                let val = value.trim();
                if (this.multiline) {
                    val = val.replace(/</g, '˂');
                    val = val.replace(/>/g, '˃');
                    val = val.replace(/\n/g, '<br/>');
                    elem.querySelector('div').innerHTML = val;
                } else {
                    elem.querySelector('div').textContent = val;
                }
            }
            ui.hideModal();
            /*
            return uci.save()
            .then(L.bind(ui.changes.init, ui.changes))
            .then(L.bind(ui.changes.displayChanges, ui.changes))
            //.then(L.bind(ui.changes.apply, ui.changes))
            .then(ui.addNotification(null, E('p', _('Contents have been saved.')), 'info'))
            .catch(e => {
                ui.addNotification(null, E('p', _('Unable to save the contents') + ': %s'.format(e.message)));
            }).finally(() => {
                ui.hideModal();
            });
            */
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
            //ui.showModal(null, E('p', { 'class': 'spinning' }, _('Loading')) );
            let content = this.load();
            //ui.hideModal();
            if (content === null) {
                return this.error('Cannot load parameter');
            }    
            return this.render(content);
        },
    }),

});
