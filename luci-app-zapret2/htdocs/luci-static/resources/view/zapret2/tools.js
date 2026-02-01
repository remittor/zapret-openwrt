'use strict';
'require baseclass';
'require fs';
'require rpc';
'require ui';
'require uci';
'require view.zapret2.env as env_tools';

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
    __init__() {
        env_tools.load_env(this);
        //console.log('appName: ' + this.appName);
        //console.log('PACKAGER: ' + this.packager.name);
    },

    load_feat_env: function()
    {
        env_tools.load_feat_env(this);
    },

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

    callServiceList: rpc.declare({
        object: 'service',
        method: 'list',
        params: [ 'name', 'verbose' ],
        expect: { '': {} }
    }),

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

    getSvcInfo: function(svc_name = null) {
        let name = (svc_name) ? svc_name : this.appName;
        let verbose = 1;
        return this.callServiceList(name, verbose).then(res => {
            return res;
        }).catch(e => {
            ui.addNotification(null, E('p', _('Failed to get %s service info: %s').format(name, e)));
        });
    },

    getInitState: function(name) {
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

    getPackageDict: function()
    {
        let exec_cmd = this.packager.path;
        let exec_arg = this.packager.args;
        return fs.exec(exec_cmd, exec_arg).then(res => {
            let pdict_json = localStorage.getItem(this.skey_pkg_dict);
            if (res.code != 0) {
                console.log(this.appName + ': Unable to enumerate installed packages. code = ' + res.code);
                if (pdict_json != null) {
                    return JSON.parse(pdict_json);  // return cached value
                }
                return null;
            }
            let pdict = this.decode_pkg_list(res.stdout);
            if (pdict != pdict_json) {
                localStorage.setItem(this.skey_pkg_dict, JSON.stringify(pdict));  // renew cache
            }
            return pdict;
        }).catch(e => {
            ui.addNotification(null, E('p', _('Unable to enumerate installed packages.') + ' Error: %s'.format(e)));
        });
    },

    getStratList: function() {
        let exec_cmd = '/bin/busybox';
        let exec_arg = [ 'awk', '-F', '"', '/if \\[ "\\$strat" = "/ {print $4}', this.defCfgPath ];
        return fs.exec(exec_cmd, exec_arg).then(res => {
            if (res.code == 0) {
                return this.getWordsArray(res.stdout);
            }
            return [ ];
        }).catch(e => {
            ui.addNotification(null, E('p', _('Failed to get strat list: %s').format(e)));
        });
    },

    handleServiceAction: function(name, action, throwed = false)
    {
        console.log('handleServiceAction: '+name+' '+action);
        return this.callInitAction(name, action).then(success => {
            if (!success) {
                throw _('Command failed');
            }
            return true;
        }).catch(e => {
            ui.addNotification(null, E('p', _('Service action failed "%s %s": %s').format(name, action, e)));
            if (throwed) {
                throw e;
            }
        });
    },

    serviceActionEx: async function(action, args = [ ], throwed = false)
    {
        let errmsg = null;
        try {
            let exec_cmd = null;
            let exec_arg = [ ];
            if (action == 'start' || action == 'restart') {
                exec_cmd = this.syncCfgPath;
                errmsg = _('Unable to run sync_config.sh script.');
            }
            if (action == 'reset') {
                exec_cmd = this.defaultCfgPath;
                exec_arg = args;  // (reset_ipset)(sync) ==> restore all configs + sync config
                errmsg = _('Unable to run restore-def-cfg.sh script.');
                action = null;
            }
            if (exec_cmd) {
                let res = await fs.exec(exec_cmd, exec_arg);
                if (res.code != 0) {
                    throw Error('res.code = ' + res.code);
                }
            }
            errmsg = null;
            if (action) {
                await this.handleServiceAction(this.appName, action, throwed);
            }
        } catch(e) { 
            if (throwed) {
                throw e;
            } else {
                let msg = errmsg ? errmsg : _('Unable to run service action') + ' "' + action + '".';
                ui.addNotification(null, E('p', msg + ' Error: ' + e.message));
            }
        }
    },

    promiseAllDict: function(promisesDict)
    {
        const keys = Object.keys(promisesDict);
        const promises = keys.map(key => promisesDict[key]);
        return Promise.all(promises)
            .then(results => {
                const resultDict = { };
                keys.forEach((key, index) => {
                    resultDict[key] = results[index];
                });
                return resultDict;
            });
    },    
    
    baseLoad: function(ctx, callback)
    {
        return Promise.all([
            L.probeSystemFeatures(),
            this.getSvcInfo(),           // svc_info
            uci.load(this.appName),
        ])
        .then( ([ sys_feat, svcInfo, uci_data ]) => {
            let svc_info = this.decodeSvcInfo(svcInfo);
            let ret = { sys_feat, svc_info, uci_data };
            if (typeof(callback) === 'function') {
                const res = callback.call(ctx, ret);
                if (res && typeof(res.then) === 'function') {
                    return res.then(() => res);
                }
                return ret;
            }
            return ret;
        })
        .catch(e => {
            ui.addNotification(null, E('p', _('Unable to read the contents') + ' (baseLoad): %s '.format(e.message) ));
            return null;
        });
    },

    decodeSvcInfo: function(svc_info, svc_autorun = true, proc_list = [ ])
    {
        if (svc_info?.autorun !== undefined && svc_info?.dmn !== undefined) {
            return svc_info;
        }
        if (svc_info != null && typeof(svc_info) == 'object') {
            return this.decode_svc_info(svc_autorun, svc_info, proc_list);
        }
        return null;
    },

    setDefferedAction: function(action, svcInfo = null, forced = false)
    {
        let svc_info = this.decodeSvcInfo(svcInfo);
        if (action == 'start' && svc_info?.dmn.inited) {
            action = 'restart';
        }
        if (action == 'start') {
            if (!forced && svc_info?.dmn.inited) {
                action = null;
            }
        }
        if (action == 'restart') {
            if (!forced && !svc_info?.dmn.inited) {
                action = null;
            }
        }
        if (action && localStorage.getItem(this.skey_deffered_action) == null) {
            localStorage.setItem(this.skey_deffered_action, action);
            console.log('setDefferedAction: '+this.skey_deffered_action+' = '+action);
        }
    },
    
    execDefferedAction: function(svcInfo = null)
    {
        let svc_info = this.decodeSvcInfo(svcInfo);
        //console.log('execDefferedAction: svc_info = '+JSON.stringify(svc_info));
        let action = localStorage.getItem(this.skey_deffered_action);
        if (action) {
            localStorage.removeItem(this.skey_deffered_action);
            console.log('execDefferedAction: '+action);
            this.serviceActionEx(action);
        }
    },
    
    checkUnsavedChanges: function()
    {
        if (!ui.changes) return false;
        if (!ui.changes.changes) return false;
        return ui.changes.changes[this.appName] ? true : false;
    },

    normalizeValue: function(v) {
        return (v && typeof(v) === 'string') ? v.trim().replace(/\r?\n/g, '') : v;
    },

    getWordsArray: function (text, { trim = true, removeEmpty = true } = {}) {
        const rawLines = text.split(/\n/);
        const processed = trim ? rawLines.map(line => line.trim()) : rawLines.slice();
        return removeEmpty ? processed.filter(line => line.length > 0) : processed;
    },
    
    getConfigPar: function(txt, key, defval = null) {
        const re = new RegExp(`^${key}\\s*=\\s*(['"])(.*?)\\1`, 'm');
        const m = txt.match(re);
        return m ? m[2] : defval;        
    },

    decode_pkg_list: function(pkg_list) {
        let pkg_dict = { };
        if (!pkg_list) {
            return pkg_dict;
        }
        let lines = pkg_list.trim().split('\n');
        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();
            let name;
            let ver;
            let rev = -1;
            if (this.packager.name == 'apk') {
                let fullname = line.split(' ')[0];
                let match = fullname.match(/^(.*)-r(\d+)$/);
                if (match) {
                    fullname = match[1];
                    rev = parseInt(match[2], 10);
                }
                let mpos = fullname.lastIndexOf('-');
                if (mpos <= 0)
                    continue;   // incorrect format
                name = fullname.slice(0, mpos).trim();
                ver = fullname.slice(mpos + 1).trim();
            } else {
                if (!line.includes(' - '))
                    continue;   // incorrect format
                name = line.split(' - ')[0].trim();
                ver  = line.split(' - ')[1].trim();
                let spos = ver.indexOf(" ");
                if (spos > 0) {
                    ver = ver.substring(0, spos);
                }
                let match = ver.match(/^(.*)-r(\d+)$/);
                if (match) {
                    ver = match[1];
                    rev = parseInt(match[2], 10);
                }
            }
            if (rev >= 0) {
                ver += '-r' + rev;
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

    decode_svc_info: function(svc_autorun, svc_info, proc_list, cfg = null)
    {
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
        let plist = proc_list;
        if (proc_list?.code !== undefined) {
            if (proc_list.code != 0) {
                return -2;
            }        
            plist = this.get_pid_list(proc_list.stdout);
            if (plist.length < 4) {
                return -3;
            }
        }
        if (svc_info == null) {
            return null;
        }
        if (typeof(svc_info) !== 'object') {
            return -4;
        }
        let jdata = svc_info;
        if (typeof(jdata[this.appName]) == 'object') {
            result.dmn.inited = true;
            let dmn_list = jdata[this.appName].instances;
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

    makeStatusString: function(svcinfo, pkg_arch, bllist_preset) {
        let svc_autorun = _('Unknown');
        let svc_daemons = _('Unknown');
        
        if (typeof(svcinfo) == 'object' && svcinfo?.autorun !== undefined) {
            svc_autorun = (svcinfo.autorun) ? _('Enabled') : _('Disabled');
            if (!svcinfo.dmn.inited) {
                svc_daemons = _('Stopped');
            } else {
                svc_daemons = (!svcinfo.dmn.working) ? _('Starting') : _('Running');
                svc_daemons += ' [' + svcinfo.dmn.working + '/' + svcinfo.dmn.total + ']';
            }
        }
        let td_name_width = 40;
        let td_name_style = `style="width: ${td_name_width}%; min-width:${td_name_width}%; max-width:${td_name_width}%;"`;
        let out = `
                <table class="table">
                    <tr class="tr">
                        <td class="td left" ${td_name_style}>
                            ${_('CPU architecture')}:
                        </td>
                        <td class="td left">
                            ${pkg_arch}
                        </td>
                    </tr>
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
        __init__: function(opts = {})
        {
            Object.assign(this, {
                file: '',
                title: '',
                desc: '',
                aux: '',
                rows: 10,
                callback: null,
                file_exists: false,
                setperm: 644,
            }, opts);
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
                        'click': ui.createHandlerFn(this, this.handleSaveAdv),
                    }, _('Save')),
                ]),
            ]);
        },

        writeAdv: async function(fileName, data, chunkSize = 8000)
        {
            let tmpFile = fileName + '.tmp';
            try {
                for (let wsize = 0; wsize <= data.length; wsize += chunkSize) {
                    let chunk = data.slice(wsize, wsize + chunkSize);
                    if (wsize > 0 && chunk.length == 0) {
                        break;  // EOF
                    }
                    chunk = chunk.replace(/'/g, `'\"'\"'`);
                    let teeArg = (wsize === 0) ? '' : '-a';
                    let cmd = `printf %s '${chunk}' | tee ${teeArg} '${tmpFile}'`;
                    let res = await fs.exec('/bin/busybox', [ 'sh', '-c', cmd ]);
                    if (res.code !== 0) {
                        throw new Error('tee failed, rc = ' + res.code);
                    }
                }
                if (this.setperm) {
                    let res = await fs.exec('/bin/busybox', [ 'chmod', '' + this.setperm, tmpFile ]);
                    if (res.code != 0) {
                        throw new Error('chmod failed, rc = ' + res.code);
                    }
                }
                let res = await fs.exec('/bin/busybox', [ 'mv', '-f', tmpFile, fileName ]);
                if (res.code != 0) {
                    throw new Error('mv failed, rc = ' + res.code);
                }
            } catch(e) {
                try {
                    await fs.exec('/bin/busybox', [ 'rm', '-f', tmpFile ]);
                } catch(e2) {
                    // nothing
                }
                throw e;
            }
            return fs.stat(fileName);
        },

        handleSaveAdv: async function(ev)
        {
            let txt = document.getElementById('widget.modal_content');
            let value = txt.value.trim().replace(/\r\n/g, '\n');
            if (value.length > 0) {
                value += '\n';
            }
            return this.writeAdv(this.file, value).then(async rc => {
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
        __init__: function(opts = {})
        {
            Object.assign(this, {
                cfgsec: '',
                cfgparam: '',
                title: '',
                desc: '',
                rows: 10,
                multiline: false  // may be 2
            }, opts);
            env_tools.load_env(this);
        },

        load: function() {
            let value = uci.get(this.appName, this.cfgsec, this.cfgparam);
            if (typeof(value) === 'string') {
                value = value.trim();
                if (this.multiline == 2) {
                    value = value.replace(/\n\t/g, "\n");
                    value = value.replace(/\n\t/g, "\n");
                    value = value.replace(/\n\t/g, "\n");
                    value = value.replace(/\n\t/g, "\n");
                    value = value.replace(/\n\t/g, "\n");
                    value = value.replace(/\n\t/g, "\n");
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
                        'click': ui.createHandlerFn(this, this.handleSaveAdv),
                    }, _('Save')),
                ]),
            ]);
        },

        handleSaveAdv: function(ev) {
            let txt = document.getElementById('widget.modal_content');
            let value = txt.value.trim();
            if (this.multiline) {
                value = value.replace(/\r/g, '');
                if (value != "" && value != "\t") {
                    value = '\n' + value + '\n';
                    if (this.multiline == 2) {
                        if (value.includes('"')) {
                            alert(_('Unable to save the contents') + ':\n' + _('text cannot contain quotes!'));
                            return false;
                        }
                        value = value.replace(/"/g, '');
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
            try {
                let elem = document.getElementById("widget.cbid." + this.appName + ".config._" + this.cfgparam);
                if (elem) {
                    let val = value.trim();
                    elem.textContent = val;
                }
            } catch(e) {
                console.error('ERROR: cannot found elem for ' + this.cfgsec + '.' + this.cfgparam);
            }
            uci.set(this.appName, this.cfgsec, this.cfgparam, value);
            uci.save().then(ui.hideModal);
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
            ui.showModal(null,
                E('p', { 'class': 'spinning' }, _('Loading'))
            );
            L.resolveDefault(this.load(), null)
            .then(content => {
                ui.hideModal();
                return this.render(content);
            }).catch(e => {
                ui.hideModal();
                return this.error(e);
            })
        },
    }),

    isModalActive: function()
    {
        return document.body.classList.contains('modal-overlay-active');
    },

    execAndRead: async function({ cmd = [ ], log = '', logArea = null, callback = null, ctx = null, hiderow = [ ] } = {})
    {
        function appendLog(msg, end = '\n')
        {
            logArea.value += msg + end;
            logArea.scrollTop = logArea.scrollHeight;
        }
        function fixLogEnd()
        {
            if (logArea.value && logArea.value.slice(-1) != '\n') {
                appendLog('');
            }
        }
        let hide_rows = Array.isArray(hiderow) ? hiderow : [ hiderow ];
        const logFile = log;  // file for reading: '/tmp/zapret_pkg_install.log'
        const rcFile = logFile + '.rc';
        try {
            await fs.exec('/bin/busybox', [ 'rm', '-f', logFile ], null);
            await fs.exec('/bin/busybox', [ 'rm', '-f', rcFile  ], null);
            //appendLog('Output file cleared!');
        } catch (e) {
            return callback.call(ctx, 500, 'ERROR: Failed to clear output file');
        }
        let execRetCode = -1;
        let opt_list = [ logFile ];
        try {
            opt_list.push(...cmd);
            //console.log('script-exec.sh ... '+JSON.stringify(opt_list));
            fs.exec(this.appDir+'/script-exec.sh', opt_list, null)
            .then( (res) => {
                if (execRetCode < 0) {
                    execRetCode = res.code;
                    fixLogEnd();
                    if (res.code == 0) {
                        appendLog('Process started....');
                    } else {
                        if (res.stdout) appendLog(res.stdout);
                        appendLog('ERROR: process not executed! ret_code = '+res.code);
                    }
                }
            }).catch( (e) => { 
                console.log('ERROR: execAndRead: process not exec: '+e.message);
                execRetCode = -100;
            });
        } catch (e) {
            return callback.call(ctx, 520, 'ERROR: Failed on execute process: ' + e.message);
        }
        let lastLen = 0;
        let retCode = -2;  // rc file not found
        return await new Promise(async (resolve, reject) => {
            let ticks = 0;
            async function epoll()
            {
                ticks += 1;
                try {
                    if (retCode < 0) {
                        let rc = await fs.exec('/bin/cat', [ rcFile ], null);
                        if (rc.code != 0) {
                            if (ticks >= 2) {
                                console.log('ERROR: execAndRead: '+JSON.stringify(opt_list));
                                fixLogEnd();
                                resolve(callback.call(ctx, 542, 'ERROR: Failed on read process rc-file: code = ' + rc.code));
                                return;
                            }
                            console.log('WARN: execAndRead: read rc-file res.code = '+rc.code);
                        }
                        if (rc.code == 0) {
                            if (rc.stdout) {
                                retCode = parseInt(rc.stdout.trim(), 10);
                            } else {
                                retCode = -1;  // rc file exists, but empty
                            }
                        }
                        if (retCode <= -2) {
                            setTimeout(epoll, 500);
                            return;  // skip first step with error
                        }
                    }
                    let res = await fs.exec('/bin/cat', [ logFile ], null);
                    if (res.code != 0) {
                        fixLogEnd();
                        resolve(callback.call(ctx, 546, 'ERROR: Failed on read process log: code = ' + res.code));
                        return;
                    }
                    if (execRetCode < 0) {
                        execRetCode = 9999;
                        appendLog('Process started...');
                    }
                    if (res.code == 0 && res.stdout && res.stdout.length > lastLen) {
                        let log = res.stdout.slice(lastLen);
                        hide_rows.forEach(re => {
                            log = log.replace(re, '');
                        });                    
                        appendLog(log, '');
                        lastLen = res.stdout.length;
                    }
                    if (retCode >= 0) {
                        fixLogEnd();
                        if (retCode == 0 && res.stdout) {
                            resolve(callback.call(ctx, 0, res.stdout));
                            return;
                        }
                        resolve(callback.call(ctx, retCode, 'ERROR: Process failed with error ' + retCode));
                        return;
                    }
                    setTimeout(epoll, 500);
                } catch (e) {
                    let skip_err = false;
                    if (e.message?.includes('RPC call to file/exec failed with error -32000: Object not found')) {
                        skip_err = true;
                    }
                    if (e.message?.includes('XHR request timed out')) {
                        skip_err = true;
                    }
                    if (skip_err) {
                        console.warn('WARN: execAndRead: ' + e.message);
                        setTimeout(epoll, 500);
                        return;  // goto next epoll iteration
                    }
                    fixLogEnd();
                    let errtxt = 'ERROR: execAndRead: ' + e.message;
                    errtxt    += 'ERROR: execAndRead: ' + e.stack?.trim().split('\n')[0];
                    callback.call(ctx, 540, errtxt);
                    reject(e);
                }
            }
            epoll();
        });
    },

    POLLER: baseclass.extend({
        __init__: function(opts = { })
        {
            Object.assign(this, {
                interval: 1000, // milliseconds
                func: null,
                active: false,
                running: false,
            }, opts);
            env_tools.load_env(this);
            this.ticks = 0;
            this.timer = null;
            this.mode = 0;
        },

        init: function(func, interval = null)
        {
            this.func = func;
            if (interval) {
                this.interval = interval;
            }
        },

        start: function(delay = 0)
        {
            if (this.active) {
                return;
            }
            this.ticks = 0;
            this.active = true;
            if (delay === null) {
                this.step();
                delay = this.interval;
            }
            this.timer = window.setTimeout(this.step.bind(this), delay);
            return true;
        },

        stop: function()
        {
            this.active = false;
            if (this.timer) {
                window.clearTimeout(this.timer);
                this.timer = null;
            }
        },
        
        step: function()
        {
            if (!this.active) {
                return;
            }
            if (this.timer) {
                window.clearTimeout(this.timer);
            }
            if (this.mode == 1 && this.running) {
                this.timer = window.setTimeout(this.step.bind(this), 100);
                return;
            }
            this.ticks += 1;
            this.running = true;
            Promise.resolve(this.func()).finally((function() { 
                if (this.mode == 0) {
                    this.running = false;
                }
                this.timer = null;
                if (this.active) {
                    this.timer = window.setTimeout(this.step.bind(this), this.interval);
                }
            }).bind(this));
        },

        stopAndWait: async function(interval = 50)
        {
            this.stop();
            if (!this.running) {
                return;
            }
            return new Promise((resolve) => {
                if (!this.running) {
                    return resolve();
                }
                const timer = setInterval(() => {
                    if (!this.running) {
                        resolve();
                    }
                }, interval);
            });
        },
    }),

    // original code: https://github.com/openwrt/luci/blob/95319793a27a3554be06070db8c6db71c6e28df1/modules/luci-base/htdocs/luci-static/resources/ui.js#L5342
    createHandlerFnEx: function(ctx, fn, opts = { }, ...args)
    {
        if (typeof(fn) === 'string') {
            fn = ctx[fn];
        }
        if (typeof(fn) !== 'function') {
            return null;
        }
        const {
            callback = null,   // callback(btn, result, error)
            keepDisabled = false,
            noSpin = false
        } = opts;
        return L.bind(function() {
            const btn = arguments[args.length].currentTarget;
            if (!noSpin) {
                btn.classList.add('spinning');
            }
            btn.disabled = true;
            if (btn.blur) btn.blur();
            let result, error;
            return Promise
                .resolve()
                .then(() => fn.apply(ctx, arguments))
                .then(r => { result = r; })
                .catch(e => { error = e; })
                .finally(() => {
                    if (!noSpin) {
                        btn.classList.remove('spinning');
                    }
                    if (!keepDisabled) {
                        btn.disabled = false;
                    }
                    if (typeof(callback) === 'function') {
                        callback.call(ctx, btn, result, error);
                    }
                    if (error) {
                        throw error;
                    }
                });
        }, ctx, ...args);
    },
});
