from django.contrib import admin
from .models import Site, SiteFile #Importe le modèle Site depuis le fichier models.py
# Register your models here.
admin.site.register(Site) #Enregistre le modèle Site dans l'interface d'administration de Django
admin.site.register(SiteFile) #Enregistre le modèle SiteFile dans l'interface d'administration de Django