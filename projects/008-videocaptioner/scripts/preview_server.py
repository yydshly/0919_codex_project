"""Local static preview with HTTP ranges so browsers can seek through MP4 files."""
import argparse
import re
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

class Handler(SimpleHTTPRequestHandler):
    def send_head(self):
        self.remaining = None
        path = Path(self.translate_path(self.path))
        value = self.headers.get('Range', '')
        if path.is_file() and path.suffix.lower() == '.mp4' and value:
            size = path.stat().st_size
            match = re.fullmatch(r'bytes=(\d*)-(\d*)', value)
            if not match or not any(match.groups()):
                self.send_error(416)
                return None
            left,right = match.groups()
            start = int(left) if left else max(0,size-int(right))
            end = min(int(right),size-1) if left and right else size-1
            if start>end or start>=size:
                self.send_response(416)
                self.send_header('Content-Range', f'bytes */{size}')
                self.send_header('Content-Length', '0')
                self.end_headers()
                return None
            stream=path.open('rb'); stream.seek(start)
            self.remaining=end-start+1
            self.send_response(206)
            self.send_header('Content-Type','video/mp4')
            self.send_header('Content-Range',f'bytes {start}-{end}/{size}')
            self.send_header('Content-Length',str(self.remaining))
            self.send_header('Accept-Ranges','bytes')
            self.end_headers()
            return stream
        return super().send_head()

    def copyfile(self,source,outputfile):
        if self.remaining is None:
            return super().copyfile(source,outputfile)
        while self.remaining:
            chunk=source.read(min(65536,self.remaining))
            if not chunk: break
            outputfile.write(chunk)
            self.remaining-=len(chunk)

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--port',type=int,default=5188)
    args=parser.parse_args()
    root=Path(__file__).resolve().parents[3]/'web'
    print(f'Preview: http://127.0.0.1:{args.port}/008-videocaptioner/',flush=True)
    ThreadingHTTPServer(('127.0.0.1',args.port),partial(Handler,directory=str(root))).serve_forever()
