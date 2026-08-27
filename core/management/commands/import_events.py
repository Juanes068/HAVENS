"""Django Management Command: Bulk Event Importer (import_events).

===============================================================================
SCHEMA DEFINITION & EXCEL / CSV COLUMN SPECIFICATION
===============================================================================
This management command reads an Excel (.xlsx, .xls) or CSV (.csv) file and
bulk imports Event records into the Havens database.

Supported / Recognized Columns:
-------------------------------------------------------------------------------
Column Name          | Type           | Required? | Default / Notes
-------------------------------------------------------------------------------
title                | String (<=200) | YES       | Event title / headline.
description          | String         | NO        | Detailed event description (defaults to "").
scheduled_date       | Date / DateTime| YES       | Date of the event (e.g. "2026-09-15" or "2026-09-15 18:00:00").
scheduled_time       | Time / String  | NO        | Start time (e.g. "18:30" or "06:30 PM"). Combined with scheduled_date.
location             | String (<=300) | NO        | Human-readable venue name/address (alias: `location_name`).
latitude             | Float          | NO        | Geo latitude (alias: `lat`, defaults to 0.0 or --default-lat).
longitude            | Float          | NO        | Geo longitude (alias: `lng`, `lon`, defaults to 0.0 or --default-lng).
creator_id           | Int or String  | NO        | User ID or username who created the event (alias: `creator`, `creator_username`).
community_id         | Int or String  | NO        | Circle / Community ID or subdomain (alias: `circle_id`, `community`).
visibility           | String         | NO        | "public", "friends_only", or "community_only" (default: "public").
points_reward        | Integer        | NO        | Reward points for attendees (alias: `points`, default: 10).
image_url            | URL String     | NO        | Cover image URL (alias: `image`).
age_range            | String (<=100) | NO        | Target age range (e.g. "18-35", "21+", default: "All Ages").
min_age              | Integer        | NO        | Minimum allowed age (auto-inferred from age_range if omitted).
max_age              | Integer        | NO        | Maximum allowed age (auto-inferred from age_range if omitted).
hobbies              | Comma-Sep Str  | NO        | Comma-separated hobby names or IDs (alias: `hobby_names`, `hobby_ids`).

===============================================================================
USAGE EXAMPLES:
-------------------------------------------------------------------------------
1. Import from Excel (.xlsx):
   python manage.py import_events path/to/events.xlsx

2. Import from CSV (.csv):
   python manage.py import_events path/to/events.csv

3. Test parsing without writing to database (Dry Run):
   python manage.py import_events path/to/events.xlsx --dry-run

4. Specify default creator username and fallback coordinates:
   python manage.py import_events events.xlsx --default-creator admin --default-lat 4.6097 --default-lng -74.0817

5. Import atomically (rollback all if any row fails):
   python manage.py import_events events.xlsx --atomic
===============================================================================
"""

import os
import csv
import re
import datetime
from typing import Any, Dict, List, Optional, Tuple

from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime, parse_date, parse_time

from core.models import Event, Community, Hobby


class Command(BaseCommand):
    help = (
        "Bulk import events from an Excel (.xlsx, .xls) or CSV (.csv) file into Havens.\n"
        "Supports flexible column aliases, hobby associations, automatic date/time parsing, "
        "and dry-run validation."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "file_path",
            type=str,
            help="Path to the Excel (.xlsx, .xls) or CSV (.csv) file to import.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Validate and parse file without persisting changes to the database.",
        )
        parser.add_argument(
            "--atomic",
            action="store_true",
            help="Execute import within a single transaction; rolls back all imports if any row fails.",
        )
        parser.add_argument(
            "--sheet",
            type=str,
            default=None,
            help="Name or index of the Excel sheet to read (defaults to the first sheet).",
        )
        parser.add_argument(
            "--default-creator",
            type=str,
            default=None,
            help="Fallback username or user ID for rows without a specified creator.",
        )
        parser.add_argument(
            "--default-lat",
            type=float,
            default=0.0,
            help="Fallback latitude coordinate if missing in row (default: 0.0).",
        )
        parser.add_argument(
            "--default-lng",
            type=float,
            default=0.0,
            help="Fallback longitude coordinate if missing in row (default: 0.0).",
        )
        parser.add_argument(
            "--default-visibility",
            type=str,
            default="public",
            choices=["public", "friends_only", "community_only"],
            help="Default visibility for imported events (default: public).",
        )

    def handle(self, *args, **options):
        file_path = options["file_path"]
        dry_run = options["dry_run"]
        is_atomic = options["atomic"]
        sheet_name = options.get("sheet")
        default_creator_val = options.get("default_creator")
        default_lat = options.get("default_lat", 0.0)
        default_lng = options.get("default_lng", 0.0)
        default_visibility = options.get("default_visibility", "public")

        if not os.path.exists(file_path):
            raise CommandError(f"File not found: {file_path}")

        self.stdout.write(self.style.MIGRATE_HEADING(f"==> Starting Bulk Event Import from: {file_path}"))
        if dry_run:
            self.stdout.write(self.style.WARNING("[DRY RUN MODE] No changes will be saved to the database."))

        # 1. Resolve default creator if provided
        default_creator = self._resolve_user(default_creator_val) if default_creator_val else None

        # 2. Read raw row dictionaries from Excel or CSV
        rows = self._load_file_rows(file_path, sheet_name=sheet_name)
        if not rows:
            self.stdout.write(self.style.WARNING("No records found in the specified file."))
            return

        self.stdout.write(f"Loaded {len(rows)} row(s). Processing records...\n")

        # 3. Process records
        imported_count = 0
        failed_count = 0
        errors: List[Tuple[int, str]] = []

        def process_all_rows():
            nonlocal imported_count, failed_count
            for idx, raw_row in enumerate(rows, start=2):  # Start at row 2 (assuming row 1 is header)
                try:
                    event_data, hobby_instances = self._parse_row(
                        raw_row,
                        row_idx=idx,
                        default_creator=default_creator,
                        default_lat=default_lat,
                        default_lng=default_lng,
                        default_visibility=default_visibility,
                    )

                    if not dry_run:
                        event = Event.objects.create(**event_data)
                        if hobby_instances:
                            event.hobbies.set(hobby_instances)
                        self.stdout.write(
                            self.style.SUCCESS(f"  [Row {idx}] Imported: '{event.title}' (ID: {event.id})")
                        )
                    else:
                        self.stdout.write(
                            self.style.SUCCESS(f"  [Row {idx}] Validated: '{event_data.get('title')}'")
                        )

                    imported_count += 1

                except Exception as e:
                    failed_count += 1
                    err_msg = str(e)
                    errors.append((idx, err_msg))
                    self.stdout.write(
                        self.style.ERROR(f"  [Row {idx}] Error: {err_msg}")
                    )
                    if is_atomic:
                        raise CommandError(f"Aborting atomic transaction due to error on row {idx}: {err_msg}")

        if is_atomic and not dry_run:
            with transaction.atomic():
                process_all_rows()
        else:
            process_all_rows()

        # 4. Final summary report
        self.stdout.write("\n" + "=" * 60)
        self.stdout.write(self.style.MIGRATE_HEADING("IMPORT SUMMARY"))
        self.stdout.write("=" * 60)
        self.stdout.write(f"Total Rows Processed : {len(rows)}")
        self.stdout.write(self.style.SUCCESS(f"Successfully Imported: {imported_count}"))
        if failed_count > 0:
            self.stdout.write(self.style.ERROR(f"Failed Rows          : {failed_count}"))
            self.stdout.write("\nDetailed Failure Log:")
            for row_num, err in errors:
                self.stdout.write(self.style.NOTICE(f" - Row {row_num}: {err}"))
        else:
            self.stdout.write(self.style.SUCCESS("All rows processed with zero errors!"))
        self.stdout.write("=" * 60 + "\n")

    def _load_file_rows(self, file_path: str, sheet_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """Load tabular data from Excel (.xlsx, .xls) or CSV (.csv)."""
        ext = os.path.splitext(file_path)[1].lower()

        if ext in [".xlsx", ".xls"]:
            try:
                import pandas as pd
            except ImportError:
                raise CommandError(
                    "pandas is required to read Excel files. Install it via `pip install pandas openpyxl`."
                )

            try:
                sheet = sheet_name if sheet_name is not None else 0
                df = pd.read_excel(file_path, sheet_name=sheet)
                # Fill NaN with None for clean dictionary conversion
                df = df.where(pd.notnull(df), None)
                return df.to_dict(orient="records")
            except Exception as e:
                raise CommandError(f"Failed to parse Excel file '{file_path}': {e}")

        elif ext == ".csv":
            try:
                rows = []
                with open(file_path, mode="r", encoding="utf-8-sig") as csvfile:
                    reader = csv.DictReader(csvfile)
                    for row in reader:
                        # Normalize empty string values to None
                        cleaned = {k.strip(): (v.strip() if isinstance(v, str) else v) for k, v in row.items() if k}
                        rows.append(cleaned)
                return rows
            except Exception as e:
                raise CommandError(f"Failed to parse CSV file '{file_path}': {e}")

        else:
            raise CommandError(
                f"Unsupported file format '{ext}'. Please provide a .xlsx, .xls, or .csv file."
            )

    def _get_val(self, row: Dict[str, Any], *keys: str, default: Any = None) -> Any:
        """Helper to retrieve a value from row matching any key alias (case-insensitive)."""
        normalized_row = {str(k).strip().lower().replace(" ", "_"): v for k, v in row.items() if k is not None}
        for key in keys:
            k_norm = key.strip().lower().replace(" ", "_")
            if k_norm in normalized_row:
                val = normalized_row[k_norm]
                if val is not None:
                    if isinstance(val, str) and val.strip() == "":
                        continue
                    return val
        return default

    def _parse_row(
        self,
        row: Dict[str, Any],
        row_idx: int,
        default_creator: Optional[User],
        default_lat: float,
        default_lng: float,
        default_visibility: str,
    ) -> Tuple[Dict[str, Any], List[Hobby]]:
        """Parse, validate, and convert a single row dictionary into Event kwargs and Hobby list."""
        # 1. Title (Required)
        title = self._get_val(row, "title", "name", "event_title", "event_name")
        if not title or not str(title).strip():
            raise ValueError(f"Missing required field 'title' at row {row_idx}")
        title = str(title).strip()[:200]

        # 2. Description
        description = self._get_val(row, "description", "desc", "details", default="")
        description = str(description).strip() if description is not None else ""

        # 3. Scheduled Date and Time Parsing
        date_raw = self._get_val(row, "scheduled_date", "date", "event_date", "start_date", "datetime")
        time_raw = self._get_val(row, "scheduled_time", "time", "event_time", "start_time")
        scheduled_dt = self._parse_event_datetime(date_raw, time_raw, row_idx=row_idx)

        # 4. Location & Coordinates
        location_name = self._get_val(row, "location", "location_name", "venue", "address", default="")
        location_name = str(location_name).strip()[:300] if location_name else ""

        lat_raw = self._get_val(row, "latitude", "lat", default=default_lat)
        lng_raw = self._get_val(row, "longitude", "lng", "lon", default=default_lng)
        try:
            latitude = float(lat_raw) if lat_raw is not None else default_lat
            longitude = float(lng_raw) if lng_raw is not None else default_lng
        except (ValueError, TypeError):
            latitude = default_lat
            longitude = default_lng

        # 5. Creator
        creator_raw = self._get_val(row, "creator_id", "creator", "creator_username", "user", "user_id")
        creator = self._resolve_user(creator_raw) if creator_raw else default_creator

        # 6. Community / Circle
        community_raw = self._get_val(row, "community_id", "circle_id", "community", "circle")
        community = self._resolve_community(community_raw) if community_raw else None

        # 7. Points Reward
        points_raw = self._get_val(row, "points_reward", "points", "points_awarded", default=10)
        try:
            points_reward = int(points_raw)
        except (ValueError, TypeError):
            points_reward = 10

        # 8. Visibility
        visibility_raw = self._get_val(row, "visibility", default=default_visibility)
        visibility = self._normalize_visibility(visibility_raw, default_visibility)

        # 9. Image URL
        image_url = self._get_val(row, "image_url", "image", "photo_url", "photo", default=None)
        if image_url:
            image_url = str(image_url).strip()[:500]

        # 10. Age Range & Min/Max Age
        age_range_raw = self._get_val(row, "age_range", "age_limit", default="All Ages")
        age_range = str(age_range_raw).strip()[:100] if age_range_raw else "All Ages"

        min_age_raw = self._get_val(row, "min_age", "minimum_age")
        max_age_raw = self._get_val(row, "max_age", "maximum_age")

        min_age, max_age = self._parse_min_max_age(min_age_raw, max_age_raw, age_range)

        # 11. Hobbies
        hobbies_raw = self._get_val(row, "hobbies", "hobby_names", "hobby_ids", "tags", "categories")
        hobbies = self._resolve_hobbies(hobbies_raw) if hobbies_raw else []

        event_data = {
            "title": title,
            "description": description,
            "scheduled_date": scheduled_dt,
            "location_name": location_name,
            "latitude": latitude,
            "longitude": longitude,
            "creator": creator,
            "community": community,
            "points_reward": points_reward,
            "visibility": visibility,
            "image_url": image_url,
            "age_range": age_range,
            "min_age": min_age,
            "max_age": max_age,
        }

        return event_data, hobbies

    def _parse_event_datetime(self, date_val: Any, time_val: Any, row_idx: int) -> datetime.datetime:
        """Parse combined or separate date/time fields into a timezone-aware datetime."""
        if date_val is None:
            return timezone.now()

        # If date_val is already a datetime or pandas Timestamp
        if isinstance(date_val, datetime.datetime):
            dt = date_val
        elif isinstance(date_val, datetime.date):
            dt = datetime.datetime.combine(date_val, datetime.time.min)
        else:
            date_str = str(date_val).strip()
            parsed_dt = parse_datetime(date_str)
            if parsed_dt:
                dt = parsed_dt
            else:
                parsed_d = parse_date(date_str)
                if parsed_d:
                    dt = datetime.datetime.combine(parsed_d, datetime.time.min)
                else:
                    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d", "%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S"):
                        try:
                            dt = datetime.datetime.strptime(date_str, fmt)
                            break
                        except ValueError:
                            continue
                    else:
                        raise ValueError(
                            f"Invalid date format '{date_val}' at row {row_idx}. "
                            f"Expected ISO format YYYY-MM-DD or YYYY-MM-DD HH:MM:SS."
                        )

        # If a separate time value was supplied, overlay time component
        if time_val is not None:
            if isinstance(time_val, datetime.time):
                dt = datetime.datetime.combine(dt.date(), time_val)
            elif isinstance(time_val, datetime.datetime):
                dt = datetime.datetime.combine(dt.date(), time_val.time())
            else:
                time_str = str(time_val).strip()
                parsed_t = parse_time(time_str)
                if parsed_t:
                    dt = datetime.datetime.combine(dt.date(), parsed_t)
                else:
                    for t_fmt in ("%H:%M", "%H:%M:%S", "%I:%M %p", "%I:%M:%S %p"):
                        try:
                            t_obj = datetime.datetime.strptime(time_str, t_fmt).time()
                            dt = datetime.datetime.combine(dt.date(), t_obj)
                            break
                        except ValueError:
                            continue

        if timezone.is_naive(dt):
            dt = timezone.make_aware(dt, timezone.get_current_timezone())

        return dt

    def _resolve_user(self, user_val: Any) -> Optional[User]:
        """Look up User by ID or username."""
        if not user_val:
            return None
        val_str = str(user_val).strip()
        if val_str.isdigit():
            user = User.objects.filter(id=int(val_str)).first()
            if user:
                return user
        return User.objects.filter(username__iexact=val_str).first()

    def _resolve_community(self, comm_val: Any) -> Optional[Community]:
        """Look up Community by ID, subdomain, or name."""
        if not comm_val:
            return None
        val_str = str(comm_val).strip()
        if val_str.isdigit():
            comm = Community.objects.filter(id=int(val_str)).first()
            if comm:
                return comm
        return (
            Community.objects.filter(subdomain__iexact=val_str).first()
            or Community.objects.filter(name__iexact=val_str).first()
        )

    def _normalize_visibility(self, val: Any, default: str) -> str:
        """Map aliases to valid model visibility choices."""
        if not val:
            return default
        v = str(val).strip().lower()
        if v in ["public", "all"]:
            return "public"
        if v in ["friends_only", "friends", "friend"]:
            return "friends_only"
        if v in ["community_only", "community", "circle", "circle_only"]:
            return "community_only"
        return default

    def _parse_min_max_age(
        self, min_raw: Any, max_raw: Any, age_range: str
    ) -> Tuple[Optional[int], Optional[int]]:
        """Extract or parse min_age and max_age from explicit columns or age_range string."""
        min_age, max_age = None, None

        if min_raw is not None and str(min_raw).strip().isdigit():
            min_age = int(str(min_raw).strip())
        if max_raw is not None and str(max_raw).strip().isdigit():
            max_age = int(str(max_raw).strip())

        if min_age is None or max_age is None:
            # Try to extract numbers from age_range e.g. "18-35", "21+", "18-25"
            range_match = re.match(r"^(\d+)\s*[-–to]+\s*(\d+)$", age_range.strip(), re.IGNORECASE)
            if range_match:
                if min_age is None:
                    min_age = int(range_match.group(1))
                if max_age is None:
                    max_age = int(range_match.group(2))
            else:
                plus_match = re.match(r"^(\d+)\s*\+$", age_range.strip())
                if plus_match and min_age is None:
                    min_age = int(plus_match.group(1))

        return min_age, max_age

    def _resolve_hobbies(self, raw_hobbies: Any) -> List[Hobby]:
        """Resolve comma-separated hobby names or IDs to Hobby model instances."""
        if not raw_hobbies:
            return []

        resolved: List[Hobby] = []
        if isinstance(raw_hobbies, (list, tuple)):
            items = [str(x).strip() for x in raw_hobbies if str(x).strip()]
        else:
            items = [item.strip() for item in str(raw_hobbies).split(",") if item.strip()]

        for item in items:
            if item.isdigit():
                h = Hobby.objects.filter(id=int(item)).first()
            else:
                h = Hobby.objects.filter(name__iexact=item).first()
            if h and h not in resolved:
                resolved.append(h)

        return resolved
