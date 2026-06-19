from django.db import models
from django.contrib.auth.models import User

class Community(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField()

    def __str__(self):
        return self.name

class Event(models.Model):
    community = models.ForeignKey(Community, on_delete=models.CASCADE, related_name="events")
    title = models.CharField(max_length=200)
    description = models.TextField()
    latitude = models.FloatField()  # Para el mapa
    longitude = models.FloatField() # Para el mapa
    points_reward = models.IntegerField(default=10) # Puntos por asistir
    price = models.DecimalField(max_digits=10, decimal_places=2) # Para las boletas
    date = models.DateTimeField()

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    points = models.IntegerField(default=0) # Contador de puntos

class Ticket(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    event = models.ForeignKey(Event, on_delete=models.CASCADE)
    purchased_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)