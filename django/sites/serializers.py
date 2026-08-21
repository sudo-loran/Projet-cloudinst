import os
from rest_framework import serializers
from .models import Site, SiteFile, SiteFileVersion, SiteStatistique


class SiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Site
        fields = ['id', 'utilisateur', 'sous_domaine', 'titre', 'publication',
                  'date_publication', 'nb_visites', 'date_creation']
        read_only_fields = ['id', 'utilisateur', 'nb_visites', 'date_creation', 'date_publication']

    def validate_sous_domaine(self, value):
        """Validation personnalisée du sous-domaine.
        Alignée sur la regex utilisée dans views.creer_site (2 à 30 caractères)."""
        import re
        if not re.match(r'^[a-z0-9-]{2,30}$', value):
            raise serializers.ValidationError(
                "Le sous-domaine doit contenir entre 2 et 30 caractères (minuscules, chiffres, tirets)"
            )
        return value

    def validate_titre(self, value):
        """Validation personnalisée du titre"""
        from django.utils.html import escape
        if value:
            value = escape(value.strip())
            if len(value) > 100:
                raise serializers.ValidationError("Le titre ne peut pas dépasser 100 caractères")
        return value


class SiteFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteFile
        fields = ['id', 'site', 'filename', 'contenu', 'date_modification',
                  'taille', 'type_mime', 'hash_contenu']
        read_only_fields = ['id', 'site', 'date_modification', 'taille', 'type_mime', 'hash_contenu']

    def validate_filename(self, value):
        """
        Validation du nom de fichier / chemin.

        Contrairement à la version précédente, ceci NE tronque plus le chemin
        avec os.path.basename() : un site en mode "dossier" doit pouvoir avoir
        des fichiers comme 'blog/article1.html' ou 'assets/img/logo.png'.
        On aligne cette validation sur celle déjà faite dans SiteFile.clean().
        """
        filename = os.path.normpath(value.strip())

        if not filename or filename in ('.', '..') or filename.startswith('..') or filename.startswith('/'):
            raise serializers.ValidationError("Chemin de fichier invalide")

        if '..' in filename.split(os.sep):
            raise serializers.ValidationError("Chemin de fichier invalide")

        basename = os.path.basename(filename)
        if not basename or basename.startswith('.'):
            raise serializers.ValidationError("Nom de fichier invalide")

        allowed_extensions = {
            '.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.svg',
            '.ico', '.woff', '.woff2', '.json', '.txt',
        }
        ext = os.path.splitext(basename)[1].lower()
        if ext and ext not in allowed_extensions:
            raise serializers.ValidationError(
                f"Extension non autorisée. Extensions acceptées : {', '.join(sorted(allowed_extensions))}"
            )

        # normpath utilise le séparateur de l'OS ; sur le web on veut toujours '/'
        return filename.replace(os.sep, '/')


class SiteFileVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteFileVersion
        fields = ['id', 'fichier', 'contenu', 'taille', 'date_version', 'message', 'auteur']
        read_only_fields = ['id', 'date_version', 'taille']


class SiteStatistiqueSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteStatistique
        fields = ['id', 'site', 'date', 'visites', 'pages_vues', 'visiteurs_uniques']
        read_only_fields = ['id', 'date']