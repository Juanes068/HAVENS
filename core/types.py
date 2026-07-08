import graphene
from graphene_django import DjangoObjectType
from django.contrib.auth.models import User
from .models import (
    Community, Event, Ticket, Participation, UserProfile,
    CommunityMembership, InvitationCode, EventRSVP, Friendship,
    Match, Message,
)


# Feature 7: Extended User Profile
class UserProfileType(DjangoObjectType):
    class Meta:
        model = UserProfile
        fields = ("id", "user", "total_points", "bio", "neighbourhood", "photo_url")


class UserType(DjangoObjectType):
    totalPoints = graphene.Int()
    bio = graphene.String()
    neighbourhood = graphene.String()
    photoUrl = graphene.String()

    class Meta:
        model = User
        fields = ("id", "username", "email")

    def resolve_totalPoints(self, info):
        try:
            profile = UserProfile.objects.get(user=self)
            return profile.total_points
        except UserProfile.DoesNotExist:
            return 0

    def resolve_bio(self, info):
        try:
            profile = UserProfile.objects.get(user=self)
            return profile.bio
        except UserProfile.DoesNotExist:
            return ""

    def resolve_neighbourhood(self, info):
        try:
            profile = UserProfile.objects.get(user=self)
            return profile.neighbourhood
        except UserProfile.DoesNotExist:
            return ""

    def resolve_photoUrl(self, info):
        try:
            profile = UserProfile.objects.get(user=self)
            return profile.photo_url
        except UserProfile.DoesNotExist:
            return ""


class CommunityMembershipType(DjangoObjectType):
    class Meta:
        model = CommunityMembership
        fields = ("id", "user", "community", "joined_at")


class CommunityType(DjangoObjectType):
    events = graphene.List(lambda: EventType)

    class Meta:
        model = Community
        fields = ("id", "name", "subdomain", "created_at")

    def resolve_events(self, info):
        return self.events.all()


class InvitationCodeType(DjangoObjectType):
    class Meta:
        model = InvitationCode
        fields = ("id", "code", "created_by", "used_by", "is_used", "created_at", "used_at")


class EventRSVPType(DjangoObjectType):
    class Meta:
        model = EventRSVP
        fields = ("id", "user", "event", "response", "created_at", "updated_at")


class EventType(DjangoObjectType):
    trustScore = graphene.Int()

    class Meta:
        model = Event
        fields = (
            "id", "community", "creator", "title", "description",
            "latitude", "longitude", "points_reward", "visibility",
            "scheduled_date", "created_at",
        )

    def resolve_trustScore(self, info):
        """
        Trust Score Algorithm:
        - 50 pts if the host (creator) is a friend of the requesting user
        - 15 pts per mutual friend who RSVPed 'going' (max 30 pts)
        - 20 pts if the event is from the same community the user belongs to
        """
        user = info.context.user
        if not user or not user.is_authenticated:
            return 0

        score = 0

        # 50 pts if host is a friend
        if self.creator:
            is_friend = Friendship.objects.filter(
                from_user=user, to_user=self.creator, status='accepted'
            ).exists() or Friendship.objects.filter(
                from_user=self.creator, to_user=user, status='accepted'
            ).exists()
            if is_friend:
                score += 50

        # 15 pts per mutual friend who RSVPed 'going' (max 30 pts = 2 friends)
        # Get user's friends
        user_friends = set()
        for f in Friendship.objects.filter(from_user=user, status='accepted'):
            user_friends.add(f.to_user_id)
        for f in Friendship.objects.filter(to_user=user, status='accepted'):
            user_friends.add(f.from_user_id)

        # Get users who RSVPed 'going' to this event
        going_users = set(
            EventRSVP.objects.filter(event=self, response='going')
            .values_list('user_id', flat=True)
        )

        # Intersection = mutual friends who are going
        mutual_going = user_friends & going_users
        score += min(len(mutual_going) * 15, 30)

        # 20 pts if same community
        if self.community:
            is_member = CommunityMembership.objects.filter(
                user=user, community=self.community
            ).exists()
            if is_member:
                score += 20

        return score


class TicketType(DjangoObjectType):
    class Meta:
        model = Ticket
        fields = ("id", "user", "event", "status", "created_at")


class ParticipationType(DjangoObjectType):
    class Meta:
        model = Participation
        fields = ("id", "user", "event", "points_awarded", "attended_at")


class FriendshipType(DjangoObjectType):
    class Meta:
        model = Friendship
        fields = ("id", "from_user", "to_user", "status", "created_at", "updated_at")


class MatchType(DjangoObjectType):
    class Meta:
        model = Match
        fields = ("id", "user1", "user2", "created_at")


class MessageType(DjangoObjectType):
    class Meta:
        model = Message
        fields = ("id", "match", "sender", "content", "created_at", "is_read")
