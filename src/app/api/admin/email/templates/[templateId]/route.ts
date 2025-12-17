import { readFile } from "fs/promises";
import { join } from "path";
import { NextRequest, NextResponse } from "next/server";

// Sample data for each template
const sampleData: Record<string, Record<string, string>> = {
  "welcome-confirmation": {
    ConfirmationURL: "https://foodshare.app/auth/confirm?token=abc123",
  },
  "password-reset": {
    ConfirmationURL: "https://foodshare.app/auth/reset?token=xyz789",
  },
  "magic-link": {
    ConfirmationURL: "https://foodshare.app/auth/magic?token=magic456",
  },
  "new-message": {
    SenderAvatar: "https://i.pravatar.cc/150?img=32",
    SenderName: "Emma Wilson",
    MessagePreview:
      "Hi! I'm interested in the organic vegetables you posted. Are they still available? I can pick up tomorrow afternoon if that works for you.",
    ConversationURL: "https://foodshare.app/messages/conv123",
    ListingImage: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400",
    ListingTitle: "Fresh Organic Vegetables",
    ListingType: "Free",
    UnsubscribeURL: "https://foodshare.app/settings/notifications",
  },
  "listing-interest": {
    InterestedUserName: "Alex Chen",
    InterestedUserAvatar: "https://i.pravatar.cc/150?img=12",
    InterestedUserRating: "4.9",
    InterestedUserShares: "23",
    ListingImage: "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=400",
    ListingTitle: "Homemade Apple Pie",
    ListingType: "Free",
    ListingLocation: "Brooklyn, NY",
    MessageURL: "https://foodshare.app/messages/new?user=alex",
    ListingURL: "https://foodshare.app/food/apple-pie-123",
    UnsubscribeURL: "https://foodshare.app/settings/notifications",
  },
  "review-request": {
    RecipientName: "Jordan",
    SharerName: "Maria Santos",
    ListingImage: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400",
    ListingTitle: "Fresh Baked Bread Loaves",
    PickupDate: "December 15, 2025",
    Review1StarURL: "https://foodshare.app/review?id=123&stars=1",
    Review2StarURL: "https://foodshare.app/review?id=123&stars=2",
    Review3StarURL: "https://foodshare.app/review?id=123&stars=3",
    Review4StarURL: "https://foodshare.app/review?id=123&stars=4",
    Review5StarURL: "https://foodshare.app/review?id=123&stars=5",
    ReviewURL: "https://foodshare.app/review?id=123",
    UnsubscribeURL: "https://foodshare.app/settings/notifications",
  },
  "pickup-reminder": {
    PickupTime: "2:30 PM",
    PickupDate: "Today, December 16",
    ListingImage: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400",
    ListingTitle: "Garden Fresh Salad Mix",
    SharerName: "Carlos Rivera",
    PickupAddress: "247 Park Avenue, Apt 3B",
    PickupInstructions: "Ring buzzer 3B, I'll come down. Look for the blue door.",
    DirectionsURL: "https://maps.google.com/?q=247+Park+Avenue",
    MessageURL: "https://foodshare.app/messages/carlos",
    UnsubscribeURL: "https://foodshare.app/settings/notifications",
  },
  "listing-expired": {
    UserName: "Taylor",
    ListingImage: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400",
    ListingTitle: "Homemade Pasta Sauce",
    ListingType: "Free",
    ExpiryDate: "December 14, 2025",
    RenewURL: "https://foodshare.app/my-listings/pasta-sauce/renew",
    EditURL: "https://foodshare.app/my-listings/pasta-sauce/edit",
    MarkSharedURL: "https://foodshare.app/my-listings/pasta-sauce/mark-shared",
    UnsubscribeURL: "https://foodshare.app/settings/notifications",
  },
  "weekly-digest": {
    WeekRange: "December 9 - 15, 2025",
    ItemsShared: "12",
    FoodSaved: "8.5",
    CO2Saved: "21",
    Listing1Image: "https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400",
    Listing1Title: "Fresh Organic Vegetables",
    Listing1Distance: "0.3 mi",
    Listing1URL: "https://foodshare.app/food/veggies-123",
    Listing2Image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400",
    Listing2Title: "Artisan Sourdough Bread",
    Listing2Distance: "0.7 mi",
    Listing2URL: "https://foodshare.app/food/bread-456",
    Listing3Image: "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=400",
    Listing3Title: "Homemade Apple Pie",
    Listing3Distance: "1.2 mi",
    Listing3URL: "https://foodshare.app/food/pie-789",
    ExploreURL: "https://foodshare.app/explore",
    CommunityFoodSaved: "2,450 kg",
    UnsubscribeURL: "https://foodshare.app/settings/notifications",
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { templateId } = await params;

    // Validate template ID
    if (!sampleData[templateId]) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Read the template file
    const templatePath = join(process.cwd(), "src/emails/templates", `${templateId}.html`);

    let html = await readFile(templatePath, "utf-8");

    // Replace Go template variables with sample data
    const data = sampleData[templateId];
    for (const [key, value] of Object.entries(data)) {
      // Replace {{ .VariableName }} syntax
      const regex = new RegExp(`\\{\\{\\s*\\.${key}\\s*\\}\\}`, "g");
      html = html.replace(regex, value);
    }

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Failed to load template:", error);
    return NextResponse.json({ error: "Failed to load template" }, { status: 500 });
  }
}
