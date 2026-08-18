from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
import hashlib
import os


class Site(models.Model):
    utilisateur = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="sites"
    )
    sous_domaine = models.CharField(max_length=30, unique=True, db_index=True)
    titre = models.CharField(max_length=100)
    publication = models.BooleanField(default=False, db_index=True)
    date_publication = models.DateTimeField(null=True, blank=True, db_index=True)
    nb_visites = models.PositiveIntegerField(default=0)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["publication", "date_publication"]),
            models.Index(fields=["utilisateur", "date_creation"]),
        ]

    def __str__(self):
        return f"{self.sous_domaine} ({self.utilisateur.username})"


class SiteFile(models.Model):
    MAX_FILE_SIZE = 10 * 1024 * 1024   

    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="files")
    filename = models.CharField(max_length=255, db_index=True)
    contenu = models.TextField(blank=True)
    date_modification = models.DateTimeField(auto_now=True)
    taille = models.PositiveIntegerField(default=0)
    type_mime = models.CharField(max_length=100, blank=True)
    hash_contenu = models.CharField(max_length=64, blank=True)

    class Meta:
        unique_together = ("site", "filename")
        indexes = [
            models.Index(fields=["site", "filename"]),
        ]

    def clean(self):
        if not self.filename:
            raise ValidationError({"filename": "Le nom de fichier ne peut pas être vide."})

        chemin_normal = os.path.normpath(self.filename)
        
        if chemin_normal.startswith('..') or chemin_normal.startswith('/') or chemin_normal in ('.', '..'):
            raise ValidationError({"filename": "Chemin de fichier invalide."})
        
        if '..' in chemin_normal.split(os.sep):
            raise ValidationError({"filename": "Chemin de fichier invalide."})

        self.filename = chemin_normal
        if len(self.contenu.encode("utf-8")) > self.MAX_FILE_SIZE:
            raise ValidationError(
                {"contenu": f"Le fichier dépasse la taille maximale de {self.MAX_FILE_SIZE // (1024*1024)} Mo"}
            )

    def save(self, *args, **kwargs):
        self.taille = len(self.contenu.encode("utf-8"))
        self.hash_contenu = hashlib.sha256(self.contenu.encode("utf-8")).hexdigest()
        self.clean()  
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.site.sous_domaine} - {self.filename}"



class SiteFileVersion(models.Model):
    fichier = models.ForeignKey(
        SiteFile, on_delete=models.CASCADE, related_name="versions"
    )
    contenu = models.TextField()
    taille = models.PositiveIntegerField()
    date_version = models.DateTimeField(auto_now_add=True)
    message = models.CharField(max_length=255, blank=True)
    auteur = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    class Meta:
        ordering = ["-date_version"]
        indexes = [
            models.Index(fields=["fichier", "date_version"]),
        ]

    def __str__(self):
        return f"{self.fichier.filename} - {self.date_version}"


class SiteStatistique(models.Model):
    site = models.ForeignKey(
        Site, on_delete=models.CASCADE, related_name="statistiques"
    )
    date = models.DateField(auto_now_add=True)
    visites = models.PositiveIntegerField(default=0)
    pages_vues = models.JSONField(default=dict)
    visiteurs_uniques = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ("site", "date")
        indexes = [
            models.Index(fields=["site", "date"]),
        ]

    def incrementer_page(self, page):
        """Incrémente le compteur de pages vues"""
        self.pages_vues[page] = self.pages_vues.get(page, 0) + 1
        self.save(update_fields=["pages_vues"])

    def __str__(self):
        return f"{self.site.sous_domaine} - {self.date}"
