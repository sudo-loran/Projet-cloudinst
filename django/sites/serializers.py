from rest_framework import serializers
from .models import Site, SiteFile, SiteFileVersion, SiteStatistique

class SiteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Site
        fields = ['id', 'utilisateur', 'sous_domaine', 'titre', 'publication', 
                  'date_publication', 'nb_visites', 'date_creation']
        read_only_fields = ['id', 'utilisateur', 'nb_visites', 'date_creation', 'date_publication']
    
    def validate_sous_domaine(self, value):
        """Validation personnalisée du sous-domaine"""
        import re
        if not re.match(r'^[a-z0-9-]{3,30}$', value):
            raise serializers.ValidationError(
                "Le sous-domaine doit contenir entre 3 et 30 caractères (minuscules, chiffres, tirets)"
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
        """Validation du nom de fichier"""
        import os
        filename = os.path.basename(value.strip())
        
        if not filename or filename.startswith('.'):
            raise serializers.ValidationError("Nom de fichier invalide")
        
        if '/' in filename or '\\' in filename:
            raise serializers.ValidationError("Le nom ne peut pas contenir de séparateurs de chemin")
        
        allowed_extensions = {'.html', '.css', '.js', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.json', '.txt'}
        ext = os.path.splitext(filename)[1].lower()
        if ext and ext not in allowed_extensions:
            raise serializers.ValidationError(f"Extension non autorisée. Extensions acceptées : {', '.join(allowed_extensions)}")
        
        return filename

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