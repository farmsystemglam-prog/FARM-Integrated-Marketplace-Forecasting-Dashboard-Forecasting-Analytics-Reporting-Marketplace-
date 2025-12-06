/* ==========================
       SUPABASE CONFIGURATION
    =========================== */
    const SUPABASE_URL = 'https://nzpwmhshnfvwrbkhraed.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56cHdtaHNobmZ2d3Jia2hyYWVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MzcyMTMsImV4cCI6MjA3OTExMzIxM30.IPQzkj0iuTEaxsmgY1fFva916rKcwaEfaAiBQhJHb_o';
    
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    /* ==========================
       ELEMENT SELECTORS
    =========================== */
    const tabs = document.querySelectorAll('.tab');
    const panels = {
        'crops-tab': document.getElementById('crops-panel'),
        'reviews-tab': document.getElementById('reviews-panel')
    };

    const manageEdit = document.getElementById('manage-edit');
    const dashboardButton = document.querySelector(".dashboard-button");
    const addCropCard = document.getElementById('add-crop-card');
    const addCropModal = document.getElementById('addCropModal');
    const closeModalBtn = addCropModal.querySelector('.close');
    const addCropForm = document.getElementById('addCropForm');
    const cropsList = document.getElementById('crops-list');
    const reviewsList = document.getElementById('reviews-list');
    const messageDiv = document.getElementById('message');

    /* ==========================
       STATE VARIABLES
    =========================== */
    let manageMode = false;
    let selectedCards = new Set();
    let editingCard = null;
    let currentFarmerId = null;
    let currentProfile = null;

    /* ==========================
       PAGE INITIALIZATION
    =========================== */
    document.addEventListener('DOMContentLoaded', async () => {
        try {
            // Get current user
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            
            if (userError || !user) {
                console.error('User not authenticated');
                window.location.href = "SignIn.html";
                return;
            }
            
            currentFarmerId = user.id;
            
            // Load farmer profile
            await loadFarmerProfile(user.id);
            
            // Load farmer crops
            await loadFarmerCrops(user.id);
            
            // Load customer count
            await loadCustomerCount(user.id);
            
            // Load review count
            await loadReviewCount(user.id);
            
            // Load reviews
            await loadFarmerReviews(user.id);
            
            // Initialize tabs
            initializeTabs();
            
        } catch (error) {
            console.error('Error initializing page:', error);
        }
    });

    /* ==========================
   TAB INITIALIZATION - FIXED
   =========================== */
function initializeTabs() {
    console.log("Initializing tabs...");
    
    // Check if tabs are found
    console.log("Found tabs:", tabs.length);
    if (tabs.length === 0) {
        console.error("No tabs found in the DOM!");
        return;
    }
    
    // Log each tab found
    tabs.forEach((tab, index) => {
        console.log(`Tab ${index}:`, tab.id, tab.classList);
    });
    
    // Set up tab event listeners with error handling
    tabs.forEach(tab => {
        console.log("Setting up tab:", tab.id);
        
        // Remove existing event listeners to avoid duplicates
        tab.removeEventListener('click', handleTabClick);
        tab.removeEventListener('keydown', handleTabKeydown);
        
        // Add event listeners
        tab.addEventListener('click', handleTabClick);
        tab.addEventListener('keydown', handleTabKeydown);
    });
    
    // Set initial active tab
    const activeTab = document.querySelector('.tab.active');
    if (activeTab) {
        console.log("Setting active tab:", activeTab.id);
        switchTab(activeTab);
    } else {
        console.warn("No active tab found");
        // Set first tab as active if none is active
        if (tabs.length > 0) {
            switchTab(tabs[0]);
        }
    }
}

// Helper functions for event handling
function handleTabClick(event) {
    const tab = event.currentTarget;
    console.log("Tab clicked:", tab.id);
    switchTab(tab);
}

function handleTabKeydown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const tab = event.currentTarget;
        console.log("Tab keydown:", tab.id);
        switchTab(tab);
    }
}

    /* ==========================
       LOAD FARMER PROFILE
    =========================== */
    async function loadFarmerProfile(userId) {
        try {
            const { data, error } = await supabase
                .from('farmer_profiles')
                .select('*')
                .eq('user_id', userId)
                .single();
            
            if (error) {
                console.error('Error loading profile:', error);
                return;
            }
            
            currentProfile = data;
            
            // Update UI with profile data
            document.getElementById('farmName').textContent = data.business_name;
            document.getElementById('businessName').textContent = data.business_name;
            document.getElementById('location').textContent = data.location;
            document.getElementById('description').textContent = data.description;
            
            // Format joined date
            const joinedDate = new Date(data.created_at);
            document.getElementById('joinedDate').textContent = `Joined ${joinedDate.toLocaleDateString()}`;
            
            // Display email address
            document.getElementById('emailAddress').textContent = data.email || 'No email provided';
            
            // Set profile image if available
            if (data.profile_image_url) {
                document.getElementById('profileImage').src = data.profile_image_url;
            }
            
            // Display crop categories
            displayCropCategories(data.crop_categories);
            
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    }

    /* ==========================
       DISPLAY CROP CATEGORIES
    =========================== */
    function displayCropCategories(categories) {
        const container = document.getElementById('cropCategories');
        container.innerHTML = '';
        
        if (categories && categories.length > 0) {
            categories.forEach(category => {
                const categoryElement = document.createElement('div');
                categoryElement.className = 'category-item';
                categoryElement.textContent = category;
                container.appendChild(categoryElement);
            });
        } else {
            container.innerHTML = '<span class="no-data">No categories selected</span>';
        }
    }

    /* ==========================
       LOAD CUSTOMER COUNT
    =========================== */
    async function loadCustomerCount(farmerId) {
        try {
            // Assuming there's a table 'messages' with columns 'farmer_id' and 'customer_id'
            const { count, error } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('farmer_id', farmerId);
            
            if (error) {
                console.error('Error loading customer count:', error);
                return;
            }
            
            document.getElementById('customerCount').textContent = count || 0;
            
        } catch (error) {
            console.error('Error loading customer count:', error);
        }
    }

    /* ==========================
   LOAD REVIEW COUNT - FIXED WITH BETTER NULL HANDLING
   =========================== */
async function loadReviewCount(userUuid) {
    try {
        // First get farmer profile using UUID
        const { data: farmerProfile, error: profileError } = await supabase
            .from('farmer_profiles')
            .select('id')
            .eq('user_id', userUuid)
            .single();
        
        if (profileError || !farmerProfile) {
            console.error('Error loading farmer profile:', profileError);
            return;
        }
        
        const farmerId = farmerProfile.id;
        console.log("Farmer ID (bigint):", farmerId);
        
        // Now get review count using farmer_id (bigint)
        const { count, error } = await supabase
            .from('farmer_reviews')
            .select('*', { count: 'exact', head: true })
            .eq('farmer_id', farmerId);
        
        if (error) {
            console.error('Error loading review count:', error);
            return;
        }
        
        // Update review count in stats section with better null handling
        const reviewCountElement = document.getElementById('reviewCount');
        if (reviewCountElement) {
            // Check if count is explicitly null/undefined
            if (count === null || count === undefined) {
                console.log("Review count is null/undefined, setting to 0");
                reviewCountElement.textContent = '0';
            } else if (typeof count === 'number') {
                // Only update if count is a valid number
                reviewCountElement.textContent = count;
                console.log("Updated review count to:", count);
            } else {
                console.warn("Unexpected count type:", typeof count, "value:", count);
                reviewCountElement.textContent = '0';
            }
        }
        
    } catch (error) {
        console.error('Error loading review count:', error);
    }
}

/* ==========================
   LOAD FARMER REVIEWS - FIXED TO PRESERVE COUNT AND DEBUG
   =========================== */
async function loadFarmerReviews(userUuid) {
    try {
        console.log("=== REVIEWS DEBUG START ===");
        console.log("Input userUuid:", userUuid, "Type:", typeof userUuid);
        
        // First get farmer profile using UUID
        const { data: farmerProfile, error: profileError } = await supabase
            .from('farmer_profiles')
            .select('id')
            .eq('user_id', userUuid)
            .single();
        
        if (profileError || !farmerProfile) {
            console.error('Error loading farmer profile:', profileError);
            displayReviewsError('Error loading farmer profile.');
            return;
        }
        
        const farmerId = farmerProfile.id;
        console.log("Farmer ID (bigint):", farmerId, "Type:", typeof farmerId);
        
        // Now get reviews using farmer_id (bigint)
        const { data: reviews, error, count } = await supabase
            .from('farmer_reviews')
            .select('*')
            .eq('farmer_id', farmerId)
            .order('created_at', { ascending: false });
        
        console.log("Supabase response:", { 
            reviews: reviews?.length, 
            error: error?.message, 
            count: count,
            typeofCount: typeof count,
            countIsNull: count === null,
            countIsUndefined: count === undefined
        });
        
        if (error) {
            console.error("Error loading reviews:", error);
            displayReviewsError(`Error: ${error.message}`);
            return;
        }
        
        console.log("Found", count, "reviews");
        
        // Check if reviews array exists and has items
        const hasReviews = reviews && reviews.length > 0;
        console.log("Has reviews:", hasReviews, "Reviews length:", reviews?.length || 0);
        
        // Update review count with better null handling
        const reviewCountElement = document.getElementById('reviewCount');
        if (reviewCountElement) {
            // If count is explicitly null/undefined, but we have reviews, there's an issue
            if ((count === null || count === undefined) && hasReviews) {
                console.warn("Count is null/undefined but reviews exist, using reviews.length");
                reviewCountElement.textContent = reviews.length;
            } else if (count !== null && count !== undefined) {
                // Only update if count is a valid number
                reviewCountElement.textContent = count;
                console.log("Updated review count to:", count);
            } else {
                // Count is null/undefined and no reviews
                reviewCountElement.textContent = '0';
                console.log("Set review count to 0 (no reviews)");
            }
        }
        
        // Display reviews
        displayReviews(reviews || []);
        
        console.log("=== REVIEWS DEBUG END ===");
        
    } catch (error) {
        console.error("Exception in loadFarmerReviews:", error);
        displayReviewsError(`Error: ${error.message}`);
    }
}

// Helper function to update review count in stats section
function updateReviewCountInStats(count) {
    const reviewCountElement = document.getElementById('reviewCount');
    if (reviewCountElement) {
        const currentCount = parseInt(reviewCountElement.textContent) || 0;
        if (count !== currentCount) {
            reviewCountElement.textContent = count;
            console.log("Updated review count in stats to:", count);
        }
    }
}

// Helper function to display reviews
function displayReviews(reviews) {
    const container = document.getElementById('reviews-list');
    console.log("Displaying reviews in container:", container);
    
    if (!container) {
        console.error('Reviews container not found!');
        return;
    }
    
    // Clear only the reviews list, not the count
    container.innerHTML = '';
    
    if (reviews.length === 0) {
        container.innerHTML = `
            <div class="no-reviews">
                <p>No reviews available yet.</p>
                <p>Be the first to share your experience!</p>
            </div>
        `;
        return;
    }
    
    reviews.forEach((review, index) => {
        console.log(`Processing review ${index + 1}:`, review);
        const reviewElement = createReviewElement(review);
        container.appendChild(reviewElement);
    });
}

// Helper function to create a review element
function createReviewElement(review) {
    const reviewDiv = document.createElement('div');
    reviewDiv.className = 'review-item';
    
    // Handle anonymous users
    const userName = review.is_anonymous ? 'Anonymous' : (review.user_name || 'Anonymous');
    const comment = review.comment || 'No comment';
    const date = new Date(review.created_at).toLocaleDateString();
    
    reviewDiv.innerHTML = `
        <div class="review-header">
            <span class="reviewer-name">${escapeHtml(userName)}</span>
            <span class="review-date">${date}</span>
        </div>
        <div class="review-comment">${escapeHtml(comment)}</div>
    `;
    
    return reviewDiv;
}

// Helper function to display error
function displayReviewsError(message) {
    const container = document.getElementById('reviews-list');
    if (container) {
        container.innerHTML = `
            <div class="reviews-error">
                <p>${message}</p>
                <button onclick="loadFarmerReviews(currentFarmerId)" class="retry-button">
                    Try Again
                </button>
            </div>
        `;
    }
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

    /* ==========================
       LOAD FARMER CROPS
    =========================== */
    async function loadFarmerCrops(userId) {
        try {
            const { data, error } = await supabase
                .from('crops')
                .select('*')
                .eq('farmer_id', userId)
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error('Error loading crops:', error);
                return;
            }
            
            // Clear existing crops (except add card)
            const existingCrops = cropsList.querySelectorAll('.card:not(#add-crop-card)');
            existingCrops.forEach(card => card.remove());
            
            // Add crops to the list
            data.forEach(crop => {
                addCropCardToList(crop);
            });
            
        } catch (error) {
            console.error('Error loading crops:', error);
        }
    }

    /* ==========================
   TAB SWITCHING - FIXED
   =========================== */
function switchTab(selectedTab) {
    console.log("Switching to tab:", selectedTab.id);
    
    // Validate the tab
    if (!selectedTab || !selectedTab.classList.contains('tab')) {
        console.error("Invalid tab element:", selectedTab);
        return;
    }
    
    try {
        tabs.forEach(tab => {
            const panel = panels[tab.id];
            if (tab === selectedTab) {
                tab.classList.add('active');
                tab.setAttribute('aria-selected', 'true');
                tab.setAttribute('tabindex', '0');
                if (panel) {
                    panel.hidden = false;
                    console.log("Showing panel:", panel.id);
                }
                
                // Load reviews if switching to reviews tab and user is authenticated
                if (tab.id === 'reviews-tab' && currentFarmerId) {
                    console.log("Loading reviews for Reviews tab");
                    loadFarmerReviews(currentFarmerId);
                } else if (tab.id === 'reviews-tab') {
                    console.warn("User not authenticated, cannot load reviews");
                }
            } else {
                tab.classList.remove('active');
                tab.setAttribute('aria-selected', 'false');
                tab.setAttribute('tabindex', '-1');
                if (panel) {
                    panel.hidden = true;
                    console.log("Hiding panel:", panel.id);
                }
            }
        });

        if (selectedTab.id === 'crops-tab') {
            manageEdit.style.display = 'inline-block';
        } else {
            manageEdit.style.display = 'none';
            if (manageMode) toggleManageMode();
        }
    } catch (error) {
        console.error("Error switching tab:", error);
    }
}

    /* ==========================
       DASHBOARD BUTTON
    =========================== */
    dashboardButton.addEventListener("click", () => {
        window.location.href = "FarmerDashboard.html";
    });

    /* ==========================
       MODAL OPEN/CLOSE
    =========================== */
    addCropCard.addEventListener('click', () => openModal("add"));

    function openModal(mode, card = null) {
        addCropModal.classList.add("show");
        document.body.style.overflow = "hidden";

        if (mode === "add") {
            editingCard = null;
            addCropForm.reset();
            addCropForm.querySelector("button[type='submit']").textContent = "Add";
        }

        if (mode === "edit" && card) {
            editingCard = card;
            addCropForm.querySelector("button[type='submit']").textContent = "Save Changes";

            addCropForm.cropName.value = card.querySelector(".card-title").textContent;
            addCropForm.cropDescription.value = card.querySelector(".card-subtitle").textContent;
            addCropForm.cropPrice.value = card.querySelector(".card-price").textContent.replace("₱", "").trim();
        }
    }

    function closeModal() {
        addCropModal.classList.remove("show");
        document.body.style.overflow = "";
    }
    closeModalBtn.addEventListener('click', closeModal);
    addCropModal.addEventListener('click', e => { if (e.target === addCropModal) closeModal(); });

    /* ==========================
      MESSAGE HANDLING FUNCTIONS
    =========================== */
    function showMessage(message, isError = false) {
        // Clear previous message
        messageDiv.className = 'message';
        messageDiv.textContent = message;
        
        if (isError) {
            messageDiv.classList.add('error');
        } else {
            messageDiv.classList.add('success');
        }
        
        messageDiv.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
        
        console.log('Message shown:', message, isError ? 'error' : 'success');
    }

    /* ==========================
      HANDLE FORM SUBMIT
    =========================== */
    addCropForm.addEventListener("submit", async e => {
        e.preventDefault();

        const formData = new FormData(addCropForm);
        const name = formData.get("cropName").trim();
        const description = formData.get("cropDescription").trim();
        const price = parseFloat(formData.get("cropPrice"));
        const imageFile = formData.get("cropImage");

        // Validate inputs
        if (!name || !description || !price || price <= 0) {
            showMessage("Please fill all required fields with valid values.", true);
            return;
        }

        try {
            let imageUrl = null;
            
            // Upload image if provided
            if (imageFile && imageFile.size > 0) {
                try {
                    // Create a unique filename
                    const fileExtension = imageFile.name.split('.').pop();
                    const fileName = `${Date.now()}_${currentFarmerId}.${fileExtension}`;
                    const filePath = `crops/${fileName}`;
                    
                    console.log("Uploading image to:", filePath);
                    console.log("File details:", {
                        name: imageFile.name,
                        size: imageFile.size,
                        type: imageFile.type
                    });
                    
                    // Upload to Supabase storage
                    const { error: uploadError } = await supabase.storage
                        .from('crop_images')
                        .upload(filePath, imageFile);
                    
                    if (uploadError) {
                        console.error('Error uploading image:', uploadError);
                        showMessage("Error uploading image: " + uploadError.message, true);
                        // Continue without image if upload fails
                    } else {
                        // Get the public URL
                        const { data: publicUrlData } = supabase.storage
                            .from('crop_images')
                            .getPublicUrl(filePath);
                        
                        if (publicUrlData && publicUrlData.publicUrl) {
                            imageUrl = publicUrlData.publicUrl;
                            console.log("Image uploaded successfully. URL:", imageUrl);
                        } else {
                            // Fallback to raw URL
                            imageUrl = `${SUPABASE_URL}/storage/v1/object/public/crop_images/${filePath}`;
                            console.log("Using fallback URL:", imageUrl);
                        }
                    }
                } catch (imageError) {
                    console.error('Image upload error:', imageError);
                    showMessage("Error uploading image: " + imageError.message, true);
                    // Continue without image if upload fails
                }
            }

            // Prepare crop data
            const cropData = {
                farmer_id: currentFarmerId,
                name,
                description,
                price,
                image_url: imageUrl
            };

            console.log("Inserting crop data:", cropData);

            if (editingCard) {
                // Update existing crop
                const cropId = editingCard.dataset.cropId;
                const { error: updateError } = await supabase
                    .from('crops')
                    .update(cropData)
                    .eq('id', cropId);
                    
                if (updateError) {
                    console.error('Error updating crop:', updateError);
                    showMessage("Error updating crop: " + updateError.message, true);
                    return;
                }
                
                updateEntireCrop(editingCard, name, description, price, imageUrl || editingCard.dataset.imageSrc);
                showMessage("Crop updated successfully!");
            } else {
                // Insert new crop
                const { data, error: insertError } = await supabase
                    .from('crops')
                    .insert([cropData])
                    .select(); // Get the inserted data back
                    
                if (insertError) {
                    console.error('Error inserting crop:', insertError);
                    showMessage("Error adding crop: " + insertError.message, true);
                    return;
                }
                
                console.log("Crop inserted successfully:", data);
                
                // Add the new crop to the UI directly
                if (data && data.length > 0) {
                    addCropCardToList(data[0]);
                    showMessage("Crop added successfully!");
                } else {
                    // If we don't get data back, reload all crops
                    await loadFarmerCrops(currentFarmerId);
                    showMessage("Crop added successfully!");
                }
            }
            
            closeModal();
            
        } catch (error) {
            console.error('Error saving crop:', error);
            showMessage("An error occurred while saving the crop: " + error.message, true);
        }
    });

    /* ==========================
      ADD/UPDATE CROP FUNCTIONS
    =========================== */
    function addCropCardToList(crop) {
        const placeholderCard = [...cropsList.querySelectorAll('.card')].find(c => c.dataset.placeholder === "true");
        if (placeholderCard) placeholderCard.remove();

        const card = document.createElement("article");
        card.className = "card";
        card.tabIndex = 0;
        card.dataset.cropId = crop.id;
        card.dataset.name = crop.name;
        card.dataset.description = crop.description;
        card.dataset.price = crop.price;
        card.dataset.imageSrc = crop.image_url || '';

        // Use a placeholder image if no image URL is provided
        const displayImageUrl = crop.image_url || 'default-crop-image.jpg';
        
        card.innerHTML = `
            <div class="card-img">
                <img src="${displayImageUrl}" alt="${crop.name}" onerror="this.src='default-crop-image.jpg'; this.onerror=null;">
            </div>
            <div class="card-title">${crop.name}</div>
            <div class="card-subtitle">${crop.description}</div>
            <div class="card-price">₱${Number(crop.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        `;

        card.addEventListener('click', () => handleCardClick(card));
        cropsList.appendChild(card);
        
        // Log image URL for debugging
        console.log("Added crop card with image URL:", displayImageUrl);
    }

    function updateCropTextOnly(card, name, description, price) {
        card.querySelector(".card-title").textContent = name;
        card.querySelector(".card-subtitle").textContent = description;
        card.querySelector(".card-price").textContent = `₱${Number(price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }

    function updateEntireCrop(card, name, description, price, imageSrc) {
        updateCropTextOnly(card, name, description, price);
        if (imageSrc) {
            const imgElement = card.querySelector(".card-img img");
            imgElement.src = imageSrc;
            // Reset error handler in case it was triggered
            imgElement.onerror = function() {
                this.src = 'default-crop-image.jpg';
                this.onerror = null;
            };
        }
    }

    /* ==========================
       MANAGE / DELETE LOGIC
    =========================== */
    manageEdit.addEventListener('click', () => {
        if (!manageMode) {
            // Enter Manage Mode
            toggleManageMode();
        } else {
            // If already in Manage Mode → Delete selected cards
            deleteSelectedCards();
        }
    });

    function toggleManageMode() {
        manageMode = !manageMode;
        selectedCards.clear();
        manageEdit.setAttribute('aria-pressed', manageMode);
        manageEdit.textContent = manageMode ? 'Delete Selected' : 'Manage/Edit';

        const cards = cropsList.querySelectorAll('.card:not(#add-crop-card)');
        cards.forEach(card => {
            card.style.cursor = manageMode ? 'pointer' : 'default';
            if (manageMode) card.setAttribute('role', 'button');
            else { 
                card.classList.remove('selected'); 
                card.removeAttribute('role'); 
            }
        });
    }

    function handleCardClick(card) {
        if (!manageMode) {
            openModal("edit", card); // normal mode → open edit modal
            return;
        }

        // Manage Mode → select/unselect card
        card.classList.toggle("selected");
        selectedCards.has(card) ? selectedCards.delete(card) : selectedCards.add(card);

        if (selectedCards.size === 0) {
            manageEdit.textContent = 'Manage/Edit';
        } else {
            manageEdit.textContent = `Delete Selected (${selectedCards.size})`;
        }
    }

    async function deleteSelectedCards() {
        if (selectedCards.size === 0) return;

        try {
            // Delete from database
            for (const card of selectedCards) {
                const cropId = card.dataset.cropId;
                
                // Delete image from storage if exists
                const imageUrl = card.dataset.imageSrc;
                if (imageUrl) {
                    const filePath = imageUrl.split('/').pop();
                    await supabase.storage
                        .from('crop_images')
                        .remove([`crops/${currentFarmerId}/${filePath}`]);
                }
                
                // Delete crop record
                await supabase
                    .from('crops')
                    .delete()
                    .eq('id', cropId);
            }
            
            // Remove from UI
            selectedCards.forEach(card => card.remove());
            selectedCards.clear();
            
            manageEdit.textContent = 'Manage/Edit';
            manageMode = false;
            
            // Reset remaining cards
            const cards = cropsList.querySelectorAll('.card:not(#add-crop-card)');
            cards.forEach(card => {
                card.style.cursor = 'default';
                card.classList.remove('selected');
                card.removeAttribute('role');
            });
            
        } catch (error) {
            console.error('Error deleting crops:', error);
        }
    }