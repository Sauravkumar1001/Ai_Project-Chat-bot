const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


// Gemini API configuration
let geminiAI;
try {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  // Updated to use the latest stable model
  geminiAI = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
} catch (error) {
  console.log('Gemini AI module not available, using fallback mode');
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint for subscription box recommendations
app.post('/api/recommend', async (req, res) => {
  try {
    const { interests, budget, frequency, additionalPreferences } = req.body;

    // Validate input
    if (!interests) {
      return res.status(400).json({ error: 'Interests are required' });
    }

    // Convert budget to price range
    let priceRange;
    switch (budget) {
      case 'under-25':
        priceRange = 'under $25 per month';
        break;
      case '25-50':
        priceRange = '$25 to $50 per month';
        break;
      case '50-100':
        priceRange = '$50 to $100 per month';
        break;
      case 'over-100':
        priceRange = 'over $100 per month';
        break;
      default:
        priceRange = 'any price range';
    }

let recommendations;

    // Try using Gemini API if available
    if (geminiAI && process.env.USE_GEMINI_API === 'true') {
      try {
        // Build prompt for Gemini
        const additionalPrefsText = additionalPreferences?.length > 0 
          ? `Additional preferences: ${additionalPreferences.join(', ')}.` 
          : '';
        
        const prompt = `
          Act as a subscription box recommendation expert. 
          Please recommend 6 subscription boxes based on the following criteria:
          - Interests: ${interests}
          - Price range: ${priceRange}
          - Delivery frequency preference: ${frequency}
          ${additionalPrefsText}
          
          Format your response as a valid JSON array of objects with these properties:
          - name: The name of the subscription box
          - category: The main category it falls under
          - description: A brief description (max 2 sentences)
          - price: The approximate price range
          - frequency: How often it's delivered
          - url: The website URL (use "#" if unknown)
          
          Return ONLY the JSON array with no explanations or other text.
        `;

        // Call Gemini API
        const result = await geminiAI.generateContent(prompt);
        const responseText = result.response.text().trim();
        
        // Parse JSON from the response
        try {
          // Find and extract JSON array if it's embedded in markdown or other text
          const jsonMatch = responseText.match(/\[[\s\S]*\]/);
          const jsonString = jsonMatch ? jsonMatch[0] : responseText;
          recommendations = JSON.parse(jsonString);
        } catch (parseError) {
          console.error('Error parsing JSON response:', parseError);
          console.log('Raw response:', responseText);
          // Fall back to demo data if parsing fails
          recommendations = getFallbackRecommendations(interests, budget, frequency, additionalPreferences);
        }
      } catch (apiError) {
        console.error('Gemini API Error:', apiError);
        // Fall back to demo data if API call fails
        recommendations = getFallbackRecommendations(interests, budget, frequency, additionalPreferences);
      }
    } else {
      // Use fallback data if Gemini is not available or disabled
      recommendations = getFallbackRecommendations(interests, budget, frequency, additionalPreferences);
    }

    // Send recommendations to client
    res.json({ recommendations });

  } catch (error) {
    console.error('Server Error:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Gemini API ${geminiAI && process.env.USE_GEMINI_API === 'true' ? 'enabled' : 'disabled'}`);
  });


// Fallback function to generate sample recommendations based on user preferences
// function getFallbackRecommendations(interests, budget, frequency, additionalPreferences = []) {
//   // Extract main interest category
//   let mainInterest = interests.toLowerCase();
//   if (mainInterest.includes('beauty') || mainInterest.includes('skin')) {
//     return getBeautyBoxes(budget);
//   } else if (mainInterest.includes('food') || mainInterest.includes('cook')) {
//     return getFoodBoxes(budget);
//   } else if (mainInterest.includes('book') || mainInterest.includes('read')) {
//     return getBookBoxes(budget);
//   } else if (mainInterest.includes('fitness') || mainInterest.includes('health')) {
//     return getFitnessBoxes(budget);
//   } else if (mainInterest.includes('home') || mainInterest.includes('decor')) {
//     return getHomeBoxes(budget);
//   } else if (mainInterest.includes('pet') || mainInterest.includes('dog') || mainInterest.includes('cat')) {
//     return getPetBoxes(budget);
//   } else if (mainInterest.includes('kid') || mainInterest.includes('family') || mainInterest.includes('child')) {
//     return getKidsBoxes(budget);
//   } else if (mainInterest.includes('gaming') || mainInterest.includes('game')) {
//     return getGamingBoxes(budget);
//   } else {
//     // Default to a mix of popular boxes
//     return getMixedBoxes(budget);
//   }
// }

// Helper functions for different categories
// function getBeautyBoxes(budget) {
//   return [
//     {
//       name: "Ipsy Glam Bag",
//       category: "Beauty & Skincare",
//       description: "Monthly beauty subscription with 5 personalized products. Perfect for discovering new makeup and skincare brands.",
//       price: "$13/month",
//       frequency: "Monthly",
//       url: "https://tse4.mm.bing.net/th?id=OIP.LpIS-G5ZKIqzbHymQyDfjQHaJ3&w=474&h=474&c=7"
//     },
//     {
//       name: "Birchbox",
//       category: "Beauty & Skincare",
//       description: "Curated box of 5 beauty samples from premium brands. Focuses on skincare, haircare, and makeup essentials.",
//       price: "$15/month",
//       frequency: "Monthly",
//       url: "#"
//     },
//     {
//       name: "BoxyCharm",
//       category: "Beauty & Skincare",
//       description: "Full-size beauty products with a value of over $175. Includes makeup, skincare, and beauty tools.",
//       price: "$28/month",
//       frequency: "Monthly",
//       url: "#"
//     },
//     {
//       name: "Allure Beauty Box",
//       category: "Beauty & Skincare",
//       description: "Editor-curated beauty products from top brands. Features at least 3 full-size products in every box.",
//       price: "$23/month",
//       frequency: "Monthly",
//       url: "#"
//     },
//     {
//       name: "FabFitFun",
//       category: "Beauty & Lifestyle",
//       description: "Seasonal box of full-size premium beauty and lifestyle products. Includes fashion, fitness, home, and wellness items.",
//       price: "$50/quarter",
//       frequency: "Quarterly",
//       url: "#"
//     },
//     {
//       name: "Dermstore BeautyFix",
//       category: "Skincare",
//       description: "Premium skincare and beauty products chosen by experts. Focuses on professional-grade formulations and treatments.",
//       price: "$35/month",
//       frequency: "Monthly",
//       url: "#"
//     }
//   ];
// }

// function getFoodBoxes(budget) {
//   return [
//     {
//       name: "HelloFresh",
//       category: "Food & Cooking",
//       description: "Meal kit delivery with pre-portioned ingredients and recipe cards. Offers a variety of cuisine options and dietary preferences.",
//       price: "$60-$110/week",
//       frequency: "Weekly",
//       url: "#"
//     },
//     {
//       name: "Blue Apron",
//       category: "Food & Cooking",
//       description: "Chef-designed recipes with fresh, seasonal ingredients. Focuses on unique flavor combinations and techniques.",
//       price: "$60-$100/week",
//       frequency: "Weekly",
//       url: "#"
//     },
//     {
//       name: "SnackCrate",
//       category: "Snacks",
//       description: "International snacks from a different country each month. Introduces you to unique global flavors and treats.",
//       price: "$15-$50/month",
//       frequency: "Monthly",
//       url: "#"
//     },
//     {
//       name: "Universal Yums",
//       category: "Snacks",
//       description: "Snack box featuring treats from a new country each month. Includes a booklet about the country's snack culture.",
//       price: "$17-$40/month",
//       frequency: "Monthly",
//       url: "#"
//     },
//     {
//       name: "Wine of the Month Club",
//       category: "Beverages",
//       description: "Curated selection of wines from around the world. Each bottle comes with tasting notes and pairing suggestions.",
//       price: "$40-$60/month",
//       frequency: "Monthly",
//       url: "#"
//     },
//     {
//       name: "Trade Coffee",
//       category: "Beverages",
//       description: "Personalized coffee subscription from top US roasters. Coffee is roasted to order and shipped fresh.",
//       price: "$15-$25/delivery",
//       frequency: "Biweekly",
//       url: "#"
//     }
//   ];
// }

// function getBookBoxes(budget) {
//   return [
//     {
//       name: "Book of the Month",
//       category: "Books & Reading",
//       description: "Monthly selection of new hardcover books. Members choose one book from five curated options each month.",
//       price: "$15.99/month",
//       frequency: "Monthly",
//       url: "#"
//     },
//     {
//       name: "Literati",
//       category: "Books & Reading",
//       description: "Curated book club subscription with celebrity-picked titles. Includes access to online discussions and author insights.",
//       price: "$25/month",
//       frequency: "Monthly",
//       url: "#"
//     },
//     {
//       name: "Once Upon a Book Club",
//       category: "Books & Reading",
//       description: "Immersive reading experience with wrapped gifts to open at specific pages. Combines storytelling with surprise gifts.",
//       price: "$35-$50/month",
//       frequency: "Monthly",
//       url: "#"
//     },
//     {
//       name: "Owlcrate",
//       category: "Books & Reading",
//       description: "Young adult fiction with themed collectibles and bookish items. Features signed books and exclusive editions.",
//       price: "$32.99/month",
//       frequency: "Monthly",
//       url: "#"
//     },
//     {
//       name: "Cratejoy Book Box",
//       category: "Books & Reading",
//       description: "Personalized book recommendations based on reading preferences. Includes discussion guides and reader perks.",
//       price: "$18-$40/month",
//       frequency: "Monthly",
//       url: "#"
//     },
//     {
//       name: "Bookworm Box",
//       category: "Books & Reading",
//       description: "Romance novels with signed copies and author merchandise. Proceeds support charitable causes.",
//       price: "$40/month",
//       frequency: "Monthly",
//       url: "#"
//     }
//   ];
// }

// function getFitnessBoxes(budget) {
//   return [
//     {
//       name: "FabFitFun",
//       category: "Fitness & Lifestyle",
//       description: "Seasonal wellness and fitness products for an active lifestyle. Includes full-size fitness, beauty, and wellness items.",
//       price: "$50/quarter",
//       frequency: "Quarterly",
//       url: "#"
//     },
//     {
//       name: "Bulu Box",
//       category: "Fitness & Health",
//       description: "Sample-sized health, nutrition, and wellness products. Great for discovering new supplements and fitness snacks.",
//       price: "$10/month",
//       frequency: "Monthly",
//       url: "#"
//     },
//     {
//       name: "StrengthCrate",
//       category: "Fitness & Health",
//       description: "Fitness equipment and workout accessories for home training. Includes nutritional supplements and recovery tools.",
//       price: "$45/month",
//       frequency: "Monthly",
//       url: "#"
//     },
//     {
//       name: "Yoga Club",
//       category: "Fitness & Health",
//       description: "Personalized yoga apparel based on your style preferences. High-quality activewear at below retail prices.",
//       price: "$79/month",
//       frequency: "Monthly",
//       url: "#"
//     },
//     {
//       name: "Gainz Box",
//       category: "Fitness & Health",
//       description: "Fitness and CrossFit gear from top brands. Includes apparel, supplements, and training accessories.",
//       price: "$32/month",
//       frequency: "Monthly",
//       url: "#"
//     },
//     {
//       name: "Daily Harvest",
//       category: "Fitness & Health",
//       description: "Smoothies, harvest bowls, and other healthy frozen meals. Plant-based nutrition that's ready in minutes.",
//       price: "$70-$90/week",
//       frequency: "Weekly",
//       url: "#"
//     }
//   ];
// }

// function getHomeBoxes(budget) {
//   return [
//     {
//       name: "Decocrated",
//       category: "Home Decor",
//       description: "Seasonal home decor items with styling guide. Helps refresh your home with on-trend accessories quarterly.",
//       price: "$80/quarter",
//       frequency: "Quarterly",
//       url: "#"
//     },
//     {
//       name: "Vellabox",
//       category: "Home Decor",
//       description: "Artisan candles made from natural wax and premium scents. Includes a bonus lifestyle gift in each box.",
//       price: "$10-$30/month",
//       frequency: "Monthly",
//       url: "#"
//     },
//     {
//       name: "Bloomsy Box",
//       category: "Home Decor",
//       description: "Fresh flower arrangements from sustainable farms. Hand-tied bouquets delivered to your door.",
//       price: "$40-$70/month",
//       frequency: "Monthly",
//       url: "#"
//     },
//     {
//       name: "The Bouqs",
//       category: "Home Decor",
//       description: "Farm-fresh flower subscriptions with sustainable practices. Unique varieties and arrangements for every season.",
//       price: "$40-$65/delivery",
//       frequency: "Monthly",
//       url: "#"
//     },
//     {
//       name: "Earthlove",
//       category: "Home & Lifestyle",
//       description: "Eco-friendly home and self-care products. Features sustainable brands and natural, organic items.",
//       price: "$60/quarter",
//       frequency: "Quarterly",
//       url: "#"
//     },
//     {
//       name: "Houseplant Box",
//       category: "Home Decor",
//       description: "Monthly subscription delivering new houseplants and care accessories. Perfect for plant lovers and home gardeners.",
//       price: "$25-$65/month",
//       frequency: "Monthly",
//       url: "#"
//     }
//   ];
// }

// function getPetBoxes(budget) {
//   return [
//     {
//       name: "BarkBox",
//       category: "Pet Supplies",
//       description: "Monthly themed collection of dog toys, treats, and accessories. Customized based on your dog's size and preferences.",
//       price: "$23-$35/month",
//       frequency: "Monthly",
//       url: "#"
//     },
//     {
//       name: "Meowbox",
//       category: "Pet Supplies",
//       description: "Themed box for cats with toys, treats, and accessories. Portion of proceeds supports shelter cats.",
//       price: "$23/month",
//       frequency: "Monthly",
//       url: "#"
//     },
//     {
//       name: "Super Chewer",
//       category: "Pet Supplies",
//       description: "Durable toys and treats for heavy chewers. Extra-tough toys designed to withstand aggressive chewing.",
//       price: "$30-$42/month",
//       frequency: "Monthly",
//       url: "#"
//     },
//     {
//       name: "PupBox",
//       category: "Pet Supplies",
//       description: "Age-appropriate products for puppies with training guides. Evolves as your puppy grows.",
//       price: "$29-$39/month",
//       frequency: "Monthly",
//       url: "#"
//     },
//     {
//       name: "The Farmer's Dog",
//       category: "Pet Supplies",
//       description: "Fresh, human-grade dog food delivered to your door. Customized meal plans based on your dog's needs.",
//       price: "$30-$100/week",
//       frequency: "Weekly",
//       url: "#"
//     },
//     {
//       name: "KONG Box",
//       category: "Pet Supplies",
//       description: "Mental stimulation toys and treats for dogs. Designed to provide enrichment and reduce boredom.",
//       price: "$50/box",
//       frequency: "Bimonthly",
//       url: "#"
//     }
//   ];
// }

// function getKidsBoxes(budget) {
//   return [
//     {
//       name: "KiwiCo",
//       category: "Kids & Family",
//       description: "Age-appropriate STEAM projects and activities. Encourages creativity, critical thinking, and hands-on learning.",
//       price: "$20-$30/month",
//       frequency: "Monthly",
//       url: "#"
//     },
//     {
//       name: "Little Passports",
//       category: "Kids & Family",
//       description: "Geography and culture exploration for children. Introduces kids to different countries and cultures.",
//       price: "$15-$28/month",
//       frequency: "Monthly",
//       url: "#"
//     },
//     {
//       name: "Lovevery",
//       category: "Kids & Family",
//       description: "Developmental toys designed by experts for specific age milestones. Supports cognitive, physical, and social development.",
//       price: "$40/month",
//       frequency: "Bimonthly",
//       url: "#"
//     },
//     {
//       name: "Sago Mini Box",
//       category: "Kids & Family",
//       description: "Hands-on activities and crafts for preschoolers. Focuses on creativity and imaginative play.",
//       price: "$19/month",
//       frequency: "Monthly",
//       url: "#"
//     },
//     {
//       name: "Amazon Book Box",
//       category: "Kids & Family",
//       description: "Age-appropriate books for children from 0-12 years. Expertly curated selection at a significant discount.",
//       price: "$20/box",
//       frequency: "Monthly",
//       url: "#"
//     },
//     {
//       name: "Green Kid Crafts",
//       category: "Kids & Family",
//       description: "Eco-friendly STEAM activities and crafts. Each box follows a specific theme like ocean science or space exploration.",
//       price: "$25-$30/month",
//       frequency: "Monthly",
//       url: "#"
//     }
//   ];
// }

// function getGamingBoxes(budget) {
//   return [
//     {
//       name: "Loot Crate",
//       category: "Gaming",
//       description: "Collectibles, apparel, and gear from popular gaming franchises. Features exclusive items not available in stores.",
//       price: "$25-$50/month",
//       frequency: "Monthly",
//       url: "#"
//     },
//     {
//       name: "Bento Box Gaming",
//       category: "Gaming",
//       description: "Japanese gaming and anime merchandise. Direct from Japan with unique items and collectibles.",
//       price: "$35/month",
//       frequency: "Monthly",
//       url: "#"
//     },
//     {
//       name: "Dungeon Crate",
//       category: "Gaming",
//       description: "RPG and tabletop gaming accessories. Includes miniatures, dice, and gaming aids for your campaigns.",
//       price: "$30/month",
//       frequency: "Monthly",
//       url: "#"
//     },
//     {
//       name: "Game Box Monthly",
//       category: "Gaming",
//       description: "Board game subscription with full games each month. Introduces subscribers to new and unique games.",
//       price: "$25-$40/month",
//       frequency: "Monthly",
//       url: "#"
//     },
//     {
//       name: "Retro Game Treasure",
//       category: "Gaming",
//       description: "Retro video games customized to your consoles and preferences. Great for collectors and nostalgic gamers.",
//       price: "$35/month",
//       frequency: "Monthly",
//       url: "#"
//     },
//     {
//       name: "IndieBox",
//       category: "Gaming",
//       description: "Physical editions of popular indie games with collectibles. Supports independent game developers.",
//       price: "$25/month",
//       frequency: "Monthly",
//       url: "#"
//     }
//   ];
// }

// function getMixedBoxes(budget) {
//   return [
//     {
//       name: "FabFitFun",
//       category: "Lifestyle",
//       description: "Seasonal box with full-size premium beauty, fitness, and lifestyle products. Subscribers can customize certain items.",
//       price: "$50/quarter",
//       frequency: "Quarterly",
//       url: "#"
//     },
//     {
//       name: "Birchbox",
//       category: "Beauty & Skincare",
//       description: "Personalized beauty and grooming samples. Perfect for discovering new products without committing to full sizes.",
//       price: "$15/month",
//       frequency: "Monthly",
//       url: "#"
//     },
//     {
//       name: "BarkBox",
//       category: "Pet Supplies",
//       description: "Themed toys and treats for dogs. Each box contains 2 toys, 2 bags of treats, and a chew.",
//       price: "$23-$29/month",
//       frequency: "Monthly",
//       url: "#"
//     },
//     {
//       name: "KiwiCo",
//       category: "Kids & Family",
//       description: "Age-appropriate STEAM projects for children. Encourages hands-on learning and creative thinking.",
//       price: "$20-$30/month",
//       frequency: "Monthly",
//       url: "#"
//     },
//     {
//       name: "Blue Apron",
//       category: "Food & Cooking",
//       description: "Meal kit delivery with pre-portioned ingredients and recipe cards. Makes home cooking easier with everything measured.",
//       price: "$60-$120/week",
//       frequency: "Weekly",
//       url: "#"
//     },
//     {
//       name: "Book of the Month",
//       category: "Books & Reading",
//       description: "Monthly selection of new hardcover books. Members choose from five curated options each month.",
//       price: "$15.99/month",
//       frequency: "Monthly",
//       url: "#"
//     }
//   ];
// }

// Error handling middleware