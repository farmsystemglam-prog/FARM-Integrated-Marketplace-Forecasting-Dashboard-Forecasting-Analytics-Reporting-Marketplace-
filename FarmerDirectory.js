const SUPABASE_URL = 'https://nzpwmhshnfvwrbkhraed.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56cHdtaHNobmZ2d3Jia2hyYWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MzcyMTMsImV4cCI6MjA3OTExMzIxM30.IPQzkj0iuTEaxsmgY1fFva916rKcwaEfaAiBQhJHb_o';
      
// Initialize Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global variables
let farmers = [];
let currentFarmer = null;
let currentConversation = null;
let currentUser = null;
let farmerCrops = []; // Store farmer's crops for cart

// Check authentication
async function checkAuth() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
            // User not authenticated, redirect to sign in
            window.location.href = "SignIn.html";
            return false;
        }
        
        return true;
    } catch (error) {
        console.error("Auth check error:", error);
        window.location.href = "SignIn.html";
        return false;
    }
}

// Load farmers from database
async function loadFarmers() {
    try {
        console.log("Loading farmers...");
        
        // First, let's try to get farmers from farmer_profiles directly
        const { data: farmerProfiles, error: farmerError } = await supabase
            .from('farmer_profiles')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (farmerError) {
            console.error("Error loading farmer profiles:", farmerError);
            return;
        }
        
        console.log("Farmer profiles data:", farmerProfiles);
        
        if (!farmerProfiles || farmerProfiles.length === 0) {
            console.log("No farmer profiles found");
            document.getElementById('farmer-grid').innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #999;">No farmers found.</p>';
            return;
        }
        
        // Now get user profiles for each farmer
        const userIds = farmerProfiles.map(fp => fp.user_id);
        const { data: userProfiles, error: userError } = await supabase
            .from('profiles')
            .select('*')
            .in('id', userIds);
        
        if (userError) {
            console.error("Error loading user profiles:", userError);
            return;
        }
        
        console.log("User profiles data:", userProfiles);
        
        // Combine the data
        farmers = farmerProfiles.map(fp => {
            const userProfile = userProfiles?.find(up => up.id === fp.user_id) || {};
            return {
                ...fp,
                profiles: userProfile
            };
        });
        
        console.log("Combined farmers data:", farmers);
        
        renderFarmers(farmers);
        
    } catch (error) {
        console.error("Error loading farmers:", error);
        document.getElementById('farmer-grid').innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #999;">Error loading farmers. Please try again later.</p>';
    }
}

// Render farmers to the grid
function renderFarmers(farmerList) {
    console.log("Rendering farmers:", farmerList);
    const farmerGrid = document.getElementById('farmer-grid');
    farmerGrid.innerHTML = '';
    
    if (!farmerList || farmerList.length === 0) {
        farmerGrid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #999;">No farmers found.</p>';
        return;
    }
    
    farmerList.forEach(farmer => {
        console.log("Processing farmer:", farmer);
        const farmerCard = document.createElement('div');
        farmerCard.className = 'product-card';
        farmerCard.role = 'listitem';
        farmerCard.tabIndex = 0;
        farmerCard.setAttribute('data-id', farmer.id);
        
        // Get profile data
        const profile = farmer.profiles || {};
        
        // Create profile image with first letter of business name
        const businessName = farmer.business_name || 'Farm';
        const firstLetter = businessName.charAt(0).toUpperCase();
        
        // Use a consistent background color based on the first letter
        const colors = ['#4CAF50', '#FBC02D', '#66BB6A','#FDD835', '#81C784', '#FFEB3B'];
        const colorIndex = firstLetter.charCodeAt(0) % colors.length;
        const backgroundColor = colors[colorIndex];
        
        farmerCard.innerHTML = `
            <div class="product-image" style="
                background-color: ${backgroundColor};
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 48px;
                font-weight: bold;
                color: white;
                text-transform: uppercase;
            ">
                ${firstLetter}
            </div>
            <p class="name">${farmer.business_name || 'Business Name'}</p>
            <p class="owner">${farmer.owner_name || `${profile.first_name} ${profile.last_name}`.trim() || 'Owner Name'}</p>
            <p class="location">${farmer.location || 'Location'}</p>
        `;
        
        // Add click event to open modal
        farmerCard.addEventListener('click', () => {
            openFarmerModal(farmer);
        });
        
        farmerGrid.appendChild(farmerCard);
    });
}

// Load farmer's crop categories from farmer_profiles table
async function loadFarmerCategories(farmer) {
    try {
        console.log("Loading categories for farmer:", farmer.business_name);
        
        // Get categories from farmer_profiles table
        const { data: farmerProfile, error } = await supabase
            .from('farmer_profiles')
            .select('crop_categories')
            .eq('id', farmer.id)
            .single();
        
        if (error) {
            console.error("Error loading categories:", error);
            return;
        }
        
        console.log("Farmer profile data:", farmerProfile);
        
        const categoriesList = document.getElementById('modalCategories');
        categoriesList.innerHTML = '';
        
        // Check if categories exist and are in the expected format
        if (!farmerProfile || !farmerProfile.crop_categories || farmerProfile.crop_categories.length === 0) {
            categoriesList.innerHTML = '<span style="color: #999;">No categories specified</span>';
            return;
        }
        
        // Create category tags
        farmerProfile.crop_categories.forEach(name => {
            const tag = document.createElement('span');
            tag.className = 'category-tag';
            tag.textContent = name;
            categoriesList.appendChild(tag);
        });
        
    } catch (error) {
        console.error("Error loading categories:", error);
    }
}

// Open farmer modal
async function openFarmerModal(farmer) {
    currentFarmer = farmer;
    const modal = document.getElementById('farmerModal');
    
    // Set farmer details in modal
    document.getElementById('modalFarmerBusinessName').textContent = farmer.business_name || 'Farm';
    document.getElementById('modalFarmerLocation').textContent = farmer.location || 'Location';
    document.getElementById('modalFarmerJoined').textContent = `Joined ${new Date(farmer.created_at).toLocaleDateString()}`;
    document.getElementById('modalFarmerReviews').textContent = '0'; // Will be updated later
    document.getElementById('modalFarmerDescription').textContent = farmer.description || 'No description available.';
    
    // Set avatar with first letter
    const businessName = farmer.business_name || 'Farm';
    const firstLetter = businessName.charAt(0).toUpperCase();
    const avatar = document.getElementById('modalAvatar');
    avatar.textContent = firstLetter;
    
    // Set avatar background color
    const colors = ['#4CAF50', '#FBC02D', '#66BB6A','#FDD835', '#81C784', '#FFEB3B'];
    const colorIndex = firstLetter.charCodeAt(0) % colors.length;
    avatar.style.backgroundColor = colors[colorIndex];
    
    // Load farmer's categories
    await loadFarmerCategories(farmer);
    
    // Load farmer's crops using user_id (UUID)
    await loadFarmerCrops(farmer.user_id);
    
    // Load farmer's reviews using farmer_id (bigint)
    await loadFarmerReviews(farmer.id);
    
    // Show modal
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Load farmer's crops - UPDATED WITH DESCRIPTION FIELD
async function loadFarmerCrops(farmerId) {
    try {
        console.log("=== STARTING CROP LOADING ===");
        console.log("Farmer ID:", farmerId);
        console.log("Current farmer object:", currentFarmer);
        
        // Check if farmerId is valid
        if (!farmerId) {
            console.error("Farmer ID is null or undefined");
            document.getElementById('modal-crops-list').innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #999;">Error: Farmer ID is missing.</p>';
            return;
        }
        
        // Ensure farmerId is a UUID string
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(farmerId)) {
            console.error("Invalid UUID format:", farmerId);
            document.getElementById('modal-crops-list').innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #999;">Error: Invalid farmer ID format.</p>';
            return;
        }
        
        console.log("Querying crops table for farmer_id:", farmerId);
        
        const { data: crops, error } = await supabase
            .from('crops')
            .select('*')
            .eq('farmer_id', farmerId)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error("Supabase error details:", error);
            console.error("Error loading crops:", error.message);
            document.getElementById('modal-crops-list').innerHTML = `<p style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #999;">Error loading crops: ${error.message}</p>`;
            return;
        }
        
        console.log("Raw crops data from Supabase:", crops);
        console.log("Crops data type:", typeof crops);
        console.log("Is crops an array:", Array.isArray(crops));
        
        const cropsList = document.getElementById('modal-crops-list');
        console.log("Crops list element:", cropsList);
        
        if (!cropsList) {
            console.error("Crops list element not found!");
            return;
        }
        
        cropsList.innerHTML = '';
        
        // Check if crops is null or undefined
        if (!crops) {
            console.log("No crops data returned (null)");
            cropsList.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #999;">No crops available.</p>';
            return;
        }
        
        // Check if crops is an empty array
        if (Array.isArray(crops) && crops.length === 0) {
            console.log("Crops array is empty");
            cropsList.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #999;">No crops available.</p>';
            return;
        }
        
        // Ensure crops is an array
        const cropsArray = Array.isArray(crops) ? crops : [crops];
        console.log("Processing crops array:", cropsArray);
        
        // Store crops for cart functionality
        farmerCrops = cropsArray;
        
        // Display crops as non-clickable items with images - UPDATED
        cropsArray.forEach((crop, index) => {
            console.log(`Processing crop ${index + 1}:`, crop);
            
            // Create a container for the crop card
            const cropContainer = document.createElement('div');
            cropContainer.className = 'crop-container';
            
            const cropCard = document.createElement('div');
            cropCard.className = 'modal-card';
            
            // Create image element with proper handling
            const cropImage = document.createElement('div');
            cropImage.className = 'modal-card-img';
            
            // Check if crop has an image URL
            if (crop.image_url && crop.image_url.trim() !== '') {
                cropImage.style.backgroundImage = `url('${crop.image_url}')`;
                cropImage.style.backgroundSize = 'cover';
                cropImage.style.backgroundPosition = 'center';
                cropImage.style.backgroundColor = 'transparent';
            } else {
                // Use placeholder if no image
                cropImage.style.backgroundColor = '#f0f0f0';
                cropImage.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#676758" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                `;
                cropImage.style.display = 'flex';
                cropImage.style.alignItems = 'center';
                cropImage.style.justifyContent = 'center';
            }
            
            // Create the rest of the card content
            const title = document.createElement('div');
            title.className = 'modal-card-title';
            title.textContent = crop.name || 'Crop Name';
            
            const subtitle = document.createElement('div');
            subtitle.className = 'modal-card-subtitle';
            subtitle.textContent = `PHP ${crop.price || '0.00'}`;
            
            // Create description instead of location
            const descriptionDiv = document.createElement('div');
            descriptionDiv.className = 'modal-card-description';
            descriptionDiv.textContent = crop.description || 'No description available';
            
            // Build the card
            cropCard.appendChild(cropImage);
            cropCard.appendChild(title);
            cropCard.appendChild(subtitle);
            cropCard.appendChild(descriptionDiv);
            
            // Just append the card directly to the container (no link)
            cropContainer.appendChild(cropCard);
            cropsList.appendChild(cropContainer);
            
            console.log(`Added crop ${index + 1} to the list`);
        });
        
        console.log("=== CROP LOADING COMPLETED ===");
        
    } catch (error) {
        console.error("Unexpected error in loadFarmerCrops:", error);
        console.error("Error stack:", error.stack);
        document.getElementById('modal-crops-list').innerHTML = `<p style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #999;">Unexpected error: ${error.message}</p>`;
    }
}

// Load farmer's reviews - UPDATED FOR farmer_reviews TABLE
async function loadFarmerReviews(farmerId) {
    try {
        console.log("Loading reviews for farmer ID:", farmerId);
        
        // Get reviews directly from farmer_reviews table
        const { data: reviews, error } = await supabase
            .from('farmer_reviews')
            .select('*')
            .eq('farmer_id', farmerId)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error("Error loading reviews:", error);
            document.getElementById('modal-reviews-list').innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #999;">Error loading reviews.</p>';
            return;
        }
        
        const reviewsList = document.getElementById('modal-reviews-list');
        reviewsList.innerHTML = '';
        
        if (!reviews || reviews.length === 0) {
            reviewsList.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #999;">No reviews available.</p>';
            return;
        }
        
        // Update review count
        document.getElementById('modalFarmerReviews').textContent = reviews.length;
        
        // Display reviews
        reviews.forEach(review => {
            const reviewItem = document.createElement('div');
            reviewItem.className = 'review-item';
            
            reviewItem.innerHTML = `
                <div class="review-header">
                    <div class="reviewer-name">${review.user_name || 'Anonymous'}</div>
                </div>
                <div class="review-date">${new Date(review.created_at).toLocaleDateString()}</div>
                <div class="review-comment">${review.comment || 'No comment'}</div>
            `;
            
            reviewsList.appendChild(reviewItem);
        });
        
    } catch (error) {
        console.error("Error loading reviews:", error);
        document.getElementById('modal-reviews-list').innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #999;">Error loading reviews.</p>';
    }
}

// Close farmer modal
function closeModal() {
    const modal = document.getElementById('farmerModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    currentFarmer = null;
}

// Open message modal
async function openMessageModal() {
    if (!currentFarmer) return;
    
    const messageModal = document.getElementById('messageModal');
    const messageFarmerName = document.getElementById('messageFarmerName');
    
    // Set the farmer name in the message modal header
    messageFarmerName.textContent = currentFarmer.business_name || 'Farmer';
    
    // Set the business avatar in the message modal header
    const businessName = currentFarmer.business_name || 'Farm';
    const firstLetter = businessName.charAt(0).toUpperCase();
    const messageAvatar = document.getElementById('messageAvatar');
    messageAvatar.textContent = firstLetter;
    
    // Set avatar background color
    const colors = ['#4CAF50', '#FBC02D', '#66BB6A','#FDD835', '#81C784', '#FFEB3B'];
    const colorIndex = firstLetter.charCodeAt(0) % colors.length;
    messageAvatar.style.backgroundColor = colors[colorIndex];
    messageAvatar.style.color = 'white';
    messageAvatar.style.display = 'flex';
    messageAvatar.style.alignItems = 'center';
    messageAvatar.style.justifyContent = 'center';
    messageAvatar.style.fontSize = '24px';
    messageAvatar.style.fontWeight = 'bold';
    messageAvatar.style.borderRadius = '50%';
    messageAvatar.style.width = '48px';
    messageAvatar.style.height = '48px';
    
    // Show the message modal
    messageModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Load existing messages
    await loadMessages();
    
    // Set up real-time subscription for new messages
    setupMessageSubscription();
    
}

// Close message modal
function closeMessageModal() {
    const messageModal = document.getElementById('messageModal');
    messageModal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Get or create conversation
async function getOrCreateConversation(customerId, farmerId) {
    try {
        // Check if conversation already exists
        const { data: existingConversation, error: fetchError } = await supabase
            .from('conversations')
            .select('*')
            .eq('customer_id', customerId)
            .eq('farmer_id', farmerId)
            .single();
        
        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error("Error fetching conversation:", fetchError);
            return null;
        }
        
        if (existingConversation) {
            return existingConversation;
        }
        
        // Create new conversation
        const { data: newConversation, error: createError } = await supabase
            .from('conversations')
            .insert({
                customer_id: customerId,
                farmer_id: farmerId
            })
            .select()
            .single();
        
        if (createError) {
            console.error("Error creating conversation:", createError);
            return null;
        }
        
        return newConversation;
    } catch (error) {
        console.error("Error in getOrCreateConversation:", error);
        return null;
    }
}

// Load messages between current user and selected farmer
async function loadMessages() {
    if (!currentFarmer) return;
    
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        // Get or create conversation
        currentConversation = await getOrCreateConversation(user.id, currentFarmer.user_id);
        
        if (!currentConversation) {
            console.error("Failed to get or create conversation");
            return;
        }
        
        // Get all messages for this conversation
        const { data: messages, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', currentConversation.id)
            .order('created_at', { ascending: true });
        
        if (error) {
            console.error("Error loading messages:", error);
            return;
        }
        
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = '';
        
        if (!messages || messages.length === 0) {
            chatMessages.innerHTML = '<div class="message received"><div class="message-bubble">Hello! How can I help you today?</div><div class="message-time">Just now</div></div>';
            return;
        }
        
        // Display messages
        messages.forEach(message => {
            const messageItem = document.createElement('div');
            messageItem.className = `message ${message.sender_id === user.id ? 'sent' : 'received'}`;
            
            messageItem.innerHTML = `
                <div class="message-bubble">${message.content}</div>
                <div class="message-time">${new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            `;
            
            chatMessages.appendChild(messageItem);
        });
        
        // Scroll to the bottom of the message list
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
    } catch (error) {
        console.error("Error loading messages:", error);
    }
}

// Send a new message
// Add this function to your code
function addMessageToUI(message, currentUser) {
    const chatMessages = document.getElementById('chatMessages');
    
    // Remove loading indicator if exists
    const loadingIndicator = chatMessages.querySelector('.loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.remove();
    }
    
    const messageItem = document.createElement('div');
    messageItem.className = `message ${message.sender_id === currentUser.id ? 'sent' : 'received'}`;
    
    // Format time
    const messageTime = new Date(message.created_at).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    // Use the 'message' column for display (you could also use 'content')
    messageItem.innerHTML = `
        <div class="message-bubble">${message.message}</div>
        <div class="message-time">${messageTime}</div>
    `;
    
    chatMessages.appendChild(messageItem);
}

// Your sendMessage function (unchanged)
async function sendMessage() {
    if (!currentFarmer) return;
    
    const messageInput = document.getElementById('messageInput');
    const content = messageInput.value.trim();
    
    if (!content) return;
    
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            console.error("User not authenticated:", userError);
            alert("You must be logged in to send messages.");
            return;
        }
        
        // Create conversation if it doesn't exist
        if (!currentConversation) {
            console.log("Creating conversation...");
            currentConversation = await getOrCreateConversation(user.id, currentFarmer.user_id);
            
            if (!currentConversation) {
                console.error("Failed to create conversation");
                alert("Failed to create conversation");
                return;
            }
        }
        
        console.log("Sending message with conversation ID:", currentConversation.id);
        console.log("Message content:", content);
        
        // Insert the new message - providing BOTH required text columns
        const { data: newMessage, error } = await supabase
            .from('messages')
            .insert({
                sender_id: user.id,
                receiver_id: currentFarmer.user_id,
                conversation_id: currentConversation.id,
                content: content,        // First required text column
                message: content,       // Second required text column
                sender: 'user'          // Required sender field
            })
            .select()
            .single();
        
        if (error) {
            console.error("Error sending message:", error);
            console.error("Error code:", error.code);
            console.error("Error message:", error.message);
            alert("Failed to send message: " + error.message);
            return;
        }
        
        console.log("Message sent successfully:", newMessage);
        
        // Clear input
        messageInput.value = '';
        
        // Add message to UI immediately
        addMessageToUI(newMessage, user);
        
        // Scroll to bottom
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
    } catch (error) {
        console.error("Error in sendMessage:", error);
        alert("Failed to send message: " + error.message);
    }
}

// Also make sure you have these other functions defined
async function getOrCreateConversation(customerId, farmerUserId) {
    try {
        // Check if conversation already exists
        const { data: existingConversation, error: fetchError } = await supabase
            .from('conversations')
            .select('*')
            .eq('customer_id', customerId)
            .eq('farmer_id', farmerUserId)
            .single();
        
        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error("Error fetching conversation:", fetchError);
            console.error("Error details:", fetchError.message);
            return null;
        }
        
        if (existingConversation) {
            console.log("Found existing conversation:", existingConversation);
            return existingConversation;
        }
        
        // Create new conversation
        console.log("Creating new conversation...");
        const { data: newConversation, error: createError } = await supabase
            .from('conversations')
            .insert({
                customer_id: customerId,
                farmer_id: farmerUserId
            })
            .select()
            .single();
        
        if (createError) {
            console.error("Error creating conversation:", createError);
            console.error("Error details:", createError.message);
            console.error("Error code:", createError.code);
            return null;
        }
        
        console.log("New conversation created:", newConversation);
        return newConversation;
    } catch (error) {
        console.error("Error in getOrCreateConversation:", error);
        return null;
    }
}

async function getOrCreateCustomerProfile(userId) {
    try {
        console.log("Getting or creating customer profile for user:", userId);
        
        // First, try to get customer profile from user metadata
        if (window.supabase.auth.user()?.user_metadata?.customer_profile_id) {
            const profileId = window.supabase.auth.user().user_metadata.customer_profile_id;
            console.log("Found customer profile ID in metadata:", profileId);
            return profileId;
        }
        
        // Try to get customer profile from customer_profiles table
        const { data: existingProfile, error: fetchError } = await supabase
            .from('customer_profiles')
            .select('id')
            .eq('id', userId)
            .single();
        
        if (fetchError && fetchError.code !== 'PGRST116') {
            console.error("Error fetching customer profile:", fetchError);
            console.error("Error details:", fetchError.message);
            return null;
        }
        
        if (existingProfile) {
            console.log("Found existing customer profile:", existingProfile);
            return existingProfile.id;
        }
        
        // Create new customer profile with user's UUID as the profile ID
        console.log("Creating new customer profile...");
        const { data: newProfile, error: createError } = await supabase
            .from('customer_profiles')
            .insert({
                id: userId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select()
            .single();
        
        if (createError) {
            console.error("Error creating customer profile:", createError);
            console.error("Error details:", createError.message);
            console.error("Error code:", createError.code);
            
            // If the error is a unique constraint violation, try to fetch the existing record
            if (createError.code === '23505') {  // Unique violation error code
                console.log("Unique constraint violation, trying to fetch existing profile...");
                const { data: retryProfile, error: retryError } = await supabase
                    .from('customer_profiles')
                    .select('id')
                    .eq('id', userId)
                    .single();
                
                if (retryError) {
                    console.error("Error fetching after constraint violation:", retryError);
                    return null;
                }
                
                if (retryProfile) {
                    console.log("Found existing profile after constraint violation:", retryProfile);
                    return retryProfile.id;
                }
            }
            
            return null;
        }
        
        console.log("Created new customer profile:", newProfile);
        
        // Update user metadata with customer profile ID
        const { error: metadataError } = await supabase.auth.updateUser({
            data: {
                customer_profile_id: newProfile.id
            }
        });
        
        if (metadataError) {
            console.error("Error updating user metadata:", metadataError);
            // Don't return null here, as the profile was created successfully
        }
        
        return newProfile.id;
        
    } catch (error) {
        console.error("Error in getOrCreateCustomerProfile:", error);
        return null;
    }
}

// Update loadMessages function
async function loadMessages() {
    if (!currentFarmer) return;
    
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        // Get or create conversation
        currentConversation = await getOrCreateConversation(user.id, currentFarmer.user_id);
        
        if (!currentConversation) {
            console.error("Failed to get or create conversation");
            return;
        }
        
        // Get all messages for this conversation
        const { data: messages, error } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', currentConversation.id)
            .order('created_at', { ascending: true });
        
        if (error) {
            console.error("Error loading messages:", error);
            return;
        }
        
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML = '';
        
        if (!messages || messages.length === 0) {
            chatMessages.innerHTML = '<div class="message received"><div class="message-bubble">Hello! How can I help you today?</div><div class="message-time">Just now</div></div>';
            return;
        }
        
        // Display messages
        messages.forEach(message => {
            const messageItem = document.createElement('div');
            messageItem.className = `message ${message.sender_id === user.id ? 'sent' : 'received'}`;
            
            messageItem.innerHTML = `
                <div class="message-bubble">${message.message}</div>
                <div class="message-time">${new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            `;
            
            chatMessages.appendChild(messageItem);
        });
        
        // Scroll to the bottom of the message list
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
    } catch (error) {
        console.error("Error loading messages:", error);
    }
}

// Update setupMessageSubscription function
function setupMessageSubscription() {
    if (!currentConversation) return;
    
    supabase
        .from('messages')
        .on('INSERT', payload => {
            if (payload.new.conversation_id === currentConversation.id) {
                const { data: { user } } = supabase.auth.getUser();
                addMessageToUI(payload.new, user);
            }
        })
        .subscribe();
}


// Update DOMContentLoaded to set current user
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Initializing page...");
    
    // Check authentication
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) {
        return;
    }
    
    // Set current user
    const { data: { user } } = await supabase.auth.getUser();
    currentUser = user;
    
    // Load farmers
    await loadFarmers();
    
    // Setup search
    setupSearch();
    
    // Setup modal tabs
    setupModalTabs();
});

// Open review modal
function openReviewModal() {
    if (!currentFarmer) return;
    
    const reviewModal = document.getElementById('reviewModal');
    reviewModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// Close review modal
function closeReviewModal() {
    const reviewModal = document.getElementById('reviewModal');
    reviewModal.style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // Reset form
    document.getElementById('reviewForm').reset();
    document.getElementById('anonymousCheckbox').checked = false;
}

// Handle review form submission - UPDATED FOR farmer_reviews TABLE
async function handleReviewSubmit(event) {
    event.preventDefault();
    
    if (!currentFarmer) return;
    
    const comment = document.getElementById('reviewComment').value.trim();
    
    if (!comment) {
        alert('Please fill in all fields');
        return;
    }
    
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        
        // Check if user wants to post anonymously
        const isAnonymous = document.getElementById('anonymousCheckbox').checked;
        const userName = isAnonymous ? 'Anonymous' : `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim();
        
        // Insert the review into farmer_reviews
        const { error } = await supabase
            .from('farmer_reviews')
            .insert({
                farmer_id: currentFarmer.id,  // Use farmer's profile ID
                user_id: user.id,
                user_name: userName,
                comment: comment,
                is_anonymous: isAnonymous
            });
        
        if (error) {
            console.error("Error submitting review:", error);
            alert('Error submitting review. Please try again.');
            return;
        }
        
        // Close review modal
        closeReviewModal();
        
        // Reload farmer reviews to show the new review
        await loadFarmerReviews(currentFarmer.id);
        
        // Show success message
        alert('Thank you for your review!');
        
    } catch (error) {
        console.error("Error in handleReviewSubmit:", error);
        alert('Error submitting review. Please try again.');
    }
}

// Modal tab switching
function setupModalTabs() {
    const tabs = document.querySelectorAll('.modal-tab');
    const panels = {
        'crops': document.getElementById('modal-crops-panel'),
        'reviews': document.getElementById('modal-reviews-panel')
    };
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Update active panel
            Object.values(panels).forEach(panel => panel.classList.remove('active'));
            panels[tabName].classList.add('active');
        });
    });
}

// Search functionality
function setupSearch() {
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener("input", (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        
        if (!searchTerm) {
            renderFarmers(farmers);
            return;
        }
        
        const filtered = farmers.filter(farmer => {
            const profile = farmer.profiles || {};
            
            // Search by business name, owner name, or location
            return (
                farmer.business_name?.toLowerCase().includes(searchTerm) ||
                farmer.owner_name?.toLowerCase().includes(searchTerm) ||
                farmer.location?.toLowerCase().includes(searchTerm) ||
                profile.first_name?.toLowerCase().includes(searchTerm) ||
                profile.last_name?.toLowerCase().includes(searchTerm) ||
                profile.email?.toLowerCase().includes(searchTerm)
            );
        });
        
        renderFarmers(filtered);
    });
}

// Existing profile dropdown code
const profileBtn = document.getElementById("profileBtn");
const dropdownMenu = document.getElementById("dropdownMenu");

// Show dropdown on hover
profileBtn.addEventListener("mouseenter", () => {
    dropdownMenu.style.display = "flex";
});
dropdownMenu.addEventListener("mouseenter", () => {
    dropdownMenu.style.display = "flex";
});

// Hide when mouse leaves both
profileBtn.addEventListener("mouseleave", () => {
    setTimeout(() => {
        if (!dropdownMenu.matches(":hover")) {
            dropdownMenu.style.display = "none";
        }
    }, 150);
});
dropdownMenu.addEventListener("mouseleave", () => {
    dropdownMenu.style.display = "none";
});

// Modal event listeners
document.getElementById('closeModal').addEventListener('click', closeModal);

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    const farmerModal = document.getElementById('farmerModal');
    if (e.target === farmerModal) {
        closeModal();
    }
});

// Message button event listener
document.querySelector('.modal-btn-message').addEventListener('click', function() {
    openMessageModal();
});

// Close message modal
document.getElementById('closeMessageModal').addEventListener('click', closeMessageModal);

// Close message modal when clicking outside
window.addEventListener('click', (e) => {
    const messageModal = document.getElementById('messageModal');
    if (e.target === messageModal) {
        closeMessageModal();
    }
});

// Send message button
document.getElementById('sendMessage').addEventListener('click', sendMessage);

// Send message on Enter key press
document.getElementById('messageInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// Add review button event listener
document.getElementById('addReviewBtn').addEventListener('click', openReviewModal);

// Close review modal
document.getElementById('closeReviewModal').addEventListener('click', closeReviewModal);

// Close review modal when clicking outside
window.addEventListener('click', (e) => {
    const reviewModal = document.getElementById('reviewModal');
    if (e.target === reviewModal) {
        closeReviewModal();
    }
});

// Cancel review button
document.getElementById('cancelReview').addEventListener('click', closeReviewModal);

// Review form submission
document.getElementById('reviewForm').addEventListener('submit', handleReviewSubmit);

// Follow button in modal
document.querySelector('.modal-btn-follow').addEventListener('click', function() {
    if (!this.classList.contains('following')) {
        // Change to green when following
        this.style.backgroundColor = '#4CAF50';
        this.style.color = 'white';
        this.innerHTML = `
            <svg viewBox="0 0 24 24">
                <path d="M12 5v14m7-7H5" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Following
        `;
        this.classList.add('following');
    } else {
        // Change back to yellow when not following
        this.style.backgroundColor = '#FFEB3B';
        this.style.color = '#333';
        this.innerHTML = `
            <svg viewBox="0 0 24 24">
                <path d="M12 5v14m7-7H5" stroke="#333" stroke-width="2" stroke-linecap="round"/>
            </svg>
            Follow
        `;
        this.classList.remove('following');
    }
});

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
    console.log("Initializing page...");
    
    // Check authentication
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) {
        return;
    }
    
    // Load farmers
    await loadFarmers();
    
    // Setup search
    setupSearch();
    
    // Setup modal tabs
    setupModalTabs();
});
