#!/usr/bin/env python3
"""CGI bridge for hosts with an approved Python HTTP preview server."""
import json, os, pathlib, subprocess, shutil
root=pathlib.Path(__file__).resolve().parents[3]
length=int(os.environ.get('CONTENT_LENGTH','0') or '0')
print('Content-Type: application/json; charset=utf-8')
print('Cache-Control: no-store')
print()
if length>20000:
    print(json.dumps({'error':'请求过长。'},ensure_ascii=False))
else:
    import sys
    payload={'method':os.environ.get('REQUEST_METHOD','GET'),'query':os.environ.get('QUERY_STRING',''),'body':sys.stdin.buffer.read(length).decode('utf-8')}
    try:
        result=subprocess.run([shutil.which('node') or '/usr/local/bin/node',str(root/'scripts/cgi-api.mjs')],input=json.dumps(payload),capture_output=True,text=True,cwd=root,timeout=15)
        if result.returncode: raise RuntimeError('预约服务暂时不可用。')
        print(result.stdout)
    except Exception:
        print(json.dumps({'error':'本地预约服务暂时不可用，请重试。'},ensure_ascii=False))
