# -*- coding: utf-8 -*-
"""Vercel Function (Python) — recebe os leads dos formulários das páginas
/landing e /evento-rio.

AJUSTAR antes de considerar isto "em produção": hoje o lead só é
registrado no log da função (visível em vercel.com → Deployments →
Functions → Logs). Não há e-mail, planilha nem CRM configurado porque
isso exige uma credencial de terceiro (ex.: RESEND_API_KEY, uma conta
de serviço do Google Sheets, um CRM) que precisa ser criada e colada
como variável de ambiente na Vercel por quem tem acesso à conta — não
é algo que se resolve no código. Ver a função `entregar_lead` abaixo:
é o único lugar que precisa mudar quando essa credencial existir.

Formato do form: application/x-www-form-urlencoded (POST nativo do
<form>) ou application/json (fetch em js/forms.js). Campos comuns:
origem, nome, email, whatsapp, perfil. Evento Rio acrescenta: creci,
imobiliaria, cidade.
"""
import json
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs

CAMPOS_OBRIGATORIOS = {
    'landing': ['nome', 'email', 'whatsapp', 'perfil'],
    'evento-rio': ['nome', 'whatsapp', 'perfil'],
}


def entregar_lead(lead):
    """AJUSTAR: plugar aqui o envio real (e-mail/planilha/CRM) quando
    houver credencial. Por ora, só loga — Vercel guarda stdout das
    Functions como log de execução."""
    print(json.dumps({'lead_recebido': lead}, ensure_ascii=False))


def validar(dados):
    origem = dados.get('origem', [''])[0] if isinstance(dados.get('origem'), list) else dados.get('origem', '')
    obrigatorios = CAMPOS_OBRIGATORIOS.get(origem)
    if obrigatorios is None:
        return 'origem inválida'
    for campo in obrigatorios:
        valor = dados.get(campo)
        if isinstance(valor, list):
            valor = valor[0] if valor else ''
        if not (valor or '').strip():
            return 'campo obrigatório ausente: %s' % campo
    return None


def normalizar(dados):
    out = {}
    for k, v in dados.items():
        out[k] = v[0] if isinstance(v, list) else v
    out['recebido_em'] = datetime.now(timezone.utc).isoformat()
    return out


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        tamanho = int(self.headers.get('Content-Length', 0))
        corpo = self.rfile.read(tamanho) if tamanho else b''
        content_type = self.headers.get('Content-Type', '')

        try:
            if 'application/json' in content_type:
                dados = json.loads(corpo or b'{}')
            else:
                dados = parse_qs(corpo.decode('utf-8'))
        except (ValueError, UnicodeDecodeError):
            self._json(400, {'ok': False, 'erro': 'corpo da requisição inválido'})
            return

        erro = validar(dados)
        if erro:
            self._json(400, {'ok': False, 'erro': erro})
            return

        entregar_lead(normalizar(dados))

        quer_json = 'application/json' in (self.headers.get('Accept') or '') \
            or 'application/json' in content_type \
            or self.headers.get('X-Requested-With') == 'fetch'
        if quer_json:
            self._json(200, {'ok': True})
        else:
            destino = self.headers.get('Referer', '/') + ('&' if '?' in self.headers.get('Referer', '/') else '?') + 'enviado=1'
            self.send_response(303)
            self.send_header('Location', destino)
            self.end_headers()

    def _json(self, status, payload):
        body = json.dumps(payload).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)
