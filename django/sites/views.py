import re
import os
from datetime import timedelta
from django.utils import timezone
from django.conf import settings
from django.db import transaction
from django.db.models import Q, Sum, F
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.http import Http404, HttpResponse
from django.views.decorators.clickjacking import xframe_options_exempt
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Site, SiteFile, SiteFileVersion, SiteStatistique
from .serializers import SiteFileSerializer, SiteSerializer
from .utils import resoudre_fichier_site, deviner_content_type

SOUS_DOMAINES = {
    "admin",
    "api",
    "www",
    "static",
    "media",
    "help",
    "login",
    "register",
    "dashboard",
}
SOUSDOMAIN = r"^[a-z0-9-]{2,30}$"
MAX_TAILLE = 10 * 1024 * 1024
MAX_STOCKAGE = 50 * 1024 * 1024
MAX_FICHIER = 50


@api_view(["POST"])
def inscription(request):
    username = request.data.get("username")
    email = request.data.get("email")
    password = request.data.get("password")

    if not username or not email or not password:
        return Response(
            {"erreur": "Nom d'utilisateur, email et mot de passe requis"}, status=400
        )

    if User.objects.filter(username__iexact=username).exists():
        return Response({"erreur": "Ce nom d'utilisateur est déjà pris"}, status=400)

    if User.objects.filter(email__iexact=email).exists():
        return Response({"erreur": "Cet email est déjà utilisé"}, status=400)

    User.objects.create_user(username=username, email=email, password=password)
    return Response({"message": "Compte créé avec succès"}, status=201)


@api_view(["POST"])
def connexion(request):
    username = request.data.get("username")
    password = request.data.get("password")

    utilisateur = authenticate(username=username, password=password)
    if utilisateur is None:
        return Response(
            {"erreur": "Nom d'utilisateur ou mot de passe incorrect"}, status=401
        )

    token, _ = Token.objects.get_or_create(user=utilisateur)
    return Response({"token": token.key, "username": utilisateur.username})


@api_view(["POST"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def deconnexion(request):
    Token.objects.filter(user=request.user).delete()
    return Response({"message": "Déconnecté avec succès"})


@api_view(["GET", "PUT"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def profil(request):
    if request.method == "GET":
        return Response(
            {
                "username": request.user.username,
                "email": request.user.email,
                "date_inscription": request.user.date_joined,
                "nombre_sites": request.user.sites.count(),
            }
        )

    email = request.data.get("email")
    nouveau_username = request.data.get("username")
    nouveau_password = request.data.get("password")

    if email is not None:
        request.user.email = email
    if nouveau_username and nouveau_username != request.user.username:
        if User.objects.filter(username__iexact=nouveau_username).exists():
            return Response(
                {"erreur": "Ce nom d'utilisateur est déjà pris"}, status=400
            )
        request.user.username = nouveau_username
    if nouveau_password:
        request.user.set_password(nouveau_password)

    request.user.save()
    return Response({"message": "Profil mis à jour avec succès"})

from django.core.mail import send_mail
from django.conf import settings
from .models import PasswordResetCode

@api_view(["POST"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def envoyer_code_confirmation(request):
    user = request.user
    # Vérifier que l'utilisateur a bien un email
    if not user.email:
        return Response({"erreur": "Vous n'avez pas d'adresse email enregistrée."}, status=400)

    # Générer et sauvegarder le code
    code_obj = PasswordResetCode.generate_code(user)
    
    # Envoyer l'email
    send_mail(
        subject="Code de confirmation CloudInst",
        message=f"Bonjour {user.username},\n\nVoici votre code de confirmation pour changer votre mot de passe : {code_obj.code}\n\nCe code est valable 10 minutes.\n\n-- L'équipe CloudInst",
        from_email=settings.EMAIL_HOST_USER,
        recipient_list=[user.email],
        fail_silently=False,
    )

    return Response({"message": "Code de confirmation envoyé par email."})


@api_view(["POST"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def confirmer_code_confirmation(request):
    user = request.user
    code_saisi = request.data.get("code")
    nouveau_mdp = request.data.get("new_password")

    if not code_saisi or not nouveau_mdp:
        return Response({"erreur": "Code et nouveau mot de passe requis."}, status=400)

    try:
        code_obj = PasswordResetCode.objects.get(user=user, code=code_saisi)
    except PasswordResetCode.DoesNotExist:
        return Response({"erreur": "Code invalide."}, status=400)

    if code_obj.is_expired():
        code_obj.delete()
        return Response({"erreur": "Le code a expiré. Veuillez en demander un nouveau."}, status=400)

    # Tout est bon, on change le mot de passe et on supprime le code
    user.set_password(nouveau_mdp)
    user.save()
    code_obj.delete()

    return Response({"message": "Mot de passe modifié avec succès !"})

@api_view(["DELETE"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def supprimer_compte(request):
    request.user.delete()
    return Response({"message": "Compte supprimé avec succès"})


@api_view(["GET"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def mes_sites(request):
    sites = (
        request.user.sites.select_related("utilisateur")
        .all()
        .order_by("-date_creation")
    )
    serializer = SiteSerializer(sites, many=True)
    return Response({"sites": serializer.data})


@api_view(["POST"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def creer_site(request):

    sous_domaine = (request.data.get("sous_domaine") or "").strip().lower()
    titre = (request.data.get("titre") or "").strip()

    if not sous_domaine:
        return Response({"erreur": "Le sous-domaine est requis"}, status=400)

    if len(sous_domaine) > 30:
        return Response(
            {"erreur": "Le sous-domaine ne peut pas dépasser 30 caractères"}, status=400
        )

    if not re.match(SOUSDOMAIN, sous_domaine):
        return Response(
            {
                "erreur": "Le sous-domaine doit contenir entre 2 et 30 caractères (minuscules, chiffres, tirets)"
            },
            status=400,
        )

    if sous_domaine in SOUS_DOMAINES:
        return Response(
            {
                "erreur": f"'{sous_domaine}' est un nom de sous-domaine réservé par le système"
            },
            status=400,
        )

    if Site.objects.filter(sous_domaine=sous_domaine).exists():
        return Response(
            {"erreur": f"Le sous-domaine '{sous_domaine}' est déjà utilisé"}, status=400
        )

    if titre:
        if len(titre) > 100:
            return Response(
                {"erreur": "Le titre ne peut pas dépasser 100 caractères"}, status=400
            )
    else:
        titre = sous_domaine

    MAX_SITES = getattr(settings, "MAX_SITES", 10)
    if request.user.sites.count() >= MAX_SITES:
        return Response(
            {
                "erreur": f"Vous avez atteint la limite de {MAX_SITES} sites par utilisateur"
            },
            status=400,
        )

    if request.user.sites.filter(titre__iexact=titre).exists():
        return Response({"erreur": "Vous avez déjà un site avec ce titre"}, status=400)

    try:
        with transaction.atomic():
            site = Site.objects.create(
                utilisateur=request.user, sous_domaine=sous_domaine, titre=titre
            )

            code_html_defaut = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{titre}</title>
</head>
<body>
    <h1>Hello World !</h1>
    <p>Bienvenue sur mon site CloudInst.</p>
</body>
</html>"""

            SiteFile.objects.create(
                site=site, filename="index.html", contenu=code_html_defaut
            )
    except Exception as e:
        return Response(
            {"erreur": f"Erreur lors de la création du site: {str(e)}"}, status=500
        )

    serializer = SiteSerializer(site)
    return Response(serializer.data, status=201)


@api_view(["DELETE"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def supprimer_site(request, site_id):
    try:
        site = request.user.sites.get(id=site_id)
    except Site.DoesNotExist:
        return Response({"erreur": "Site introuvable"}, status=404)

    site.delete()
    return Response({"message": "Site supprimé avec succès"})


@api_view(["GET"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def fichiers_site(request, site_id):
    try:
        site = request.user.sites.prefetch_related("files").get(id=site_id)
    except Site.DoesNotExist:
        return Response({"erreur": "Site introuvable"}, status=404)

    fichiers = site.files.all()
    site_serializer = SiteSerializer(site)
    fichiers_serializer = SiteFileSerializer(fichiers, many=True)

    return Response(
        {
            "site": site_serializer.data,
            "fichiers": fichiers_serializer.data,
        }
    )


@api_view(["POST"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def enregistrer_fichier(request):
    site_id = request.data.get("site_id")
    nom_fichier = request.data.get("filename")
    contenu = request.data.get("contenu", "")

    if not site_id or not nom_fichier:
        return Response({"erreur": "site_id et filename sont requis"}, status=400)

    filename = os.path.normpath(nom_fichier.strip())

    if not filename or filename in ('.', '..') or filename.startswith('..') or filename.startswith('/'):
        return Response({"erreur": "Nom de fichier invalide"}, status=400)

    if '..' in filename.split(os.sep):
        return Response({"erreur": "Nom de fichier invalide"}, status=400)

    basename = os.path.basename(filename)
    if not basename or basename.startswith('.'):
        return Response({"erreur": "Nom de fichier invalide"}, status=400)

    filename = filename.replace(os.sep, '/')

    try:
        site = request.user.sites.get(id=site_id)
    except Site.DoesNotExist:
        return Response({"erreur": "Site introuvable"}, status=404)

    fichier_existant = site.files.filter(filename=filename).first()

    # Le quota de nombre de fichiers ne s'applique qu'à la création d'un nouveau fichier
    if fichier_existant is None and site.files.count() >= MAX_FICHIER:
        return Response(
            {"erreur": f"Nombre maximum de fichiers atteint ({MAX_FICHIER})"},
            status=400,
        )

    contenu_size = len(contenu.encode("utf-8"))
    if contenu_size > MAX_TAILLE:
        return Response(
            {
                "erreur": f"Le fichier fait {contenu_size // 1024} Ko, la limite est de {MAX_TAILLE // (1024*1024)} Mo"
            },
            status=400,
        )

    # On exclut la taille actuelle de CE fichier du calcul, sinon on la compte deux fois
    # (une fois comme "déjà utilisé", une fois comme "nouveau contenu") lors d'une simple édition.
    total_utilise = (
        SiteFile.objects.filter(site__utilisateur=request.user)
        .exclude(site=site, filename=filename)
        .aggregate(total=Sum("taille"))["total"]
        or 0
    )

    if total_utilise + contenu_size > MAX_STOCKAGE:
        espace_restant = max(MAX_STOCKAGE - total_utilise, 0)
        return Response(
            {
                "erreur": f"Espace de stockage insuffisant. Utilisé : {total_utilise // (1024*1024)} Mo / {MAX_STOCKAGE // (1024*1024)} Mo. Espace restant : {espace_restant // 1024} Ko"
            },
            status=400,
        )

    if fichier_existant is not None:
        ancien_contenu = fichier_existant.contenu
        ancienne_taille = fichier_existant.taille

        fichier_existant.contenu = contenu
        fichier_existant.save()
        fichier = fichier_existant

        SiteFileVersion.objects.create(
            fichier=fichier,
            contenu=ancien_contenu,
            taille=ancienne_taille,
            auteur=request.user,
            message=f"Mise à jour de {filename}",
        )
    else:
        fichier = SiteFile.objects.create(site=site, filename=filename, contenu=contenu)

    serializer = SiteFileSerializer(fichier)
    return Response({"message": "Fichier enregistré", "fichier": serializer.data})


@api_view(["DELETE"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def supprimer_fichier(request, file_id):
    try:
        fichier = SiteFile.objects.get(id=file_id, site__utilisateur=request.user)
    except SiteFile.DoesNotExist:
        return Response({"erreur": "Fichier introuvable"}, status=404)

    fichier.delete()
    return Response({"message": "Fichier supprimé avec succès"})


@api_view(["POST"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def publier_site(request, site_id):
    try:
        site = request.user.sites.get(id=site_id)
    except Site.DoesNotExist:
        return Response({"erreur": "Site introuvable"}, status=404)

    site.publication = not site.publication
    if site.publication:
        site.date_publication = timezone.now()
    else:
        site.date_publication = None

    site.save()
    serializer = SiteSerializer(site)
    return Response(serializer.data)


@xframe_options_exempt
def apercu(request, sous_domaine, filename="index.html"):
    """
    Vue de preview : /apercu/<sous_domaine>/ ou /apercu/<sous_domaine>/<path:filename>

    Utilise la même logique de résolution que le middleware de production
    (resoudre_fichier_site), pour que la preview corresponde exactement
    à ce que verrait un visiteur sur le vrai sous-domaine, y compris
    pour les sites en mode "dossier" avec des sous-chemins comme blog/article.html.
    """
    try:
        site = Site.objects.get(sous_domaine=sous_domaine)
    except Site.DoesNotExist:
        raise Http404("Site introuvable")

    if not site.publication:
        token_str = request.GET.get("token")
        if not token_str:
            return HttpResponse("Ce site est privé. Token requis.", status=401)
        try:
            token = Token.objects.get(key=token_str)
            if site.utilisateur != token.user:
                return HttpResponse("Accès refusé : vous n'êtes pas le propriétaire", status=403)
        except Token.DoesNotExist:
            return HttpResponse("Token invalide", status=401)

    try:
        fichier = resoudre_fichier_site(site, filename)
    except ValueError:
        return HttpResponse("Chemin invalide", status=400)

    if fichier is None:
        return HttpResponse(f"Le fichier '{filename}' n'existe pas sur ce site.", status=404)

    if site.publication and fichier.filename == "index.html":
        Site.objects.filter(pk=site.pk).update(nb_visites=F("nb_visites") + 1)

    content_type = deviner_content_type(fichier.filename)
    return HttpResponse(fichier.contenu, content_type=content_type)


@api_view(["GET"])
def explorateur(request):
    try:
        limite = max(int(request.GET.get("limite", 12)), 0)
        depart = max(int(request.GET.get("depart", 0)), 0)
    except ValueError:
        return Response(
            {"erreur": "limite et depart doivent être des nombres"}, status=400
        )

    sites_publics = (
        Site.objects.filter(publication=True)
        .select_related("utilisateur")
        .order_by("-date_publication")
    )
    total = sites_publics.count()
    page = sites_publics[depart: depart + limite]

    data = [
        {
            "id": s.id,
            "sous_domaine": s.sous_domaine,
            "titre": s.titre,
            "nb_visites": s.nb_visites,
            "date_publication": s.date_publication,
            "auteur": s.utilisateur.username,
        }
        for s in page
    ]

    return Response({"sites": data, "total": total, "limite": limite, "depart": depart})


@api_view(["GET"])
def recherche_sites(request):
    query = request.GET.get("q", "").strip()

    if not query or len(query) < 2:
        return Response(
            {"erreur": "La recherche doit contenir au moins 2 caractères"}, status=400
        )

    sites = (
        Site.objects.filter(publication=True)
        .filter(
            Q(titre__icontains=query)
            | Q(sous_domaine__icontains=query)
            | Q(utilisateur__username__icontains=query)
        )
        .select_related("utilisateur")
        .order_by("-nb_visites")[:50]
    )

    data = [
        {
            "id": s.id,
            "sous_domaine": s.sous_domaine,
            "titre": s.titre,
            "nb_visites": s.nb_visites,
            "auteur": s.utilisateur.username,
        }
        for s in sites
    ]

    return Response({"sites": data, "total": len(data)})


@api_view(["POST"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def importer_fichiers(request):
    site_id = request.data.get("site_id")
    fichiers = request.data.get("fichiers", [])  # Liste de {filename, contenu}

    try:
        site = request.user.sites.get(id=site_id)
    except Site.DoesNotExist:
        return Response({"erreur": "Site introuvable"}, status=404)

    resultats = []
    for fichier_data in fichiers:
        filename = fichier_data.get("filename")
        contenu = fichier_data.get("contenu", "")

        if not filename:
            resultats.append({"filename": filename, "erreur": "nom de fichier manquant"})
            continue

        filename_normalise = os.path.normpath(filename.strip())
        if (
            not filename_normalise
            or filename_normalise in ('.', '..')
            or filename_normalise.startswith('..')
            or filename_normalise.startswith('/')
            or '..' in filename_normalise.split(os.sep)
        ):
            resultats.append({"filename": filename, "erreur": "chemin invalide"})
            continue

        filename_normalise = filename_normalise.replace(os.sep, '/')

        fichier, created = SiteFile.objects.update_or_create(
            site=site, filename=filename_normalise, defaults={"contenu": contenu}
        )

        resultats.append(
            {"filename": filename_normalise, "created": created, "taille": fichier.taille}
        )

    return Response(
        {"message": f"{len(resultats)} fichiers traités", "resultats": resultats}
    )


@api_view(["GET"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def statistiques_site(request, site_id):
    try:
        site = request.user.sites.get(id=site_id)
    except Site.DoesNotExist:
        return Response({"erreur": "Site introuvable"}, status=404)

    total_visites = site.nb_visites
    total_fichiers = site.files.count()

    date_debut = timezone.now() - timedelta(days=30)
    stats_recentes = site.statistiques.filter(date__gte=date_debut).order_by("date")

    visites_par_jour = [
        {"date": stat.date.isoformat(), "visites": stat.visites}
        for stat in stats_recentes
    ]

    return Response(
        {
            "site": site.sous_domaine,
            "total_visites": total_visites,
            "total_fichiers": total_fichiers,
            "visites_30_jours": visites_par_jour,
            "date_publication": site.date_publication,
        }
    )

@api_view(["GET"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def espace_utilisateur(request):
    total_utilise = SiteFile.objects.filter(site__utilisateur=request.user).aggregate(total=Sum("taille"))["total"] or 0
    used_mb = round(total_utilise / (1024 * 1024), 2)
    max_mb = MAX_STOCKAGE / (1024 * 1024)  # 50 Mo

    total_fichiers = SiteFile.objects.filter(site__utilisateur=request.user).count()
    
    return Response({
        "used_mb": used_mb,
        "max_mb": max_mb,
        "used_files": total_fichiers,
        "max_files": MAX_FICHIER
    })