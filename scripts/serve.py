#!/usr/bin/env python3
"""Servidor estático de desenvolvimento — igual ao http.server, mas sem cache.

O http.server padrão não manda Cache-Control, então o browser guarda o
index.html por heurística e continua carregando CSS/JS antigos mesmo depois
de um refresh normal. Aqui cada resposta vai com no-store: o que você vê é
sempre o que está no disco.

Uso:  python3 scripts/serve.py [porta]      (padrão: 8000)
"""
import functools
import http.server
import os
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def do_GET(self):
        # sem 304: descarta a validação condicional e devolve sempre o corpo
        for h in ("If-Modified-Since", "If-None-Match"):
            if h in self.headers:
                del self.headers[h]
        super().do_GET()

    def translate_path(self, path):
        """Clean URLs iguais às da Vercel (vercel.json → cleanUrls:true):
        /o-ativo serve o-ativo.html, para o preview local se comportar
        como a produção."""
        full = super().translate_path(path)
        base = full.split("?", 1)[0].split("#", 1)[0]
        if not os.path.isdir(base) and not os.path.exists(base) and os.path.exists(base + ".html"):
            return base + ".html"
        return full

    def log_message(self, fmt, *args):
        pass  # silencioso


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


if __name__ == "__main__":
    handler = functools.partial(NoCacheHandler, directory=ROOT)
    with ReusableTCPServer(("", PORT), handler) as httpd:
        print("Cinnamon Studio em http://localhost:%d  (sem cache)" % PORT)
        httpd.serve_forever()
