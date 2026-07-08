from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import uuid


class Community(models.Model):
    name = models.CharField(max_length=200)
    subdomain = models.CharField(max_length=100, unique=True, default='community')
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.name


# Feature 7: Extended User Profile
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    total_points = models.IntegerField(default=0)
    bio = models.TextField(blank=True, default='')
    neighbourhood = models.CharField(max_length=200, blank=True, default='')
    photo_url = models.URLField(blank=True, default='')

    def __str__(self):
        return f"{self.user.username} ({self.total_points} pts)"


# Feature 2: User - Community Connection
class CommunityMembership(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='community_memberships')
    community = models.ForeignKey(Community, on_delete=models.CASCADE, related_name='memberships')
    joined_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ('user', 'community')

    def __str__(self):
        return f"{self.user.username} in {self.community.name}"


# Feature 1: Exclusive Invitation System
class InvitationCode(models.Model):
    code = models.CharField(max_length=32, unique=True, default=uuid.uuid4, editable=False)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='invites_created')
    used_by = models.OneToOneField(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='invited_with')
    is_used = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    used_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Code {self.code} by {self.created_by.username}"


class Event(models.Model):
    VISIBILITY_CHOICES = [
        ('public', 'Public'),
        ('friends_only', 'Friends Only'),
        ('community_only', 'Community Only'),
    ]

    community = models.ForeignKey(
        Community, on_delete=models.CASCADE, null=True, blank=True, related_name='events'
    )
    creator = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    title = models.CharField(max_length=200)
    description = models.TextField()
    latitude = models.FloatField()
    longitude = models.FloatField()
    points_reward = models.IntegerField(default=10)
    visibility = models.CharField(max_length=20, choices=VISIBILITY_CHOICES, default='public')
    scheduled_date = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.title


# Feature 4: "Event Tinder" — EventRSVP
class EventRSVP(models.Model):
    RESPONSE_CHOICES = [
        ('going', 'Going'),
        ('maybe', 'Maybe'),
        ('pass', 'Pass'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='event_rsvps')
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='rsvps')
    response = models.CharField(max_length=10, choices=RESPONSE_CHOICES)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'event')

    def __str__(self):
        return f"{self.user.username} {self.response} {self.event.title}"


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


# Feature 3: Trust Network (Friend Requests)
class Friendship(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
    ]

    from_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='friend_requests_sent')
    to_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='friend_requests_received')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('from_user', 'to_user')

    def __str__(self):
        return f"{self.from_user.username} → {self.to_user.username} ({self.status})"


# Feature 5: Matches & Chat (Messaging)
class Match(models.Model):
    user1 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='matches_as_user1')
    user2 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='matches_as_user2')
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ('user1', 'user2')

    def __str__(self):
        return f"Match: {self.user1.username} ↔ {self.user2.username}"


class Message(models.Model):
    match = models.ForeignKey(Match, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='messages_sent')
    content = models.TextField()
    created_at = models.DateTimeField(default=timezone.now)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Msg from {self.sender.username} in match {self.match.id}"
