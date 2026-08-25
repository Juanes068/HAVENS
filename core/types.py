import graphene
from graphene_django import DjangoObjectType
from django.contrib.auth.models import User
from .models import (
    Community, Event, Ticket, Participation, UserProfile,
    CommunityMembership, InvitationCode, EventRSVP, Friendship,
    Match, Message, HobbyCategory, Hobby,
)


class HobbyType(DjangoObjectType):
    class Meta:
        model = Hobby
        fields = ("id", "name", "category")


class HobbyCategoryType(DjangoObjectType):
    hobbies = graphene.List(HobbyType)

    class Meta:
        model = HobbyCategory
        fields = ("id", "name")

    def resolve_hobbies(self, info):
        return self.hobbies.all()


class UserProfileType(DjangoObjectType):
    age = graphene.Int()
    dateOfBirth = graphene.Date()

    class Meta:
        model = UserProfile
        fields = ("id", "user", "total_points", "bio", "date_of_birth", "neighbourhood", "city_name", "latitude", "longitude", "photo_url", "invite_code", "hobbies")

    def resolve_age(self, info):
        return self.age

    def resolve_dateOfBirth(self, info):
        return self.date_of_birth

    def resolve_invite_code(self, info):
        user = info.context.user
        if user and user.is_authenticated and (user.id == self.user_id or user.is_staff):
            return self.invite_code
        return None

    def resolve_latitude(self, info):
        user = info.context.user
        if user and user.is_authenticated and (user.id == self.user_id or user.is_staff):
            return self.latitude
        return None

    def resolve_longitude(self, info):
        user = info.context.user
        if user and user.is_authenticated and (user.id == self.user_id or user.is_staff):
            return self.longitude
        return None


class UserType(DjangoObjectType):
    email = graphene.String()
    totalPoints = graphene.Int()
    bio = graphene.String()
    dateOfBirth = graphene.Date()
    age = graphene.Int()
    neighbourhood = graphene.String()
    cityName = graphene.String()
    latitude = graphene.Float()
    longitude = graphene.Float()
    photoUrl = graphene.String()
    inviteCode = graphene.String()
    hobbies = graphene.List(HobbyType)
    affinityScore = graphene.Int()
    distance = graphene.Float()
    matchPercentage = graphene.Int()
    sharedHobbies = graphene.List(HobbyType)
    relatedHobbies = graphene.List(HobbyType)
    createdCirclesCount = graphene.Int()
    canCreateCircle = graphene.Boolean()

    class Meta:
        model = User
        fields = ("id", "username", "email")

    def resolve_email(self, info):
        user = info.context.user
        if user and user.is_authenticated and (user.id == self.id or user.is_staff):
            return self.email
        return None

    def resolve_totalPoints(self, info):
        try:
            profile = getattr(self, 'profile', None) or UserProfile.objects.get(user=self)
            return profile.total_points
        except UserProfile.DoesNotExist:
            return 0

    def resolve_bio(self, info):
        try:
            profile = getattr(self, 'profile', None) or UserProfile.objects.get(user=self)
            return profile.bio
        except UserProfile.DoesNotExist:
            return ""

    def resolve_dateOfBirth(self, info):
        try:
            profile = getattr(self, 'profile', None) or UserProfile.objects.get(user=self)
            return profile.date_of_birth
        except UserProfile.DoesNotExist:
            return None

    def resolve_age(self, info):
        try:
            profile = getattr(self, 'profile', None) or UserProfile.objects.get(user=self)
            return profile.age
        except UserProfile.DoesNotExist:
            return None

    def resolve_neighbourhood(self, info):
        try:
            profile = getattr(self, 'profile', None) or UserProfile.objects.get(user=self)
            return profile.neighbourhood
        except UserProfile.DoesNotExist:
            return ""

    def resolve_cityName(self, info):
        try:
            profile = getattr(self, 'profile', None) or UserProfile.objects.get(user=self)
            return profile.city_name
        except UserProfile.DoesNotExist:
            return ""

    def resolve_latitude(self, info):
        user = info.context.user
        if user and user.is_authenticated and (user.id == self.id or user.is_staff):
            try:
                profile = getattr(self, 'profile', None) or UserProfile.objects.get(user=self)
                return profile.latitude
            except UserProfile.DoesNotExist:
                return None
        return None

    def resolve_longitude(self, info):
        user = info.context.user
        if user and user.is_authenticated and (user.id == self.id or user.is_staff):
            try:
                profile = getattr(self, 'profile', None) or UserProfile.objects.get(user=self)
                return profile.longitude
            except UserProfile.DoesNotExist:
                return None
        return None

    def resolve_photoUrl(self, info):
        try:
            profile = getattr(self, 'profile', None) or UserProfile.objects.get(user=self)
            return profile.photo_url
        except UserProfile.DoesNotExist:
            return ""

    def resolve_inviteCode(self, info):
        user = info.context.user
        if user and user.is_authenticated and (user.id == self.id or user.is_staff):
            try:
                profile = getattr(self, 'profile', None) or UserProfile.objects.get(user=self)
                return profile.invite_code or ""
            except UserProfile.DoesNotExist:
                return ""
        return None

    def resolve_hobbies(self, info):
        try:
            profile = getattr(self, 'profile', None) or UserProfile.objects.get(user=self)
            return profile.hobbies.all()
        except UserProfile.DoesNotExist:
            return []

    def resolve_affinityScore(self, info):
        return getattr(self, 'affinity_score', 0)

    def resolve_distance(self, info):
        return getattr(self, 'distance', None)

    def resolve_matchPercentage(self, info):
        return getattr(self, 'match_percentage', 0)

    def resolve_sharedHobbies(self, info):
        return getattr(self, 'shared_hobbies', [])

    def resolve_relatedHobbies(self, info):
        return getattr(self, 'related_hobbies', [])

    def resolve_createdCirclesCount(self, info):
        return Community.objects.filter(creator=self).count()

    def resolve_canCreateCircle(self, info):
        return Community.objects.filter(creator=self).count() < Community.MAX_CIRCLES_PER_USER


class CommunityMembershipType(DjangoObjectType):
    class Meta:
        model = CommunityMembership
        fields = ("id", "user", "community", "joined_at")


class CommunityType(DjangoObjectType):
    events = graphene.List(lambda: EventType)
    hobbies = graphene.List(HobbyType)
    creator = graphene.Field(UserType)
    memberCount = graphene.Int()
    imageUrl = graphene.String()
    locationName = graphene.String()
    ageRange = graphene.String()
    minAge = graphene.Int()
    maxAge = graphene.Int()
    affinityScore = graphene.Int()
    distance = graphene.Float()
    matchPercentage = graphene.Int()
    sharedHobbies = graphene.List(HobbyType)
    relatedHobbies = graphene.List(HobbyType)

    class Meta:
        model = Community
        fields = (
            "id", "name", "subdomain", "description", "creator",
            "latitude", "longitude", "image_url", "location_name",
            "is_virtual", "age_range", "min_age", "max_age", "created_at",
        )

    def resolve_ageRange(self, info):
        return getattr(self, 'age_range', 'All Ages') or 'All Ages'

    def resolve_minAge(self, info):
        return getattr(self, 'min_age', None)

    def resolve_maxAge(self, info):
        return getattr(self, 'max_age', None)

    def resolve_isVirtual(self, info):
        return getattr(self, 'is_virtual', False)

    def resolve_events(self, info):
        return self.events.all()

    def resolve_hobbies(self, info):
        return self.hobbies.all()

    def resolve_creator(self, info):
        return self.creator

    def resolve_memberCount(self, info):
        return self.memberships.count()

    def resolve_imageUrl(self, info):
        return self.image_url

    def resolve_locationName(self, info):
        return self.location_name

    def resolve_affinityScore(self, info):
        return getattr(self, 'affinity_score', 0)

    def resolve_distance(self, info):
        return getattr(self, 'distance', None)

    def resolve_matchPercentage(self, info):
        return getattr(self, 'match_percentage', 0)

    def resolve_sharedHobbies(self, info):
        return getattr(self, 'shared_hobbies', [])

    def resolve_relatedHobbies(self, info):
        return getattr(self, 'related_hobbies', [])


class InvitationCodeType(DjangoObjectType):
    class Meta:
        model = InvitationCode
        fields = ("id", "code", "created_by", "used_by", "is_used", "created_at", "used_at")


class EventRSVPType(DjangoObjectType):
    user = graphene.Field(UserType)
    event = graphene.Field(lambda: EventType)

    class Meta:
        model = EventRSVP
        fields = ("id", "user", "event", "response", "created_at", "updated_at")

    def resolve_user(self, info):
        return self.user

    def resolve_event(self, info):
        return self.event


class EventType(DjangoObjectType):
    trustScore = graphene.Int()
    imageUrl = graphene.String()
    locationName = graphene.String()
    ageRange = graphene.String()
    minAge = graphene.Int()
    maxAge = graphene.Int()
    rsvps = graphene.List(EventRSVPType)
    # Override visibility as plain String to bypass Graphene's auto-enum
    # that rejects the raw CharField values from the DB (e.g. 'friends_only').
    visibility = graphene.String()
    hobbies = graphene.List(HobbyType)

    class Meta:
        model = Event
        fields = (
            "id", "community", "creator", "title", "description",
            "latitude", "longitude", "points_reward", "visibility",
            "image_url", "location_name", "scheduled_date", "created_at",
            "age_range", "min_age", "max_age",
        )

    def resolve_visibility(self, info):
        return self.visibility

    def resolve_imageUrl(self, info):
        return self.image_url

    def resolve_locationName(self, info):
        return self.location_name

    def resolve_ageRange(self, info):
        return self.age_range or 'All Ages'

    def resolve_minAge(self, info):
        return self.min_age

    def resolve_maxAge(self, info):
        return self.max_age

    def resolve_rsvps(self, info):
        return self.rsvps.select_related('user', 'user__profile').all()

    def resolve_hobbies(self, info):
        return self.hobbies.all()

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
        user_friends = set()
        for f in Friendship.objects.filter(from_user=user, status='accepted'):
            user_friends.add(f.to_user_id)
        for f in Friendship.objects.filter(to_user=user, status='accepted'):
            user_friends.add(f.from_user_id)

        going_users = set(
            EventRSVP.objects.filter(event=self, response='going')
            .values_list('user_id', flat=True)
        )

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
    status = graphene.String()
    initiator = graphene.Field(UserType)
    createdAt = graphene.DateTime()
    updatedAt = graphene.DateTime()

    class Meta:
        model = Match
        fields = ("id", "user1", "user2", "initiator", "status", "created_at", "updated_at")

    def resolve_status(self, info):
        return self.status

    def resolve_initiator(self, info):
        return self.initiator

    def resolve_createdAt(self, info):
        return self.created_at

    def resolve_updatedAt(self, info):
        return self.updated_at


class MessageType(DjangoObjectType):
    class Meta:
        model = Message
        fields = ("id", "match", "sender", "content", "created_at", "is_read")
