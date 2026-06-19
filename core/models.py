from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Community(models.Model):
    name = models.CharField(max_length=200)
    subdomain = models.CharField(max_length=100, unique=True, default='community')
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.name


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    total_points = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.user.username} ({self.total_points} pts)"


class Event(models.Model):
    community = models.ForeignKey(
        Community, on_delete=models.CASCADE, null=True, blank=True, related_name='events'
    )
    creator = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    title = models.CharField(max_length=200)
    description = models.TextField()
    latitude = models.FloatField()
    longitude = models.FloatField()
    points_reward = models.IntegerField(default=10)
    scheduled_date = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.title


class Ticket(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tickets')
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='tickets')
    status = models.CharField(max_length=50, default='confirmed')
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ('user', 'event')

    def __str__(self):
        return f"{self.user.username} → {self.event.title}"


class Participation(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='participations')
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='participations')
    points_awarded = models.IntegerField()
    attended_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ('user', 'event')

    def __str__(self):
        return f"{self.user.username} @ {self.event.title} (+{self.points_awarded})"
