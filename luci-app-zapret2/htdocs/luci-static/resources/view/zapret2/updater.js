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

const fn_update_pkg_sh   = '/opt/'+tools.appName+'/update-pkg.sh';

return baseclass.extend({
    releasesUrlPrefix : 'https://raw.githubusercontent.com/remittor/zapret-openwrt/gh-pages/releases/',
    
    appendLog: function(msg, end = '\n')
    {
        this.logArea.value += msg + end;
        this.logArea.scrollTop = this.logArea.scrollHeight;
    },

    setBtnMode: function(check, install, cancel)
    {
        this.btn_check.disabled   = check   ? false : true;
        this.btn_install.disabled = install ? false : true;
        this.btn_cancel.disabled  = cancel  ? false : true;
    },
    
    setStage: function(stage, btn_flag = true)
    {
        if (stage == 0) this.setBtnMode(1, 0, 1);
        if (stage == 1) this.setBtnMode(0, 0, 1);
        if (stage == 2) this.setBtnMode(1, 1, 1);
        if (stage == 3) this.setBtnMode(0, 0, 0);
        if (stage == 8) this.setBtnMode(0, 0, 1);
        if (stage >= 9) this.setBtnMode(0, 0, 0);
        this.stage = stage;
    },

    checkUpdates: async function(ev)
    {
        this._action = 'checkUpdates';
        this.setStage(1);
        this.pkg_url = null;
        this.appendLog(_('Checking for updates...'));
        let cmd = [ fn_update_pkg_sh, '-c' ];  // check for updates
        if (document.getElementById('cfg_exclude_prereleases').checked == false) {
            cmd.push('-p');  // include prereleases ZIP-files
        }
        this.forced_reinstall = document.getElementById('cfg_forced_reinstall').checked;
        return tools.execAndRead({
            cmd: cmd,
            log: '/tmp/'+tools.appName+'_pkg_check.log',
            logArea: this.logArea,
            callback: this.execAndReadCallback,
            ctx: this,
        });
    },

    installUpdates: async function(ev)
    {
        if (!this.pkg_url || this.pkg_url.length < 10) {
            this.appendLog('ERROR: pkg_url = null');
            this.setStage(9);
            return;
        }
        this._action = 'installUpdates';
        this.setStage(3);
        this.appendLog(_('Install updates...'));
        let cmd = [ fn_update_pkg_sh, '-u', this.pkg_url ];  // update packages
        if (document.getElementById('cfg_forced_reinstall').checked == true) {
            cmd.push('-f');  // forced reinstall if same version
        }
        //this._test = 1; cmd.push('-t'); cmd.push('45');  // only for testing
        return tools.execAndRead({
            cmd: cmd,
            log: '/tmp/'+tools.appName+'_pkg_install.log',
            logArea: this.logArea,
            hiderow: /^ \* resolve_conffiles.*(?:\r?\n|$)/gm,
            callback: this.execAndReadCallback,
            ctx: this,
        });
    },

    execAndReadCallback: function(rc, txt = '')
    {
        //console.log('execAndReadCallback = ' + rc + '; _action = ' + this._action);
        if (rc == 0 && txt) {
            let code = txt.match(/^RESULT:\s*\(([^)]+)\)\s+.+$/m);
            if (this._action == 'checkUpdates') {
                this.appendLog('=========================================================');
                if (code && code[1] == 'E') {
                    this.btn_install.textContent = _('Reinstall');
                } else {
                    this.btn_install.textContent = _('Install');
                }
                let pkg_url = txt.match(/^ZAP_PKG_URL\s*=\s*(.+)$/m);
                if (code && pkg_url) {
                    if (!this.forced_reinstall) {
                        if (code[1] == 'E' || code[1] == 'G') {
                            this.setStage(0);  // install not needed
                            return;
                        }
                    }
                    this.pkg_url = pkg_url[1];
                    this.setStage(2);  // enable all buttons
                    return;  // install allowed
                }
            }
            if (this._action == 'installUpdates') {
                if (this._test || (code && code[1] == '+')) {
                    this.setStage(9);
                    this.appendLog('Please update WEB-page (press F5)');
                    return;
                }
            }
        }
        this.setStage(0);
        if (rc >= 500) {
            if (txt) {
                this.appendLog(txt.startsWith('ERROR') ? txt : 'ERROR: ' + txt);
            } else {
                this.appendLog('ERROR: ' + this._action + ': Terminated with error code = ' + rc);
            }
        } else {
            this.appendLog('ERROR: Process finished with retcode = ' + rc);
        }
        this.appendLog('=========================================================');
    },

    openUpdateDialog: function(pkg_arch)
    {
        if (tools.checkUnsavedChanges()) {
            ui.addNotification(null, E('p', _('You have unapplied changes')));
            return;
        }
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
            'id': 'widget.modal_content',
            'readonly': true,
            'style': 'width:100% !important; font-family: monospace;',
            'rows': 20,
            'wrap': 'off',
        });

        this.btn_cancel = E('button', {
            'id': 'btn_cancel',
            'name': 'btn_cancel',
            'class': btn_style_warning,
        }, _('Cancel'));
        this.btn_cancel.onclick = ui.hideModal;

        this.btn_check = E('button', {
            'id': 'btn_check',
            'name': 'btn_check',
            'class': btn_style_action,
        }, _('Check'));
        this.btn_check.onclick = ui.createHandlerFn(this, this.checkUpdates);

        this.btn_install = E('button', {
            'id': 'btn_install',
            'name': 'btn_install',
            'class': btn_style_positive,
        }, _('Install'));
        this.btn_install.onclick = ui.createHandlerFn(this, async () => {
            let res = await this.installUpdates();
            if (true) {
                setTimeout(() => {
                    this.btn_install.disabled = true;
                }, 0);
            }
        });
        
        this.setStage(0);

        ui.showModal(_('Check for updates and install'), [
            E('div', { 'class': 'cbi-section' }, [
                exclude_prereleases,
                E('br'), E('br'),
                forced_reinstall,
                E('br'), E('br'),
                E('hr'),
                this.logArea,
            ]),
            E('div', { 'style': 'display:flex; justify-content:space-between; align-items:center; margin-top:1px;' }, [
                E('div', { 'class': 'left' }, [
                    this.btn_check,
                    ' ',
                    this.btn_install,
                ]),
                E('div', { 'class': 'right' }, [
                    ' ',
                    this.btn_cancel,
                ]),
            ]),
        ]);
    },
});
