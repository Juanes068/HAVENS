from django.test import TestCase
from django.contrib.auth.models import User
from core.models import UserProfile, HobbyCategory, Hobby, Match
from core.utils import haversine_km, calculate_user_recommendations
from havens.schema import schema


class MatchingEngineAndAsyncLogicTests(TestCase):
    def setUp(self):
        # Create Hobby Categories
        self.cat_sports = HobbyCategory.objects.create(name="Sports & Fitness")
        self.cat_tech = HobbyCategory.objects.create(name="Technology & Gaming")

        # Create Hobbies
        self.hobby_running = Hobby.objects.create(name="Running", category=self.cat_sports)
        self.hobby_cycling = Hobby.objects.create(name="Cycling", category=self.cat_sports)
        self.hobby_gaming = Hobby.objects.create(name="Video Games", category=self.cat_tech)
        self.hobby_coding = Hobby.objects.create(name="Coding", category=self.cat_tech)

        # Create Primary User (Bogota Center: 4.6097, -74.0817)
        self.user_main = User.objects.create_user(username="main_user", email="main@test.com", password="password123")
        self.profile_main = UserProfile.objects.create(
            user=self.user_main,
            latitude=4.6097,
            longitude=-74.0817,
            neighbourhood="Chapinero"
        )
        self.profile_main.hobbies.add(self.hobby_running, self.hobby_gaming)

        # User 1 (Near - 2km, Exact + Related match): Running (Exact), Cycling (Related)
        self.user_near_high = User.objects.create_user(username="near_high", email="near_high@test.com", password="password123")
        self.profile_near_high = UserProfile.objects.create(
            user=self.user_near_high,
            latitude=4.6200,
            longitude=-74.0700,
            neighbourhood="Teusaquillo"
        )
        self.profile_near_high.hobbies.add(self.hobby_running, self.hobby_cycling)

        # User 2 (Near - 3km, Related only match): Coding (Related via Tech)
        self.user_near_low = User.objects.create_user(username="near_low", email="near_low@test.com", password="password123")
        self.profile_near_low = UserProfile.objects.create(
            user=self.user_near_low,
            latitude=4.6300,
            longitude=-74.0600,
            neighbourhood="Salitre"
        )
        self.profile_near_low.hobbies.add(self.hobby_coding)

        # User 3 (Far - Medellin ~240km, Exact match): Running, Video Games
        self.user_far = User.objects.create_user(username="far_user", email="far@test.com", password="password123")
        self.profile_far = UserProfile.objects.create(
            user=self.user_far,
            latitude=6.2442,
            longitude=-75.5812,
            neighbourhood="El Poblado"
        )
        self.profile_far.hobbies.add(self.hobby_running, self.hobby_gaming)

    def test_location_first_filtering(self):
        """Users outside radius_km should be strictly excluded when location filtering is active."""
        # 50km radius should include near_high and near_low, but EXCLUDE far_user (Medellin)
        recs = calculate_user_recommendations(
            user=self.user_main,
            radius_km=50.0
        )
        rec_usernames = [u.username for u in recs]
        self.assertIn("near_high", rec_usernames)
        self.assertIn("near_low", rec_usernames)
        self.assertNotIn("far_user", rec_usernames)
        self.assertNotIn("main_user", rec_usernames)

    def test_vancouver_bogota_strict_exclusion(self):
        """A user in Vancouver with 100% hobby match must NEVER appear for a user in Bogota."""
        user_vancouver = User.objects.create_user(username="vancouver_100", email="van@test.com", password="password123")
        profile_van = UserProfile.objects.create(
            user=user_vancouver,
            latitude=49.2827,
            longitude=-123.1207,
            neighbourhood="Downtown Vancouver"
        )
        # Give 100% match with main_user
        profile_van.hobbies.add(self.hobby_running, self.hobby_gaming)

        recs = calculate_user_recommendations(
            user=self.user_main,
            radius_km=50.0
        )
        rec_usernames = [u.username for u in recs]
        self.assertNotIn("vancouver_100", rec_usernames)

    def test_affinity_scoring_and_sorting(self):
        """Profiles must be sorted strictly by highest affinity score first (exact match > related match)."""
        recs = calculate_user_recommendations(
            user=self.user_main,
            radius_km=50.0
        )
        self.assertEqual(len(recs), 2)
        # near_high has 1 exact (Running: 3pts) + 1 related (Cycling: 1pt) = 4pts
        # near_low has 0 exact + 1 related (Coding: 1pt) = 1pt
        self.assertEqual(recs[0].username, "near_high")
        self.assertEqual(recs[0].affinity_score, 4)
        self.assertEqual(len(recs[0].shared_hobbies), 1)
        self.assertEqual(len(recs[0].related_hobbies), 1)

        self.assertEqual(recs[1].username, "near_low")
        self.assertEqual(recs[1].affinity_score, 1)

    def test_async_match_lifecycle(self):
        """Test sending connect request, pending state, and responding with accept/reject."""
        # Main user sends connect request to near_high
        mutation_send = """
        mutation {
            sendConnectRequest(toUserId: %d) {
                success
                message
                match {
                    id
                    status
                    initiator { id username }
                }
            }
        }
        """ % self.user_near_high.id

        class MockInfo:
            class Context:
                def __init__(self, user):
                    self.user = user
                    self.is_authenticated = True
            context = None

        mock_context = MockInfo.Context(self.user_main)
        result = schema.execute(mutation_send, context_value=mock_context)
        self.assertIsNone(result.errors)
        data = result.data['sendConnectRequest']
        self.assertTrue(data['success'])
        self.assertEqual(data['match']['status'], 'pending')
        self.assertEqual(data['match']['initiator']['username'], 'main_user')
        match_id = data['match']['id']

        # near_high responds and accepts the request
        mutation_respond = """
        mutation {
            respondConnectRequest(matchId: %s, action: "accept") {
                success
                message
                match {
                    id
                    status
                }
            }
        }
        """ % match_id

        mock_context_near = MockInfo.Context(self.user_near_high)
        result2 = schema.execute(mutation_respond, context_value=mock_context_near)
        self.assertIsNone(result2.errors)
        data2 = result2.data['respondConnectRequest']
        self.assertTrue(data2['success'])
        self.assertEqual(data2['match']['status'], 'accepted')

    def test_mutual_connect_auto_accepts(self):
        """If user B sends a connect request to user A who already sent one, match becomes accepted."""
        # User A -> User B
        Match.objects.create(
            user1=min(self.user_main, self.user_near_high, key=lambda u: u.id),
            user2=max(self.user_main, self.user_near_high, key=lambda u: u.id),
            initiator=self.user_main,
            status='pending'
        )

        # User B sends connect request back to User A
        mutation = """
        mutation {
            sendConnectRequest(toUserId: %d) {
                success
                message
                match {
                    status
                }
            }
        }
        """ % self.user_main.id

        class MockContext:
            def __init__(self, user):
                self.user = user
                self.is_authenticated = True

        result = schema.execute(mutation, context_value=MockContext(self.user_near_high))
        self.assertIsNone(result.errors)
        self.assertTrue(result.data['sendConnectRequest']['success'])
        self.assertEqual(result.data['sendConnectRequest']['match']['status'], 'accepted')

    def test_circle_creation_limit_enforced(self):
        """Users are strictly restricted to creating a maximum of 3 Circles."""
        from core.models import Community
        from django.core.exceptions import ValidationError

        class MockContext:
            def __init__(self, user):
                self.user = user
                self.is_authenticated = True

        ctx = MockContext(self.user_main)

        # Create 3 circles successfully
        for i in range(1, 4):
            mutation = f"""
            mutation {{
                createCommunity(name: "Circle {i}", subdomain: "circle-{i}-{self.user_main.id}") {{
                    success
                    message
                    community {{ id name }}
                }}
            }}
            """
            res = schema.execute(mutation, context_value=ctx)
            self.assertIsNone(res.errors)
            self.assertTrue(res.data['createCommunity']['success'])

        # 4th circle via GraphQL mutation must fail
        mutation_4th = f"""
        mutation {{
            createCommunity(name: "Circle 4", subdomain: "circle-4-{self.user_main.id}") {{
                success
                message
                community {{ id name }}
            }}
        }}
        """
        res_4th = schema.execute(mutation_4th, context_value=ctx)
        self.assertFalse(res_4th.data['createCommunity']['success'])
        self.assertIn("Circle creation limit reached", res_4th.data['createCommunity']['message'])

        # 4th circle via direct model save must also raise ValidationError
        with self.assertRaises(ValidationError):
            Community.objects.create(
                name="Circle 4 Direct",
                subdomain="circle-4-direct",
                creator=self.user_main
            )

