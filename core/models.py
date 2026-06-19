from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone

class Community(models.Model):
    name = models.CharField(max_length=200)
    subdomain = models.CharField(max_length=100, unique=True, default='community')
    created_at = models.DateTimeField(default=timezone.now) 

    def __str__(self):
        return self.name


class Event(models.Model):
    community = models.ForeignKey(Community, on_delete=models.CASCADE, null=True, blank=True)
    creator = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    title = models.CharField(max_length=200)
    description = models.TextField()
    latitude = models.FloatField()
    longitude = models.FloatField()
    points_reward = models.IntegerField(default=10)
    scheduled_date = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(default=timezone.now)


class Ticket(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    event = models.ForeignKey(Event, on_delete=models.CASCADE)
    status = models.CharField(max_length=50, default='confirmed')
    created_at = models.DateTimeField(default=timezone.now)


class Participation(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    event = models.ForeignKey(Event, on_delete=models.CASCADE)
    points_awarded = models.IntegerField()
    attended_at = models.DateTimeField(default=timezone.now)
