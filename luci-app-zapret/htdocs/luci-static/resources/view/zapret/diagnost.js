'use strict';
'require baseclass';
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

const fn_dwc_sh   = '/opt/'+tools.appName+'/dwc.sh';

return baseclass.extend({
    appendLog: function(msg, end = '\n')
    {
        this.logArea.value += msg + end;
        this.logArea.scrollTop = this.logArea.scrollHeight;
    },

    dpiCheck: async function()
    {
        this._action = 'dpiCheck';
        this.appendLog('DPI check [tcp 16-20]...');
        this.appendLog('Original sources: https://github.com/hyperion-cs/dpi-checkers');
        this.appendLog('WEB-version: https://hyperion-cs.github.io/dpi-checkers/ru/tcp-16-20/');
        let cmd = [ fn_dwc_sh ];
        let log = '/tmp/'+tools.appName+'_dwc.log';
        let callback = this.execAndReadCallback;
        let wnd = this;
        return tools.execAndRead({ cmd: cmd, log: log, logArea: this.logArea, callback: callback, cbarg: wnd });
    },

    execAndReadCallback: function(wnd, rc, txt = '')
    {
        if (rc == 0 && txt) {
            if (wnd._action == 'dpiCheck') {
                wnd.appendLog('=========================================================');
                return;
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
        wnd.appendLog('=========================================================');
    },

    openDiagnostDialog: function(pkg_arch)
    {
        this.pkg_arch = pkg_arch;

        this.logArea = E('textarea', {
            'id': 'widget.modal_content',
            'readonly': true,
            'style': 'width:100% !important; font-family: monospace;',
            'rows': 26,
            'wrap': 'off',
        });

        this.btn_cancel = E('button', {
            'id': 'btn_cancel',
            'name': 'btn_cancel',
            'class': btn_style_warning,
        }, _('Cancel'));
        this.btn_cancel.onclick = ui.hideModal;

        this.btn_dpicheck = E('button', {
            'id': 'btn_dpicheck',
            'name': 'btn_dpicheck',
            'class': btn_style_action,
        }, _('DPI check [tcp 16-20]'));
        this.btn_dpicheck.onclick = ui.createHandlerFn(this, () => { this.dpiCheck() });
        
        ui.showModal(_('Diagnostics'), [
            E('div', { 'class': 'cbi-section' }, [
                this.logArea,
            ]),
            E('div', { 'class': 'right' }, [
                this.btn_dpicheck,
                ' ',
                this.btn_cancel,
            ])
        ]);
    }    
});
