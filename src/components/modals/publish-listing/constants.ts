import {
  FaBox,
  FaCommentDots,
  FaDotCircle,
  FaEnvelope,
  FaHandsHelping,
  FaLeaf,
  FaPhone,
  FaSearch,
  FaStar,
  FaUtensils,
} from "react-icons/fa";
import { GiMilkCarton, GiPeanut, GiWheat } from "react-icons/gi";

export const MAX_DESCRIPTION_LENGTH = 500;
export const MAX_FILE_SIZE_MB = 10;
export const COMPRESS_THRESHOLD_MB = 1; // Compress images over 1MB for faster uploads
export const DRAFT_KEY = "foodshare_listing_draft";
export const MAX_IMAGES = 4;
export const MAX_TAGS = 5;
export const MIN_DESCRIPTION_LENGTH = 20;
export const MIN_TITLE_LENGTH = 3;
export const RECENT_LISTINGS_KEY = "foodshare_recent_listings";
export const MAX_RECENT_LISTINGS = 5;

export const categoryConfig = {
  food: {
    icon: FaUtensils,
    label: "Food",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    hasExpiration: true,
    hasQuantity: true,
    hasDietary: true,
    hasCondition: false,
    tips: [
      "Mention if it's homemade or store-bought",
      "Include portion size or servings",
      "Add any allergen warnings",
      "Specify best-by date for freshness",
    ],
    placeholders: {
      title: "e.g., Homemade Pasta, Fresh Vegetables",
      description: "Describe what you're sharing, how it was prepared, and any dietary info...",
    },
  },
  things: {
    icon: FaBox,
    label: "Things",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    hasExpiration: false,
    hasQuantity: true,
    hasDietary: false,
    hasCondition: true,
    tips: [
      "Describe the item's condition honestly",
      "Include dimensions if relevant",
      "Mention any defects or wear",
      "Add brand/model if applicable",
    ],
    placeholders: {
      title: "e.g., IKEA Bookshelf, Winter Jacket",
      description: "Describe the item, its condition, why you're giving it away...",
    },
  },
  borrow: {
    icon: FaHandsHelping,
    label: "Borrow",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    hasExpiration: false,
    hasQuantity: false,
    hasDietary: false,
    hasCondition: true,
    tips: [
      "Specify the loan duration",
      "Mention any deposit requirements",
      "List what's included (cables, cases)",
      "Add usage instructions if needed",
    ],
    placeholders: {
      title: "e.g., Power Drill, Camping Tent",
      description: "Describe what you're lending, loan period, and any terms...",
    },
  },
  wanted: {
    icon: FaSearch,
    label: "Wanted",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    hasExpiration: false,
    hasQuantity: false,
    hasDietary: false,
    hasCondition: false,
    tips: [
      "Be specific about what you need",
      "Mention acceptable conditions",
      "Include size/dimensions if relevant",
      "Explain why you need it",
    ],
    placeholders: {
      title: "e.g., Looking for Baby Clothes, Need Moving Boxes",
      description: "Describe what you're looking for, why you need it, and any preferences...",
    },
  },
  fridge: {
    icon: FaBox,
    label: "Community Fridge",
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
    hasExpiration: false,
    hasQuantity: false,
    hasDietary: false,
    hasCondition: false,
    tips: [
      "Include the fridge location and hours",
      "Mention what items are accepted",
      "Add contact info for volunteers",
      "Specify any access requirements",
    ],
    placeholders: {
      title: "e.g., Downtown Community Fridge",
      description: "Describe the fridge location, operating hours, and what items are accepted...",
    },
  },
  foodBank: {
    icon: FaBox,
    label: "Food Bank",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    hasExpiration: false,
    hasQuantity: false,
    hasDietary: false,
    hasCondition: false,
    tips: [
      "Include operating hours",
      "List services offered",
      "Mention eligibility requirements",
      "Add contact information",
    ],
    placeholders: {
      title: "e.g., Local Food Bank",
      description: "Describe the food bank, services offered, and how to access them...",
    },
  },
  volunteer: {
    icon: FaHandsHelping,
    label: "Volunteer",
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    hasExpiration: false,
    hasQuantity: false,
    hasDietary: false,
    hasCondition: false,
    tips: [
      "Describe the volunteer opportunity",
      "Include time commitment",
      "Mention any skills needed",
      "Add how to sign up",
    ],
    placeholders: {
      title: "e.g., Food Distribution Volunteer",
      description: "Describe the volunteer opportunity, time commitment, and requirements...",
    },
  },
  challenge: {
    icon: FaStar,
    label: "Challenge",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    hasExpiration: true,
    hasQuantity: false,
    hasDietary: false,
    hasCondition: false,
    tips: [
      "Explain the challenge goals",
      "Set clear rules and timeline",
      "Mention any prizes or rewards",
      "Include how to participate",
    ],
    placeholders: {
      title: "e.g., Zero Waste Week Challenge",
      description: "Describe the challenge, rules, timeline, and how to participate...",
    },
  },
  "vegan-food": {
    icon: FaLeaf,
    label: "Vegan",
    color: "text-green-600",
    bgColor: "bg-green-600/10",
    hasExpiration: true,
    hasQuantity: true,
    hasDietary: true,
    hasCondition: false,
    tips: [
      "Confirm all ingredients are vegan",
      "Mention if it's organic",
      "Include preparation method",
      "Add nutritional highlights",
    ],
    placeholders: {
      title: "e.g., Vegan Buddha Bowl, Plant-Based Curry",
      description: "Describe your vegan dish, ingredients, and any allergen info...",
    },
  },
} as const;

export const dietaryOptions = [
  { id: "vegan", label: "Vegan", icon: FaLeaf, color: "text-green-600" },
  { id: "vegetarian", label: "Vegetarian", icon: FaLeaf, color: "text-green-500" },
  { id: "gluten-free", label: "Gluten-Free", icon: GiWheat, color: "text-amber-600" },
  { id: "dairy-free", label: "Dairy-Free", icon: GiMilkCarton, color: "text-blue-500" },
  { id: "nut-free", label: "Nut-Free", icon: GiPeanut, color: "text-orange-600" },
];

export const conditionOptions = [
  { id: "new", label: "New", icon: FaStar, description: "Brand new, never used" },
  { id: "like-new", label: "Like New", icon: FaDotCircle, description: "Excellent condition" },
  { id: "good", label: "Good", icon: FaDotCircle, description: "Minor signs of use" },
  { id: "fair", label: "Fair", icon: FaDotCircle, description: "Shows wear but functional" },
];

export const contactOptions = [
  { id: "chat", label: "Chat", icon: FaCommentDots },
  { id: "phone", label: "Phone", icon: FaPhone },
  { id: "email", label: "Email", icon: FaEnvelope },
];

export const templatePresets = {
  food: [
    {
      id: "homemade-meal",
      name: "Homemade Meal",
      icon: "🍲",
      title: "Homemade ",
      description:
        "Freshly prepared at home. Serves approximately X portions. Made with fresh ingredients. Best enjoyed within 24 hours.",
      tags: ["homemade", "fresh"],
    },
    {
      id: "leftover-groceries",
      name: "Extra Groceries",
      icon: "🥬",
      title: "Fresh ",
      description:
        "Unopened/unused groceries. Purchased recently and still within expiration date. Perfect condition.",
      tags: ["groceries", "fresh", "unopened"],
    },
    {
      id: "baked-goods",
      name: "Baked Goods",
      icon: "🍪",
      title: "Fresh Baked ",
      description:
        "Freshly baked today. Made with quality ingredients. Perfect for sharing. Contains: flour, sugar, eggs, butter.",
      tags: ["baked", "homemade", "fresh"],
    },
  ],
  things: [
    {
      id: "furniture",
      name: "Furniture",
      icon: "🪑",
      title: "",
      description:
        "In good condition. Dimensions: Length x Width x Height. Some minor signs of use. Must be picked up - cannot deliver.",
      tags: ["furniture", "pickup"],
    },
    {
      id: "electronics",
      name: "Electronics",
      icon: "📱",
      title: "",
      description:
        "Working condition. Includes original charger/cables. Factory reset completed. No longer needed after upgrade.",
      tags: ["electronics", "working"],
    },
    {
      id: "clothing",
      name: "Clothing",
      icon: "👕",
      title: "",
      description:
        "Size: X. Worn a few times, still in great condition. Freshly washed and ready for pickup. Smoke-free home.",
      tags: ["clothing", "clean"],
    },
  ],
  borrow: [
    {
      id: "tools",
      name: "Tools",
      icon: "🔧",
      title: "",
      description:
        "Available to borrow for up to X days. Working perfectly. Please return in same condition. Small deposit may be required.",
      tags: ["tools", "borrow"],
    },
    {
      id: "equipment",
      name: "Equipment",
      icon: "📷",
      title: "",
      description:
        "Available for short-term loan. Includes all necessary accessories. Experience with similar equipment preferred.",
      tags: ["equipment", "loan"],
    },
  ],
  wanted: [
    {
      id: "looking-for",
      name: "General Request",
      icon: "🔍",
      title: "Looking for ",
      description:
        "Looking for this item in any reasonable condition. Can pick up anywhere within the area. Flexible on specifics.",
      tags: ["wanted", "flexible"],
    },
    {
      id: "urgent-need",
      name: "Urgent Need",
      icon: "⚡",
      title: "Urgently need ",
      description:
        "Need this item as soon as possible. Willing to pick up immediately. Any condition acceptable. Please message if you can help!",
      tags: ["urgent", "wanted"],
    },
  ],
} as const;

export const titleSuggestions = {
  food: [
    "Homemade Pasta with Sauce",
    "Fresh Vegetables Bundle",
    "Baked Cookies",
    "Leftover Party Food",
    "Organic Fruit",
  ],
  things: [
    "IKEA Furniture",
    "Winter Clothes",
    "Books Collection",
    "Kitchen Appliances",
    "Sports Equipment",
  ],
  borrow: ["Power Tools", "Camping Gear", "Camera Equipment", "Moving Boxes", "Party Supplies"],
  wanted: ["Baby Items", "Study Desk", "Winter Jacket", "Storage Boxes", "Garden Tools"],
} as const;
