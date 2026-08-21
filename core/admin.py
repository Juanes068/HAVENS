import json
from datetime import timedelta
from django.contrib import admin
from django.contrib.auth.models import User, Group
from django.contrib.auth.admin import UserAdmin, GroupAdmin
from django.db.models import Count
from django.db.models.functions import TruncDay
from django.utils import timezone
from .models import (
    Community, CommunityMembership, UserProfile, Event, Ticket, Participation,
    Hobby, HobbyCategory, EventRSVP, InvitationCode,
    Friendship, Match, Message,
)


class HavensAdminSite(admin.AdminSite):
    site_header = "Havens Administration & Analytics"
    site_title = "Havens Admin"
    index_title = "Platform Overview & Real-Time Analytics"

    def index(self, request, extra_context=None):
        extra_context = extra_context or {}

        # 1. General KPI Summary Stats
        total_users = User.objects.count()
        total_events = Event.objects.count()
        total_matches = Match.objects.count()
        total_rsvps = EventRSVP.objects.count()
        total_communities = Community.objects.count()

        # 2. Date Range: Last 30 Days
        end_date = timezone.now()
        start_date = end_date - timedelta(days=29)

        # Generate complete list of date strings for zero-filling missing days
        date_list = [(start_date + timedelta(days=i)).strftime('%Y-%m-%d') for i in range(30)]
        display_date_list = [(start_date + timedelta(days=i)).strftime('%b %d') for i in range(30)]

        # 3. Community Growth: User Registrations per Day (ORM TruncDay & Count)
        growth_qs = (
            User.objects.filter(date_joined__gte=start_date)
            .annotate(day=TruncDay('date_joined'))
            .values('day')
            .annotate(count=Count('id'))
            .order_by('day')
        )
        growth_dict = {item['day'].strftime('%Y-%m-%d'): item['count'] for item in growth_qs if item['day']}
        growth_data = [growth_dict.get(d, 0) for d in date_list]

        # 4. Platform Activity: Events Created per Day
        event_qs = (
            Event.objects.filter(created_at__gte=start_date)
            .annotate(day=TruncDay('created_at'))
            .values('day')
            .annotate(count=Count('id'))
            .order_by('day')
        )
        event_dict = {item['day'].strftime('%Y-%m-%d'): item['count'] for item in event_qs if item['day']}
        event_data = [event_dict.get(d, 0) for d in date_list]

        # 5. Platform Activity: Matches Generated per Day
        match_qs = (
            Match.objects.filter(created_at__gte=start_date)
            .annotate(day=TruncDay('created_at'))
            .values('day')
            .annotate(count=Count('id'))
            .order_by('day')
        )
        match_dict = {item['day'].strftime('%Y-%m-%d'): item['count'] for item in match_qs if item['day']}
        match_data = [match_dict.get(d, 0) for d in date_list]

        extra_context.update({
            'kpi_total_users': total_users,
            'kpi_total_events': total_events,
            'kpi_total_matches': total_matches,
            'kpi_total_rsvps': total_rsvps,
            'kpi_total_communities': total_communities,
            'chart_dates_json': json.dumps(display_date_list),
            'chart_growth_data_json': json.dumps(growth_data),
            'chart_event_data_json': json.dumps(event_data),
            'chart_match_data_json': json.dumps(match_data),
        })

        return super().index(request, extra_context=extra_context)


admin_site = HavensAdminSite(name='havens_admin')

# Register default auth models
admin_site.register(User, UserAdmin)
admin_site.register(Group, GroupAdmin)

# Register core application models
@admin.register(Community, site=admin_site)
class CommunityAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'subdomain', 'location_name', 'creator', 'member_count', 'created_at')
    search_fields = ('name', 'subdomain', 'location_name', 'description')
    list_filter = ('created_at',)
    filter_horizontal = ('hobbies',)

    @admin.display(description='Members')
    def member_count(self, obj):
        return obj.memberships.count()


@admin.register(CommunityMembership, site=admin_site)
class CommunityMembershipAdmin(admin.ModelAdmin):
    list_display = ('user', 'community', 'joined_at')
    search_fields = ('user__username', 'community__name')
    list_filter = ('joined_at', 'community')


@admin.register(UserProfile, site=admin_site)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'total_points', 'neighbourhood', 'city_name')
    search_fields = ('user__username', 'neighbourhood', 'city_name')


@admin.register(Event, site=admin_site)
class EventAdmin(admin.ModelAdmin):
    list_display = ('title', 'community', 'creator', 'latitude', 'longitude', 'points_reward', 'created_at')
    list_filter = ('community', 'visibility')
    search_fields = ('title', 'description')


@admin.register(Ticket, site=admin_site)
class TicketAdmin(admin.ModelAdmin):
    list_display = ('user', 'event', 'status', 'created_at')
    list_filter = ('status',)


@admin.register(Participation, site=admin_site)
class ParticipationAdmin(admin.ModelAdmin):
    list_display = ('user', 'event', 'points_awarded', 'attended_at')


@admin.register(HobbyCategory, site=admin_site)
class HobbyCategoryAdmin(admin.ModelAdmin):
    list_display = ('name',)
    search_fields = ('name',)


@admin.register(Hobby, site=admin_site)
class HobbyAdmin(admin.ModelAdmin):
    list_display = ('name', 'category')
    list_filter = ('category',)
    search_fields = ('name',)


@admin.register(EventRSVP, site=admin_site)
class EventRSVPAdmin(admin.ModelAdmin):
    list_display = ('user', 'event', 'response', 'updated_at')
    list_filter = ('response',)


@admin.register(InvitationCode, site=admin_site)
class InvitationCodeAdmin(admin.ModelAdmin):
    list_display = ('code', 'created_by', 'used_by', 'is_used', 'created_at')
    list_filter = ('is_used',)


@admin.register(Friendship, site=admin_site)
class FriendshipAdmin(admin.ModelAdmin):
    list_display = ('from_user', 'to_user', 'status', 'updated_at')
    list_filter = ('status',)


@admin.register(Match, site=admin_site)
class MatchAdmin(admin.ModelAdmin):
    list_display = ('id', 'user1', 'user2', 'message_count', 'created_at')
    search_fields = ('user1__username', 'user2__username')
    list_filter = ('created_at',)
    readonly_fields = ('created_at',)

    @admin.display(description='Messages')
    def message_count(self, obj):
        return obj.messages.count()


@admin.register(Message, site=admin_site)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'sender', 'match', 'content_preview', 'created_at', 'is_read')
    search_fields = ('sender__username', 'match__user1__username', 'match__user2__username')
    list_filter = ('is_read', 'created_at')
    readonly_fields = ('content_preview', 'match', 'sender', 'created_at', 'is_read')
    exclude = ('content',)

    @admin.display(description='Content Preview')
    def content_preview(self, obj):
        """Shows truncated preview or [Encrypted] tag to protect message privacy."""
        if not obj.content:
            return '[Empty]'
        if obj.content.startswith('U2F'):
            return '[Encrypted]'
        return obj.content[:30] + ('...' if len(obj.content) > 30 else '')
