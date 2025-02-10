'use strict';
'require view';
'require fs';
'require form';
'require poll';
'require uci';
'require ui';
'require view.zapret.tools as tools';

return view.extend({
    retrieveLog: async function() {
        return Promise.all([
            L.resolveDefault(fs.stat('/bin/cat'), null),
            fs.exec('/usr/bin/find', [ '/tmp', '-maxdepth', '1', '-type', 'f', '-name', 'zapret+*.log' ]),
        ]).then(function(status_array) {
            var filereader = status_array[0] ? status_array[0].path : null;
            var log_data   = status_array[1];   // stdout: multiline text
            if (log_data.code != 0) {
                ui.addNotification(null, E('p', _('Unable to get log files') + '(code = ' + log_data.code + ') : retrieveLog()'));
                return null;
            }
            if (typeof(log_data.stdout) !== 'string') {
                ui.addNotification(null, E('p', _('Unable to get log files') + '(undefined stdout) : retrieveLog()'));
                return null;
            }
            var log_list = log_data.stdout.trim().split('\n');
            if (log_list.length <= 0) {
                ui.addNotification(null, E('p', _('Unable to get log files') + '(not found) : retrieveLog()'));
                return null;
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
                    + ': %s [ %s | %s | %s | %s ]'.format(
                        e.message, tools.execPath, 'retrieveLogData', 'uci.zapret'
                )));
                return null;
            });
        }).catch(function(e) {
            ui.addNotification(null, E('p', _('Unable to execute or read contents')
                + ': %s [ %s | %s | %s | %s ]'.format(
                    e.message, tools.execPath, 'retrieveLog', 'uci.zapret'
            )));
            return null;
        });
    },

    pollLog: async function() {
        const elem0 = document.getElementById('dmnlog_0');
        if (elem0) {
            const logdata = await this.retrieveLog();
            for (let log_num = 0; log_num < logdata.length; log_num++) {
                let elem = document.getElementById('dmnlog_' + log_num);
                if (elem) {
                    if (logdata[log_num].data) {
                        elem.value = logdata[log_num].data;
                        elem.rows  = logdata[log_num].rows;
                    } else {
                        elem.value = '';
                        elem.rows  = 0;
                    }
                }
            }
            //console.log('POLL: updated ' + logdata.length);
        }
    },

    load: async function() {
        poll.add(this.pollLog.bind(this));
        return await this.retrieveLog();
    },
    
    render: function(logdata) {
        if (!logdata) {
            return;
        }
        var h2 = E('div', {'class' : 'cbi-title-section'}, [
            E('h2', {'class': 'cbi-title-field'}, [ _('Zapret') + ' - ' + _('Log Viewer') ]),
        ]);

        var tabs = E('div', {}, E('div'));

        for (let log_num = 0; log_num < logdata.length; log_num++) {
            //console.log('REN: ' + logdata[log_num].filename + ' : ' + logdata[log_num].data.length);
            var logfn = logdata[log_num].filename;
            let filename = logfn.replace(/.*\//, '');
            let fname = filename.split('.')[0];
            fname = fname.replace(/^(zapret\+)/, '');
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
            
            let log_text = (logdata[log_num].data) ? logdata[log_num].data : '';
            
            let tab = E('div', { 'data-tab': tabname, 'data-tab-title': tabNameText }, [
                E('div', { 'id': 'content_dmnlog_' + log_num }, [
                    E('div', {'style': 'padding-bottom: 20px'}, [ scrollDownButton ]),
                    E('textarea', {
                        'id': 'dmnlog_' + log_num,
                        'style': 'font-size:12px',
                        'readonly': 'readonly',
                        'wrap': 'off',
                        'rows': logdata[log_num].rows,
                    }, [ log_text ]),
                    E('div', {'style': 'padding-bottom: 20px'}, [ scrollUpButton ]),
                ]),
            ]);
            
            tabs.firstElementChild.appendChild(tab);
        }
        ui.tabs.initTabGroup(tabs.firstElementChild.childNodes);
        //this.pollFn = L.bind(this.handleScanRefresh, this);
        //poll.add(this.pollFn);
        return E('div', { }, [ h2, tabs ]);
    },

    handleSaveApply: null,
    handleSave: null,
    handleReset: null
});
