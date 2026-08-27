from django.test import TestCase
from django.contrib.auth.models import User
from core.models import UserProfile, HobbyCategory, Hobby, Match, Community, CommunityMembership, CircleMessage
from core.utils import haversine_km, calculate_user_recommendations, calculate_circle_recommendations
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

    def test_security_third_party_cannot_respond_to_request(self):
        """User C cannot accept/decline match requests between User A and User B."""
        # Request from User Main (A) -> User Near High (B)
        match = Match.objects.create(
            user1=min(self.user_main, self.user_near_high, key=lambda u: u.id),
            user2=max(self.user_main, self.user_near_high, key=lambda u: u.id),
            initiator=self.user_main,
            status='pending'
        )

        class MockContext:
            def __init__(self, user):
                self.user = user
                self.is_authenticated = True

        # User Far (C) attempts to accept the request between A and B
        ctx_c = MockContext(self.user_far)
        mutation = f"""
        mutation {{
            respondConnectRequest(matchId: {match.id}, action: "accept") {{
                success
                message
            }}
        }}
        """
        res = schema.execute(mutation, context_value=ctx_c)
        self.assertFalse(res.data['respondConnectRequest']['success'])
        self.assertEqual(res.data['respondConnectRequest']['message'], "Connection request not found.")

        # Verify match is still untouched and pending
        match.refresh_from_db()
        self.assertEqual(match.status, 'pending')

    def test_security_requester_cannot_respond_to_own_request(self):
        """User A cannot accept/decline their own pending outgoing request."""
        match = Match.objects.create(
            user1=min(self.user_main, self.user_near_high, key=lambda u: u.id),
            user2=max(self.user_main, self.user_near_high, key=lambda u: u.id),
            initiator=self.user_main,
            status='pending'
        )

        class MockContext:
            def __init__(self, user):
                self.user = user
                self.is_authenticated = True

        ctx_a = MockContext(self.user_main)
        mutation = f"""
        mutation {{
            respondConnectRequest(matchId: {match.id}, action: "accept") {{
                success
                message
            }}
        }}
        """
        res = schema.execute(mutation, context_value=ctx_a)
        self.assertFalse(res.data['respondConnectRequest']['success'])
        self.assertIn("Cannot respond to your own outgoing connection request", res.data['respondConnectRequest']['message'])

    def test_circle_recommendations_physical_radius_and_virtual_bypass(self):
        """Physical circles outside radius are excluded; virtual circles bypass radius filter."""
        # Circle 1: Bogota (Near, ~2 km from user_main), 1 exact hobby match (+3)
        circle_near = Community.objects.create(
            name="Bogota Running Club",
            subdomain="bogota-running",
            latitude=4.6200,
            longitude=-74.0700,
            is_virtual=False,
            creator=self.user_near_high
        )
        circle_near.hobbies.add(self.hobby_running)

        # Circle 2: Vancouver (Far, ~6300 km from user_main), 2 exact hobbies
        circle_far = Community.objects.create(
            name="Vancouver Marathoners",
            subdomain="vancouver-marathoners",
            latitude=49.2827,
            longitude=-123.1207,
            is_virtual=False,
            creator=self.user_far
        )
        circle_far.hobbies.add(self.hobby_running, self.hobby_cycling)

        # Circle 3: Virtual Group (null coords, is_virtual=True), 1 related category hobby (+1)
        circle_virtual = Community.objects.create(
            name="Global Sports Tech Hub",
            subdomain="global-sports-tech",
            latitude=None,
            longitude=None,
            is_virtual=True,
            creator=self.user_near_low
        )
        circle_virtual.hobbies.add(self.hobby_cycling)

        class MockContext:
            def __init__(self, user):
                self.user = user
                self.is_authenticated = True

        ctx = MockContext(self.user_main)
        query = """
        query {
            getRecommendedCircles(radiusKm: 50.0) {
                id
                name
                isVirtual
                distance
                affinityScore
                matchPercentage
            }
        }
        """
        res = schema.execute(query, context_value=ctx)
        self.assertIsNone(res.errors)
        recommended = res.data['getRecommendedCircles']

        # Vancouver circle (~6300 km away) must be completely excluded
        rec_ids = [c['id'] for c in recommended]
        self.assertNotIn(str(circle_far.id), rec_ids)
        self.assertNotIn(circle_far.id, rec_ids)

        # Bogota and Virtual circles must be included
        self.assertIn(str(circle_near.id), [str(c['id']) for c in recommended])
        self.assertIn(str(circle_virtual.id), [str(c['id']) for c in recommended])

        # Bogota circle (exact match, affinity = 3) ranks before Virtual circle (related category, affinity = 1)
        self.assertEqual(int(recommended[0]['id']), circle_near.id)
        self.assertEqual(recommended[0]['affinityScore'], 3)
        self.assertEqual(int(recommended[1]['id']), circle_virtual.id)
        self.assertEqual(recommended[1]['affinityScore'], 1)
        self.assertTrue(recommended[1]['isVirtual'])

    def test_delete_community_success_restores_quota(self):
        """Deleting a circle succeeds for creator and releases 1 slot in the creation quota."""
        # Create circle
        circle = Community.objects.create(
            name="Circle To Delete",
            subdomain=f"circle-to-delete-{self.user_main.id}",
            creator=self.user_main
        )
        self.assertEqual(Community.objects.filter(creator=self.user_main).count(), 1)

        class MockContext:
            def __init__(self, user):
                self.user = user
                self.is_authenticated = True

        ctx = MockContext(self.user_main)
        mutation = f"""
        mutation {{
            deleteCommunity(id: {circle.id}) {{
                success
                message
                deletedCircleId
            }}
        }}
        """
        res = schema.execute(mutation, context_value=ctx)
        self.assertIsNone(res.errors)
        self.assertTrue(res.data['deleteCommunity']['success'])
        self.assertEqual(res.data['deleteCommunity']['deletedCircleId'], circle.id)

        # Confirm deleted and quota freed
        self.assertEqual(Community.objects.filter(id=circle.id).count(), 0)
        self.assertEqual(Community.objects.filter(creator=self.user_main).count(), 0)

    def test_delete_community_permission_denied_for_non_creator(self):
        """A user cannot delete a circle created by someone else."""
        circle = Community.objects.create(
            name="Protected Circle",
            subdomain=f"protected-circle-{self.user_main.id}",
            creator=self.user_main
        )

        class MockContext:
            def __init__(self, user):
                self.user = user
                self.is_authenticated = True

        # Non-creator user attempts deletion
        ctx_other = MockContext(self.user_far)
        mutation = f"""
        mutation {{
            deleteCommunity(id: {circle.id}) {{
                success
                message
            }}
        }}
        """
        res = schema.execute(mutation, context_value=ctx_other)
        self.assertFalse(res.data['deleteCommunity']['success'])
        self.assertIn("Permission denied", res.data['deleteCommunity']['message'])

        # Circle remains intact
        self.assertEqual(Community.objects.filter(id=circle.id).count(), 1)


class CircleGroupChatTests(TestCase):
    def setUp(self):
        # Create Users
        self.creator = User.objects.create_user(username="creator_user", email="creator@havens.com", password="password123")
        self.member = User.objects.create_user(username="member_user", email="member@havens.com", password="password123")
        self.outsider = User.objects.create_user(username="outsider_user", email="outsider@havens.com", password="password123")

        # Create Circle
        self.circle = Community.objects.create(
            name="AI Innovators Club",
            subdomain="ai-innovators",
            description="Discussing AI advancements and LLMs.",
            creator=self.creator
        )
        # Add creator and member to memberships
        CommunityMembership.objects.create(user=self.creator, community=self.circle)
        CommunityMembership.objects.create(user=self.member, community=self.circle)

    def _get_context(self, user):
        class MockContext:
            def __init__(self, u):
                self.user = u
                self.is_authenticated = True
        return MockContext(user)

    def test_send_circle_message_success_as_member(self):
        """A confirmed member of the Circle can successfully post a group message."""
        ctx = self._get_context(self.member)
        mutation = f"""
        mutation {{
            sendCircleMessage(circleId: {self.circle.id}, content: "Hello everyone in AI Innovators!") {{
                success
                messageField
                message {{
                    id
                    content
                    sender {{
                        username
                    }}
                    circle {{
                        name
                    }}
                }}
            }}
        }}
        """
        res = schema.execute(mutation, context_value=ctx)
        self.assertIsNone(res.errors)
        data = res.data['sendCircleMessage']
        self.assertTrue(data['success'])
        self.assertEqual(data['message']['content'], "Hello everyone in AI Innovators!")
        self.assertEqual(data['message']['sender']['username'], "member_user")
        self.assertEqual(data['message']['circle']['name'], "AI Innovators Club")
        self.assertEqual(CircleMessage.objects.filter(circle=self.circle).count(), 1)

    def test_send_circle_message_success_as_creator(self):
        """The Circle creator can post messages to the group chat."""
        ctx = self._get_context(self.creator)
        mutation = f"""
        mutation {{
            sendCircleMessage(circleId: {self.circle.id}, content: "Welcome to the group chat!") {{
                success
                messageField
                message {{
                    id
                    content
                    sender {{
                        username
                    }}
                }}
            }}
        }}
        """
        res = schema.execute(mutation, context_value=ctx)
        self.assertIsNone(res.errors)
        self.assertTrue(res.data['sendCircleMessage']['success'])
        self.assertEqual(res.data['sendCircleMessage']['message']['content'], "Welcome to the group chat!")

    def test_send_circle_message_forbidden_for_non_member(self):
        """A non-member cannot post messages to the Circle group chat and receives failure."""
        ctx = self._get_context(self.outsider)
        mutation = f"""
        mutation {{
            sendCircleMessage(circleId: {self.circle.id}, content: "I am an outsider trying to spam.") {{
                success
                messageField
            }}
        }}
        """
        res = schema.execute(mutation, context_value=ctx)
        self.assertIsNone(res.errors)
        self.assertFalse(res.data['sendCircleMessage']['success'])
        self.assertIn("Access denied", res.data['sendCircleMessage']['messageField'])
        self.assertEqual(CircleMessage.objects.filter(circle=self.circle).count(), 0)

    def test_send_circle_message_empty_content_validation(self):
        """Sending empty or whitespace-only message returns failure with validation message."""
        ctx = self._get_context(self.member)
        mutation = f"""
        mutation {{
            sendCircleMessage(circleId: {self.circle.id}, content: "   ") {{
                success
                messageField
            }}
        }}
        """
        res = schema.execute(mutation, context_value=ctx)
        self.assertIsNone(res.errors)
        self.assertFalse(res.data['sendCircleMessage']['success'])
        self.assertIn("cannot be empty", res.data['sendCircleMessage']['messageField'])

    def test_get_circle_messages_success_as_member(self):
        """A confirmed member can retrieve the chronological chat history."""
        # Create some messages
        CircleMessage.objects.create(circle=self.circle, sender=self.creator, content="First message")
        CircleMessage.objects.create(circle=self.circle, sender=self.member, content="Second message")

        ctx = self._get_context(self.member)
        query = f"""
        query {{
            getCircleMessages(circleId: {self.circle.id}) {{
                id
                content
                sender {{
                    username
                }}
            }}
        }}
        """
        res = schema.execute(query, context_value=ctx)
        self.assertIsNone(res.errors)
        messages = res.data['getCircleMessages']
        self.assertEqual(len(messages), 2)
        self.assertEqual(messages[0]['content'], "First message")
        self.assertEqual(messages[1]['content'], "Second message")

    def test_get_circle_messages_forbidden_for_non_member(self):
        """A non-member receives an empty list when attempting to read private Circle chat."""
        CircleMessage.objects.create(circle=self.circle, sender=self.creator, content="Private Circle discussion")

        ctx = self._get_context(self.outsider)
        query = f"""
        query {{
            getCircleMessages(circleId: {self.circle.id}) {{
                id
                content
            }}
        }}
        """
        res = schema.execute(query, context_value=ctx)
        self.assertIsNone(res.errors)
        self.assertEqual(res.data['getCircleMessages'], [])


