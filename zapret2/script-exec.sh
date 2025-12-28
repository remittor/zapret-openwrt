#!/bin/sh
# Copyright (c) 2024 remittor
LOG_FILE=$1
RC_FILE=$1.rc
shift 1
: > $LOG_FILE
: > $RC_FILE
(
	exec </dev/null >/dev/null 2>&1
	"$@" >> $LOG_FILE 2>&1
	RETCODE=$?
	sleep 1
	echo $RETCODE > $RC_FILE
) &
exit 0
