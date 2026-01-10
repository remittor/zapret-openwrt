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

    setBtnMode: function(enable)
    {
        this.btn_cancel.disabled = enable ? false : true;
        this.btn_action.disabled = (enable == 2) ? false : true;
    },
    
    setStage: function(stage, btn_flag = true)
    {
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
    
    checkUpdates: async function()
    {
        this._action = 'checkUpdates';
        this.setStage(0);
        this.setBtnMode(0);
        this.pkg_url = null;
        this.appendLog(_('Checking for updates...'));
        let cmd = [ fn_update_pkg_sh, '-c' ];  // check for updates
        if (document.getElementById('cfg_exclude_prereleases').checked == false) {
            cmd.push('-p');  // include prereleases ZIP-files
        }
        this.forced_reinstall = document.getElementById('cfg_forced_reinstall').checked;
        let log = '/tmp/'+tools.appName+'_pkg_check.log';
        let callback = this.execAndReadCallback;
        let wnd = this;
        return tools.execAndRead({ cmd: cmd, log: log, logArea: this.logArea, callback: callback, cbarg: wnd });
    },

    installUpdates: async function()
    {
        this._action = 'installUpdates';
        this.setStage(1);
        this.setBtnMode(0);
        if (!this.pkg_url || this.pkg_url.length < 10) {
            this.appendLog('ERROR: pkg_url = null');
            this.setStage(999);
            return;
        }
        this.appendLog(_('Install updates...'));
        let cmd = [ fn_update_pkg_sh, '-u', this.pkg_url ];  // update packages
        if (document.getElementById('cfg_forced_reinstall').checked == true) {
            cmd.push('-f');  // forced reinstall if same version
        }
        //this._test = 1; cmd.push('-t'); cmd.push('45');  // only for testing
        let log = '/tmp/'+tools.appName+'_pkg_install.log';
        let hiderow = /^ \* resolve_conffiles.*(?:\r?\n|$)/gm;
        let callback = this.execAndReadCallback;
        let wnd = this;
        return tools.execAndRead({ cmd: cmd, log: log, logArea: this.logArea, hiderow: hiderow, callback: callback, cbarg: wnd });
    },

    execAndReadCallback: function(wnd, rc, txt = '')
    {
        //console.log('execAndReadCallback = ' + rc + '; _action = ' + wnd._action);
        if (rc == 0 && txt) {
            let code = txt.match(/^RESULT:\s*\(([^)]+)\)\s+.+$/m);
            if (wnd._action == 'checkUpdates') {
                let pkg_url = txt.match(/^ZAP_PKG_URL\s*=\s*(.+)$/m);
                if (code && pkg_url) {
                    wnd.appendLog('=========================================================');
                    wnd.pkg_url = pkg_url[1];
                    code = code[1];
                    if (code == 'E' && !wnd.forced_reinstall) {
                        wnd.setStage(999);  // install not needed
                        return;
                    }
                    wnd.setStage(1);
                    wnd.setBtnMode(2);  // enable all buttons
                    return;  // install allowed
                }
            }
            if (wnd._action == 'installUpdates') {
                if (wnd._test || (code && code[1] == '+')) {
                    wnd.stage = 999;
                    wnd.btn_action.textContent = _('OK');
                    wnd.btn_action.disabled = false;
                    wnd.btn_cancel.disabled = true;
                    return;
                }
            }
        }
        if (rc >= 500) {
            if (txt) {
                wnd.appendLog(txt.startsWith('ERROR') ? txt : 'ERROR: ' + txt);
            } else {
                wnd.appendLog('ERROR: ' + wnd._action + ': Terminated with error code = ' + rc);
            }
        } else {
            wnd.appendLog('ERROR: Process finished with retcode = ' + rc);
        }
        wnd.setStage(999);
        if (wnd._action == 'checkUpdates') {
            wnd.appendLog('=========================================================');
        }
    },

    openUpdateDialog: function(pkg_arch)
    {
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
