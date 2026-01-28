'use strict';
'require view';
'require fs';
'require form';
'require poll';
'require uci';
'require ui';
'require view.zapret.tools as tools';

return view.extend({
    POLL: new tools.POLLER( { } ),
    
    retrieveLog: async function()
    {
        return tools.promiseAllDict({
            filereader   : L.resolveDefault(fs.stat('/bin/cat'), null),
            log_data     : fs.exec('/usr/bin/find', [ '/tmp', '-maxdepth', '1', '-type', 'f', '-name', tools.appName+'+*.log' ]),
        }).then( (data) => {
            var filereader = data.filereader ? data.filereader.path : null;
            var log_data   = data.log_data;   // stdout: multiline text
            if (log_data?.code === undefined || log_data.code != 0) {
                ui.addNotification(null, E('p', _('Unable to get log files') + '(code = ' + log_data.code + ') : retrieveLog()'));
                return null;
            }
            var reason = '';
            var uci_cfg = uci.get(tools.appName, 'config');
            if (uci_cfg !== null && typeof(uci_cfg) === 'object') {
                let flag = uci_cfg.DAEMON_LOG_ENABLE;
                if (flag != '1') {
                    reason = ' (Reason: option DAEMON_LOG_ENABLE = ' + flag + ')';
                }
            }
            if (typeof(log_data.stdout) !== 'string') {
                return 'Log files not found.' + reason;
            }
            var log_list = log_data.stdout.trim().split('\n');
            if (log_list.length <= 0) {
                return 'Log files not found!' + reason;
            }
            for (let i = 0; i < log_list.length; i++) {
                let logfn = log_list[i].trim();
                if (logfn.startsWith('/tmp/') && logfn.endsWith('+main.log')) {
                    log_list.splice(i, 1);
                    log_list.unshift(logfn);
                    break;
                }
            }
            var tasks = [ ];
            var logdata = [ ];
            for (let i = 0; i < log_list.length; i++) {
                let logfn = log_list[i].trim();
                if (logfn.startsWith('/tmp/')) {
                    //console.log('LOG: ' + logfn);
                    logdata.push( { filename: logfn, data: null, rows: 0 } );
                    tasks.push( fs.read_direct(logfn) );
                }
            }
            return Promise.all(tasks).then(function(log_array) {
                for (let i = 0; i < log_array.length; i++) {
                    if (log_array[i]) {
                        logdata[i].data = log_array[i];
                        logdata[i].rows = tools.getLineCount(log_array[i]) + 1;
                    }
                }
                return logdata;
            }).catch(function(e) {
                ui.addNotification(null, E('p', _('Unable to execute or read contents')
                    + ': %s [ %s | %s | %s ]'.format(
                        e.message, 'retrieveLogData', 'uci.'+tools.appName
                )));
                return null;
            });
        }).catch( (e) => {
            const [, lineno, colno] = e.stack.match(/(\d+):(\d+)/);
            ui.addNotification(null, E('p', _('Unable to execute or read contents')
                + ': %s [ lineno: %s | %s | %s | %s ]'.format(
                    e.message, lineno, 'retrieveLog', 'uci.'+tools.appName
            )));
            return null;
        }).finally( () => {
            this.POLL.running = false;
        });
    },

    pollLog: async function()
    {
        let logdate_len = -2;
        let logdata;
        for (let txt_id = 0; txt_id < 10; txt_id++) {
            let elem = document.getElementById('dmnlog_' + txt_id);
            if (!elem)
                break;
            if (logdate_len == -2) {
                logdata = await this.retrieveLog();
                logdate_len = (Array.isArray(logdata)) ? logdata.length : -1;
            }
            let elem_name = elem.getAttribute("name");
            let found = false;
            if (logdate_len > 0) {
                for (let log_num = 0; log_num < logdate_len; log_num++) {
                    if (logdata[log_num].filename == elem_name) {
                        if (logdata[log_num].data) {
                            elem.value = logdata[log_num].data;
                            elem.rows  = logdata[log_num].rows;
                            found = true;
                            //console.log('POLL: updated ' + elem_name);
                        }
                        break;
                    }
                }
            }
            if (!found) {
                elem.value = '';
                elem.rows  = 0;
            }
        }
    },

    load: function()
    {
        return tools.baseLoad(this, (data) => {
            tools.load_feat_env();
            this.svc_info = data.svc_info;
            return this.retrieveLog();
        });
    },
    
    render: function(logdata)
    {
        if (typeof(logdata) === 'string') {
            return E('div', {}, [
                E('p', {'class': 'cbi-title-field'}, [ logdata ]),
            ]);
        }
        if (!logdata || !Array.isArray(logdata)) {
            ui.addNotification(null, E('p', _('Unable to get log files') + ' : render()'));
            return;
        }
        var h2 = E('div', {'class' : 'cbi-title-section'}, [
            E('h2', {'class': 'cbi-title-field'}, [ ]),
        ]);

        var tabs = E('div', {}, E('div'));

        for (let log_num = 0; log_num < logdata.length; log_num++) {
            //console.log('REN: ' + logdata[log_num].filename + ' : ' + logdata[log_num].data.length);
            var logfn = logdata[log_num].filename;
            let filename = logfn.replace(/.*\//, '');
            let fname = filename.split('.')[0];
            if (tools.appName == 'zapret2') {
                fname = fname.replace(/^(zapret2\+)/, '');
            } else {
                fname = fname.replace(/^(zapret\+)/, '');
            }
            let fn = fname.split('+');
            
            let tabNameText = fname.replace(/\+/g, ' ');
            let tabname = 'tablog_' + log_num;

            var scrollDownButton = null;
            var scrollUpButton = null;

            scrollDownButton = E('button', {
                    'id': 'scrollDownButton_' + log_num,
                    'class': 'cbi-button cbi-button-neutral'
                }, _('Scroll to tail', 'scroll to bottom (the tail) of the log file')
            );
            scrollDownButton.addEventListener('click', function() {
                scrollUpButton.focus();
            });

            scrollUpButton = E('button', {
                    'id' : 'scrollUpButton_' + log_num,
                    'class': 'cbi-button cbi-button-neutral'
                }, _('Scroll to head', 'scroll to top (the head) of the log file')
            );
            scrollUpButton.addEventListener('click', function() {
                scrollDownButton.focus();
            });
            
            let log_id = 'dmnlog_' + log_num;
            let log_name = logdata[log_num].filename;
            let log_text = (logdata[log_num].data) ? logdata[log_num].data : '';
            
            let tab = E('div', { 'data-tab': tabname, 'data-tab-title': tabNameText }, [
                E('div', { 'id': 'content_dmnlog_' + log_num }, [
                    E('div', {'style': 'margin-bottom: 20px; '}, [ scrollDownButton ]),
                    E('textarea', {
                        'id': log_id,
                        'name': log_name,
                        'style': 'font-size:12px; width: 100%; max-height: 50vh;',
                        'readonly': 'readonly',
                        'wrap': 'off',
                        'rows': logdata[log_num].rows,
                    }, [ log_text ]),
                    E('div', {'style': 'margin-top: 20px'}, [ scrollUpButton ]),
                ]),
            ]);
            
            tabs.firstElementChild.appendChild(tab);
        }
        ui.tabs.initTabGroup(tabs.firstElementChild.childNodes);

        this.POLL.mode = 1;
        this.POLL.init( this.pollLog.bind(this), 1000 );  // interval 1000 ms
        this.POLL.start();

        return E('div', { }, [ h2, tabs ]);
    },

    handleSaveApply: null,
    handleSave: null,
    handleReset: null
});
