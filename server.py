import http.server
import os
import socketserver

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        super().end_headers()
    def log_message(self, *args):
        pass

class ThreadingHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True

PORT = int(os.environ.get("PORT", 5544))
with ThreadingHTTPServer(("", PORT), NoCacheHandler) as httpd:
    httpd.serve_forever()
