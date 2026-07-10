import os
import django
from graphql import GraphQLError

# Set up Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "havens.settings")
django.setup()

from django.contrib.auth.models import User
from django.utils import timezone
from core.models import Community, Event, Match, Message, Ticket, Participation, UserProfile
from core.queries import Query
from core.mutations import GenerateCloudinarySignature, SendMessage, ConfirmAttendance
import graphene

# 1. Mock info class for Graphene Context
class MockContext:
    def __init__(self, user):
        self.user = user

class MockInfo:
    def __init__(self, user):
        self.context = MockContext(user)

def run_tests():
    print("=== STARTING HAVENS MVP SCHEMA VERIFICATION ===")

    # Setup temporary test users and community
    username_a = "test_user_a"
    username_b = "test_user_b"
    username_c = "test_user_c"

    # Delete existing test users if any
    User.objects.filter(username__in=[username_a, username_b, username_c]).delete()
    
    user_a = User.objects.create_user(username=username_a, email="a@test.com", password="password")
    user_b = User.objects.create_user(username=username_b, email="b@test.com", password="password")
    user_c = User.objects.create_user(username=username_c, email="c@test.com", password="password")

    community = Community.objects.create(name="Test Community", subdomain="testcomm")

    # --- TEST 1: GEOLOCATION HA VERSINE FILTERING ---
    print("\n--- Testing Geolocation Haversine Filtering ---")
    # Clean up existing events to avoid noise
    Event.objects.all().delete()

    # Event 1: Close to coordinates (0, 0) - distance is ~15.7 km from (0, 0.1)
    # Let's place one at (0, 0)
    event_close = Event.objects.create(
        community=community,
        creator=user_a,
        title="Close Event",
        description="Close by",
        latitude=0.0,
        longitude=0.0,
        points_reward=10,
        visibility="public",
        scheduled_date=timezone.now()
    )

    # Event 2: Far from (0, 0) - distance is ~111 km from (0, 1)
    event_far = Event.objects.create(
        community=community,
        creator=user_a,
        title="Far Event",
        description="Far away",
        latitude=1.0,
        longitude=0.0,
        points_reward=10,
        visibility="public",
        scheduled_date=timezone.now()
    )

    query_resolver = Query()
    
    # Query events within 20 km of (0.0, 0.1)
    # Distance from (0, 0.1) to (0, 0) is roughly 11.1 km
    events_close_res = query_resolver.resolve_all_events(
        info=MockInfo(user_a),
        latitude=0.0,
        longitude=0.1,
        radius_km=20.0
    )
    print(f"Events within 20km: {[e.title for e in events_close_res]}")
    assert len(events_close_res) == 1, f"Expected 1 event, got {len(events_close_res)}"
    assert events_close_res[0].id == event_close.id, "Expected Close Event to be returned"

    # Query events within 150 km of (0.0, 0.1)
    events_all_res = query_resolver.resolve_all_events(
        info=MockInfo(user_a),
        latitude=0.0,
        longitude=0.1,
        radius_km=150.0
    )
    print(f"Events within 150km: {[e.title for e in events_all_res]}")
    assert len(events_all_res) == 2, f"Expected 2 events, got {len(events_all_res)}"
    print("Geolocation Haversine Filtering Test: PASSED")


    # --- TEST 2: CLOUDINARY SIGNATURE GENERATION ---
    print("\n--- Testing Cloudinary Signature Generation ---")
    # Set fake env variables for test
    os.environ['CLOUDINARY_API_KEY'] = "463119879725683"
    os.environ['CLOUDINARY_API_SECRET'] = "eUrI5DmiXV2VmZYnJ5V8MjQQslc"

    # Execute mutation
    params = {"folder": "profile_pics"}
    info_auth = MockInfo(user_a)
    result = GenerateCloudinarySignature.mutate(
        root=None,
        info=info_auth,
        params_to_sign=params
    )
    print(f"Success: {result.success}")
    print(f"Signature: {result.signature}")
    print(f"Timestamp: {result.timestamp}")
    print(f"API Key: {result.api_key}")
    assert result.success is True, "Signature generation failed"
    assert result.signature is not None, "Signature should not be None"
    assert result.api_key == "463119879725683", "API Key mismatch"
    print("Cloudinary Signature Generation Test: PASSED")


    # --- TEST 3: SENDMESSAGE SECURITY PERMISSIONS ---
    print("\n--- Testing SendMessage Security Permissions ---")
    # Create a match between user_a and user_b
    match = Match.objects.create(user1=user_a, user2=user_b)

    # User A sending message to match (authorized)
    print("Sending message as user_a (participant)...")
    res_auth = SendMessage.mutate(
        root=None,
        info=MockInfo(user_a),
        match_id=match.id,
        content="Hello from user A"
    )
    print(f"Success: {res_auth.success}, Message field: {res_auth.message_field}")
    assert res_auth.success is True
    assert Message.objects.filter(match=match, sender=user_a).exists()

    # User C sending message to match (unauthorized)
    print("Sending message as user_c (non-participant)...")
    try:
        SendMessage.mutate(
            root=None,
            info=MockInfo(user_c),
            match_id=match.id,
            content="Intruder message"
        )
        print("FAIL: Expected security validation exception, but none was raised.")
        assert False, "Security check failed: non-participant allowed to send message"
    except Exception as e:
        print(f"PASSED: Exception successfully caught: {str(e)}")
        # Check that it's a GraphQLError
        assert isinstance(e, GraphQLError) or "not part of this match" in str(e) or "not a participant" in str(e)


    # --- TEST 4: CONFIRMATTENDANCE SECURITY PERMISSIONS ---
    print("\n--- Testing ConfirmAttendance Security Permissions ---")
    
    # User A confirming for themselves (authorized)
    print("Confirming attendance for user_a by user_a...")
    res_confirm_auth = ConfirmAttendance.mutate(
        root=None,
        info=MockInfo(user_a),
        user_id=user_a.id,
        event_id=event_close.id
    )
    print(f"Success: {res_confirm_auth.success}, Message: {res_confirm_auth.message}")
    assert res_confirm_auth.success is True
    assert Ticket.objects.filter(user=user_a, event=event_close).exists()
    assert Participation.objects.filter(user=user_a, event=event_close).exists()

    # User B confirming for User A (unauthorized)
    print("Confirming attendance for user_a by user_b...")
    try:
        ConfirmAttendance.mutate(
            root=None,
            info=MockInfo(user_b),
            user_id=user_a.id,
            event_id=event_close.id
        )
        print("FAIL: Expected security validation exception, but none was raised.")
        assert False, "Security check failed: user allowed to confirm attendance for others"
    except Exception as e:
        print(f"PASSED: Exception successfully caught: {str(e)}")
        assert isinstance(e, GraphQLError) or "another user" in str(e)

    # Clean up test database records
    user_a.delete()
    user_b.delete()
    user_c.delete()
    community.delete()
    
    print("\n=== ALL TESTS PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_tests()
