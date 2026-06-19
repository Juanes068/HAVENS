from django.contrib import admin
from .models import Community, UserProfile, Event, Ticket, Participation


@admin.register(Community)
class CommunityAdmin(admin.ModelAdmin):
    list_display = ('name', 'subdomain', 'created_at')
    search_fields = ('name', 'subdomain')


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'total_points')
    search_fields = ('user__username',)


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('title', 'community', 'latitude', 'longitude', 'points_reward', 'scheduled_date')
    list_filter = ('community',)
    search_fields = ('title',)


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ('user', 'event', 'status', 'created_at')
    list_filter = ('status',)


@admin.register(Participation)
class ParticipationAdmin(admin.ModelAdmin):
    list_display = ('user', 'event', 'points_awarded', 'attended_at')
