"""Django Management Command: Event Database Cleanup & Deduplication (cleanup_events).

Usage:
  1. Find and remove duplicate events (keeps primary, merges RSVPs/tickets):
     python manage.py cleanup_events

  2. Dry run preview without making database changes:
     python manage.py cleanup_events --dry-run

  3. Completely wipe/flush all events:
     python manage.py cleanup_events --wipe
"""

from collections import defaultdict
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from core.models import Event, EventRSVP, Ticket, Participation


class Command(BaseCommand):
    help = (
        "Clean up duplicate event records from imports or completely wipe/flush events.\n"
        "Safely merges RSVPs and tickets to the keeper event before deleting redundant duplicates."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--wipe",
            "--all",
            action="store_true",
            dest="wipe",
            help="Completely delete ALL event records from the database.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Simulate deduplication or wipe without saving changes to the database.",
        )
        parser.add_argument(
            "--keep",
            type=str,
            choices=["first", "last"],
            default="first",
            help="Which duplicate instance to preserve: 'first' (lowest ID / earliest created) or 'last'. Default: first.",
        )

    def handle(self, *args, **options):
        is_wipe = options["wipe"]
        dry_run = options["dry_run"]
        keep_strategy = options["keep"]

        self.stdout.write(self.style.MIGRATE_HEADING("==> Havens Event Database Cleanup"))

        if dry_run:
            self.stdout.write(self.style.WARNING("[DRY RUN MODE] No changes will be persisted to the database.\n"))

        if is_wipe:
            total_count = Event.objects.count()
            if total_count == 0:
                self.stdout.write(self.style.SUCCESS("Database already contains 0 events. Nothing to wipe."))
                return

            self.stdout.write(self.style.WARNING(f"Found {total_count} event(s) to wipe."))
            if not dry_run:
                with transaction.atomic():
                    deleted_count, details = Event.objects.all().delete()
                self.stdout.write(self.style.SUCCESS(f"Successfully wiped {deleted_count} total record(s) (including relations) from the database."))
            else:
                self.stdout.write(self.style.NOTICE(f"[Dry Run] Would delete {total_count} event records."))
            return

        # Deduplication mode
        all_events = list(Event.objects.all().order_by("id"))
        if not all_events:
            self.stdout.write(self.style.SUCCESS("No events found in database."))
            return

        # Group by normalized title + date (or title + location)
        grouped = defaultdict(list)
        for ev in all_events:
            # Grouping key: normalized lowercase title + scheduled_date (to hour level)
            date_key = ev.scheduled_date.strftime("%Y-%m-%d %H") if ev.scheduled_date else "no-date"
            norm_title = ev.title.strip().lower()
            key = (norm_title, date_key)
            grouped[key].append(ev)

        duplicate_groups = {k: v for k, v in grouped.items() if len(v) > 1}

        if not duplicate_groups:
            self.stdout.write(self.style.SUCCESS(f"Scanned {len(all_events)} event(s): Zero duplicate events found!"))
            return

        self.stdout.write(self.style.WARNING(f"Found {len(duplicate_groups)} duplicate group(s) across {len(all_events)} total events.\n"))

        total_deleted = 0
        total_rsvps_merged = 0

        with transaction.atomic():
            for (title, date_key), event_list in duplicate_groups.items():
                keeper = event_list[0] if keep_strategy == "first" else event_list[-1]
                duplicates = [e for e in event_list if e.id != keeper.id]

                self.stdout.write(
                    f" - Group '{keeper.title}' on {date_key}: Keeping ID {keeper.id}, removing {len(duplicates)} duplicate(s) [IDs: {', '.join(str(d.id) for d in duplicates)}]"
                )

                if not dry_run:
                    for dup in duplicates:
                        # Re-point RSVPs if keeper doesn't already have an RSVP for that user
                        for rsvp in dup.rsvps.all():
                            if not EventRSVP.objects.filter(event=keeper, user=rsvp.user).exists():
                                rsvp.event = keeper
                                rsvp.save()
                                total_rsvps_merged += 1
                            else:
                                rsvp.delete()

                        # Re-point Tickets
                        for ticket in dup.tickets.all():
                            ticket.event = keeper
                            ticket.save()

                        # Re-point Participations
                        for part in dup.participations.all():
                            if not Participation.objects.filter(event=keeper, user=part.user).exists():
                                part.event = keeper
                                part.save()
                            else:
                                part.delete()

                        # Delete duplicate event
                        dup.delete()
                        total_deleted += 1
                else:
                    total_deleted += len(duplicates)

            if dry_run:
                # Force rollback in dry run just in case
                transaction.set_rollback(True)

        self.stdout.write("\n" + "=" * 60)
        if dry_run:
            self.stdout.write(self.style.NOTICE(f"[Dry Run Complete] Would remove {total_deleted} duplicate event(s)."))
        else:
            self.stdout.write(self.style.SUCCESS(f"Cleanup Complete! Removed {total_deleted} duplicate event(s) and merged {total_rsvps_merged} RSVP(s)."))
        self.stdout.write("=" * 60 + "\n")
