from django.http import HttpResponse, HttpResponsePermanentRedirect
from django.core.cache import cache
from django.db.models import F
from rest_framework.authtoken.models import Token
from .models import Site, SiteFile

DEFAULT_HTML = """<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Mon Site</title>
</head>
<body>
    <h1>Hello World !</h1>
    <p>Bienvenue sur CloudInst</p>
</body>
</html>"""

class SousDomaineMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.cache_timeout = 300
        self.static_extensions = ('.css', '.js', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.woff', '.woff2')

    def __call__(self, request):
        host = request.get_host().split(':')[0]
        parts = host.split('.')
        
        if parts[0] == 'www' and len(parts) >= 3:
            new_host = '.'.join(parts[1:])
            new_url = f"{request.scheme}://{new_host}{request.path}"
            if request.GET:
                new_url += f"?{request.GET.urlencode()}"
            return HttpResponsePermanentRedirect(new_url)
        
        if len(parts) >= 3 and parts[0] not in ('www', 'localhost'):
            sous_domaine = parts[0]
            
            try:
                site = Site.objects.get(sous_domaine__iexact=sous_domaine)
            except Site.DoesNotExist:
                site = None
            
            if site:
                if not site.publication:
                    token_str = request.GET.get('token')
                    
                    if not token_str:
                        return HttpResponse("Ce site est privé. Token requis.", status=401)
                    
                    try:
                        token = Token.objects.get(key=token_str)
                        if site.utilisateur != token.user:
                            return HttpResponse("Accès refusé : vous n'êtes pas le propriétaire", status=403)
                    except Token.DoesNotExist:
                        return HttpResponse("Token invalide", status=401)
                
                chemin = request.path.strip('/')
                filename = chemin if chemin else 'index.html'
                
                if '..' in filename or filename.startswith('/') or filename.startswith('\\'):
                    return HttpResponse("Nom de fichier invalide", status=400)
                
                dangerous_chars = ['<', '>', ':', '"', '|', '?', '*']
                if any(char in filename for char in dangerous_chars):
                    return HttpResponse("Nom de fichier invalide", status=400)
                
                try:
                    fichier = site.files.get(filename=filename)
                except SiteFile.DoesNotExist:
                    # Si c'est index.html qui manque, le créer
                    if filename == 'index.html':
                        fichier = SiteFile.objects.create(
                            site=site,
                            filename='index.html',
                            contenu=DEFAULT_HTML
                        )
                    else:
                        return HttpResponse("Fichier introuvable", status=404)
                
                if filename.endswith(self.static_extensions) or (filename.endswith('.html') and site.publication):
                    cache_key = f"site_{site.id}_{filename}_{fichier.date_modification}"
                    cached_response = cache.get(cache_key)
                    
                    if cached_response:
                        return cached_response
                
                if filename == 'index.html' and site.publication:
                    Site.objects.filter(pk=site.pk).update(nb_visites=F('nb_visites') + 1)
                
                if filename.endswith('.css'):
                    content_type = 'text/css'
                elif filename.endswith('.js'):
                    content_type = 'application/javascript'
                elif filename.endswith('.png'):
                    content_type = 'image/png'
                elif filename.endswith('.jpg') or filename.endswith('.jpeg'):
                    content_type = 'image/jpeg'
                elif filename.endswith('.svg'):
                    content_type = 'image/svg+xml'
                else:
                    content_type = 'text/html'
                
                response = HttpResponse(fichier.contenu, content_type=content_type)
                
                if filename.endswith(self.static_extensions):
                    cache.set(cache_key, response, self.cache_timeout)
                    response['Cache-Control'] = f'max-age={self.cache_timeout}'
                    response['ETag'] = f'"{fichier.hash_contenu}"'
                
                return response
        
        return self.get_response(request)