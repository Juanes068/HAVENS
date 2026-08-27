"""
Havens Administration & Analytics — core/admin.py
==================================================
Registers all core models with the custom HavensAdminSite.

Privacy Policy
--------------
• Message (match-based DMs): The `content` field is intentionally EXCLUDED
  from list_display, readonly_fields, and the admin form entirely via
  `exclude = ('content',)` and `get_fields()` override.  Admin staff can
  see WHO sent a message and WHEN, but NEVER the message body.

• CircleMessage (circle group chat): Same policy — content is hidden in list
  view; only a character-count badge is shown to confirm the row is non-empty.
  Full content is excluded from the admin form entirely.

Models registered
-----------------
  Community          (product name: "Circle")
  CommunityMembership
  UserProfile
  Event
  EventRSVP
  Ticket
  Participation
  Hobby / HobbyCategory
  InvitationCode
  Friendship
  Match
  Message            ← privacy-hardened
  CircleMessage      ← privacy-hardened
"""

import json
from datetime import timedelta

from django.contrib import admin
from django.contrib.auth.models import User, Group
from django.contrib.auth.admin import UserAdmin, GroupAdmin
from django.db.models import Count, Q
from django.db.models.functions import TruncDay, TruncWeek
from django.utils import timezone
from django.utils.html import format_html

from .models import (
    Community,
    CommunityMembership,
    UserProfile,
    Event,
    EventRSVP,
    Ticket,
    Participation,
    Hobby,
    HobbyCategory,
    InvitationCode,
    Friendship,
    Match,
    Message,
    CircleMessage,
)


# ─────────────────────────────────────────────────────────────────────────────
# Custom Admin Site
# ─────────────────────────────────────────────────────────────────────────────

class HavensAdminSite(admin.AdminSite):
    """
    Custom AdminSite that injects aggregated KPI data into the analytics
    dashboard index page.  Chart rendering is handled by the overridden
    admin/index.html template (Task 2).
    """

    site_header = "Havens Administration & Analytics"
    site_title = "Havens Admin"
    index_title = "Platform Overview & Real-Time Analytics"

    def index(self, request, extra_context=None):
        extra_context = extra_context or {}

        # ════════════════════════════════════════════════════════════════════
        # TASK 3 — Data Aggregation & KPIs (Optimized ORM Queries)
        # All queries use .annotate() + TruncDay / TruncWeek and a single
        # COUNT per group.  No raw SQL.  Results are zero-filled in Python
        # for complete date continuity on the front-end charts.
        # ════════════════════════════════════════════════════════════════════

        # ── 1. Scalar KPI totals (one COUNT query each) ──────────────────────
        total_users       = User.objects.count()
        total_profiles    = UserProfile.objects.count()
        total_events      = Event.objects.count()
        total_matches     = Match.objects.count()
        accepted_matches  = Match.objects.filter(status='accepted').count()
        total_rsvps       = EventRSVP.objects.count()
        rsvps_going       = EventRSVP.objects.filter(response='going').count()
        rsvps_maybe       = EventRSVP.objects.filter(response='maybe').count()
        total_communities = Community.objects.count()
        total_messages    = Message.objects.count()
        total_circle_msgs = CircleMessage.objects.count()

        # ── 2. Date windows ──────────────────────────────────────────────────
        now        = timezone.now()
        # 30-day daily window
        day_end    = now
        day_start  = day_end - timedelta(days=29)
        # 8-week weekly window
        week_end   = now
        week_start = week_end - timedelta(weeks=7)

        # Precompute aligned date keys for O(1) zero-fill lookups
        day_keys  = [(day_start  + timedelta(days=i)).strftime('%Y-%m-%d') for i in range(30)]
        day_labels = [(day_start + timedelta(days=i)).strftime('%b %d')    for i in range(30)]

        week_keys   = [(week_start + timedelta(weeks=i)).strftime('%Y-%m-%d') for i in range(8)]
        week_labels = [(week_start + timedelta(weeks=i)).strftime('%b %d')    for i in range(8)]

        # ── Helper: build a zero-filled list from a queryset result dict ─────
        def _fill(result_dict, keys):
            return [result_dict.get(k, 0) for k in keys]

        # ════════════════════════════════════════════════════════════════════
        # COMMUNITY GROWTH  — Signups & Profile completions grouped by day/week
        # ════════════════════════════════════════════════════════════════════

        # [Daily] User registrations (30 days)
        growth_daily = (
            User.objects
            .filter(date_joined__gte=day_start)
            .annotate(day=TruncDay('date_joined'))
            .values('day')
            .annotate(count=Count('id'))
            .order_by('day')
        )
        growth_data = _fill(
            {r['day'].strftime('%Y-%m-%d'): r['count'] for r in growth_daily if r['day']},
            day_keys,
        )

        # [Daily] Profile completions — proxied through user__date_joined
        # (UserProfile has no standalone created_at; the FK to User is the
        #  creation signal.  This counts profiles whose owner signed up in window.)
        profiles_daily = (
            UserProfile.objects
            .filter(user__date_joined__gte=day_start)
            .annotate(day=TruncDay('user__date_joined'))
            .values('day')
            .annotate(count=Count('id'))
            .order_by('day')
        )
        profiles_data = _fill(
            {r['day'].strftime('%Y-%m-%d'): r['count'] for r in profiles_daily if r['day']},
            day_keys,
        )

        # [Weekly] User registrations (8 weeks) — for trend overview chart
        growth_weekly = (
            User.objects
            .filter(date_joined__gte=week_start)
            .annotate(week=TruncWeek('date_joined'))
            .values('week')
            .annotate(count=Count('id'))
            .order_by('week')
        )
        growth_weekly_data = _fill(
            {r['week'].strftime('%Y-%m-%d'): r['count'] for r in growth_weekly if r['week']},
            week_keys,
        )

        # [Weekly] Profile completions (8 weeks)
        profiles_weekly = (
            UserProfile.objects
            .filter(user__date_joined__gte=week_start)
            .annotate(week=TruncWeek('user__date_joined'))
            .values('week')
            .annotate(count=Count('id'))
            .order_by('week')
        )
        profiles_weekly_data = _fill(
            {r['week'].strftime('%Y-%m-%d'): r['count'] for r in profiles_weekly if r['week']},
            week_keys,
        )

        # ════════════════════════════════════════════════════════════════════
        # SOCIAL CONNECTIONS — Matches, Circles created, Intros accepted
        # ════════════════════════════════════════════════════════════════════

        # [Daily] All matches created (30 days)
        matches_daily = (
            Match.objects
            .filter(created_at__gte=day_start)
            .annotate(day=TruncDay('created_at'))
            .values('day')
            .annotate(count=Count('id'))
            .order_by('day')
        )
        match_data = _fill(
            {r['day'].strftime('%Y-%m-%d'): r['count'] for r in matches_daily if r['day']},
            day_keys,
        )

        # [Daily] Accepted introductions — matches whose status flipped to
        # 'accepted' within the window (updated_at is auto_now, so it reflects
        # the most recent status change accurately)
        accepted_daily = (
            Match.objects
            .filter(status='accepted', updated_at__gte=day_start)
            .annotate(day=TruncDay('updated_at'))
            .values('day')
            .annotate(count=Count('id'))
            .order_by('day')
        )
        accepted_data = _fill(
            {r['day'].strftime('%Y-%m-%d'): r['count'] for r in accepted_daily if r['day']},
            day_keys,
        )

        # [Daily] Circles / Communities created (30 days)
        circles_daily = (
            Community.objects
            .filter(created_at__gte=day_start)
            .annotate(day=TruncDay('created_at'))
            .values('day')
            .annotate(count=Count('id'))
            .order_by('day')
        )
        circles_data = _fill(
            {r['day'].strftime('%Y-%m-%d'): r['count'] for r in circles_daily if r['day']},
            day_keys,
        )

        # [Weekly] Matches created (8 weeks)
        matches_weekly = (
            Match.objects
            .filter(created_at__gte=week_start)
            .annotate(week=TruncWeek('created_at'))
            .values('week')
            .annotate(count=Count('id'))
            .order_by('week')
        )
        matches_weekly_data = _fill(
            {r['week'].strftime('%Y-%m-%d'): r['count'] for r in matches_weekly if r['week']},
            week_keys,
        )

        # ════════════════════════════════════════════════════════════════════
        # REAL-WORLD ACTIVITY — Events, RSVP Going vs Maybe per day/week
        # ════════════════════════════════════════════════════════════════════

        # [Daily] Events created (30 days)
        events_daily = (
            Event.objects
            .filter(created_at__gte=day_start)
            .annotate(day=TruncDay('created_at'))
            .values('day')
            .annotate(count=Count('id'))
            .order_by('day')
        )
        event_data = _fill(
            {r['day'].strftime('%Y-%m-%d'): r['count'] for r in events_daily if r['day']},
            day_keys,
        )

        # [Daily] RSVPs — Going (30 days)
        rsvp_going_daily = (
            EventRSVP.objects
            .filter(response='going', created_at__gte=day_start)
            .annotate(day=TruncDay('created_at'))
            .values('day')
            .annotate(count=Count('id'))
            .order_by('day')
        )
        rsvp_going_data = _fill(
            {r['day'].strftime('%Y-%m-%d'): r['count'] for r in rsvp_going_daily if r['day']},
            day_keys,
        )

        # [Daily] RSVPs — Maybe (30 days)
        rsvp_maybe_daily = (
            EventRSVP.objects
            .filter(response='maybe', created_at__gte=day_start)
            .annotate(day=TruncDay('created_at'))
            .values('day')
            .annotate(count=Count('id'))
            .order_by('day')
        )
        rsvp_maybe_data = _fill(
            {r['day'].strftime('%Y-%m-%d'): r['count'] for r in rsvp_maybe_daily if r['day']},
            day_keys,
        )

        # [Weekly] Events created (8 weeks)
        events_weekly = (
            Event.objects
            .filter(created_at__gte=week_start)
            .annotate(week=TruncWeek('created_at'))
            .values('week')
            .annotate(count=Count('id'))
            .order_by('week')
        )
        events_weekly_data = _fill(
            {r['week'].strftime('%Y-%m-%d'): r['count'] for r in events_weekly if r['week']},
            week_keys,
        )

        # ── Inject all context variables ──────────────────────────────────────
        extra_context.update({

            # ── Scalar KPI cards ─────────────────────────────────────────────
            'kpi_total_users':       total_users,
            'kpi_total_profiles':    total_profiles,
            'kpi_total_events':      total_events,
            'kpi_total_matches':     total_matches,
            'kpi_accepted_matches':  accepted_matches,
            'kpi_total_rsvps':       total_rsvps,
            'kpi_rsvps_going':       rsvps_going,
            'kpi_rsvps_maybe':       rsvps_maybe,
            'kpi_total_communities': total_communities,
            'kpi_total_messages':    total_messages,
            'kpi_total_circle_messages': total_circle_msgs,

            # ── Daily chart labels (30 days) ──────────────────────────────────
            'chart_dates_json': json.dumps(day_labels),

            # ── Community Growth — daily (Chart 1: dual-line) ────────────────
            'chart_growth_data_json':   json.dumps(growth_data),
            'chart_profiles_data_json': json.dumps(profiles_data),

            # ── Social Connections — daily (Chart 2: triple-bar) ─────────────
            'chart_match_data_json':    json.dumps(match_data),
            'chart_accepted_data_json': json.dumps(accepted_data),
            'chart_circles_data_json':  json.dumps(circles_data),

            # ── Real-World Activity — daily (Chart 3: stacked bar) ───────────
            'chart_event_data_json':      json.dumps(event_data),
            'chart_rsvp_going_data_json': json.dumps(rsvp_going_data),
            'chart_rsvp_maybe_data_json': json.dumps(rsvp_maybe_data),

            # ── Weekly trend chart (Chart 5) — 8 weeks ───────────────────────
            'chart_week_labels_json':         json.dumps(week_labels),
            'chart_growth_weekly_json':        json.dumps(growth_weekly_data),
            'chart_profiles_weekly_json':      json.dumps(profiles_weekly_data),
            'chart_matches_weekly_json':        json.dumps(matches_weekly_data),
            'chart_events_weekly_json':         json.dumps(events_weekly_data),
        })

        return super().index(request, extra_context=extra_context)



admin_site = HavensAdminSite(name='havens_admin')

# Register default Django auth models on the custom site
admin_site.register(User, UserAdmin)
admin_site.register(Group, GroupAdmin)


# ─────────────────────────────────────────────────────────────────────────────
# Community  (product name: "Circle")
# ─────────────────────────────────────────────────────────────────────────────

@admin.register(Community, site=admin_site)
class CommunityAdmin(admin.ModelAdmin):
    """
    'Community' is the underlying Django model; in Havens product language
    these are called "Circles".  Both terms are noted here for clarity.
    """

    list_display = (
        'id',
        'name',
        'subdomain',
        'location_name',
        'creator',
        'is_virtual',
        'age_range',
        'member_count',
        'event_count',
        'created_at',
    )
    search_fields = (
        'name',
        'subdomain',
        'location_name',
        'description',
        'creator__username',
        'creator__email',
    )
    list_filter = (
        'is_virtual',
        'age_range',
        'created_at',
    )
    filter_horizontal = ('hobbies',)
    readonly_fields = ('created_at',)
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)

    @admin.display(description='Members')
    def member_count(self, obj):
        return obj.memberships.count()

    @admin.display(description='Events')
    def event_count(self, obj):
        return obj.events.count()

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('creator')


# ─────────────────────────────────────────────────────────────────────────────
# CommunityMembership
# ─────────────────────────────────────────────────────────────────────────────

@admin.register(CommunityMembership, site=admin_site)
class CommunityMembershipAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'community', 'joined_at')
    search_fields = (
        'user__username',
        'user__email',
        'community__name',
    )
    list_filter = ('joined_at', 'community')
    readonly_fields = ('joined_at',)
    ordering = ('-joined_at',)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'community')


# ─────────────────────────────────────────────────────────────────────────────
# UserProfile
# ─────────────────────────────────────────────────────────────────────────────

@admin.register(UserProfile, site=admin_site)
class UserProfileAdmin(admin.ModelAdmin):
    """
    Displays profile completion signals (bio, city, hobbies).
    Sensitive fields such as date_of_birth and GPS coordinates
    are read-only to prevent accidental edits.
    """

    list_display = (
        'id',
        'user',
        'city_name',
        'neighbourhood',
        'total_points',
        'profile_complete',
        'invite_code',
    )
    search_fields = (
        'user__username',
        'user__email',
        'user__first_name',
        'user__last_name',
        'neighbourhood',
        'city_name',
        'invite_code',
    )
    list_filter = ('city_name',)
    filter_horizontal = ('hobbies',)
    readonly_fields = ('invite_code', 'date_of_birth', 'latitude', 'longitude')
    ordering = ('-total_points',)

    @admin.display(description='Profile Complete', boolean=True)
    def profile_complete(self, obj):
        """True when the user has filled in bio, city, and at least one hobby."""
        return bool(obj.bio and obj.city_name and obj.hobbies.exists())

    def get_queryset(self, request):
        return (
            super().get_queryset(request)
            .select_related('user')
            .prefetch_related('hobbies')
        )


# ─────────────────────────────────────────────────────────────────────────────
# Match
# ─────────────────────────────────────────────────────────────────────────────

@admin.register(Match, site=admin_site)
class MatchAdmin(admin.ModelAdmin):
    """
    Tracks introductions between users.  Shows status (pending / accepted /
    rejected) for quick moderation filtering.  Message content is never
    accessible from this view — see MessageAdmin for message metadata.
    """

    list_display = (
        'id',
        'user1',
        'user2',
        'initiator',
        'status',
        'message_count',
        'created_at',
        'updated_at',
    )
    search_fields = (
        'user1__username',
        'user2__username',
        'initiator__username',
    )
    list_filter = ('status', 'created_at')
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)

    @admin.display(description='Messages')
    def message_count(self, obj):
        return obj.messages.count()

    def get_queryset(self, request):
        return (
            super().get_queryset(request)
            .select_related('user1', 'user2', 'initiator')
            .annotate(msg_count=Count('messages'))
        )


# ─────────────────────────────────────────────────────────────────────────────
# Message  —  PRIVACY-HARDENED
# ─────────────────────────────────────────────────────────────────────────────

@admin.register(Message, site=admin_site)
class MessageAdmin(admin.ModelAdmin):
    """
    PRIVACY POLICY — Match-based Direct Messages
    ─────────────────────────────────────────────
    The `content` field is intentionally EXCLUDED from:
      • list_display   — no content or preview is shown in the list view
      • readonly_fields — content is not rendered in the detail form
      • get_fields()   — content is stripped at field-resolution time
      • exclude        — content is excluded at the ModelForm level

    Admin staff can see WHO sent a message and WHEN (sender, match
    participants, timestamp, read status), but NEVER the message body.
    """

    # List view: sender + match context + timestamp only — no content
    list_display = (
        'id',
        'sender',
        'match_link',
        'is_read',
        'created_at',
    )
    search_fields = (
        'sender__username',
        'sender__email',
        'match__user1__username',
        'match__user2__username',
    )
    list_filter = ('is_read', 'created_at')
    # Hard-exclude content from all admin forms
    exclude = ('content',)
    readonly_fields = ('sender', 'match', 'created_at', 'is_read')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)

    @admin.display(description='Match (participants)')
    def match_link(self, obj):
        """Shows match ID and both participant usernames — no message content."""
        return format_html(
            '<span title="Match #{}">{} ↔ {}</span>',
            obj.match_id,
            obj.match.user1.username,
            obj.match.user2.username,
        )

    def get_queryset(self, request):
        # select_related prevents N+1 on sender + match participants
        return (
            super().get_queryset(request)
            .select_related('sender', 'match__user1', 'match__user2')
        )

    def get_fields(self, request, obj=None):
        """Final safety net: strip content even if exclude is bypassed."""
        fields = super().get_fields(request, obj)
        return [f for f in fields if f != 'content']


# ─────────────────────────────────────────────────────────────────────────────
# CircleMessage  —  PRIVACY-HARDENED  (mirrors Message policy)
# ─────────────────────────────────────────────────────────────────────────────

@admin.register(CircleMessage, site=admin_site)
class CircleMessageAdmin(admin.ModelAdmin):
    """
    PRIVACY POLICY — Circle Group Chat Messages
    ────────────────────────────────────────────
    `content` is hidden from list view; only a character-count badge confirms
    the row is non-empty.  Full content is excluded from the admin form so
    that group conversation text is never surfaced to admin staff.
    """

    list_display = (
        'id',
        'sender',
        'circle',
        'char_count',
        'created_at',
    )
    search_fields = (
        'sender__username',
        'sender__email',
        'circle__name',
    )
    list_filter = ('circle', 'created_at')
    exclude = ('content',)
    readonly_fields = ('sender', 'circle', 'created_at')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)

    @admin.display(description='Length (chars)')
    def char_count(self, obj):
        """Character count only — never exposes the message body."""
        return len(obj.content) if obj.content else 0

    def get_queryset(self, request):
        return (
            super().get_queryset(request)
            .select_related('sender', 'circle')
        )

    def get_fields(self, request, obj=None):
        fields = super().get_fields(request, obj)
        return [f for f in fields if f != 'content']


# ─────────────────────────────────────────────────────────────────────────────
# Event
# ─────────────────────────────────────────────────────────────────────────────

@admin.register(Event, site=admin_site)
class EventAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'title',
        'community',
        'creator',
        'visibility',
        'location_name',
        'scheduled_date',
        'rsvp_count',
        'points_reward',
        'created_at',
    )
    search_fields = (
        'title',
        'description',
        'location_name',
        'creator__username',
        'community__name',
    )
    list_filter = ('visibility', 'community', 'scheduled_date', 'created_at')
    filter_horizontal = ('hobbies',)
    readonly_fields = ('created_at',)
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)

    @admin.display(description='RSVPs')
    def rsvp_count(self, obj):
        return obj.rsvps.count()

    def get_queryset(self, request):
        return (
            super().get_queryset(request)
            .select_related('community', 'creator')
            .annotate(rsvp_cnt=Count('rsvps'))
        )


# ─────────────────────────────────────────────────────────────────────────────
# EventRSVP
# ─────────────────────────────────────────────────────────────────────────────

@admin.register(EventRSVP, site=admin_site)
class EventRSVPAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'user',
        'event',
        'response',
        'created_at',
        'updated_at',
    )
    search_fields = (
        'user__username',
        'user__email',
        'event__title',
    )
    list_filter = ('response', 'created_at')
    readonly_fields = ('created_at', 'updated_at')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'event')


# ─────────────────────────────────────────────────────────────────────────────
# Ticket & Participation
# ─────────────────────────────────────────────────────────────────────────────

@admin.register(Ticket, site=admin_site)
class TicketAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'event', 'status', 'created_at')
    search_fields = ('user__username', 'event__title')
    list_filter = ('status', 'created_at')
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'event')


@admin.register(Participation, site=admin_site)
class ParticipationAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'event', 'points_awarded', 'attended_at')
    search_fields = ('user__username', 'event__title')
    list_filter = ('attended_at',)
    readonly_fields = ('attended_at',)
    ordering = ('-attended_at',)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'event')


# ─────────────────────────────────────────────────────────────────────────────
# Hobby Taxonomy
# ─────────────────────────────────────────────────────────────────────────────

@admin.register(HobbyCategory, site=admin_site)
class HobbyCategoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'hobby_count')
    search_fields = ('name',)
    ordering = ('name',)

    @admin.display(description='# Hobbies')
    def hobby_count(self, obj):
        return obj.hobbies.count()


@admin.register(Hobby, site=admin_site)
class HobbyAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'category')
    list_filter = ('category',)
    search_fields = ('name', 'category__name')
    ordering = ('category__name', 'name')

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('category')


# ─────────────────────────────────────────────────────────────────────────────
# InvitationCode
# ─────────────────────────────────────────────────────────────────────────────

@admin.register(InvitationCode, site=admin_site)
class InvitationCodeAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'code',
        'created_by',
        'used_by',
        'is_used',
        'created_at',
        'used_at',
    )
    search_fields = (
        'code',
        'created_by__username',
        'used_by__username',
    )
    list_filter = ('is_used', 'created_at')
    readonly_fields = ('code', 'created_at', 'used_at')
    ordering = ('-created_at',)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('created_by', 'used_by')


# ─────────────────────────────────────────────────────────────────────────────
# Friendship
# ─────────────────────────────────────────────────────────────────────────────

@admin.register(Friendship, site=admin_site)
class FriendshipAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'from_user',
        'to_user',
        'status',
        'created_at',
        'updated_at',
    )
    search_fields = (
        'from_user__username',
        'to_user__username',
    )
    list_filter = ('status', 'created_at')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-updated_at',)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('from_user', 'to_user')
