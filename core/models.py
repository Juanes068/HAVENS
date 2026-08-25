from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import uuid
import random
import string


def generate_short_invite_code(length=6):
    """Generates a random 5 to 6 character alphanumeric invite code."""
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choices(chars, k=length))


class Community(models.Model):
    MAX_CIRCLES_PER_USER = 3

    name = models.CharField(max_length=200)
    subdomain = models.CharField(max_length=100, unique=True, default='community')
    description = models.TextField(blank=True, default='')
    creator = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_communities')
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    location_name = models.CharField(max_length=300, blank=True, default='')
    is_virtual = models.BooleanField(default=False)
    image_url = models.URLField(max_length=500, blank=True, default='')
    hobbies = models.ManyToManyField('Hobby', blank=True, related_name='communities')
    created_at = models.DateTimeField(default=timezone.now)

    def clean(self):
        from django.core.exceptions import ValidationError
        if self.creator:
            existing = Community.objects.filter(creator=self.creator)
            if self.pk:
                existing = existing.exclude(pk=self.pk)
            if existing.count() >= self.MAX_CIRCLES_PER_USER:
                raise ValidationError(
                    f"Circle creation limit reached. A user profile can create a maximum of {self.MAX_CIRCLES_PER_USER} Circles."
                )

    def save(self, *args, **kwargs):
        from django.core.exceptions import ValidationError
        if not self.pk and self.creator:
            existing_count = Community.objects.filter(creator=self.creator).count()
            if existing_count >= self.MAX_CIRCLES_PER_USER:
                raise ValidationError(
                    f"Circle creation limit reached. A user profile can create a maximum of {self.MAX_CIRCLES_PER_USER} Circles."
                )
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class HobbyCategory(models.Model):
    """Broad category for grouping specific hobbies (e.g., Sports & Fitness, Technology)."""
    name = models.CharField(max_length=100, unique=True)

    class Meta:
        verbose_name_plural = 'Hobby Categories'
        ordering = ['name']

    def __str__(self):
        return self.name


class Hobby(models.Model):
    """Specific hobby belonging to a category (e.g., Running, Artificial Intelligence)."""
    category = models.ForeignKey(HobbyCategory, on_delete=models.CASCADE, related_name='hobbies')
    name = models.CharField(max_length=100)

    class Meta:
        unique_together = ('category', 'name')
        verbose_name_plural = 'Hobbies'
        ordering = ['name']

    def __str__(self):
        return f"{self.category.name} -> {self.name}"


# Extended User Profile with Invite Code and Hobbies Taxonomy
class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    total_points = models.IntegerField(default=0)
    bio = models.TextField(blank=True, default='')
    date_of_birth = models.DateField(null=True, blank=True)
    neighbourhood = models.CharField(max_length=200, blank=True, default='')
    city_name = models.CharField(max_length=100, blank=True, default='')
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    photo_url = models.URLField(blank=True, default='')
    invite_code = models.CharField(max_length=10, unique=True, null=True, blank=True)
    hobbies = models.ManyToManyField(Hobby, blank=True, related_name='profiles')

    @property
    def age(self):
        if not self.date_of_birth:
            return None
        today = timezone.now().date()
        return today.year - self.date_of_birth.year - (
            (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
        )

    def save(self, *args, **kwargs):
        if not self.invite_code:
            code = generate_short_invite_code(6)
            while UserProfile.objects.filter(invite_code=code).exists():
                code = generate_short_invite_code(6)
            self.invite_code = code
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.username} ({self.total_points} pts) [Invite: {self.invite_code}]"


# User - Community Connection
class CommunityMembership(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='community_memberships')
    community = models.ForeignKey(Community, on_delete=models.CASCADE, related_name='memberships')
    joined_at = models.DateTimeField(default=timezone.now)

    class Meta:
        unique_together = ('user', 'community')

    def __str__(self):
        return f"{self.user.username} in {self.community.name}"


def generate_6char_invite_code():
    return generate_short_invite_code(6)


# Exclusive Invitation System
class InvitationCode(models.Model):
    code = models.CharField(max_length=36, unique=True, default=generate_6char_invite_code, editable=False)
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
    image_url = models.URLField(max_length=500, null=True, blank=True)
    location_name = models.CharField(max_length=300, blank=True, default='')
    scheduled_date = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(default=timezone.now)
    hobbies = models.ManyToManyField(Hobby, blank=True, related_name='events')

    def __str__(self):
        return self.title


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


class Match(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
    ]

    user1 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='matches_as_user1')
    user2 = models.ForeignKey(User, on_delete=models.CASCADE, related_name='matches_as_user2')
    initiator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='initiated_matches', null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user1', 'user2')

    def __str__(self):
        return f"Match: {self.user1.username} ↔ {self.user2.username} ({self.status})"


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
