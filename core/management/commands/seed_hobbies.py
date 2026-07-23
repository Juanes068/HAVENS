import json
from django.core.management.base import BaseCommand
from core.models import HobbyCategory, Hobby

HOBBIES_DATA = [
  {
    "name": "Sports & Fitness",
    "hobbies": [
      "Running", "Trail Running", "Walking", "Hiking", "Backpacking", "Cycling",
      "Mountain Biking", "Road Cycling", "Swimming", "Triathlon", "Marathon Training",
      "CrossFit", "Weightlifting", "Powerlifting", "Bodybuilding", "Functional Training",
      "Yoga", "Pilates", "Boxing", "Kickboxing", "MMA", "Brazilian Jiu-Jitsu",
      "Rock Climbing", "Bouldering", "Padel", "Tennis", "Pickleball", "Golf",
      "Basketball", "Soccer", "Volleyball", "Surfing", "Snowboarding", "Skiing",
      "Skateboarding", "Roller Skating", "Ice Skating", "Dance Fitness"
    ]
  },
  {
    "name": "Technology",
    "hobbies": [
      "Artificial Intelligence", "Machine Learning", "Programming", "Web Development",
      "Mobile Development", "Game Development", "Cybersecurity", "Cloud Computing",
      "Data Science", "Open Source", "Robotics", "3D Printing", "IoT", "Automation",
      "Home Automation", "PC Building", "Mechanical Keyboards", "Linux", "Startups",
      "Product Design", "UX/UI Design", "No-Code Tools", "Crypto", "Blockchain", "Wearable Tech"
    ]
  },
  {
    "name": "Arts & Creativity",
    "hobbies": [
      "Photography", "Street Photography", "Film Photography", "Videography", "Filmmaking",
      "Painting", "Drawing", "Sketching", "Digital Art", "Illustration", "Graphic Design",
      "Animation", "3D Modeling", "Sculpting", "Pottery", "Calligraphy", "Crafting",
      "DIY Projects", "Woodworking", "Leathercraft", "Embroidery", "Knitting",
      "Fashion Design", "Interior Design"
    ]
  },
  {
    "name": "Music",
    "hobbies": [
      "Live Concerts", "Music Festivals", "DJing", "Music Production", "Songwriting",
      "Singing", "Guitar", "Piano", "Drums", "Violin", "Bass Guitar", "Vinyl Collecting",
      "Hi-Fi Audio", "K-Pop", "Hip-Hop", "Rock", "Jazz", "Classical Music",
      "Electronic Music", "Lo-Fi", "Indie Music", "Metal", "R&B", "Podcasts"
    ]
  },
  {
    "name": "Food & Drinks",
    "hobbies": [
      "Cooking", "Baking", "Specialty Coffee", "Espresso", "Pour Over Coffee",
      "Tea Culture", "Wine Tasting", "Craft Beer", "Whiskey", "Cocktail Making",
      "Mixology", "BBQ", "Pizza Making", "Sushi", "Street Food", "Fine Dining",
      "Food Photography", "Healthy Cooking", "Meal Prep", "Fermentation", "Chocolate",
      "Cheese", "Food Festivals", "Brunch"
    ]
  },
  {
    "name": "Travel & Adventure",
    "hobbies": [
      "Traveling", "Backpacking", "Solo Travel", "Luxury Travel", "Road Trips",
      "Van Life", "Camping", "Glamping", "Adventure Travel", "National Parks",
      "Beach Destinations", "City Breaks", "Cultural Travel", "Eco Tourism",
      "Scuba Diving", "Snorkeling", "Sailing", "Cruises", "Travel Photography",
      "Digital Nomad Life", "Hidden Gems", "Mountain Trips", "Safari", "Island Hopping"
    ]
  },
  {
    "name": "Movies, TV & Entertainment",
    "hobbies": [
      "Movies", "TV Series", "Netflix", "Cinema", "Documentaries", "Anime", "Manga",
      "K-Dramas", "Reality Shows", "Marvel", "DC", "Sci-Fi", "Fantasy", "Horror",
      "Thrillers", "Comedy", "True Crime", "Stand-up Comedy", "Streaming",
      "Movie Reviews", "Film Festivals"
    ]
  },
  {
    "name": "Gaming",
    "hobbies": [
      "PC Gaming", "PlayStation", "Xbox", "Nintendo", "Steam", "Mobile Gaming",
      "Esports", "Retro Gaming", "Indie Games", "VR Gaming", "Simulation Games",
      "RPGs", "FPS Games", "Strategy Games", "Board Games", "Card Games", "Chess",
      "Dungeons & Dragons", "Game Streaming", "Speedrunning"
    ]
  },
  {
    "name": "Health & Wellness",
    "hobbies": [
      "Meditation", "Mindfulness", "Breathwork", "Biohacking", "Nutrition",
      "Healthy Living", "Mental Health", "Journaling", "Self Improvement",
      "Cold Plunges", "Sauna", "Sleep Optimization", "Stretching", "Holistic Health",
      "Personal Growth", "Life Coaching", "Minimalism", "Digital Detox"
    ]
  },
  {
    "name": "Fashion & Beauty",
    "hobbies": [
      "Streetwear", "Luxury Fashion", "Sneakers", "Vintage Fashion", "Thrifting",
      "Sustainable Fashion", "Jewelry", "Watches", "Perfumes", "Skincare", "Makeup",
      "Haircare", "Nail Art", "Personal Styling", "Fashion Photography",
      "Designer Brands", "Accessories"
    ]
  },
  {
    "name": "Business & Finance",
    "hobbies": [
      "Entrepreneurship", "Startups", "Investing", "Stock Market", "Real Estate",
      "Personal Finance", "Side Hustles", "Freelancing", "Marketing", "Sales",
      "Brand Building", "Leadership", "Product Management", "Economics",
      "Business Books", "Networking", "Angel Investing", "Venture Capital"
    ]
  },
  {
    "name": "Lifestyle & Social",
    "hobbies": [
      "Nightlife", "Bars", "Cocktail Bars", "Clubbing", "Festivals",
      "Networking Events", "Meetups", "Board Game Nights", "Escape Rooms",
      "Trivia Nights", "Karaoke", "Book Clubs", "Volunteering", "Community Events",
      "Brunch", "Coffee Shops", "Picnics", "Shopping"
    ]
  },
  {
    "name": "Books & Learning",
    "hobbies": [
      "Reading", "Fiction", "Non-Fiction", "Fantasy Books", "Science Fiction",
      "Mystery Novels", "Romance Books", "History", "Psychology", "Philosophy",
      "Science", "Languages", "Writing", "Poetry", "Creative Writing",
      "Public Speaking", "Online Courses", "Documentary Books"
    ]
  },
  {
    "name": "Pets & Nature",
    "hobbies": [
      "Dogs", "Cats", "Birds", "Aquariums", "Fishkeeping", "Horse Riding",
      "Gardening", "Indoor Plants", "Urban Farming", "Bird Watching",
      "Wildlife Photography", "Nature Walks", "Conservation", "Botany",
      "Beekeeping", "Camping"
    ]
  }
]


class Command(BaseCommand):
    help = "Populate the database with categorized Hobbies taxonomy"

    def handle(self, *args, **options):
        total_categories = 0
        total_hobbies = 0

        for item in HOBBIES_DATA:
            cat_name = item["name"]
            category, cat_created = HobbyCategory.objects.get_or_create(name=cat_name)
            if cat_created:
                total_categories += 1

            for hobby_name in item["hobbies"]:
                hobby, hobby_created = Hobby.objects.get_or_create(
                    category=category,
                    name=hobby_name
                )
                if hobby_created:
                    total_hobbies += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully seeded database with {total_categories} categories and {total_hobbies} hobbies."
            )
        )
