'use strict';
'require baseclass';
'require fs';
'require rpc';
'require ui';
'require uci';
'require view.zapret.env as env_tools';

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
        let ses_var_name = this.appName+'_pkgdict';
        let exec_cmd = this.packager.path;
        let exec_arg = this.packager.args;
        return fs.exec(exec_cmd, exec_arg).then(res => {
            let pdict_json = sessionStorage.getItem(ses_var_name);
            if (res.code != 0) {
                console.log(this.appName + ': Unable to enumerate installed packages. code = ' + res.code);
                if (pdict_json != null) {
                    return JSON.parse(pdict_json);  // return cached value
                }
                return null;
            }
            let pdict = this.decode_pkg_list(res.stdout);
            if (pdict != pdict_json) {
                sessionStorage.setItem(ses_var_name, JSON.stringify(pdict));  // renew cache
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
        if (proc_list.code != 0) {
            return -2;
        }        
        let plist = this.get_pid_list(proc_list.stdout);
        
        if (plist.length < 4) {
            return -3;
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
        
        if (typeof(svcinfo) == 'object') {
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
                        if (value.includes("'") || value.includes('"')) {
                            alert(_('Unable to save the contents') + ':\n' + _('text cannot contain quotes!'));
                            return false;
                        }
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

    execAndRead: async function({ cmd = [ ], log = '', logArea = null, callback = null, cbarg = null, hiderow = [ ], rpc_timeout = 5, rpc_root = false } = {})
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
        let rpc_opt = { "timeout": rpc_timeout*1000 };
        if (rpc_root) {
            rpc_opt.uid = 0;  // run under root
        }
        const logFile = log;  // file for reading: '/tmp/zapret_pkg_install.log'
        const rcFile = logFile + '.rc';
        try {
            await fs.exec('/bin/busybox', [ 'rm', '-f', logFile + '*' ], null, rpc_opt);
            appendLog('Output file cleared!');
        } catch (e) {
            return callback(cbarg, 500, 'ERROR: Failed to clear output file');
        }
        try {
            let opt_list = [ logFile ];
            opt_list.push(...cmd);
            let res = await fs.exec(this.appDir+'/script-exec.sh', opt_list, null, rpc_opt);
            if (res.code != 0) {
                return callback(cbarg, 525, 'ERROR: cannot run "' + cmd[0] + '" script! (error = ' + res.code + ')');
            }
            appendLog('Process started...');
        } catch (e) {
            return callback(cbarg, 520, 'ERROR: Failed on execute process: ' + e.message);
        }
        let lastLen = 0;
        let retCode = -1;
        return await new Promise(async (resolve, reject) => {
            async function poll()
            {
                try {
                    let res = await fs.exec('/bin/cat', [ logFile ], null, rpc_opt);
                    if (res.stdout && res.stdout.length > lastLen) {
                        let log = res.stdout.slice(lastLen);
                        hide_rows.forEach(re => {
                            log = log.replace(re, '');
                        });                    
                        appendLog(log, '');
                        lastLen = res.stdout.length;
                    }
                    if (retCode < 0) {
                        let rc = await fs.exec('/bin/cat', [ rcFile ], null, rpc_opt);
                        if (rc.code != 0) {
                            fixLogEnd();
                            resolve(callback(cbarg, 545, 'ERROR: cannot read file "' + rcFile + '"'));
                            return;
                        }
                        if (rc.stdout) {
                            retCode = parseInt(rc.stdout.trim(), 10);
                        }
                    }
                    if (retCode >= 0) {
                        fixLogEnd();
                        if (retCode == 0 && res.stdout) {
                            resolve(callback(cbarg, 0, res.stdout));
                            return;
                        }
                        resolve(callback(cbarg, retCode, 'ERROR: Process failed with error ' + retCode));
                        return;
                    }
                    setTimeout(poll, 500);
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
                        setTimeout(poll, 500);
                        return;  // goto next poll iteration
                    }
                    fixLogEnd();
                    let errtxt = 'ERROR: execAndRead: ' + e.message;
                    errtxt    += 'ERROR: execAndRead: ' + e.stack?.trim().split('\n')[0];
                    callback(cbarg, 540, errtxt);
                    reject(e);
                }
            }
            poll();
        });
    },

});
