from django.http import HttpResponse, HttpResponsePermanentRedirect
from django.core.cache import cache
from django.db.models import F
from rest_framework.authtoken.models import Token
from .models import Site, SiteFile
from .utils import resoudre_fichier_site, deviner_content_type, est_fichier_statique

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
                            return HttpResponse(
                                "Accès refusé : vous n'êtes pas le propriétaire", status=403
                            )
                    except Token.DoesNotExist:
                        return HttpResponse("Token invalide", status=401)

                try:
                    fichier = resoudre_fichier_site(site, request.path)
                except ValueError:
                    return HttpResponse("Nom de fichier invalide", status=400)

                if fichier is None:
                    chemin = request.path.strip('/')
                    filename_demande = chemin if chemin else 'index.html'

                    # Si c'est index.html à la racine qui manque, on le crée par défaut
                    if filename_demande == 'index.html':
                        fichier = SiteFile.objects.create(
                            site=site,
                            filename='index.html',
                            contenu=DEFAULT_HTML,
                        )
                    else:
                        return HttpResponse("Fichier introuvable", status=404)

                filename = fichier.filename

                # Le cache_key doit toujours être défini avant usage plus bas
                cache_key = f"site_{site.id}_{filename}_{fichier.date_modification}"

                fichier_statique = est_fichier_statique(filename)
                fichier_html_publie = filename.endswith(('.html', '.htm')) and site.publication

                if fichier_statique or fichier_html_publie:
                    cached_response = cache.get(cache_key)
                    if cached_response:
                        return cached_response

                if filename == 'index.html' and site.publication:
                    Site.objects.filter(pk=site.pk).update(nb_visites=F('nb_visites') + 1)

                content_type = deviner_content_type(filename)
                response = HttpResponse(fichier.contenu, content_type=content_type)

                if fichier_statique:
                    cache.set(cache_key, response, self.cache_timeout)
                    response['Cache-Control'] = f'max-age={self.cache_timeout}'
                    response['ETag'] = f'"{fichier.hash_contenu}"'

                return response

        return self.get_response(request)