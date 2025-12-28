'use strict';
'require baseclass';
'require fs';
'require poll';
'require uci';
'require ui';
'require view';
'require view.zapret2.tools as tools';

const btn_style_neutral  = 'btn';
const btn_style_action   = 'btn cbi-button-action';
const btn_style_positive = 'btn cbi-button-save important';
const btn_style_negative = 'btn cbi-button-reset important';
const btn_style_warning  = 'btn cbi-button-negative';
const btn_style_success  = 'btn cbi-button-success important';

const fn_update_pkg_sh   = '/opt/zapret2/update-pkg.sh';

return baseclass.extend({
    releasesUrlPrefix : 'https://raw.githubusercontent.com/remittor/zapret-openwrt/gh-pages/releases/',
    
    appendLog: function(msg, end = '\n') {
        this.logArea.value += msg + end;
        this.logArea.scrollTop = this.logArea.scrollHeight;
    },

    setBtnMode: function(enable) {
        this.btn_cancel.disabled = enable ? false : true;
        this.btn_action.disabled = (enable == 2) ? false : true;
    },
    
    setStage: function(stage, btn_flag = true) {
        if (stage == 0) {
            this.btn_action.textContent = _('Check for updates');
            this.btn_action.classList.remove('hidden');
        } else
        if (stage == 1) {
            this.btn_action.textContent = _('Update packages');
            this.btn_action.classList.remove('hidden');
        } else {
            this.btn_action.classList.add('hidden');
        }
        if (stage > 1 && typeof(this.btn_action) == 'object') {
            this.setBtnMode(1);
        }
        this.stage = stage;
    },
    
    checkUpdates: function() {
        this.setStage(0);
        this.setBtnMode(0);
        this.pkg_url = null;
        this.appendLog(_('Checking for updates...'));
        let opt_list = [ '-c' ];  // check for updates
        if (document.getElementById('cfg_exclude_prereleases').checked == false) {
            opt_list.push('-p');  // include prereleases ZIP-files 
        }
        let forced_reinstall = document.getElementById('cfg_forced_reinstall').checked;
        let rpc_opt = { timeout: 20*1000 }
        //rpc_opt.uid = 0;  // run under root
        let res = fs.exec(fn_update_pkg_sh, opt_list, null, rpc_opt).then(res => {
            let log = res.stdout.trim();
            this.appendLog(log);
            let code = log.match(/^RESULT:\s*\(([^)]+)\)\s+.+$/m);
            let pkg_url = log.match(/^ZAP_PKG_URL\s*=\s*(.+)$/m);
            if (res.code == 0 && code && pkg_url) {
                this.pkg_url = pkg_url[1];
                code = code[1];
                if (code == 'E' && !forced_reinstall) {
                    this.setStage(999);
                    return 0;
                }
                this.setStage(1);
                this.setBtnMode(2);  // enable all buttons
            } else {
                if (res.code != 0) {
                    this.appendLog('ERROR: Check for updates failed with error ' + res.code);
                }
                this.setStage(999);
            }
            return res.code;
        }).catch(e => {
            this.appendLog('ERROR: ' + _('Updates checking failed'));
            this.appendLog('ERROR: ' + e);
            this.setStage(999);
            return 1;
        }).finally(() => {
            this.appendLog('=========================================================');
        });
    },

    installUpdates: async function() {
        this.setStage(1);
        this.setBtnMode(0);
        if (!this.pkg_url || this.pkg_url.length < 10) {
            this.appendLog('ERROR: pkg_url = null');
            this.setStage(999);
            return 1;
        }
        this.appendLog(_('Install updates...'));
        let opt_list = [ '-u', this.pkg_url ];  // update packages
        if (document.getElementById('cfg_forced_reinstall').checked == true) {
            opt_list.push('-f');  // forced reinstall if same version
        }
        let rpc_opt = { timeout: 5*1000 }
        //rpc_opt.uid = 0;  // run under root
        const logFile = '/tmp/zapret2_pkg_install.log';
        const rcFile = logFile + '.rc';
        try {
            await fs.exec('/bin/busybox', [ 'rm', '-f', logFile + '*' ], null, rpc_opt);
            this.appendLog('Install log cleared.');
        } catch (e) {
            this.appendLog('ERROR: Failed to clear log file');
            this.setStage(999);
            return 1;
        }
        try {
            let opt = [ logFile, fn_update_pkg_sh ];
            //opt.push('-t'); opt.push('0');  // only for testing
            opt.push(...opt_list);
            let res = await fs.exec('/opt/zapret2/script-exec.sh', opt, null, rpc_opt);
            if (res.code == 0) {
                this.appendLog('Process started...');
            } else {
                this.appendLog('ERROR: cannot run ' + fn_update_pkg_sh + ' script! (error = ' + res.code + ')');
                throw new Error('cannot run script');
            }
        } catch (e) {
            this.appendLog('ERROR: Failed to start process: ' + e.message);
            this.setStage(999);
            return 1;
        }
        let lastLen = 0;
        let retCode = -1;
        let timerBusy = false;
        let timer = setInterval(async () => {
            if (timerBusy)
                return;  // skip iteration
            timerBusy = true;
            try {
                let res = await fs.exec('/bin/cat', [ logFile ], null, rpc_opt);
                if (res.stdout && res.stdout.length > lastLen) {
                    let log = res.stdout.slice(lastLen);
                    log = log.replace(/^ \* resolve_conffiles.*(?:\r?\n|$)/gm, '');
                    this.appendLog(log, '');
                    lastLen = res.stdout.length;
                }
                if (retCode < 0) {
                    let rc = await fs.exec('/bin/cat', [ rcFile ], null, rpc_opt);
                    if (rc.code != 0) {
                        throw new Error('cannot read file "' + rcFile + '"');
                    }
                    if (rc.stdout) {
                        retCode = parseInt(rc.stdout.trim(), 10);
                    }
                }
                if (retCode >= 0) {
                    clearInterval(timer);
                    this.appendLog('\n' + 'Process finished.');
                    if (res.stdout) {
                        let code = res.stdout.match(/^RESULT:\s*\(([^)]+)\)\s+.+$/m);
                        if (retCode == 0 && code && code[1] == '+') {
                            this.stage = 999;
                            this.btn_action.textContent = _('OK');
                            this.btn_action.disabled = false;
                            this.btn_cancel.disabled = true;
                            return 0;
                        }
                    }
                    this.appendLog('ERROR: Install updates failed with error ' + retCode);
                    this.setStage(999);
                }
            } catch (e) {
                clearInterval(timer);
                this.appendLog('ERROR: installUpdates: ' + e.message);
                this.appendLog('ERROR: installUpdates: ' + e.stack?.trim().split('\n').pop());
                this.setStage(999);
            } finally {
                timerBusy = false;
            }
        }, 500);
    },
    
    openUpdateDialog: function(pkg_arch) {
        this.stage = 0;
        this.pkg_arch = pkg_arch;
        this.pkg_url = null;

        let exclude_prereleases = E('label', [
            E('input', { type: 'checkbox', id: 'cfg_exclude_prereleases', checked: true }),
            ' ', _('Exclude PreReleases')
        ]);

        let forced_reinstall = E('label', [
            E('input', { type: 'checkbox', id: 'cfg_forced_reinstall'}),
            ' ', _('Forced reinstall packages')
        ]);

        this.logArea = E('textarea', {
            'readonly': true,
            'style': 'width:100%; height:400px; font-family: monospace;'
        });

        this.btn_cancel = E('button', {
            'id': 'btn_cancel',
            'name': 'btn_cancel',
            'class': btn_style_warning,
        }, _('Cancel'));
        this.btn_cancel.onclick = ui.hideModal;

        this.btn_action = E('button', {
            'id': 'btn_action',
            'name': 'btn_action',
            'class': btn_style_action,
        }, 'BUTTON_ACTION');
        this.btn_action.onclick = ui.createHandlerFn(this, () => {
            if (this.stage == 0) {
                return this.checkUpdates();
            }
            if (this.stage == 1) {
                return this.installUpdates();
            }
            return ui.hideModal();
        });
        
        this.setStage(0);
        this.setBtnMode(2);

        ui.showModal(_('Package update'), [
            E('div', { 'class': 'cbi-section' }, [
                exclude_prereleases,
                E('br'), E('br'),
                forced_reinstall,
                E('br'), E('br'),
                E('hr'),
                this.logArea,
            ]),
            E('div', { 'class': 'right' }, [
                this.btn_cancel,
                ' ',
                this.btn_action,
            ])
        ]);
    }    
});
